import { useState, useEffect } from 'react';
import type { Run, FunnelElement } from '../types';
import { parseOutput, renderFunnelHTML } from '../utils/renderer';
import { formatDuration } from '../utils/helpers';

interface RunDetailProps {
  run: Run;
  onClose: () => void;
  onRefresh: () => void;
}

export default function RunDetail({ run, onClose, onRefresh }: RunDetailProps) {
  const [activeTab, setActiveTab] = useState<'opt' | 'ty' | 'dl' | 'email'>('opt');
  const [funnelJson, setFunnelJson] = useState<FunnelElement[]>([]);

  useEffect(() => {
    // Parse output to extract funnel_json
    const outputRaw = run.output?.output_text || run.output || '';
    const outputText = typeof outputRaw === 'string' ? outputRaw : JSON.stringify(outputRaw, null, 2);
    const parsedOutput = parseOutput(outputText);
    if (parsedOutput && parsedOutput.funnel_json) {
      setFunnelJson(parsedOutput.funnel_json);
    } else {
      setFunnelJson([]);
    }
  }, [run]);

  const switchTab = (tabType: 'opt' | 'ty' | 'dl' | 'email') => {
    setActiveTab(tabType);
  };

  const html = renderFunnelHTML(funnelJson, activeTab);

  return (
    <div className="run-detail">
      <div className="detail-header">
        <h2>Run Details</h2>
        <button className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="detail-content">
        <div className="detail-section">
          <h3>Basic Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Run ID</div>
              <div className="info-value">{run.runId}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Template ID</div>
              <div className="info-value">{run.templateId || 'N/A'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Status</div>
              <div className="info-value">
                <span className={`status-badge status-${run.status || 'pending'}`}>
                  {(run.status || 'pending').charAt(0).toUpperCase() + (run.status || 'pending').slice(1)}
                </span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">Timestamp</div>
              <div className="info-value">
                {run.timestamp ? new Date(run.timestamp).toLocaleString() : 'N/A'}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">Start Time</div>
              <div className="info-value">
                {run.startTime ? new Date(run.startTime).toLocaleString() : 'N/A'}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">End Time</div>
              <div className="info-value">
                {run.endTime ? new Date(run.endTime).toLocaleString() : 'N/A'}
              </div>
            </div>
            {run.duration && (
              <div className="info-item">
                <div className="info-label">Duration</div>
                <div className="info-value">{formatDuration(run.duration)}</div>
              </div>
            )}
          </div>
        </div>

        <div className="detail-section">
          <h3>Input</h3>
          <pre className="json-viewer">
            {JSON.stringify(run.input || {}, null, 2)}
          </pre>
        </div>

        <div className="detail-section">
          <h3>Output</h3>
          <pre className="json-viewer">
            {typeof run.output === 'string'
              ? run.output
              : JSON.stringify(run.output || {}, null, 2)}
          </pre>
        </div>

        <div className="detail-section">
          <h3>HTML Visualization</h3>
          <div className="tabs">
            <button
              className={`tab-btn ${activeTab === 'opt' ? 'active' : ''}`}
              onClick={() => switchTab('opt')}
            >
              Opt-in Page
            </button>
            <button
              className={`tab-btn ${activeTab === 'ty' ? 'active' : ''}`}
              onClick={() => switchTab('ty')}
            >
              Thank You Page
            </button>
            <button
              className={`tab-btn ${activeTab === 'dl' ? 'active' : ''}`}
              onClick={() => switchTab('dl')}
            >
              Download Page
            </button>
            <button
              className={`tab-btn ${activeTab === 'email' ? 'active' : ''}`}
              onClick={() => switchTab('email')}
            >
              Email Preview
            </button>
          </div>
          <div className="visualization-container">
            <iframe
              id="visualizationFrame"
              className="visualization-frame"
              srcDoc={html}
              title="Funnel Visualization"
            />
          </div>
        </div>

        <div className="detail-section">
          <h3>Image Processing Results</h3>
          <div id="imageResults">
            {run.imageProcessingResults && run.imageProcessingResults.length > 0 ? (
              <div className="image-results">
                {run.imageProcessingResults.map((result, index) => {
                  const success = result.success !== false;
                  const s3Url = result.s3Url || result.url || '';
                  return (
                    <div key={index} className="image-result-item">
                      {s3Url && (
                        <img
                          src={s3Url}
                          alt={result.elementId || 'Image'}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div className="image-info">
                        <strong>Element ID:</strong> {result.elementId || 'N/A'}
                        <br />
                        <strong>Status:</strong>{' '}
                        {success ? (
                          <span style={{ color: 'green' }}>Success</span>
                        ) : (
                          <span style={{ color: 'red' }}>Failed</span>
                        )}
                        {s3Url && (
                          <>
                            <br />
                            <strong>S3 URL:</strong>
                            <br />
                            <span className="image-url">{s3Url}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p>No image processing results</p>
            )}
          </div>
        </div>

        <div className="detail-section">
          <h3>Cost Breakdown</h3>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Total Cost</div>
              <div className="info-value">
                ${(run.cost?.total || 0).toFixed(4)}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">Agent Cost</div>
              <div className="info-value">
                ${(run.cost?.agent?.cost !== undefined 
                  ? run.cost.agent.cost 
                  : (typeof run.cost?.agent === 'number' ? run.cost.agent : 0) || 0
                ).toFixed(4)}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">Image Cost</div>
              <div className="info-value">
                ${(run.cost?.images?.cost !== undefined
                  ? run.cost.images.cost
                  : (typeof run.cost?.image === 'number' ? run.cost.image : 0) || 0
                ).toFixed(4)}
              </div>
            </div>
            {(run.cost?.agent?.tokens?.input || run.cost?.agent?.tokens?.output) && (
              <>
                {run.cost?.agent?.tokens?.input && (
                  <div className="info-item">
                    <div className="info-label">Input Tokens</div>
                    <div className="info-value">
                      {run.cost.agent.tokens.input.toLocaleString()}
                    </div>
                  </div>
                )}
                {run.cost?.agent?.tokens?.output && (
                  <div className="info-item">
                    <div className="info-label">Output Tokens</div>
                    <div className="info-value">
                      {run.cost.agent.tokens.output.toLocaleString()}
                    </div>
                  </div>
                )}
              </>
            )}
            {(run.cost?.images?.imagesGenerated || 0) > 0 && (
              <div className="info-item">
                <div className="info-label">Images Generated</div>
                <div className="info-value">{run.cost.images.imagesGenerated}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

