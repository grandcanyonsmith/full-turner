import { escapeHtml } from '../utils/renderer';

interface PreviewModalProps {
  title: string;
  content: {
    description?: string;
    funnelJson?: any[];
    content?: string;
  } | null;
  onClose: () => void;
}

export default function PreviewModal({ title, content, onClose }: PreviewModalProps) {
  if (!content) return null;

  let html = '';

  if (content.description) {
    html += `<div style="margin-bottom: 20px;"><strong>Description:</strong> ${escapeHtml(content.description)}</div>`;
  }

  if (content.funnelJson) {
    html += '<div style="margin-bottom: 10px;"><strong>Funnel JSON:</strong></div>';
    html += `<div class="preview-content json"><pre>${escapeHtml(JSON.stringify(content.funnelJson, null, 2))}</pre></div>`;
  }

  if (content.content) {
    html += '<div style="margin-bottom: 10px;"><strong>Content:</strong></div>';
    html += `<div class="preview-content">${escapeHtml(content.content)}</div>`;
  }

  return (
    <div className="preview-modal" style={{ display: 'flex' }}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    </div>
  );
}

