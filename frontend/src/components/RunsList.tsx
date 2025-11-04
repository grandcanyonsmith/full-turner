import type { Run } from '../types';
import { truncate } from '../utils/helpers';

interface RunsListProps {
  runs: Run[];
  onViewRun: (runId: string) => void;
  onRefresh: () => void;
  onCreateNew: () => void;
}

export default function RunsList({ runs, onViewRun, onRefresh, onCreateNew }: RunsListProps) {
  return (
    <div className="runs-container">
      <div className="runs-header">
        <h2>Processing Runs</h2>
        <div className="controls">
          <button className="btn btn-primary" onClick={onCreateNew}>
            Create New Run
          </button>
          <button className="btn btn-secondary" onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </div>

      <table className="runs-table">
        <thead>
          <tr>
            <th>Run ID</th>
            <th>Template ID</th>
            <th>Status</th>
            <th>Timestamp</th>
            <th>Cost</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {runs.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                No runs found
              </td>
            </tr>
          ) : (
            runs.map((run) => {
              const statusClass = `status-${run.status || 'pending'}`;
              const statusText = (run.status || 'pending').charAt(0).toUpperCase() + (run.status || 'pending').slice(1);
              const cost = run.cost?.total !== undefined 
                ? run.cost.total 
                : (run.cost?.agent?.cost !== undefined
                    ? run.cost.agent.cost
                    : (typeof run.cost?.agent === 'number' ? run.cost.agent : 0)) || 0;
              const timestamp = run.timestamp ? new Date(run.timestamp).toLocaleString() : 'N/A';

              return (
                <tr
                  key={run.runId}
                  onClick={() => onViewRun(run.runId)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{truncate(run.runId, 20)}</td>
                  <td>{run.templateId || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${statusClass}`}>{statusText}</span>
                  </td>
                  <td>{timestamp}</td>
                  <td>${cost.toFixed(4)}</td>
                  <td>
                    <button
                      className="btn btn-primary btn-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewRun(run.runId);
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

