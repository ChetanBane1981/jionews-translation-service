import { BaseAgent } from '../BaseAgent.js';
import UserStory from '../../models/UserStory.js';
import { AnthropicServiceProvider } from '../../services/AnthropicServiceProvider.js';

/**
 * ProductManagerAgent - Requirement gathering and story creation
 *
 * Responsibilities:
 * - Gather requirements from stakeholders
 * - Conduct research on features
 * - Create well-formed user stories
 * - Define acceptance criteria
 * - Prioritize stories
 */

export class ProductManagerAgent extends BaseAgent {
  constructor(config = {}, domainConfig = null) {
    super('product-manager', config, domainConfig);

    this.aiProvider = new AnthropicServiceProvider(config.anthropic || {});

    // Register skills
    this.registerSkill('requirementGathering', this.gatherRequirements);
    this.registerSkill('researchFeature', this.researchFeature);
    this.registerSkill('createStory', this.createUserStory);
    this.registerSkill('defineAcceptanceCriteria', this.defineAcceptanceCriteria);
    this.registerSkill('prioritizeStory', this.prioritizeStory);
    this.registerSkill('analyzeCompetitors', this.analyzeCompetitors);
    this.registerSkill('estimateEffort', this.estimateEffort);

    this.logger.info('ProductManagerAgent initialized');
  }

