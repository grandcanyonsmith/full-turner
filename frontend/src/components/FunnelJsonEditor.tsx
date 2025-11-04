import { useState } from 'react';
import type { FunnelElement } from '../types';

interface FunnelJsonEditorProps {
  value: FunnelElement[];
  onChange: (value: FunnelElement[]) => void;
}

export default function FunnelJsonEditor({ value, onChange }: FunnelJsonEditorProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const addElement = () => {
    const newElement: FunnelElement = {
      element_id: '',
      type: 'character',
      text: '',
    };
    onChange([...value, newElement]);
    setExpandedIndex(value.length);
  };

  const removeElement = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  const updateElement = (index: number, field: keyof FunnelElement, fieldValue: any) => {
    const updated = [...value];
    updated[index] = {
      ...updated[index],
      [field]: fieldValue,
    };
    onChange(updated);
  };

  const toggleExpanded = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="funnel-json-editor">
      <div className="editor-header">
        <button type="button" className="btn btn-primary btn-small" onClick={addElement}>
          + Add Element
        </button>
        <span className="element-count">{value.length} element{value.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="elements-list">
        {value.length === 0 ? (
          <div className="empty-state">
            <p>No elements yet. Click "Add Element" to get started.</p>
          </div>
        ) : (
          value.map((element, index) => (
            <div key={index} className="element-item">
              <div className="element-header" onClick={() => toggleExpanded(index)}>
                <div className="element-summary">
                  <span className="element-id">{element.element_id || '(no ID)'}</span>
                  <span className="element-type">{element.type || 'character'}</span>
                  {element.text && (
                    <span className="element-preview">{element.text.substring(0, 30)}...</span>
                  )}
                  {element.url && (
                    <span className="element-preview">{element.url.substring(0, 30)}...</span>
                  )}
                </div>
                <div className="element-actions">
                  <button
                    type="button"
                    className="btn btn-danger btn-small"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeElement(index);
                    }}
                  >
                    Remove
                  </button>
                  <span className="toggle-icon">{expandedIndex === index ? '▼' : '▶'}</span>
                </div>
              </div>

              {expandedIndex === index && (
                <div className="element-fields">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Element ID *</label>
                      <input
                        type="text"
                        value={element.element_id || ''}
                        onChange={(e) => updateElement(index, 'element_id', e.target.value)}
                        placeholder="e.g., opt_brand_name"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Type *</label>
                      <select
                        value={element.type || 'character'}
                        onChange={(e) => updateElement(index, 'type', e.target.value)}
                        required
                      >
                        <option value="character">Character</option>
                        <option value="image">Image</option>
                        <option value="color">Color</option>
                        <option value="url">URL</option>
                      </select>
                    </div>
                  </div>

                  {(element.type === 'character' || !element.type) && (
                    <div className="form-group">
                      <label>Text</label>
                      <textarea
                        value={element.text || ''}
                        onChange={(e) => updateElement(index, 'text', e.target.value)}
                        rows={3}
                        placeholder="Enter text content"
                      />
                    </div>
                  )}

                  {(element.type === 'image' || element.type === 'url') && (
                    <div className="form-group">
                      <label>URL</label>
                      <input
                        type="text"
                        value={element.url || ''}
                        onChange={(e) => updateElement(index, 'url', e.target.value)}
                        placeholder="https://example.com/image.png"
                      />
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label>Width</label>
                      <input
                        type="number"
                        value={element.width || ''}
                        onChange={(e) =>
                          updateElement(index, 'width', e.target.value ? parseInt(e.target.value) : undefined)
                        }
                        placeholder="Optional"
                      />
                    </div>
                    <div className="form-group">
                      <label>Height</label>
                      <input
                        type="number"
                        value={element.height || ''}
                        onChange={(e) =>
                          updateElement(index, 'height', e.target.value ? parseInt(e.target.value) : undefined)
                        }
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  {element.type === 'image' && (
                    <>
                      <div className="form-group">
                        <label>Alt Text</label>
                        <input
                          type="text"
                          value={element.alt_text || ''}
                          onChange={(e) => updateElement(index, 'alt_text', e.target.value)}
                          placeholder="Optional"
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          <input
                            type="checkbox"
                            checked={element.transparent_bg || false}
                            onChange={(e) => updateElement(index, 'transparent_bg', e.target.checked)}
                          />
                          Transparent Background
                        </label>
                      </div>
                    </>
                  )}

                  <div className="form-group">
                    <label>Value</label>
                    <input
                      type="text"
                      value={element.value || ''}
                      onChange={(e) => updateElement(index, 'value', e.target.value)}
                      placeholder="Optional value field"
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

