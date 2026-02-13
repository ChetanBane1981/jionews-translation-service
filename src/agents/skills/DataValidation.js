import { logger } from '../../utils/logger.js';

/**
 * DataValidation Skill
 * Validates input data against schema, checks required fields, types, and ranges
 */
export class DataValidationSkill {
  constructor(agent) {
    this.agent = agent;
    this.name = 'dataValidation';
  }

  /**
   * Validate data against schema
   * @param {Object} input - { data, schema }
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} - { valid, errors, warnings }
   */
  async execute(input, options = {}) {
    const { data, schema } = input;

    if (!schema) {
      return { valid: true, errors: [], warnings: ['No schema provided'] };
    }

    const errors = [];
    const warnings = [];

    // Check required fields
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (data[field] === undefined || data[field] === null) {
          errors.push(`Required field missing: ${field}`);
        }
      }
    }

    // Check field types
    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        if (data[field] !== undefined) {
          const valid = this.validateType(data[field], fieldSchema);
          if (!valid) {
            errors.push(`Invalid type for field ${field}: expected ${fieldSchema.type}`);
          }

          // Check ranges for numbers
          if (fieldSchema.type === 'number') {
            if (fieldSchema.min !== undefined && data[field] < fieldSchema.min) {
              errors.push(`Field ${field} below minimum: ${data[field]} < ${fieldSchema.min}`);
            }
            if (fieldSchema.max !== undefined && data[field] > fieldSchema.max) {
              errors.push(`Field ${field} above maximum: ${data[field]} > ${fieldSchema.max}`);
            }
          }

          // Check string length
          if (fieldSchema.type === 'string') {
            if (fieldSchema.minLength && data[field].length < fieldSchema.minLength) {
              warnings.push(`Field ${field} shorter than recommended: ${data[field].length} < ${fieldSchema.minLength}`);
            }
            if (fieldSchema.maxLength && data[field].length > fieldSchema.maxLength) {
              errors.push(`Field ${field} exceeds maximum length: ${data[field].length} > ${fieldSchema.maxLength}`);
            }
          }

          // Check enum values
          if (fieldSchema.enum && !fieldSchema.enum.includes(data[field])) {
            errors.push(`Field ${field} has invalid value: ${data[field]}, expected one of: ${fieldSchema.enum.join(', ')}`);
          }
        }
      }
    }

    const valid = errors.length === 0;

    if (!valid) {
      logger.warn(`[${this.agent.name}] Validation failed:`, errors);
    }

    return { valid, errors, warnings };
  }

  /**
   * Validate field type
   * @param {*} value
   * @param {Object} schema
   * @returns {boolean}
   */
  validateType(value, schema) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (schema.type === 'array') {
      return Array.isArray(value);
    }

    return actualType === schema.type;
  }

  /**
   * Create validation schema helper
   * @param {Object} fields - Field definitions
   * @returns {Object} - JSON Schema
   */
  static createSchema(fields) {
    return {
      type: 'object',
      properties: fields,
      required: Object.keys(fields).filter(key => fields[key].required)
    };
  }
}

export default DataValidationSkill;
