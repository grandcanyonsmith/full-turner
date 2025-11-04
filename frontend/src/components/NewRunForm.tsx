import { useState, useEffect } from 'react';
import type { FunnelTemplate, BrandGuide } from '../types';

interface NewRunFormProps {
  funnelTemplates: FunnelTemplate[];
  brandGuides: BrandGuide[];
  onSubmit: (data: {
    funnelTemplateId: string;
    brandGuideId: string;
    customInstructions?: string;
  }) => void;
  onCancel: () => void;
  onPreviewFunnelTemplate: (templateId: string) => void;
  onPreviewBrandGuide: (guideId: string) => void;
  onLoadTemplates: () => Promise<void>;
  onLoadGuides: () => Promise<void>;
}

export default function NewRunForm({
  funnelTemplates,
  brandGuides,
  onSubmit,
  onCancel,
  onPreviewFunnelTemplate,
  onPreviewBrandGuide,
  onLoadTemplates,
  onLoadGuides,
}: NewRunFormProps) {
  const [funnelTemplateId, setFunnelTemplateId] = useState('');
  const [brandGuideId, setBrandGuideId] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');

  useEffect(() => {
    // Load templates and guides if not already loaded
    if (funnelTemplates.length === 0) {
      onLoadTemplates();
    }
    if (brandGuides.length === 0) {
      onLoadGuides();
    }
  }, [funnelTemplates.length, brandGuides.length, onLoadTemplates, onLoadGuides]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!funnelTemplateId || !brandGuideId) {
      return;
    }
    onSubmit({
      funnelTemplateId,
      brandGuideId,
      customInstructions: customInstructions || undefined,
    });
  };

  return (
    <div className="new-run-form">
      <div className="form-header">
        <h2>Create New Run</h2>
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <div className="form-content">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="funnelTemplateSelect">Funnel Template *</label>
            <div className="select-with-preview">
              <select
                id="funnelTemplateSelect"
                value={funnelTemplateId}
                onChange={(e) => setFunnelTemplateId(e.target.value)}
                required
              >
                <option value="">Select a funnel template...</option>
                {funnelTemplates.map((template) => (
                  <option key={template.funnelTemplateId} value={template.funnelTemplateId}>
                    {template.name}
                    {template.description ? ` - ${template.description}` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-preview"
                disabled={!funnelTemplateId}
                onClick={() => funnelTemplateId && onPreviewFunnelTemplate(funnelTemplateId)}
              >
                Preview
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="brandGuideSelect">Brand Guide *</label>
            <div className="select-with-preview">
              <select
                id="brandGuideSelect"
                value={brandGuideId}
                onChange={(e) => setBrandGuideId(e.target.value)}
                required
              >
                <option value="">Select a brand guide...</option>
                {brandGuides.map((guide) => (
                  <option key={guide.brandGuideId} value={guide.brandGuideId}>
                    {guide.name}
                    {guide.description ? ` - ${guide.description}` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-preview"
                disabled={!brandGuideId}
                onClick={() => brandGuideId && onPreviewBrandGuide(brandGuideId)}
              >
                Preview
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="customInstructions">Custom Instructions (Optional)</label>
            <textarea
              id="customInstructions"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              rows={4}
              placeholder="Add any custom instructions for the workflow..."
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Create Run
            </button>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

