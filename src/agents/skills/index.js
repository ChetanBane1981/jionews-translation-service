/**
 * Agent Skills Index
 * Exports all available skills for agent registration
 */

// Core Skills (6)
export { DataValidationSkill } from './DataValidation.js';
export { CacheManagementSkill } from './CacheManagement.js';
export { RateLimitingSkill } from './RateLimiting.js';
export { DataEnrichmentSkill } from './DataEnrichment.js';
export { ErrorRecoverySkill } from './ErrorRecovery.js';
export { TelemetrySkill } from './Telemetry.js';

// Advanced AI Skills (5) - Import when implemented
export { SentimentAnalysisSkill } from './SentimentAnalysis.js';
export { EntityExtractionSkill } from './EntityExtraction.js';

// Skill Categories
export const CORE_SKILLS = [
  'dataValidation',
  'cacheManagement',
  'rateLimiting',
  'dataEnrichment',
  'errorRecovery',
  'telemetry'
];

export const AI_SKILLS = [
  'sentimentAnalysis',
  'entityExtraction',
  'contextualRanking',
  'adaptiveLearning'
];

export const DOMAIN_SKILLS = {
  news: ['factChecking', 'sourceTracking', 'trendPrediction'],
  ecommerce: ['priceTracking', 'reviewAnalysis', 'inventoryMonitoring'],
  social: ['engagementPrediction', 'influencerDetection', 'toxicityDetection']
};

/**
 * Get all available skills
 * @returns {Array<string>}
 */
export function getAllSkills() {
  return [
    ...CORE_SKILLS,
    ...AI_SKILLS,
    ...Object.values(DOMAIN_SKILLS).flat()
  ];
}

/**
 * Get skills for a specific domain
 * @param {string} domain
 * @returns {Array<string>}
 */
export function getSkillsForDomain(domain) {
  return [
    ...CORE_SKILLS,
    ...AI_SKILLS,
    ...(DOMAIN_SKILLS[domain] || [])
  ];
}
