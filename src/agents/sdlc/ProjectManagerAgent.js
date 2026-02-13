import { BaseAgent } from '../BaseAgent.js';
import UserStory from '../../models/UserStory.js';
import ApprovalGate from '../../models/ApprovalGate.js';
import { AnthropicServiceProvider } from '../../services/AnthropicServiceProvider.js';

/**
 * ProjectManagerAgent - Story approval and sprint planning
 *
 * Responsibilities:
 * - Review and approve/reject user stories
 * - Manage iterations when changes needed
 * - Plan sprints and assign stories
 * - Track progress and metrics
 * - Escalate blockers
 */

export class ProjectManagerAgent extends BaseAgent {
  constructor(config = {}, domainConfig = null) {
    super('project-manager', config, domainConfig);

    this.aiProvider = new AnthropicServiceProvider(config.anthropic || {});

    // Register skills
    this.registerSkill('reviewStory', this.reviewStory);
    this.registerSkill('approveStory', this.approveStory);
    this.registerSkill('rejectStory', this.rejectStory);
    this.registerSkill('requestRevision', this.requestRevision);
    this.registerSkill('planSprint', this.planSprint);
    this.registerSkill('assignStoriesToSprint', this.assignStoriesToSprint);
    this.registerSkill('trackProgress', this.trackProgress);
    this.registerSkill('identifyBlockers', this.identifyBlockers);

    this.logger.info('ProjectManagerAgent initialized');
  }