  /**
   * Main execution flow
   */
  async execute(task) {
    this.logger.info('ProductManagerAgent executing', { taskId: task.id });

    try {
      const { requirements, mode } = task;

      switch (mode) {
        case 'create-story':
          return await this.createStoryFromRequirements(requirements);

        case 'research':
          return await this.conductResearch(requirements);

        case 'prioritize':
          return await this.prioritizeStories(requirements.storyIds);

        case 'review':
          return await this.reviewStory(requirements.storyId);

        default:
          throw new Error(`Unknown mode: ${mode}`);
      }
    } catch (error) {
      this.logger.error('ProductManagerAgent execution failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Gather requirements from description
   */
  async gatherRequirements(input) {
    const { description, stakeholder, context } = input;

    const prompt = `You are a Product Manager gathering requirements for a new feature.

**Feature Description:**
${description}

**Stakeholder:** ${stakeholder || 'Internal team'}
**Context:** ${context || 'General enhancement'}

Extract and structure the requirements:

1. **Functional Requirements** - What the feature must do
2. **Non-functional Requirements** - Performance, security, usability
3. **Technical Requirements** - Technologies, integrations needed
4. **Business Requirements** - Why this feature matters

Output as JSON:
{
  "functional": ["requirement 1", "requirement 2"],
  "nonFunctional": ["requirement 1", "requirement 2"],
  "technical": ["requirement 1", "requirement 2"],
  "business": ["requirement 1", "requirement 2"]
}`;

    const response = await this.aiProvider.execute(prompt, {
      maxTokens: 2000
    });

    try {
      const requirements = JSON.parse(response);
      return {
        success: true,
        requirements,
        source: stakeholder
      };
    } catch (error) {
      this.logger.error('Failed to parse requirements', { error: error.message });
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Research feature feasibility and approach
   */
  async researchFeature(input) {
    const { feature, existingCode, competitorApproaches } = input;

    const prompt = `You are a Product Manager researching a feature.

**Feature:** ${feature}

**Existing Codebase Context:**
${existingCode || 'Not provided'}

**Competitor Approaches:**
${competitorApproaches || 'Not provided'}

Provide research findings:

1. **Technical Feasibility** - Can we build this? (score 0-100)
2. **Risks** - What could go wrong?
3. **Recommendations** - Best approach?
4. **Dependencies** - What do we need first?
5. **Estimated Complexity** - Simple, Medium, Complex, Very-Complex

Output as JSON:
{
  "feasibility": {
    "score": 85,
    "reasoning": "..."
  },
  "risks": ["risk 1", "risk 2"],
  "recommendations": ["rec 1", "rec 2"],
  "dependencies": ["dep 1", "dep 2"],
  "complexity": "medium"
}`;

    const response = await this.aiProvider.execute(prompt, {
      maxTokens: 2000
    });

    try {
      const research = JSON.parse(response);
      return {
        success: true,
        research
      };
    } catch (error) {
      this.logger.error('Failed to parse research', { error: error.message });
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Create user story from requirements
   */
  async createUserStory(input) {
    const { title, description, requirements, priority } = input;

    const prompt = `You are a Product Manager writing a user story.

**Title:** ${title}
**Description:** ${description}

**Requirements:**
${JSON.stringify(requirements, null, 2)}

Create a well-formed user story:

1. **As a [user type]** - Who is this for?
2. **I want [functionality]** - What do they want?
3. **So that [business value]** - Why do they want it?
4. **Acceptance Criteria** - How do we know it's done? (GIVEN-WHEN-THEN format)

Output as JSON:
{
  "asA": "product developer",
  "iWant": "automated testing framework",
  "soThat": "I can ensure code quality",
  "acceptanceCriteria": [
    {
      "criterion": "GIVEN a code change WHEN tests run THEN all tests pass",
      "testable": true,
      "priority": "must-have"
    }
  ]
}`;

    const response = await this.aiProvider.execute(prompt, {
      maxTokens: 2000
    });

    try {
      const storyData = JSON.parse(response);

      // Create UserStory in database
      const story = new UserStory({
        storyId: `STORY-${Date.now()}`,
        title,
        description,
        asA: storyData.asA,
        iWant: storyData.iWant,
        soThat: storyData.soThat,
        acceptanceCriteria: storyData.acceptanceCriteria,
        requirements: this.formatRequirements(requirements),
        priority: priority || 'medium',
        status: 'draft',
        createdBy: 'product-manager-agent'
      });

      await story.save();

      this.logger.info('User story created', { storyId: story.storyId });

      return {
        success: true,
        story: story.toObject()
      };
    } catch (error) {
      this.logger.error('Failed to create story', { error: error.message });
      throw error;
    }
  }

  /**
   * Define acceptance criteria for a story
   */
  async defineAcceptanceCriteria(input) {
    const { storyDescription, requirements } = input;

    const prompt = `You are a Product Manager defining acceptance criteria.

**Story:** ${storyDescription}

**Requirements:**
${JSON.stringify(requirements, null, 2)}

Create testable acceptance criteria in GIVEN-WHEN-THEN format:

Example:
- GIVEN a logged-in user WHEN they click "Export" THEN a CSV file downloads
- GIVEN an invalid email WHEN user submits form THEN error message displays

Output as JSON array:
[
  {
    "criterion": "GIVEN ... WHEN ... THEN ...",
    "testable": true,
    "priority": "must-have"
  }
]`;

    const response = await this.aiProvider.execute(prompt, {
      maxTokens: 1500
    });

    try {
      const criteria = JSON.parse(response);
      return {
        success: true,
        acceptanceCriteria: criteria
      };
    } catch (error) {
      this.logger.error('Failed to parse criteria', { error: error.message });
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Prioritize story based on multiple factors
   */
  async prioritizeStory(input) {
    const { story, businessValue, urgency, dependencies } = input;

    const prompt = `You are a Product Manager prioritizing a user story.

**Story:** ${story.title}
**Description:** ${story.description}

**Factors:**
- Business Value: ${businessValue || 'medium'}
- Urgency: ${urgency || 'normal'}
- Dependencies: ${dependencies?.length || 0} stories

Determine priority (critical, high, medium, low) based on:
1. Business impact
2. User need urgency
3. Dependencies (blockers increase priority)
4. Effort vs. value ratio

Output as JSON:
{
  "priority": "high",
  "reasoning": "High business value with urgent user need"
}`;

    const response = await this.aiProvider.execute(prompt, {
      maxTokens: 500
    });

    try {
      const result = JSON.parse(response);
      return {
        success: true,
        priority: result.priority,
        reasoning: result.reasoning
      };
    } catch (error) {
      this.logger.error('Failed to prioritize', { error: error.message });
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Analyze competitor approaches
   */
  async analyzeCompetitors(input) {
    const { feature, competitors } = input;

    const prompt = `You are a Product Manager analyzing competitor approaches.

**Feature:** ${feature}

**Competitors:**
${JSON.stringify(competitors, null, 2)}

Analyze their approaches:
1. What do they do well?
2. What are their limitations?
3. What can we learn?
4. How can we differentiate?

Output as JSON:
{
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "lessons": ["lesson 1", "lesson 2"],
  "differentiation": ["opportunity 1", "opportunity 2"]
}`;

    const response = await this.aiProvider.execute(prompt, {
      maxTokens: 1500
    });

    try {
      const analysis = JSON.parse(response);
      return {
        success: true,
        competitorAnalysis: analysis
      };
    } catch (error) {
      this.logger.error('Failed to analyze competitors', { error: error.message });
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Estimate effort for story
   */
  async estimateEffort(input) {
    const { story, similarStories } = input;

    const prompt = `You are a Product Manager estimating effort.

**Story:** ${story.title}
**Description:** ${story.description}

**Acceptance Criteria:**
${JSON.stringify(story.acceptanceCriteria, null, 2)}

**Similar Stories (for reference):**
${JSON.stringify(similarStories, null, 2)}

Estimate effort:
1. **Story Points** (1, 2, 3, 5, 8, 13, 21)
2. **Hours** (developer time)
3. **Complexity** (simple, medium, complex, very-complex)

Output as JSON:
{
  "storyPoints": 5,
  "hours": 20,
  "complexity": "medium",
  "reasoning": "..."
}`;

    const response = await this.aiProvider.execute(prompt, {
      maxTokens: 1000
    });

    try {
      const estimate = JSON.parse(response);
      return {
        success: true,
        effort: estimate
      };
    } catch (error) {
      this.logger.error('Failed to estimate effort', { error: error.message });
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Create story from requirements (full workflow)
   */
  async createStoryFromRequirements(requirements) {
    try {
      // Step 1: Gather structured requirements
      const reqResult = await this.executeSkill('requirementGathering', requirements);

      // Step 2: Research feasibility
      const researchResult = await this.executeSkill('researchFeature', {
        feature: requirements.description,
        existingCode: requirements.existingCode,
        competitorApproaches: requirements.competitorApproaches
      });

      // Step 3: Create user story
      const storyResult = await this.executeSkill('createStory', {
        title: requirements.title,
        description: requirements.description,
        requirements: reqResult.requirements,
        priority: requirements.priority
      });

      // Step 4: Estimate effort
      const effortResult = await this.executeSkill('estimateEffort', {
        story: storyResult.story,
        similarStories: requirements.similarStories || []
      });

      // Update story with research and effort
      const story = await UserStory.findById(storyResult.story._id);
      story.research = {
        completed: true,
        findings: researchResult.research.recommendations,
        technicalFeasibility: researchResult.research.feasibility
      };
      story.estimatedEffort = {
        storyPoints: effortResult.effort.storyPoints,
        hours: effortResult.effort.hours,
        complexity: effortResult.effort.complexity
      };
      story.status = 'ready-for-review';

      // Add PM review approval gate
      story.addApprovalGate('pm-review', [
        'Requirements are clear and complete',
        'Acceptance criteria are testable',
        'Effort estimate is reasonable',
        'No major technical risks'
      ]);

      await story.save();

      this.emit('story:created', {
        storyId: story.storyId,
        title: story.title,
        status: story.status
      });

      return {
        success: true,
        story: story.toObject(),
        message: 'Story created and ready for PM review'
      };

    } catch (error) {
      this.logger.error('Failed to create story from requirements', { error: error.message });
      throw error;
    }
  }

  /**
   * Conduct comprehensive research
   */
  async conductResearch(requirements) {
    try {
      const researchTasks = [
        this.executeSkill('researchFeature', {
          feature: requirements.description,
          existingCode: requirements.existingCode
        }),
        this.executeSkill('analyzeCompetitors', {
          feature: requirements.description,
          competitors: requirements.competitors || []
        })
      ];

      const [featureResearch, competitorAnalysis] = await Promise.all(researchTasks);

      return {
        success: true,
        research: {
          feature: featureResearch.research,
          competitors: competitorAnalysis.competitorAnalysis
        }
      };
    } catch (error) {
      this.logger.error('Research failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Prioritize multiple stories
   */
  async prioritizeStories(storyIds) {
    try {
      const stories = await UserStory.find({ storyId: { $in: storyIds } });

      const prioritizationResults = await Promise.all(
        stories.map(story => this.executeSkill('prioritizeStory', {
          story,
          businessValue: story.businessValue,
          urgency: story.urgency,
          dependencies: story.dependencies
        }))
      );

      // Update story priorities
      for (let i = 0; i < stories.length; i++) {
        stories[i].priority = prioritizationResults[i].priority;
        await stories[i].save();
      }

      return {
        success: true,
        prioritized: stories.map((s, i) => ({
          storyId: s.storyId,
          title: s.title,
          priority: s.priority,
          reasoning: prioritizationResults[i].reasoning
        }))
      };
    } catch (error) {
      this.logger.error('Prioritization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Review story (PM review gate)
   */
  async reviewStory(storyId) {
    try {
      const story = await UserStory.findOne({ storyId });
      if (!story) {
        throw new Error(`Story ${storyId} not found`);
      }

      // AI-powered review
      const prompt = `You are a Product Manager reviewing a user story.

**Story:**
Title: ${story.title}
As a: ${story.asA}
I want: ${story.iWant}
So that: ${story.soThat}

**Acceptance Criteria:**
${JSON.stringify(story.acceptanceCriteria, null, 2)}

**Requirements:**
${JSON.stringify(story.requirements, null, 2)}

Review the story:
1. Are requirements clear?
2. Are acceptance criteria testable?
3. Is scope appropriate (not too big/small)?
4. Any missing information?

Output as JSON:
{
  "approved": true/false,
  "issues": ["issue 1", "issue 2"],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "decision": "approved" | "revision-required" | "rejected",
  "confidence": 85
}`;

      const response = await this.aiProvider.execute(prompt, {
        maxTokens: 1500
      });

      const review = JSON.parse(response);

      // Auto-approve if high confidence and no issues
      if (review.approved && review.confidence >= 85 && review.issues.length === 0) {
        story.updateApprovalGate('pm-review', 'approved', 'product-manager-agent', 'Auto-approved by AI review');
        story.status = 'approved';
        await story.save();

        this.emit('story:approved', {
          storyId: story.storyId,
          title: story.title
        });

        return {
          success: true,
          decision: 'approved',
          story: story.toObject()
        };
      } else {
        // Flag for human review
        this.emit('story:needs-human-review', {
          storyId: story.storyId,
          title: story.title,
          issues: review.issues,
          suggestions: review.suggestions
        });

        return {
          success: true,
          decision: 'needs-human-review',
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
   * Helper: Format requirements for story
   */
  formatRequirements(requirements) {
    const formatted = [];

    for (const [type, reqs] of Object.entries(requirements)) {
      if (Array.isArray(reqs)) {
        reqs.forEach(req => {
          formatted.push({
            type: type === 'functional' ? 'functional' :
                  type === 'nonFunctional' ? 'non-functional' :
                  type === 'technical' ? 'technical' : 'business',
            description: req,
            priority: 'high',
            source: 'product-manager-agent'
          });
        });
      }
    }

    return formatted;
  }
}

export default ProductManagerAgent;
