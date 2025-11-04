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
      setStatus('active');
      setUseJson(true);
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
      saveData.brandGuideJson = brandGuideJson;
    } else {
      saveData.content = content;
    }

    onSave(saveData);
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
                <label>Brand Guide JSON *</label>
                <BrandGuideJsonEditor value={brandGuideJson} onChange={setBrandGuideJson} />
                <small>Edit the structured brand guide data</small>
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

