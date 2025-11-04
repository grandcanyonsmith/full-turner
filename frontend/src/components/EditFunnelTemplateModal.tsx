import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { FunnelElement } from '../types';
import FunnelJsonEditor from './FunnelJsonEditor';

interface EditFunnelTemplateModalProps {
  templateId: string | null;
  templateData?: any | null;
  onSave: (data: {
    name: string;
    description?: string;
    funnelJson: FunnelElement[];
    status?: string;
  }) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function EditFunnelTemplateModal({
  templateId,
  templateData,
  onSave,
  onDelete,
  onClose,
}: EditFunnelTemplateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [funnelJson, setFunnelJson] = useState<FunnelElement[]>([]);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (templateId) {
      // First try to use templateData if provided
      if (templateData) {
        setName(templateData.name || '');
        setDescription(templateData.description || '');
        setFunnelJson(Array.isArray(templateData.funnelJson) ? templateData.funnelJson : []);
        setStatus(templateData.status || 'active');
        setLoading(false);
        return;
      }

      // Otherwise try to fetch from API
      setLoading(true);
      setError(null);
      api
        .getFunnelTemplate(templateId)
        .then((data) => {
          const template = data.funnelTemplate;
          setName(template.name || '');
          setDescription(template.description || '');
          setFunnelJson(Array.isArray(template.funnelJson) ? template.funnelJson : []);
          setStatus(template.status || 'active');
        })
        .catch((err) => {
          console.error('Error loading template:', err);
          setError(err.message || 'Failed to load funnel template');
          // If it's a 404, show a helpful message but allow editing
          if (err.message?.includes('404') || err.message?.includes('not found')) {
            setError('Template endpoint not found. You can still edit the template data.');
          }
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setName('');
      setDescription('');
      setFunnelJson([]);
      setStatus('active');
      setError(null);
    }
  }, [templateId, templateData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (funnelJson.length === 0) {
      setError('At least one funnel element is required');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name,
        description: description || undefined,
        funnelJson,
        status,
      });
      // Success - modal will be closed by parent component
    } catch (err: any) {
      console.error('Error saving template:', err);
      let errorMessage = err.message || 'Failed to save funnel template';
      
      // Check for CORS errors
      if (errorMessage.includes('CORS') || errorMessage.includes('blocked') || 
          err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
        errorMessage = 'CORS error: The API server is not configured to allow requests from this origin. Please check your API CORS settings or use a proxy.';
      }
      
      setError(errorMessage);
      setSaving(false);
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
          <h2>{templateId ? 'Edit Funnel Template' : 'Create Funnel Template'}</h2>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">
          {error && (
            <div className="error" style={{ marginBottom: '20px' }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="funnelTemplateName">Name *</label>
              <input
                type="text"
                id="funnelTemplateName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="funnelTemplateDescription">Description</label>
              <textarea
                id="funnelTemplateDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="form-group">
              <label>Funnel Elements *</label>
              <FunnelJsonEditor value={funnelJson} onChange={setFunnelJson} />
              <small>Add, edit, or remove funnel elements</small>
            </div>
            <div className="form-group">
              <label htmlFor="funnelTemplateStatus">Status</label>
              <select
                id="funnelTemplateStatus"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              {templateId && (
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ marginLeft: 'auto' }}
                  onClick={onDelete}
                  disabled={saving}
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
