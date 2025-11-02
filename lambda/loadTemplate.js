/**
 * Lambda Handler: Load Template
 * Fetches template from DynamoDB
 */

import { getTemplate } from '../src/services/database.js';
import { logger, setLogContext } from '../src/utils/logger.js';
import { randomUUID } from 'crypto';

/**
 * Lambda handler for loading a template
 * @param {Object} event - Step Functions event (contains runId, templateId, templateVersion, brandGuide, templateFunnel)
 * @param {Object} context - Lambda context
 * @returns {Promise<Object>} - Template data
 */
export async function handler(event, context) {
  const requestId = context.requestId || randomUUID();
  setLogContext(requestId, event.runId, event.templateId);

  try {
    logger.info('Loading template', {
      templateId: event.templateId,
      templateVersion: event.templateVersion,
      hasBrandGuide: !!event.brandGuide,
      hasTemplateFunnel: !!event.templateFunnel
    });

    // If brandGuide and templateFunnel are provided in the event, use them directly
    // Otherwise, fetch from database (for backward compatibility)
    let brandGuideContent;
    let templateFunnelJson;

    if (event.brandGuide && event.templateFunnel) {
      logger.info('Using brand guide and template funnel from event');
      brandGuideContent = event.brandGuide;
      templateFunnelJson = typeof event.templateFunnel === 'string' 
        ? event.templateFunnel 
        : JSON.stringify(event.templateFunnel);
    } else {
      // Fallback to database lookup
      logger.info('Fetching template from database');
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

      brandGuideContent = template.brandGuideContent;
      templateFunnelJson = template.templateFunnelJson;

      logger.info('Template loaded successfully from database', {
        templateId: template.templateId,
        version: template.version,
        name: template.name
      });
    }

    return {
      ...event,
      template: {
        templateId: event.templateId,
        version: event.templateVersion || 'latest',
        name: event.templateId, // Use templateId as name if not provided
        brandGuideContent,
        templateFunnelJson,
        metadata: {}
      }
    };
  } catch (error) {
    logger.error('Failed to load template', error, { event });
    throw error;
  }
}

