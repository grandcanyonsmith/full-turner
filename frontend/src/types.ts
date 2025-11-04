export interface Run {
  runId: string;
  templateId?: string;
  status: 'pending' | 'processing' | 'running' | 'completed' | 'failed';
  timestamp?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  input?: {
    funnelTemplateId?: string;
    brandGuideId?: string;
    customInstructions?: string;
    input_as_text?: string;
    [key: string]: any;
  };
  output?: {
    output_text?: string;
    [key: string]: any;
  };
  cost?: {
    total?: number;
    agent?: {
      cost?: number;
      tokens?: {
        input?: number;
        output?: number;
        total?: number;
      };
    };
    images?: {
      cost?: number;
      imagesGenerated?: number;
    };
  };
  imageProcessingResults?: ImageProcessingResult[];
}

export interface ImageProcessingResult {
  elementId?: string;
  success?: boolean;
  s3Url?: string;
  url?: string;
}

export interface FunnelTemplate {
  funnelTemplateId: string;
  name: string;
  description?: string;
  funnelJson?: FunnelElement[];
  status?: 'active' | 'inactive';
  createdAt?: string;
}

export interface BrandGuide {
  brandGuideId: string;
  name: string;
  description?: string;
  content?: string;
  brandGuideJson?: BrandGuideJson;
  status?: 'active' | 'inactive';
  createdAt?: string;
}

export interface BrandGuideJson {
  story?: {
    title?: string;
    content?: string;
  };
  product?: {
    name?: string;
    price?: string;
    shortDescription?: string;
    features?: Array<{
      title?: string;
      description?: string;
    }>;
    uniqueMechanism?: {
      tagline?: string;
      description?: string;
    };
    delivery?: {
      format?: string;
      advisory?: string;
      community?: string;
      access?: string;
    };
    investment?: string;
  };
  pains?: Array<{
    title?: string;
    painScore?: number;
    description?: string;
    quotes?: string[];
  }>;
  dreams?: Array<{
    title?: string;
    visionSnapshot?: string;
    tangibleMilestones?: string;
    emotionalWin?: string;
    quotes?: string[];
    dailyFrictionRemoved?: string;
    deeperPurpose?: string;
    forWhom?: string;
    aspirationalMirror?: string;
    reputationGoal?: string;
    shelvedDream?: string;
  }>;
  authority?: {
    title?: string;
    content?: string;
    highlights?: string[];
  };
  brandStyleGuide?: {
    title?: string;
    colors?: {
      primary?: {
        name?: string;
        hex?: string;
        usage?: string;
      };
      secondary?: {
        name?: string;
        hex?: string;
        usage?: string;
      };
      accent?: {
        name?: string;
        hex?: string;
        usage?: string;
      };
    };
    typography?: {
      headings?: {
        font?: string;
        description?: string;
      };
      body?: {
        font?: string;
        description?: string;
      };
    };
    voiceAndTone?: {
      description?: string;
      attributes?: string[];
      avoidance?: string[];
    };
    visualStyle?: {
      approach?: string;
      elements?: string[];
    };
    logos?: {
      primary?: {
        description?: string;
        usage?: string;
        specifications?: string[];
      };
      variations?: Array<{
        name?: string;
        description?: string;
        usage?: string;
      }>;
      clearSpace?: string;
      incorrectUsage?: string[];
    };
  };
  competitors?: {
    directCompetitors?: Array<{
      name?: string;
      website?: string;
      offering?: string;
      usp?: string;
      strengths?: string[];
      weaknesses?: string[];
      observations?: string;
    }>;
    indirectCompetitors?: Array<{
      name?: string;
      website?: string;
      problem?: string;
      overlap?: string;
      whyChooseThem?: string;
    }>;
    influencers?: Array<{
      name?: string;
      platform?: string;
      expertise?: string;
      audienceSize?: string;
      collaboration?: string;
    }>;
    marketOverlaps?: Array<{
      name?: string;
      whyHybrid?: string;
      strategyImpact?: string;
    }>;
  };
  demographics?: {
    age?: string;
    gender?: string;
    location?: string;
    occupation?: string;
    income?: string;
    education?: string;
    familyStatus?: string;
  };
  psychographics?: {
    values?: string;
    lifestyle?: string;
    personality?: string;
    attitudesTowardSolutions?: string;
  };
  values?: {
    coreValues?: string[];
    beliefs?: string;
  };
  transformation?: {
    beforeState?: string;
    afterState?: string;
    emotionalShift?: string;
    impact?: string;
  };
  mediaConsumption?: {
    socialPlatforms?: string[];
    podcasts?: string[];
    blogs?: string[];
    forums?: string[];
    books?: string[];
  };
  objections?: Array<{
    objection?: string;
    rebuttal?: string;
  }>;
  competitiveAdvantage?: {
    uniqueValueProposition?: string[];
    funElements?: string[];
    innovation?: string;
    comparison?: string;
  };
  communicationStyle?: {
    tone?: string;
    languageStyle?: string;
    emotionalVibe?: string;
    avoid?: string[];
  };
  meta?: {
    brandName?: string;
    templateVersion?: string;
    lastUpdated?: string;
  };
}

export interface FunnelElement {
  element_id: string;
  type: string;
  text?: string;
  url?: string;
  value?: string;
  width?: number;
  height?: number;
  alt_text?: string;
  transparent_bg?: boolean;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  [key: string]: any;
}

export interface RunsResponse extends ApiResponse {
  runs: Run[];
  lastKey?: string | null;
  count?: number;
}

export interface RunResponse extends ApiResponse {
  run: Run;
}

export interface FunnelTemplatesResponse extends ApiResponse {
  funnelTemplates: FunnelTemplate[];
}

export interface BrandGuidesResponse extends ApiResponse {
  brandGuides: BrandGuide[];
}

