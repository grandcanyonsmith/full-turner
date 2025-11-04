import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import BrandGuideJsonEditor from './BrandGuideJsonEditor';
import type { BrandGuideJson } from '../types';

interface EditBrandGuideModalProps {
  guideId: string | null;
  guideData?: any | null;
  onSave: (data: {
    name: string;
    description?: string;
    content?: string;
    brandGuideJson?: BrandGuideJson;
    status?: string;
  }) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function EditBrandGuideModal({
  guideId,
  guideData,
  onSave,
  onDelete,
  onClose,
}: EditBrandGuideModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [brandGuideJson, setBrandGuideJson] = useState<BrandGuideJson>({});
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [loading, setLoading] = useState(false);
  const [useJson, setUseJson] = useState(true);
  const [jsonInputMode, setJsonInputMode] = useState<'structured' | 'raw'>('structured');
  const [rawJsonText, setRawJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (guideId) {
      // First try to use guideData if provided
      if (guideData) {
        setName(guideData.name || '');
        setDescription(guideData.description || '');
        setContent(guideData.content || '');
        setBrandGuideJson(guideData.brandGuideJson || {});
        setStatus(guideData.status || 'active');
        setUseJson(!!guideData.brandGuideJson || Object.keys(guideData.brandGuideJson || {}).length > 0);
        setRawJsonText(guideData.brandGuideJson ? JSON.stringify(guideData.brandGuideJson, null, 2) : '');
        setJsonError(null);
        setLoading(false);
        return;
      }

      // Otherwise try to fetch from API
      setLoading(true);
      api
        .getBrandGuide(guideId)
        .then((data) => {
          const guide = data.brandGuide;
          setName(guide.name || '');
          setDescription(guide.description || '');
          setContent(guide.content || '');
          setBrandGuideJson(guide.brandGuideJson || {});
          setStatus(guide.status || 'active');
          setUseJson(!!guide.brandGuideJson || Object.keys(guide.brandGuideJson || {}).length > 0);
          setRawJsonText(guide.brandGuideJson ? JSON.stringify(guide.brandGuideJson, null, 2) : '');
          setJsonError(null);
        })
        .catch((err) => {
          console.error('Error loading brand guide:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setName('');
      setDescription('');
      setContent('');
      setBrandGuideJson({});
      setRawJsonText('');
      setJsonError(null);
      setStatus('active');
      setUseJson(true);
      setJsonInputMode('structured');
    }
  }, [guideId, guideData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const saveData: {
      name: string;
      description?: string;
      content?: string;
      brandGuideJson?: BrandGuideJson;
      status?: string;
    } = {
      name,
      description: description || undefined,
      status,
    };

    if (useJson) {
      // If in raw JSON mode, parse it first
      if (jsonInputMode === 'raw') {
        try {
          const parsed = JSON.parse(rawJsonText);
          saveData.brandGuideJson = parsed;
        } catch (error: any) {
          setJsonError(error.message || 'Invalid JSON');
          return;
        }
      } else {
        saveData.brandGuideJson = brandGuideJson;
      }
    } else {
      saveData.content = content;
    }

    onSave(saveData);
  };

  const handleRawJsonChange = (text: string) => {
    setRawJsonText(text);
    setJsonError(null);
    // Try to parse and update structured view in real-time
    try {
      const parsed = JSON.parse(text);
      setBrandGuideJson(parsed);
    } catch {
      // Invalid JSON, but don't show error until save
    }
  };

  const handlePasteJson = () => {
    // Switch to raw mode and focus the textarea
    setJsonInputMode('raw');
    setRawJsonText(JSON.stringify(brandGuideJson, null, 2));
  };

  const handleLoadFromRaw = () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      setBrandGuideJson(parsed);
      setJsonInputMode('structured');
      setJsonError(null);
    } catch (error: any) {
      setJsonError(error.message || 'Invalid JSON. Please check your syntax.');
    }
  };

  if (loading) {
    return (
      <div className="edit-modal" style={{ display: 'flex' }}>
        <div className="modal-content large-modal">
          <div className="modal-body">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-modal" style={{ display: 'flex' }}>
      <div className="modal-content large-modal">
        <div className="modal-header">
          <h2>{guideId ? 'Edit Brand Guide' : 'Create Brand Guide'}</h2>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="brandGuideName">Name *</label>
              <input
                type="text"
                id="brandGuideName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="brandGuideDescription">Description</label>
              <textarea
                id="brandGuideDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="radio"
                  checked={useJson}
                  onChange={() => setUseJson(true)}
                  style={{ marginRight: '8px' }}
                />
                Use JSON Structure (Recommended)
              </label>
              <label>
                <input
                  type="radio"
                  checked={!useJson}
                  onChange={() => setUseJson(false)}
                  style={{ marginRight: '8px', marginLeft: '16px' }}
                />
                Use Text Content
              </label>
            </div>
            {useJson ? (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ margin: 0 }}>Brand Guide JSON *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {jsonInputMode === 'structured' ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={handlePasteJson}
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                      >
                        Paste JSON
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary btn-small"
                        onClick={handleLoadFromRaw}
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                      >
                        Load into Editor
                      </button>
                    )}
                  </div>
                </div>
                {jsonInputMode === 'structured' ? (
                  <>
                    <BrandGuideJsonEditor value={brandGuideJson} onChange={setBrandGuideJson} />
                    <small>Edit the structured brand guide data, or click "Paste JSON" to paste full JSON</small>
                  </>
                ) : (
                  <>
                    <textarea
                      value={rawJsonText}
                      onChange={(e) => handleRawJsonChange(e.target.value)}
                      rows={25}
                      style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '12px',
                        width: '100%',
                        padding: '8px',
                        border: jsonError ? '2px solid #dc3545' : '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                      placeholder="Paste your full JSON here..."
                    />
                    {jsonError && (
                      <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                        Error: {jsonError}
                      </div>
                    )}
                    <small>Paste your complete JSON structure here. Click "Load into Editor" to populate the structured editor, or just save to use the raw JSON.</small>
                  </>
                )}
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="brandGuideContent">Content *</label>
                <textarea
                  id="brandGuideContent"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={20}
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                  required
                />
                <small>Enter the brand guide content (text format)</small>
              </div>
            )}
            <div className="form-group">
              <label htmlFor="brandGuideStatus">Status</label>
              <select
                id="brandGuideStatus"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Save
              </button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              {guideId && (
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ marginLeft: 'auto' }}
                  onClick={onDelete}
                >
                  Delete
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

