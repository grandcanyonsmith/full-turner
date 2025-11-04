import { useState } from 'react';
import type { FunnelTemplate, BrandGuide } from '../types';
import { escapeHtml } from '../utils/renderer';

interface ManagementModalProps {
  funnelTemplates: FunnelTemplate[];
  brandGuides: BrandGuide[];
  onClose: () => void;
  onEditFunnelTemplate: (template: FunnelTemplate | null) => void;
  onEditBrandGuide: (guide: BrandGuide | null) => void;
  onRefresh: () => Promise<void>;
}

export default function ManagementModal({
  funnelTemplates,
  brandGuides,
  onClose,
  onEditFunnelTemplate,
  onEditBrandGuide,
  onRefresh,
}: ManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'funnel-templates' | 'brand-guides'>('funnel-templates');

  return (
    <div className="management-modal" style={{ display: 'flex' }}>
      <div className="modal-content large-modal">
        <div className="modal-header">
          <h2>Manage Templates & Guides</h2>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">
          <div className="management-tabs">
            <button
              className={`tab-btn ${activeTab === 'funnel-templates' ? 'active' : ''}`}
              onClick={() => setActiveTab('funnel-templates')}
            >
              Funnel Templates
            </button>
            <button
              className={`tab-btn ${activeTab === 'brand-guides' ? 'active' : ''}`}
              onClick={() => setActiveTab('brand-guides')}
            >
              Brand Guides
            </button>
          </div>

          {activeTab === 'funnel-templates' && (
            <div className="management-content" style={{ display: 'block' }}>
              <div className="management-header">
                <h3>Funnel Templates</h3>
                <button
                  className="btn btn-primary"
                  onClick={() => onEditFunnelTemplate(null)}
                >
                  Create New Template
                </button>
              </div>
              <div className="items-list">
                {funnelTemplates.length === 0 ? (
                  <p>No funnel templates found. Create one to get started.</p>
                ) : (
                  funnelTemplates.map((template) => (
                    <div key={template.funnelTemplateId} className="item-card">
                      <div className="item-header">
                        <h4>{escapeHtml(template.name)}</h4>
                        <span className={`status-badge status-${template.status || 'active'}`}>
                          {(template.status || 'active').charAt(0).toUpperCase() +
                            (template.status || 'active').slice(1)}
                        </span>
                      </div>
                      <p className="item-description">
                        {escapeHtml(template.description || 'No description')}
                      </p>
                      <div className="item-meta">
                        <span>ID: {escapeHtml(template.funnelTemplateId)}</span>
                        <span>Elements: {template.funnelJson?.length || 0}</span>
                      </div>
                      <div className="item-actions">
                        <button
                          className="btn btn-primary btn-small"
                          onClick={() => onEditFunnelTemplate(template)}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'brand-guides' && (
            <div className="management-content" style={{ display: 'block' }}>
              <div className="management-header">
                <h3>Brand Guides</h3>
                <button
                  className="btn btn-primary"
                  onClick={() => onEditBrandGuide(null)}
                >
                  Create New Guide
                </button>
              </div>
              <div className="items-list">
                {brandGuides.length === 0 ? (
                  <p>No brand guides found. Create one to get started.</p>
                ) : (
                  brandGuides.map((guide) => {
                    const contentPreview = guide.content
                      ? guide.content.substring(0, 100) + '...'
                      : 'No content';
                    return (
                      <div key={guide.brandGuideId} className="item-card">
                        <div className="item-header">
                          <h4>{escapeHtml(guide.name)}</h4>
                          <span className={`status-badge status-${guide.status || 'active'}`}>
                            {(guide.status || 'active').charAt(0).toUpperCase() +
                              (guide.status || 'active').slice(1)}
                          </span>
                        </div>
                        <p className="item-description">
                          {escapeHtml(guide.description || 'No description')}
                        </p>
                        <div className="item-meta">
                          <span>ID: {escapeHtml(guide.brandGuideId)}</span>
                          <span>Content length: {guide.content?.length || 0} chars</span>
                        </div>
                        <div className="item-preview">{escapeHtml(contentPreview)}</div>
                        <div className="item-actions">
                        <button
                          className="btn btn-primary btn-small"
                          onClick={() => onEditBrandGuide(guide)}
                        >
                          Edit
                        </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

