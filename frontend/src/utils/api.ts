import type {
  RunsResponse,
  RunResponse,
  FunnelTemplatesResponse,
  BrandGuidesResponse,
} from '../types';

const getApiBaseUrl = (): string => {
  // Check if API_BASE_URL is set via window (from Vercel env var or manual config)
  const windowWithApi = window as typeof window & { API_BASE_URL?: string };
  if (windowWithApi.API_BASE_URL && windowWithApi.API_BASE_URL !== '%API_BASE_URL%') {
    const url = windowWithApi.API_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
    console.log('Using API_BASE_URL from window:', url);
    return url;
  }

  // Try to detect API URL from current location
  const origin = window.location.origin;

  // If running locally, use mock API server on port 8080
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    console.log('Using local API:', 'http://localhost:8080/api');
    return 'http://localhost:8080/api';
  }

  // For production, use the Lambda Function URL
  const lambdaUrl = 'https://i5of4xggwlglu3f477pzq24o7u0jrwms.lambda-url.us-west-2.on.aws';
  console.log('Using Lambda Function URL:', lambdaUrl);
  return lambdaUrl;
};

export const API_BASE_URL = getApiBaseUrl();

console.log('API_BASE_URL initialized to:', API_BASE_URL);

export const api = {
  async getRuns(limit: number = 100): Promise<RunsResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${API_BASE_URL}/runs?limit=${limit}`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to load runs'}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to load runs');
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },

  async getRun(runId: string): Promise<RunResponse> {
    const response = await fetch(`${API_BASE_URL}/runs/${runId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to load run details');
    }

    return data;
  },

  async createRun(data: {
    funnelTemplateId: string;
    brandGuideId: string;
    customInstructions?: string;
  }): Promise<{ success: boolean; runId: string; message?: string }> {
    const response = await fetch(`${API_BASE_URL}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to create run');
    }

    return result;
  },

  async getFunnelTemplates(): Promise<FunnelTemplatesResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${API_BASE_URL}/funnel-templates`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok && response.status === 200) {
        const data = await response.json();
        if (data.success) {
          return data;
        }
      }

      throw new Error('Failed to load funnel templates');
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },

  async getFunnelTemplate(templateId: string): Promise<{ success: boolean; funnelTemplate: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/funnel-templates/${templateId}`);
      
      // Check for CORS errors
      if (!response.ok && response.status === 0) {
        throw new Error('CORS error: Request blocked. The API server is not configured to allow requests from this origin.');
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load funnel template');
      }

      return data;
    } catch (error: any) {
      // Handle network/CORS errors
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('CORS error: Request blocked. The API server is not configured to allow requests from this origin.');
      }
      throw error;
    }
  },

  async saveFunnelTemplate(
    templateId: string | null,
    data: {
      name: string;
      description?: string;
      funnelJson: any[];
      status?: string;
    }
  ): Promise<{ success: boolean; message?: string }> {
    const url = templateId
      ? `${API_BASE_URL}/funnel-templates/${templateId}`
      : `${API_BASE_URL}/funnel-templates`;
    const method = templateId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      // Check for CORS errors before trying to parse JSON
      if (!response.ok && response.status === 0) {
        throw new Error('CORS error: Request blocked. The API server is not configured to allow requests from this origin.');
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to save funnel template');
      }

      return result;
    } catch (error: any) {
      // Handle network/CORS errors
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('CORS error: Request blocked. The API server is not configured to allow requests from this origin.');
      }
      throw error;
    }
  },

  async deleteFunnelTemplate(templateId: string): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`${API_BASE_URL}/funnel-templates/${templateId}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to delete funnel template');
    }

    return result;
  },

  async getBrandGuides(): Promise<BrandGuidesResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${API_BASE_URL}/brand-guides`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok && response.status === 200) {
        const data = await response.json();
        if (data.success) {
          return data;
        }
      }

      throw new Error('Failed to load brand guides');
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },

  async getBrandGuide(guideId: string): Promise<{ success: boolean; brandGuide: any }> {
    const response = await fetch(`${API_BASE_URL}/brand-guides/${guideId}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to load brand guide');
    }

    return data;
  },

  async saveBrandGuide(
    guideId: string | null,
    data: {
      name: string;
      description?: string;
      content?: string;
      brandGuideJson?: any;
      status?: string;
    }
  ): Promise<{ success: boolean; message?: string }> {
    const url = guideId
      ? `${API_BASE_URL}/brand-guides/${guideId}`
      : `${API_BASE_URL}/brand-guides`;
    const method = guideId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to save brand guide');
    }

    return result;
  },

  async deleteBrandGuide(guideId: string): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`${API_BASE_URL}/brand-guides/${guideId}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to delete brand guide');
    }

    return result;
  },
};

