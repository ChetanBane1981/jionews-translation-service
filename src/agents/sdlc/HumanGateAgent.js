import { BaseAgent } from '../BaseAgent.js';
import ApprovalGate from '../../models/ApprovalGate.js';
import UserStory from '../../models/UserStory.js';
import Task from '../../models/Task.js';
import TestCase from '../../models/TestCase.js';

/**
 * HumanGateAgent - Approval checkpoint management
 *
 * Responsibilities:
 * - Create approval gates at key checkpoints
 * - Manage checklists
 * - Route to appropriate approvers
 * - Handle approvals/rejections
 * - Escalate overdue gates
 * - Enable human-in-the-loop workflow
 */

export class HumanGateAgent extends BaseAgent {
  constructor(config = {}, domainConfig = null) {
    super('human-gate', config, domainConfig);

    // Register skills
    this.registerSkill('createGate', this.createApprovalGate);
    this.registerSkill('processApproval', this.processApproval);
    this.registerSkill('checkGateStatus', this.checkGateStatus);
    this.registerSkill('escalateOverdue', this.escalateOverdueGates);
    this.registerSkill('autoApprove', this.attemptAutoApproval);

    this.logger.info('HumanGateAgent initialized');
  }

  async execute(task) {
    try {
      const { mode, data } = task;

      switch (mode) {
        case 'create-gate':
          return await this.createGateForEntity(data);
        case 'process-approval':
          return await this.handleApproval(data);
        case 'check-pending':
          return await this.checkPendingGates();
        case 'escalate':
          return await this.escalateGates();
        default:
          throw new Error(`Unknown mode: ${mode}`);
      }
    } catch (error) {
      this.logger.error('HumanGateAgent execution failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Create approval gate
   */
  async createApprovalGate(input) {
    const { entityType, entityId, gateType, approvers, checklist, criteria } = input;

    const entity = await this.getEntity(entityType, entityId);
    if (!entity) {
      throw new Error(`Entity ${entityType}:${entityId} not found`);
    }

    const gate = new ApprovalGate({
      gateId: `GATE-${gateType}-${Date.now()}`,
      name: this.getGateName(gateType),
      description: this.getGateDescription(gateType),
      type: gateType,
      entity: {
        type: entityType,
        entityId: entity._id,
        entityTitle: entity.title
      },
      checklist: checklist.map(item => ({
        item,
        required: true,
        checked: false,
        category: this.categorizeChecklistItem(item)
      })),
      approvers: approvers.map(approver => ({
        role: approver.role,
        userId: approver.userId,
        name: approver.name,
        email: approver.email,
        required: approver.required !== false
      })),
      criteria: criteria || {
        requiresAllChecklist: true,
        minChecklistPercentage: 100,
        requiresApproverSignoff: true,
        allowAutoApproval: gateType === 'test-approval' // Only test results can auto-approve
      },
      sla: {
        targetReviewTime: this.getTargetReviewTime(gateType),
        dueDate: new Date(Date.now() + this.getTargetReviewTime(gateType) * 60 * 60 * 1000)
      },
      metadata: {
        priority: entity.priority || 'medium',
        workflow: 'sdlc',
        phase: this.getPhaseForGateType(gateType)
      }
    });

    await gate.save();

    this.logger.info('Approval gate created', { gateId: gate.gateId, type: gateType });

    this.emit('gate:created', {
      gateId: gate.gateId,
      type: gateType,
      entityType,
      entityId: entity.storyId || entity.taskId || entity.testCaseId
    });

    return {
      success: true,
      gate: gate.toObject()
    };
  }

  /**
   * Process approval
   */
  async processApproval(input) {
    const { gateId, userId, decision, comments, checkedItems } = input;

    const gate = await ApprovalGate.findOne({ gateId });
    if (!gate) {
      throw new Error(`Gate ${gateId} not found`);
    }

    // Start review if not started
    if (!gate.reviewStartedAt) {
      gate.startReview();
    }

    // Check checklist items
    if (checkedItems && Array.isArray(checkedItems)) {
      checkedItems.forEach(itemIndex => {
        gate.checkItem(itemIndex, userId, comments);
      });
    }

    // Record approval decision
    gate.recordApproval(userId, decision, comments);

    await gate.save();

    this.logger.info('Approval processed', { gateId, decision, userId });

    // Emit events based on decision
    if (gate.status === 'approved') {
      this.emit('gate:approved', {
        gateId: gate.gateId,
        entityType: gate.entity.type,
        entityId: gate.entity.entityId
      });

      // Update entity status
      await this.updateEntityOnApproval(gate);
    } else if (gate.status === 'rejected') {
      this.emit('gate:rejected', {
        gateId: gate.gateId,
        reason: comments
      });

      await this.updateEntityOnRejection(gate, comments);
    } else if (gate.status === 'revision-required') {
      this.emit('gate:revision-required', {
        gateId: gate.gateId,
        requirements: comments
      });

      await this.updateEntityOnRevision(gate, comments);
    }

    return {
      success: true,
      gate: gate.toObject(),
      decision: gate.status
    };
  }

  /**
   * Check gate status
   */
  async checkGateStatus(input) {
    const { gateId } = input;

    const gate = await ApprovalGate.findOne({ gateId });
    if (!gate) {
      throw new Error(`Gate ${gateId} not found`);
    }

    const checklistStatus = gate.checkChecklistCompletion();
    const approverStatus = this.getApproverStatus(gate);

    return {
      success: true,
      gateId: gate.gateId,
      status: gate.status,
      checklist: checklistStatus,
      approvers: approverStatus,
      canAutoApprove: gate.canAutoApprove()
    };
  }

  /**
   * Escalate overdue gates
   */
  async escalateOverdueGates() {
    const overdueGates = await ApprovalGate.findOverdue();

    const escalated = [];
    for (const gate of overdueGates) {
      // Escalate to manager/lead
      const escalateTo = this.getEscalationTarget(gate);
      gate.escalate(escalateTo);
      await gate.save();

      this.emit('gate:escalated', {
        gateId: gate.gateId,
        escalatedTo,
        daysOverdue: Math.floor((Date.now() - gate.sla.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      });

      escalated.push({
        gateId: gate.gateId,
        type: gate.type,
        daysOverdue: Math.floor((Date.now() - gate.sla.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      });
    }

    return {
      success: true,
      escalatedCount: escalated.length,
      gates: escalated
    };
  }

  /**
   * Attempt auto-approval
   */
  async attemptAutoApproval(input) {
    const { gateId } = input;

    const gate = await ApprovalGate.findOne({ gateId });
    if (!gate) {
      throw new Error(`Gate ${gateId} not found`);
    }

    if (gate.autoApprove()) {
      await gate.save();

      this.logger.info('Gate auto-approved', { gateId });

      this.emit('gate:auto-approved', {
        gateId: gate.gateId,
        entityType: gate.entity.type
      });

      await this.updateEntityOnApproval(gate);

      return {
        success: true,
        autoApproved: true,
        gate: gate.toObject()
      };
    }

    return {
      success: true,
      autoApproved: false,
      reason: 'Does not meet auto-approval criteria'
    };
  }

  /**
   * Create gate for entity (workflow)
   */
  async createGateForEntity(data) {
    const { entityType, entityId, gateType, approvers, checklist } = data;

    return await this.executeSkill('createGate', {
      entityType,
      entityId,
      gateType,
      approvers: approvers || this.getDefaultApprovers(gateType),
      checklist: checklist || this.getDefaultChecklist(gateType),
      criteria: this.getDefaultCriteria(gateType)
    });
  }

  /**
   * Handle approval
   */
  async handleApproval(data) {
    return await this.executeSkill('processApproval', data);
  }

  /**
   * Check pending gates
   */
  async checkPendingGates() {
    const pendingGates = await ApprovalGate.findPendingGates();

    return {
      success: true,
      count: pendingGates.length,
      gates: pendingGates.map(g => ({
        gateId: g.gateId,
        type: g.type,
        entityTitle: g.entity.entityTitle,
        priority: g.metadata.priority,
        dueDate: g.sla.dueDate,
        approvers: g.approvers.filter(a => !a.approved).map(a => a.name)
      }))
    };
  }

  /**
   * Escalate gates
   */
  async escalateGates() {
    return await this.executeSkill('escalateOverdue');
  }

  /**
   * Helper methods
   */

  async getEntity(entityType, entityId) {
    switch (entityType) {
      case 'user-story':
        return await UserStory.findOne({ storyId: entityId });
      case 'task':
        return await Task.findOne({ taskId: entityId });
      case 'test-case':
        return await TestCase.findOne({ testCaseId: entityId });
      default:
        return null;
    }
  }

  getGateName(gateType) {
    const names = {
      'story-review': 'Story Review',
      'story-approval': 'Story Approval',
      'technical-review': 'Technical Review',
      'code-review': 'Code Review',
      'test-approval': 'Test Results Approval',
      'final-walkthrough': 'Final Walkthrough',
      'production-ready': 'Production Deployment Approval'
    };
    return names[gateType] || gateType;
  }

  getGateDescription(gateType) {
    const descriptions = {
      'story-review': 'Product Manager reviews user story after research',
      'story-approval': 'Project Manager approves story for development',
      'technical-review': 'Technical Lead reviews implementation approach',
      'code-review': 'Code review before merging',
      'test-approval': 'QA Lead approves test results',
      'final-walkthrough': 'Final demo with PM and Product team',
      'production-ready': 'Final approval for production deployment'
    };
    return descriptions[gateType] || '';
  }

  categorizeChecklistItem(item) {
    if (item.includes('test') || item.includes('quality')) return 'quality';
    if (item.includes('security')) return 'security';
    if (item.includes('performance')) return 'performance';
    if (item.includes('doc')) return 'documentation';
    return 'functional';
  }

  getTargetReviewTime(gateType) {
    // Hours
    const times = {
      'story-review': 4,
      'story-approval': 2,
      'technical-review': 8,
      'code-review': 4,
      'test-approval': 1,
      'final-walkthrough': 2,
      'production-ready': 4
    };
    return times[gateType] || 4;
  }

  getPhaseForGateType(gateType) {
    if (gateType.includes('story')) return 'planning';
    if (gateType.includes('code')) return 'development';
    if (gateType.includes('test')) return 'testing';
    if (gateType.includes('production')) return 'deployment';
    return 'general';
  }

  getDefaultApprovers(gateType) {
    const defaults = {
      'story-review': [{ role: 'product-manager', required: true }],
      'story-approval': [{ role: 'project-manager', required: true }],
      'technical-review': [{ role: 'tech-lead', required: true }],
      'code-review': [{ role: 'tech-lead', required: true }],
      'test-approval': [{ role: 'qa-lead', required: true }],
      'final-walkthrough': [
        { role: 'product-manager', required: true },
        { role: 'project-manager', required: true }
      ],
      'production-ready': [
        { role: 'project-manager', required: true },
        { role: 'tech-lead', required: true }
      ]
    };
    return defaults[gateType] || [];
  }

  getDefaultChecklist(gateType) {
    const checklists = {
      'story-review': [
        'Requirements are clear and complete',
        'Acceptance criteria are testable',
        'Research findings documented'
      ],
      'story-approval': [
        'Story meets acceptance criteria',
        'Effort estimate is reasonable',
        'No critical blockers',
        'Ready for development'
      ],
      'code-review': [
        'Code follows project standards',
        'No security vulnerabilities',
        'Tests included',
        'Documentation updated'
      ],
      'test-approval': [
        'All test cases pass',
        'Code coverage meets threshold',
        'No critical bugs',
        'Performance acceptable'
      ],
      'final-walkthrough': [
        'Meets all acceptance criteria',
        'Demo successful',
        'Documentation complete',
        'Ready for production'
      ]
    };
    return checklists[gateType] || [];
  }

  getDefaultCriteria(gateType) {
    return {
      requiresAllChecklist: true,
      minChecklistPercentage: 100,
      requiresApproverSignoff: true,
      allowAutoApproval: gateType === 'test-approval'
    };
  }

  getApproverStatus(gate) {
    return gate.approvers.map(a => ({
      role: a.role,
      name: a.name,
      approved: a.approved,
      decision: a.decision
    }));
  }

  getEscalationTarget(gate) {
    // In production, look up org chart
    return 'project-manager';
  }

  async updateEntityOnApproval(gate) {
    const entity = await this.getEntity(gate.entity.type, gate.entity.entityId);
    if (!entity) return;

    if (gate.type === 'story-approval') {
      entity.status = 'approved';
    } else if (gate.type === 'test-approval') {
      entity.status = 'completed';
    } else if (gate.type === 'final-walkthrough') {
      entity.status = 'done';
    }

    await entity.save();
  }

  async updateEntityOnRejection(gate, reason) {
    const entity = await this.getEntity(gate.entity.type, gate.entity.entityId);
    if (!entity) return;

    entity.status = 'rejected';
    if (entity.addIteration) {
      entity.addIteration([reason], 'Rejected at approval gate');
    }
    await entity.save();
  }

  async updateEntityOnRevision(gate, requirements) {
    const entity = await this.getEntity(gate.entity.type, gate.entity.entityId);
    if (!entity) return;

    entity.status = 'draft';
    if (entity.addIteration) {
      entity.addIteration([requirements], 'Revision required');
    }
    await entity.save();
  }
}

export default HumanGateAgent;
