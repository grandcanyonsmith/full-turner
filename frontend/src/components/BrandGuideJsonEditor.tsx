import { useState } from 'react';
import type { BrandGuideJson } from '../types';

interface BrandGuideJsonEditorProps {
  value: BrandGuideJson;
  onChange: (value: BrandGuideJson) => void;
}

export default function BrandGuideJsonEditor({ value, onChange }: BrandGuideJsonEditorProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['story', 'product']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const updateArrayItem = (path: string[], index: number, field: string, fieldValue: any) => {
    const updated = { ...value };
    let current: any = updated;
    
    for (const key of path) {
      if (!current[key]) {
        current[key] = [];
      }
      current = current[key];
    }
    
    if (!current[index]) {
      current[index] = {};
    }
    current[index][field] = fieldValue;
    
    onChange(updated);
  };

  const addArrayItem = (path: string[], defaultItem: any) => {
    const updated = { ...value };
    let current: any = updated;
    
    for (const key of path) {
      if (!current[key]) {
        current[key] = [];
      }
      current = current[key];
    }
    
    current.push(defaultItem);
    onChange(updated);
  };

  const removeArrayItem = (path: string[], index: number) => {
    const updated = { ...value };
    let current: any = updated;
    
    for (const key of path) {
      current = current[key];
    }
    
    current.splice(index, 1);
    onChange(updated);
  };

  const updateNestedValue = (path: string[], field: string, fieldValue: any) => {
    const updated = { ...value };
    let current: any = updated;
    
    for (const key of path) {
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[field] = fieldValue;
    onChange(updated);
  };

  const renderSection = (title: string, sectionKey: string, content: React.ReactNode) => {
    const isExpanded = expandedSections.has(sectionKey);
    return (
      <div className="section-item" style={{ marginBottom: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
        <div 
          className="section-header" 
          onClick={() => toggleSection(sectionKey)}
          style={{ padding: '12px', cursor: 'pointer', backgroundColor: '#f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <h3 style={{ margin: 0 }}>{title}</h3>
          <span>{isExpanded ? '▼' : '▶'}</span>
        </div>
        {isExpanded && (
          <div className="section-content" style={{ padding: '16px' }}>
            {content}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="brand-guide-json-editor" style={{ maxHeight: '600px', overflowY: 'auto' }}>
      {renderSection('Story', 'story', (
        <>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={value.story?.title || ''}
              onChange={(e) => updateNestedValue(['story'], 'title', e.target.value)}
              placeholder="My Story (Hero's Journey)"
            />
          </div>
          <div className="form-group">
            <label>Content</label>
            <textarea
              value={value.story?.content || ''}
              onChange={(e) => updateNestedValue(['story'], 'content', e.target.value)}
              rows={6}
              placeholder="Enter your story..."
            />
          </div>
        </>
      ))}

      {renderSection('Product', 'product', (
        <>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={value.product?.name || ''}
              onChange={(e) => updateNestedValue(['product'], 'name', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Price</label>
            <input
              type="text"
              value={value.product?.price || ''}
              onChange={(e) => updateNestedValue(['product'], 'price', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Short Description</label>
            <textarea
              value={value.product?.shortDescription || ''}
              onChange={(e) => updateNestedValue(['product'], 'shortDescription', e.target.value)}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Investment</label>
            <input
              type="text"
              value={value.product?.investment || ''}
              onChange={(e) => updateNestedValue(['product'], 'investment', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Unique Mechanism - Tagline</label>
            <input
              type="text"
              value={value.product?.uniqueMechanism?.tagline || ''}
              onChange={(e) => updateNestedValue(['product', 'uniqueMechanism'], 'tagline', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Unique Mechanism - Description</label>
            <textarea
              value={value.product?.uniqueMechanism?.description || ''}
              onChange={(e) => updateNestedValue(['product', 'uniqueMechanism'], 'description', e.target.value)}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Delivery - Format</label>
            <textarea
              value={value.product?.delivery?.format || ''}
              onChange={(e) => updateNestedValue(['product', 'delivery'], 'format', e.target.value)}
              rows={2}
            />
          </div>
          <div className="form-group">
            <label>Delivery - Advisory</label>
            <textarea
              value={value.product?.delivery?.advisory || ''}
              onChange={(e) => updateNestedValue(['product', 'delivery'], 'advisory', e.target.value)}
              rows={2}
            />
          </div>
          <div className="form-group">
            <label>Delivery - Community</label>
            <textarea
              value={value.product?.delivery?.community || ''}
              onChange={(e) => updateNestedValue(['product', 'delivery'], 'community', e.target.value)}
              rows={2}
            />
          </div>
          <div className="form-group">
            <label>Delivery - Access</label>
            <textarea
              value={value.product?.delivery?.access || ''}
              onChange={(e) => updateNestedValue(['product', 'delivery'], 'access', e.target.value)}
              rows={2}
            />
          </div>
          <div className="form-group">
            <label>Features</label>
            {(value.product?.features || []).map((feature, index) => (
              <div key={index} style={{ marginBottom: '12px', padding: '12px', border: '1px solid #eee', borderRadius: '4px' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      value={feature.title || ''}
                      onChange={(e) => updateArrayItem(['product', 'features'], index, 'title', e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger btn-small"
                    onClick={() => removeArrayItem(['product', 'features'], index)}
                  >
                    Remove
                  </button>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={feature.description || ''}
                    onChange={(e) => updateArrayItem(['product', 'features'], index, 'description', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={() => addArrayItem(['product', 'features'], { title: '', description: '' })}
            >
              + Add Feature
            </button>
          </div>
        </>
      ))}

      {renderSection('Pains', 'pains', (
        <>
          {(value.pains || []).map((pain, index) => (
            <div key={index} style={{ marginBottom: '16px', padding: '12px', border: '1px solid #eee', borderRadius: '4px' }}>
              <div className="form-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0 }}>Pain {index + 1}</h4>
                <button
                  type="button"
                  className="btn btn-danger btn-small"
                  onClick={() => removeArrayItem(['pains'], index)}
                >
                  Remove
                </button>
              </div>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={pain.title || ''}
                  onChange={(e) => updateArrayItem(['pains'], index, 'title', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Pain Score</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={pain.painScore || 0}
                  onChange={(e) => updateArrayItem(['pains'], index, 'painScore', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={pain.description || ''}
                  onChange={(e) => updateArrayItem(['pains'], index, 'description', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label>Quotes (one per line)</label>
                <textarea
                  value={(pain.quotes || []).join('\n')}
                  onChange={(e) => updateArrayItem(['pains'], index, 'quotes', e.target.value.split('\n').filter(q => q.trim()))}
                  rows={3}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-primary btn-small"
            onClick={() => addArrayItem(['pains'], { title: '', painScore: 0, description: '', quotes: [] })}
          >
            + Add Pain
          </button>
        </>
      ))}

      {renderSection('Dreams', 'dreams', (
        <>
          {(value.dreams || []).map((dream, index) => (
            <div key={index} style={{ marginBottom: '16px', padding: '12px', border: '1px solid #eee', borderRadius: '4px' }}>
              <div className="form-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0 }}>Dream {index + 1}</h4>
                <button
                  type="button"
                  className="btn btn-danger btn-small"
                  onClick={() => removeArrayItem(['dreams'], index)}
                >
                  Remove
                </button>
              </div>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={dream.title || ''}
                  onChange={(e) => updateArrayItem(['dreams'], index, 'title', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Vision Snapshot</label>
                <textarea
                  value={dream.visionSnapshot || ''}
                  onChange={(e) => updateArrayItem(['dreams'], index, 'visionSnapshot', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label>Tangible Milestones</label>
                <textarea
                  value={dream.tangibleMilestones || ''}
                  onChange={(e) => updateArrayItem(['dreams'], index, 'tangibleMilestones', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label>Emotional Win</label>
                <textarea
                  value={dream.emotionalWin || ''}
                  onChange={(e) => updateArrayItem(['dreams'], index, 'emotionalWin', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label>Quotes (one per line)</label>
                <textarea
                  value={(dream.quotes || []).join('\n')}
                  onChange={(e) => updateArrayItem(['dreams'], index, 'quotes', e.target.value.split('\n').filter(q => q.trim()))}
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label>Daily Friction Removed</label>
                <textarea
                  value={dream.dailyFrictionRemoved || ''}
                  onChange={(e) => updateArrayItem(['dreams'], index, 'dailyFrictionRemoved', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label>Deeper Purpose</label>
                <textarea
                  value={dream.deeperPurpose || ''}
                  onChange={(e) => updateArrayItem(['dreams'], index, 'deeperPurpose', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-primary btn-small"
            onClick={() => addArrayItem(['dreams'], { title: '', visionSnapshot: '', tangibleMilestones: '', emotionalWin: '', quotes: [] })}
          >
            + Add Dream
          </button>
        </>
      ))}

      {renderSection('Authority', 'authority', (
        <>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={value.authority?.title || ''}
              onChange={(e) => updateNestedValue(['authority'], 'title', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Content</label>
            <textarea
              value={value.authority?.content || ''}
              onChange={(e) => updateNestedValue(['authority'], 'content', e.target.value)}
              rows={6}
            />
          </div>
          <div className="form-group">
            <label>Highlights (one per line)</label>
            <textarea
              value={(value.authority?.highlights || []).join('\n')}
              onChange={(e) => updateNestedValue(['authority'], 'highlights', e.target.value.split('\n').filter(h => h.trim()))}
              rows={4}
            />
          </div>
        </>
      ))}

      {renderSection('Brand Style Guide', 'brandStyleGuide', (
        <>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={value.brandStyleGuide?.title || ''}
              onChange={(e) => updateNestedValue(['brandStyleGuide'], 'title', e.target.value)}
            />
          </div>
          
          <h4>Colors</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Primary - Name</label>
              <input
                type="text"
                value={value.brandStyleGuide?.colors?.primary?.name || ''}
                onChange={(e) => updateNestedValue(['brandStyleGuide', 'colors', 'primary'], 'name', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Primary - Hex</label>
              <input
                type="text"
                value={value.brandStyleGuide?.colors?.primary?.hex || ''}
                onChange={(e) => updateNestedValue(['brandStyleGuide', 'colors', 'primary'], 'hex', e.target.value)}
                placeholder="#5A2D82"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Primary - Usage</label>
            <textarea
              value={value.brandStyleGuide?.colors?.primary?.usage || ''}
              onChange={(e) => updateNestedValue(['brandStyleGuide', 'colors', 'primary'], 'usage', e.target.value)}
              rows={2}
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Secondary - Name</label>
              <input
                type="text"
                value={value.brandStyleGuide?.colors?.secondary?.name || ''}
                onChange={(e) => updateNestedValue(['brandStyleGuide', 'colors', 'secondary'], 'name', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Secondary - Hex</label>
              <input
                type="text"
                value={value.brandStyleGuide?.colors?.secondary?.hex || ''}
                onChange={(e) => updateNestedValue(['brandStyleGuide', 'colors', 'secondary'], 'hex', e.target.value)}
                placeholder="#C59A2A"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Secondary - Usage</label>
            <textarea
              value={value.brandStyleGuide?.colors?.secondary?.usage || ''}
              onChange={(e) => updateNestedValue(['brandStyleGuide', 'colors', 'secondary'], 'usage', e.target.value)}
              rows={2}
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Accent - Name</label>
              <input
                type="text"
                value={value.brandStyleGuide?.colors?.accent?.name || ''}
                onChange={(e) => updateNestedValue(['brandStyleGuide', 'colors', 'accent'], 'name', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Accent - Hex</label>
              <input
                type="text"
                value={value.brandStyleGuide?.colors?.accent?.hex || ''}
                onChange={(e) => updateNestedValue(['brandStyleGuide', 'colors', 'accent'], 'hex', e.target.value)}
                placeholder="#222222"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Accent - Usage</label>
            <textarea
              value={value.brandStyleGuide?.colors?.accent?.usage || ''}
              onChange={(e) => updateNestedValue(['brandStyleGuide', 'colors', 'accent'], 'usage', e.target.value)}
              rows={2}
            />
          </div>

          <h4>Typography</h4>
          <div className="form-group">
            <label>Headings - Font</label>
            <input
              type="text"
              value={value.brandStyleGuide?.typography?.headings?.font || ''}
              onChange={(e) => updateNestedValue(['brandStyleGuide', 'typography', 'headings'], 'font', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Headings - Description</label>
            <textarea
              value={value.brandStyleGuide?.typography?.headings?.description || ''}
              onChange={(e) => updateNestedValue(['brandStyleGuide', 'typography', 'headings'], 'description', e.target.value)}
              rows={2}
            />
          </div>
          <div className="form-group">
            <label>Body - Font</label>
            <input
              type="text"
              value={value.brandStyleGuide?.typography?.body?.font || ''}
              onChange={(e) => updateNestedValue(['brandStyleGuide', 'typography', 'body'], 'font', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Body - Description</label>
            <textarea
              value={value.brandStyleGuide?.typography?.body?.description || ''}
              onChange={(e) => updateNestedValue(['brandStyleGuide', 'typography', 'body'], 'description', e.target.value)}
              rows={2}
            />
          </div>

          <h4>Voice & Tone</h4>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={value.brandStyleGuide?.voiceAndTone?.description || ''}
              onChange={(e) => updateNestedValue(['brandStyleGuide', 'voiceAndTone'], 'description', e.target.value)}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Attributes (one per line)</label>
            <textarea
              value={(value.brandStyleGuide?.voiceAndTone?.attributes || []).join('\n')}
              onChange={(e) => updateNestedValue(['brandStyleGuide', 'voiceAndTone'], 'attributes', e.target.value.split('\n').filter(a => a.trim()))}
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>Avoidance (one per line)</label>
            <textarea
              value={(value.brandStyleGuide?.voiceAndTone?.avoidance || []).join('\n')}
              onChange={(e) => updateNestedValue(['brandStyleGuide', 'voiceAndTone'], 'avoidance', e.target.value.split('\n').filter(a => a.trim()))}
              rows={4}
            />
          </div>

          <h4>Visual Style</h4>
          <div className="form-group">
            <label>Approach</label>
            <textarea
              value={value.brandStyleGuide?.visualStyle?.approach || ''}
              onChange={(e) => updateNestedValue(['brandStyleGuide', 'visualStyle'], 'approach', e.target.value)}
              rows={2}
            />
          </div>
          <div className="form-group">
            <label>Elements (one per line)</label>
            <textarea
              value={(value.brandStyleGuide?.visualStyle?.elements || []).join('\n')}
              onChange={(e) => updateNestedValue(['brandStyleGuide', 'visualStyle'], 'elements', e.target.value.split('\n').filter(e => e.trim()))}
              rows={4}
            />
          </div>
        </>
      ))}

      {renderSection('Competitors', 'competitors', (
        <>
          <h4>Direct Competitors</h4>
          {(value.competitors?.directCompetitors || []).map((comp, index) => (
            <div key={index} style={{ marginBottom: '16px', padding: '12px', border: '1px solid #eee', borderRadius: '4px' }}>
              <div className="form-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h5 style={{ margin: 0 }}>Competitor {index + 1}</h5>
                <button
                  type="button"
                  className="btn btn-danger btn-small"
                  onClick={() => {
                    const updated = { ...value };
                    if (!updated.competitors) updated.competitors = {};
                    if (!updated.competitors.directCompetitors) updated.competitors.directCompetitors = [];
                    updated.competitors.directCompetitors.splice(index, 1);
                    onChange(updated);
                  }}
                >
                  Remove
                </button>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={comp.name || ''}
                    onChange={(e) => {
                      const updated = { ...value };
                      if (!updated.competitors) updated.competitors = {};
                      if (!updated.competitors.directCompetitors) updated.competitors.directCompetitors = [];
                      if (!updated.competitors.directCompetitors[index]) updated.competitors.directCompetitors[index] = {};
                      updated.competitors.directCompetitors[index].name = e.target.value;
                      onChange(updated);
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Website</label>
                  <input
                    type="text"
                    value={comp.website || ''}
                    onChange={(e) => {
                      const updated = { ...value };
                      if (!updated.competitors) updated.competitors = {};
                      if (!updated.competitors.directCompetitors) updated.competitors.directCompetitors = [];
                      if (!updated.competitors.directCompetitors[index]) updated.competitors.directCompetitors[index] = {};
                      updated.competitors.directCompetitors[index].website = e.target.value;
                      onChange(updated);
                    }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Offering</label>
                <textarea
                  value={comp.offering || ''}
                  onChange={(e) => {
                    const updated = { ...value };
                    if (!updated.competitors) updated.competitors = {};
                    if (!updated.competitors.directCompetitors) updated.competitors.directCompetitors = [];
                    if (!updated.competitors.directCompetitors[index]) updated.competitors.directCompetitors[index] = {};
                    updated.competitors.directCompetitors[index].offering = e.target.value;
                    onChange(updated);
                  }}
                  rows={2}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-primary btn-small"
            onClick={() => {
              const updated = { ...value };
              if (!updated.competitors) updated.competitors = {};
              if (!updated.competitors.directCompetitors) updated.competitors.directCompetitors = [];
              updated.competitors.directCompetitors.push({ name: '', website: '', offering: '' });
              onChange(updated);
            }}
          >
            + Add Direct Competitor
          </button>
        </>
      ))}

      {renderSection('Demographics', 'demographics', (
        <>
          <div className="form-group">
            <label>Age</label>
            <input
              type="text"
              value={value.demographics?.age || ''}
              onChange={(e) => updateNestedValue(['demographics'], 'age', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Gender</label>
            <input
              type="text"
              value={value.demographics?.gender || ''}
              onChange={(e) => updateNestedValue(['demographics'], 'gender', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              value={value.demographics?.location || ''}
              onChange={(e) => updateNestedValue(['demographics'], 'location', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Occupation</label>
            <input
              type="text"
              value={value.demographics?.occupation || ''}
              onChange={(e) => updateNestedValue(['demographics'], 'occupation', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Income</label>
            <input
              type="text"
              value={value.demographics?.income || ''}
              onChange={(e) => updateNestedValue(['demographics'], 'income', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Education</label>
            <input
              type="text"
              value={value.demographics?.education || ''}
              onChange={(e) => updateNestedValue(['demographics'], 'education', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Family Status</label>
            <input
              type="text"
              value={value.demographics?.familyStatus || ''}
              onChange={(e) => updateNestedValue(['demographics'], 'familyStatus', e.target.value)}
            />
          </div>
        </>
      ))}

      {renderSection('Psychographics', 'psychographics', (
        <>
          <div className="form-group">
            <label>Values</label>
            <textarea
              value={value.psychographics?.values || ''}
              onChange={(e) => updateNestedValue(['psychographics'], 'values', e.target.value)}
              rows={2}
            />
          </div>
          <div className="form-group">
            <label>Lifestyle</label>
            <textarea
              value={value.psychographics?.lifestyle || ''}
              onChange={(e) => updateNestedValue(['psychographics'], 'lifestyle', e.target.value)}
              rows={2}
            />
          </div>
          <div className="form-group">
            <label>Personality</label>
            <textarea
              value={value.psychographics?.personality || ''}
              onChange={(e) => updateNestedValue(['psychographics'], 'personality', e.target.value)}
              rows={2}
            />
          </div>
          <div className="form-group">
            <label>Attitudes Toward Solutions</label>
            <textarea
              value={value.psychographics?.attitudesTowardSolutions || ''}
              onChange={(e) => updateNestedValue(['psychographics'], 'attitudesTowardSolutions', e.target.value)}
              rows={2}
            />
          </div>
        </>
      ))}

      {renderSection('Values', 'values', (
        <>
          <div className="form-group">
            <label>Core Values (one per line)</label>
            <textarea
              value={(value.values?.coreValues || []).join('\n')}
              onChange={(e) => updateNestedValue(['values'], 'coreValues', e.target.value.split('\n').filter(v => v.trim()))}
              rows={6}
            />
          </div>
          <div className="form-group">
            <label>Beliefs</label>
            <textarea
              value={value.values?.beliefs || ''}
              onChange={(e) => updateNestedValue(['values'], 'beliefs', e.target.value)}
              rows={4}
            />
          </div>
        </>
      ))}

      {renderSection('Transformation', 'transformation', (
        <>
          <div className="form-group">
            <label>Before State</label>
            <textarea
              value={value.transformation?.beforeState || ''}
              onChange={(e) => updateNestedValue(['transformation'], 'beforeState', e.target.value)}
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>After State</label>
            <textarea
              value={value.transformation?.afterState || ''}
              onChange={(e) => updateNestedValue(['transformation'], 'afterState', e.target.value)}
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>Emotional Shift</label>
            <textarea
              value={value.transformation?.emotionalShift || ''}
              onChange={(e) => updateNestedValue(['transformation'], 'emotionalShift', e.target.value)}
              rows={2}
            />
          </div>
          <div className="form-group">
            <label>Impact</label>
            <textarea
              value={value.transformation?.impact || ''}
              onChange={(e) => updateNestedValue(['transformation'], 'impact', e.target.value)}
              rows={3}
            />
          </div>
        </>
      ))}

      {renderSection('Media Consumption', 'mediaConsumption', (
        <>
          <div className="form-group">
            <label>Social Platforms (one per line)</label>
            <textarea
              value={(value.mediaConsumption?.socialPlatforms || []).join('\n')}
              onChange={(e) => updateNestedValue(['mediaConsumption'], 'socialPlatforms', e.target.value.split('\n').filter(p => p.trim()))}
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>Podcasts (one per line)</label>
            <textarea
              value={(value.mediaConsumption?.podcasts || []).join('\n')}
              onChange={(e) => updateNestedValue(['mediaConsumption'], 'podcasts', e.target.value.split('\n').filter(p => p.trim()))}
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>Blogs (one per line)</label>
            <textarea
              value={(value.mediaConsumption?.blogs || []).join('\n')}
              onChange={(e) => updateNestedValue(['mediaConsumption'], 'blogs', e.target.value.split('\n').filter(b => b.trim()))}
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>Forums (one per line)</label>
            <textarea
              value={(value.mediaConsumption?.forums || []).join('\n')}
              onChange={(e) => updateNestedValue(['mediaConsumption'], 'forums', e.target.value.split('\n').filter(f => f.trim()))}
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>Books (one per line)</label>
            <textarea
              value={(value.mediaConsumption?.books || []).join('\n')}
              onChange={(e) => updateNestedValue(['mediaConsumption'], 'books', e.target.value.split('\n').filter(b => b.trim()))}
              rows={4}
            />
          </div>
        </>
      ))}

      {renderSection('Objections', 'objections', (
        <>
          {(value.objections || []).map((obj, index) => (
            <div key={index} style={{ marginBottom: '16px', padding: '12px', border: '1px solid #eee', borderRadius: '4px' }}>
              <div className="form-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h5 style={{ margin: 0 }}>Objection {index + 1}</h5>
                <button
                  type="button"
                  className="btn btn-danger btn-small"
                  onClick={() => removeArrayItem(['objections'], index)}
                >
                  Remove
                </button>
              </div>
              <div className="form-group">
                <label>Objection</label>
                <textarea
                  value={obj.objection || ''}
                  onChange={(e) => updateArrayItem(['objections'], index, 'objection', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label>Rebuttal</label>
                <textarea
                  value={obj.rebuttal || ''}
                  onChange={(e) => updateArrayItem(['objections'], index, 'rebuttal', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-primary btn-small"
            onClick={() => addArrayItem(['objections'], { objection: '', rebuttal: '' })}
          >
            + Add Objection
          </button>
        </>
      ))}

      {renderSection('Competitive Advantage', 'competitiveAdvantage', (
        <>
          <div className="form-group">
            <label>Unique Value Proposition (one per line)</label>
            <textarea
              value={(value.competitiveAdvantage?.uniqueValueProposition || []).join('\n')}
              onChange={(e) => updateNestedValue(['competitiveAdvantage'], 'uniqueValueProposition', e.target.value.split('\n').filter(u => u.trim()))}
              rows={6}
            />
          </div>
          <div className="form-group">
            <label>Fun Elements (one per line)</label>
            <textarea
              value={(value.competitiveAdvantage?.funElements || []).join('\n')}
              onChange={(e) => updateNestedValue(['competitiveAdvantage'], 'funElements', e.target.value.split('\n').filter(f => f.trim()))}
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>Innovation</label>
            <textarea
              value={value.competitiveAdvantage?.innovation || ''}
              onChange={(e) => updateNestedValue(['competitiveAdvantage'], 'innovation', e.target.value)}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Comparison</label>
            <textarea
              value={value.competitiveAdvantage?.comparison || ''}
              onChange={(e) => updateNestedValue(['competitiveAdvantage'], 'comparison', e.target.value)}
              rows={3}
            />
          </div>
        </>
      ))}

      {renderSection('Communication Style', 'communicationStyle', (
        <>
          <div className="form-group">
            <label>Tone</label>
            <textarea
              value={value.communicationStyle?.tone || ''}
              onChange={(e) => updateNestedValue(['communicationStyle'], 'tone', e.target.value)}
              rows={2}
            />
          </div>
          <div className="form-group">
            <label>Language Style</label>
            <textarea
              value={value.communicationStyle?.languageStyle || ''}
              onChange={(e) => updateNestedValue(['communicationStyle'], 'languageStyle', e.target.value)}
              rows={2}
            />
          </div>
          <div className="form-group">
            <label>Emotional Vibe</label>
            <textarea
              value={value.communicationStyle?.emotionalVibe || ''}
              onChange={(e) => updateNestedValue(['communicationStyle'], 'emotionalVibe', e.target.value)}
              rows={2}
            />
          </div>
          <div className="form-group">
            <label>Avoid (one per line)</label>
            <textarea
              value={(value.communicationStyle?.avoid || []).join('\n')}
              onChange={(e) => updateNestedValue(['communicationStyle'], 'avoid', e.target.value.split('\n').filter(a => a.trim()))}
              rows={4}
            />
          </div>
        </>
      ))}

      {renderSection('Meta', 'meta', (
        <>
          <div className="form-group">
            <label>Brand Name</label>
            <input
              type="text"
              value={value.meta?.brandName || ''}
              onChange={(e) => updateNestedValue(['meta'], 'brandName', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Template Version</label>
            <input
              type="text"
              value={value.meta?.templateVersion || ''}
              onChange={(e) => updateNestedValue(['meta'], 'templateVersion', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Last Updated</label>
            <input
              type="text"
              value={value.meta?.lastUpdated || ''}
              onChange={(e) => updateNestedValue(['meta'], 'lastUpdated', e.target.value)}
            />
          </div>
        </>
      ))}
    </div>
  );
}