  /**
   * Main execution flow
   */
  async execute(task) {
    this.logger.info('ProjectManagerAgent executing', { taskId: task.id });

    try {
      const { mode, data } = task;

      switch (mode) {
        case 'review-story':
          return await this.reviewAndDecideOnStory(data.storyId);

        case 'approve-batch':
          return await this.approveBatchStories(data.storyIds);

        case 'plan-sprint':
          return await this.planSprintWorkflow(data);

        case 'track-progress':
          return await this.trackSprintProgress(data.sprintId);

        case 'handle-iteration':
          return await this.handleIterationRequest(data);

        default:
          throw new Error(`Unknown mode: ${mode}`);
      }
    } catch (error) {
      this.logger.error('ProjectManagerAgent execution failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Review story and make approval decision
   */
  async reviewStory(input) {
    const { story } = input;

    const prompt = `You are a Project Manager reviewing a user story for approval.

**Story:**
ID: ${story.storyId}
Title: ${story.title}
Status: ${story.status}

**User Story Format:**
As a ${story.asA}
I want ${story.iWant}
So that ${story.soThat}

**Requirements:**
${JSON.stringify(story.requirements, null, 2)}

**Acceptance Criteria:**
${JSON.stringify(story.acceptanceCriteria, null, 2)}

**Effort Estimate:**
Story Points: ${story.estimatedEffort?.storyPoints}
Hours: ${story.estimatedEffort?.hours}
Complexity: ${story.estimatedEffort?.complexity}

**Research Findings:**
Feasibility Score: ${story.research?.technicalFeasibility?.score}/100
Risks: ${JSON.stringify(story.research?.technicalFeasibility?.risks || [])}

Review checklist:
1. ✓ Story format complete (As a/I want/So that)?
2. ✓ Acceptance criteria clear and testable?
3. ✓ Requirements well-defined?
4. ✓ Effort estimate reasonable?
5. ✓ Technical feasibility acceptable (>70)?
6. ✓ No critical blockers?

Make decision:
- **approved**: Ready for development
- **revision-required**: Needs minor changes (specify what)
- **rejected**: Not ready or not viable (explain why)

Output as JSON:
{
  "decision": "approved" | "revision-required" | "rejected",
  "reasoning": "Clear explanation of decision",
  "checklist": {
    "formatComplete": true,
    "criteriaTestable": true,
    "requirementsClear": true,
    "estimateReasonable": true,
    "feasibilityAcceptable": true,
    "noBlockers": true
  },
  "requiredChanges": ["change 1", "change 2"],
  "confidence": 90
}`;

    const response = await this.aiProvider.execute(prompt, {
      maxTokens: 2000
    });

    try {
      const review = JSON.parse(response);
      return {
        success: true,
        review
      };
    } catch (error) {
      this.logger.error('Failed to parse review', { error: error.message });
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Approve story
   */
  async approveStory(input) {
    const { storyId, approver, comments } = input;

    const story = await UserStory.findOne({ storyId });
    if (!story) {
      throw new Error(`Story ${storyId} not found`);
    }

    // Update approval gate
    story.updateApprovalGate('pm-approval', 'approved', approver, comments);
    story.status = 'approved';
    await story.save();

    this.logger.info('Story approved', { storyId });

    this.emit('story:approved', {
      storyId: story.storyId,
      title: story.title,
      approver
    });

    return {
      success: true,
      message: 'Story approved for development',
      story: story.toObject()
    };
  }

  /**
   * Reject story
   */
  async rejectStory(input) {
    const { storyId, approver, reason } = input;

    const story = await UserStory.findOne({ storyId });
    if (!story) {
      throw new Error(`Story ${storyId} not found`);
    }

    // Update approval gate
    story.updateApprovalGate('pm-approval', 'rejected', approver, reason);
    story.status = 'rejected';
    await story.save();

    this.logger.info('Story rejected', { storyId, reason });

    this.emit('story:rejected', {
      storyId: story.storyId,
      title: story.title,
      reason,
      approver
    });

    return {
      success: true,
      message: 'Story rejected',
      reason,
      story: story.toObject()
    };
  }

  /**
   * Request revision on story
   */
  async requestRevision(input) {
    const { storyId, approver, requiredChanges } = input;

    const story = await UserStory.findOne({ storyId });
    if (!story) {
      throw new Error(`Story ${storyId} not found`);
    }

    // Update approval gate
    story.updateApprovalGate('pm-approval', 'revision-required', approver, `Changes needed: ${requiredChanges.join(', ')}`);
    story.status = 'draft';

    // Add iteration
    story.addIteration(requiredChanges, 'PM requested revisions');

    await story.save();

    this.logger.info('Revision requested', { storyId, changes: requiredChanges });

    this.emit('story:revision-required', {
      storyId: story.storyId,
      title: story.title,
      requiredChanges,
      approver
    });

    return {
      success: true,
      message: 'Revision requested',
      requiredChanges,
      story: story.toObject()
    };
  }

  /**
   * Plan sprint
   */
  async planSprint(input) {
    const { sprintName, sprintGoal, startDate, endDate, capacity, storyIds } = input;

    const stories = await UserStory.find({
      storyId: { $in: storyIds },
      status: 'approved'
    }).sort({ priority: -1 });

    // Calculate total story points
    const totalPoints = stories.reduce((sum, s) => sum + (s.estimatedEffort?.storyPoints || 0), 0);

    if (totalPoints > capacity) {
      this.logger.warn('Sprint over capacity', { totalPoints, capacity });
    }

    // Assign stories to sprint
    const sprintId = `SPRINT-${Date.now()}`;
    for (const story of stories) {
      story.sprint = {
        sprintId,
        sprintName,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      };
      story.status = 'in-planning';
      await story.save();
    }

    this.logger.info('Sprint planned', { sprintId, storyCount: stories.length, totalPoints });

    this.emit('sprint:planned', {
      sprintId,
      sprintName,
      storyCount: stories.length,
      totalPoints
    });

    return {
      success: true,
      sprint: {
        sprintId,
        sprintName,
        sprintGoal,
        startDate,
        endDate,
        capacity,
        totalPoints,
        stories: stories.map(s => ({
          storyId: s.storyId,
          title: s.title,
          storyPoints: s.estimatedEffort?.storyPoints
        }))
      }
    };
  }

  /**
   * Assign stories to sprint
   */
  async assignStoriesToSprint(input) {
    const { sprintId, storyIds } = input;

    const stories = await UserStory.find({ storyId: { $in: storyIds } });

    for (const story of stories) {
      const sprint = await this.getSprintInfo(sprintId);
      story.sprint = sprint;
      story.status = 'in-planning';
      await story.save();
    }

    return {
      success: true,
      message: `${stories.length} stories assigned to sprint ${sprintId}`
    };
  }

  /**
   * Track progress
   */
  async trackProgress(input) {
    const { sprintId } = input;

    const stories = await UserStory.find({ 'sprint.sprintId': sprintId });

    const summary = {
      total: stories.length,
      byStatus: {},
      totalPoints: 0,
      completedPoints: 0,
      inProgressPoints: 0,
      blockedStories: []
    };

    for (const story of stories) {
      // Count by status
      summary.byStatus[story.status] = (summary.byStatus[story.status] || 0) + 1;

      // Calculate points
      const points = story.estimatedEffort?.storyPoints || 0;
      summary.totalPoints += points;

      if (story.status === 'done') {
        summary.completedPoints += points;
      } else if (story.status === 'in-progress') {
        summary.inProgressPoints += points;
      }

      // Track blocked stories
      if (story.status === 'blocked') {
        summary.blockedStories.push({
          storyId: story.storyId,
          title: story.title
        });
      }
    }

    summary.completionPercentage = summary.totalPoints > 0
      ? Math.round((summary.completedPoints / summary.totalPoints) * 100)
      : 0;

    return {
      success: true,
      sprintId,
      progress: summary
    };
  }

  /**
   * Identify blockers
   */
  async identifyBlockers(input) {
    const { sprintId } = input;

    const stories = await UserStory.find({
      'sprint.sprintId': sprintId,
      status: { $in: ['blocked', 'revision-required'] }
    });

    const blockers = stories.map(story => ({
      storyId: story.storyId,
      title: story.title,
      status: story.status,
      blockerReason: this.extractBlockerReason(story),
      daysBlocked: this.calculateDaysBlocked(story)
    }));

    if (blockers.length > 0) {
      this.emit('sprint:blockers-detected', {
        sprintId,
        blockerCount: blockers.length,
        blockers
      });
    }

    return {
      success: true,
      blockers
    };
  }

  /**
   * Review and decide on story (full workflow)
   */
  async reviewAndDecideOnStory(storyId) {
    try {
      const story = await UserStory.findOne({ storyId });
      if (!story) {
        throw new Error(`Story ${storyId} not found`);
      }

      // AI-powered review
      const reviewResult = await this.executeSkill('reviewStory', { story });
      const { review } = reviewResult;

      // Make decision based on review
      if (review.decision === 'approved' && review.confidence >= 85) {
        // Auto-approve high-confidence approvals
        return await this.executeSkill('approveStory', {
          storyId,
          approver: 'project-manager-agent',
          comments: review.reasoning
        });
      } else if (review.decision === 'revision-required') {
        return await this.executeSkill('requestRevision', {
          storyId,
          approver: 'project-manager-agent',
          requiredChanges: review.requiredChanges
        });
      } else if (review.decision === 'rejected') {
        return await this.executeSkill('rejectStory', {
          storyId,
          approver: 'project-manager-agent',
          reason: review.reasoning
        });
      } else {
        // Low confidence - flag for human review
        this.emit('story:needs-human-approval', {
          storyId,
          title: story.title,
          review
        });

        return {
          success: true,
          decision: 'needs-human-approval',
          review,
          story: story.toObject()
        };
      }
    } catch (error) {
      this.logger.error('Story review failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Approve batch of stories
   */
  async approveBatchStories(storyIds) {
    const results = await Promise.all(
      storyIds.map(storyId => this.reviewAndDecideOnStory(storyId))
    );

    const summary = {
      total: results.length,
      approved: results.filter(r => r.decision === 'approved' || r.message === 'Story approved for development').length,
      revisionRequired: results.filter(r => r.decision === 'revision-required' || r.message === 'Revision requested').length,
      rejected: results.filter(r => r.decision === 'rejected' || r.message === 'Story rejected').length,
      needsHuman: results.filter(r => r.decision === 'needs-human-approval').length
    };

    return {
      success: true,
      summary,
      results
    };
  }

  /**
   * Plan sprint workflow
   */
  async planSprintWorkflow(data) {
    const { sprintName, startDate, endDate, capacity } = data;

    // Get approved stories
    const approvedStories = await UserStory.find({
      status: 'approved',
      sprint: { $exists: false }
    }).sort({ priority: -1, 'estimatedEffort.storyPoints': 1 });

    // Select stories up to capacity
    const selectedStories = [];
    let currentCapacity = 0;

    for (const story of approvedStories) {
      const points = story.estimatedEffort?.storyPoints || 0;
      if (currentCapacity + points <= capacity) {
        selectedStories.push(story.storyId);
        currentCapacity += points;
      }

      if (currentCapacity >= capacity * 0.9) break; // 90% utilization
    }

    // Plan sprint
    return await this.executeSkill('planSprint', {
      sprintName,
      sprintGoal: data.sprintGoal || 'Complete assigned user stories',
      startDate,
      endDate,
      capacity,
      storyIds: selectedStories
    });
  }

  /**
   * Track sprint progress
   */
  async trackSprintProgress(sprintId) {
    const progressResult = await this.executeSkill('trackProgress', { sprintId });
    const blockersResult = await this.executeSkill('identifyBlockers', { sprintId });

    return {
      success: true,
      sprintId,
      progress: progressResult.progress,
      blockers: blockersResult.blockers
    };
  }

  /**
   * Handle iteration request
   */
  async handleIterationRequest(data) {
    const { storyId, changes, reason } = data;

    return await this.executeSkill('requestRevision', {
      storyId,
      approver: data.requestedBy || 'project-manager-agent',
      requiredChanges: changes
    });
  }

  /**
   * Helper: Get sprint info
   */
  async getSprintInfo(sprintId) {
    // In real implementation, this would query a Sprint model
    // For now, return basic structure
    return {
      sprintId,
      sprintName: `Sprint ${sprintId}`,
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 2 weeks
    };
  }

  /**
   * Helper: Extract blocker reason
   */
  extractBlockerReason(story) {
    if (story.status === 'revision-required') {
      const approvalGate = story.approvals.find(a => a.status === 'revision-required');
      return approvalGate?.comments || 'Revision required';
    }
    return 'Blocked by dependencies';
  }

  /**
   * Helper: Calculate days blocked
   */
  calculateDaysBlocked(story) {
    const lastUpdate = story.updatedAt || story.createdAt;
    const daysSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceUpdate;
  }
}

export default ProjectManagerAgent;
