/**
 * Lambda Handler: Load Template
 * Fetches template from DynamoDB
 */

import { getTemplate } from '../src/services/database.js';
import { logger, setLogContext } from '../src/utils/logger.js';
import { randomUUID } from 'crypto';

/**
 * Lambda handler for loading a template
 * @param {Object} event - Step Functions event (contains runId, templateId, templateVersion)
 * @param {Object} context - Lambda context
 * @returns {Promise<Object>} - Template data
 */
export async function handler(event, context) {
  const requestId = context.requestId || randomUUID();
  setLogContext(requestId, event.runId, event.templateId);

  try {
    logger.info('Loading template', {
      templateId: event.templateId,
      templateVersion: event.templateVersion
    });

    const template = await getTemplate(
      event.templateId,
      event.templateVersion || 'latest'
    );

    if (!template) {
      throw new Error(`Template ${event.templateId} not found`);
    }

    if (template.status !== 'active') {
      throw new Error(`Template ${event.templateId} is not active (status: ${template.status})`);
    }

    logger.info('Template loaded successfully', {
      templateId: template.templateId,
      version: template.version,
      name: template.name
    });

    return {
      ...event,
      template: {
        templateId: template.templateId,
        version: template.version,
        name: template.name,
        brandGuideContent: template.brandGuideContent,
        templateFunnelJson: template.templateFunnelJson,
        metadata: template.metadata
      }
    };
  } catch (error) {
    logger.error('Failed to load template', error, { event });
    throw error;
  }
}

