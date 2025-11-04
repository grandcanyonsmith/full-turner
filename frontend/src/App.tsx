import { useState, useEffect, useCallback } from 'react';
import { api } from './utils/api';
import type { Run, FunnelTemplate, BrandGuide } from './types';
import RunsList from './components/RunsList';
import RunDetail from './components/RunDetail';
import NewRunForm from './components/NewRunForm';
import ManagementModal from './components/ManagementModal';
import PreviewModal from './components/PreviewModal';
import EditFunnelTemplateModal from './components/EditFunnelTemplateModal';
import EditBrandGuideModal from './components/EditBrandGuideModal';
import './styles.css';

type View = 'list' | 'detail' | 'newRun';

function App() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [funnelTemplates, setFunnelTemplates] = useState<FunnelTemplate[]>([]);
  const [brandGuides, setBrandGuides] = useState<BrandGuide[]>([]);
  const [currentView, setCurrentView] = useState<View>('list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewContent, setPreviewContent] = useState<any>(null);
  const [showEditFunnelTemplateModal, setShowEditFunnelTemplateModal] = useState(false);
  const [showEditBrandGuideModal, setShowEditBrandGuideModal] = useState(false);
  const [currentEditingTemplateId, setCurrentEditingTemplateId] = useState<string | null>(null);
  const [currentEditingBrandGuideId, setCurrentEditingBrandGuideId] = useState<string | null>(null);
  const [refreshInterval, setRefreshIntervalState] = useState<ReturnType<typeof setInterval> | null>(null);
  const [detailRefreshInterval, setDetailRefreshIntervalState] = useState<ReturnType<typeof setInterval> | null>(null);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRuns(100);
      setRuns(data.runs || []);

      // Auto-refresh if there are pending/processing/running runs
      const hasActiveRuns = (data.runs || []).some(
        (run) => run.status === 'pending' || run.status === 'processing' || run.status === 'running'
      );

      if (hasActiveRuns && !refreshInterval) {
        console.log('Starting auto-refresh for active runs...');
        const interval = setInterval(() => {
          console.log('Auto-refreshing runs list...');
          loadRuns().catch((err) => {
            console.error('Auto-refresh error:', err);
          });
        }, 10000);
        setRefreshIntervalState(interval);
      } else if (!hasActiveRuns && refreshInterval) {
        console.log('Stopping auto-refresh - no active runs');
        clearInterval(refreshInterval);
        setRefreshIntervalState(null);
      }
    } catch (err: any) {
      console.error('Error loading runs:', err);
      let errorMessage = 'Failed to load runs. ';
      if (err.name === 'AbortError') {
        errorMessage += 'Request timed out. The API may be slow or unavailable.';
      } else if (err.message?.includes('Failed to fetch')) {
        errorMessage += 'Network error. Check if the API is accessible.';
      } else {
        errorMessage += err.message || 'Check console for details.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [refreshInterval]);

  const loadFunnelTemplates = useCallback(async () => {
    try {
      const data = await api.getFunnelTemplates();
      setFunnelTemplates(data.funnelTemplates || []);
    } catch (err) {
      console.error('Error loading funnel templates:', err);
    }
  }, []);

  const loadBrandGuides = useCallback(async () => {
    try {
      const data = await api.getBrandGuides();
      setBrandGuides(data.brandGuides || []);
    } catch (err) {
      console.error('Error loading brand guides:', err);
    }
  }, []);

  const loadRunDetail = useCallback(async (runId: string) => {
    try {
      const data = await api.getRun(runId);
      const run = data.run;
      setSelectedRun(run);

      // Update the run in the current runs list
      setRuns((prevRuns) =>
        prevRuns.map((r) => (r.runId === runId ? run : r))
      );

      // If run is pending, processing, or running, auto-refresh every 5 seconds
      if (run.status === 'pending' || run.status === 'processing' || run.status === 'running') {
        if (detailRefreshInterval) {
          clearInterval(detailRefreshInterval);
        }
        const interval = setInterval(async () => {
          console.log('Auto-refreshing run detail...');
          const detailData = await api.getRun(runId);
          const updatedRun = detailData.run;
          setSelectedRun(updatedRun);

          // Stop auto-refresh if run is completed or failed
          if (
            updatedRun.status === 'completed' ||
            updatedRun.status === 'failed' ||
            (updatedRun.status !== 'pending' &&
              updatedRun.status !== 'processing' &&
              updatedRun.status !== 'running')
          ) {
            clearInterval(interval);
            setDetailRefreshIntervalState(null);
          }
        }, 5000);
        setDetailRefreshIntervalState(interval);
      } else if (detailRefreshInterval) {
        clearInterval(detailRefreshInterval);
        setDetailRefreshIntervalState(null);
      }
    } catch (err: any) {
      console.error('Error loading run detail:', err);
      setError(err.message || 'Failed to load run details');
    }
  }, [detailRefreshInterval]);

  useEffect(() => {
    Promise.all([loadRuns(), loadFunnelTemplates(), loadBrandGuides()]);
  }, []);

  useEffect(() => {
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
      if (detailRefreshInterval) clearInterval(detailRefreshInterval);
    };
  }, [refreshInterval, detailRefreshInterval]);

  const handleViewRun = (runId: string) => {
    loadRunDetail(runId);
    setCurrentView('detail');
  };

  const handleCloseDetail = () => {
    if (detailRefreshInterval) {
      clearInterval(detailRefreshInterval);
      setDetailRefreshIntervalState(null);
    }
    setCurrentView('list');
    setSelectedRun(null);
  };

  const handleCreateRun = async (data: {
    funnelTemplateId: string;
    brandGuideId: string;
    customInstructions?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.createRun(data);
      setLoading(false);
      setCurrentView('list');
      setSuccess(`Run created successfully! Run ID: ${result.runId}`);
      setTimeout(() => setSuccess(null), 5000);
      await loadRuns();
    } catch (err: any) {
      console.error('Error creating run:', err);
      setError(err.message || 'Failed to create run');
      setLoading(false);
    }
  };

  const handleSaveFunnelTemplate = async (data: {
    name: string;
    description?: string;
    funnelJson: any[];
    status?: string;
  }) => {
    try {
      await api.saveFunnelTemplate(currentEditingTemplateId, data);
      setSuccess(
        currentEditingTemplateId
          ? 'Funnel template updated successfully'
          : 'Funnel template created successfully'
      );
      setTimeout(() => setSuccess(null), 5000);
      setShowEditFunnelTemplateModal(false);
      setCurrentEditingTemplateId(null);
      await Promise.all([loadFunnelTemplates(), loadManagementLists()]);
      // Don't throw on success
    } catch (err: any) {
      let errorMessage = err.message || 'Failed to save funnel template';
      
      // Check for CORS errors
      if (errorMessage.includes('CORS') || errorMessage.includes('blocked') || 
          err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
        errorMessage = 'CORS error: The API server is not configured to allow requests from this origin. ' +
          'This is a backend configuration issue. The template data has been saved locally but cannot be synced to the server.';
      }
      
      setError(errorMessage);
      // Re-throw so the modal can handle it and show error
      throw err;
    }
  };

  const handleDeleteFunnelTemplate = async () => {
    if (!currentEditingTemplateId) return;
    if (!confirm('Are you sure you want to delete this funnel template? This action cannot be undone.')) {
      return;
    }

    try {
      await api.deleteFunnelTemplate(currentEditingTemplateId);
      setSuccess('Funnel template deleted successfully');
      setTimeout(() => setSuccess(null), 5000);
      setShowEditFunnelTemplateModal(false);
      setCurrentEditingTemplateId(null);
      await Promise.all([loadFunnelTemplates(), loadManagementLists()]);
    } catch (err: any) {
      setError(err.message || 'Failed to delete funnel template');
    }
  };

  const handleSaveBrandGuide = async (data: {
    name: string;
    description?: string;
    content?: string;
    brandGuideJson?: any;
    status?: string;
  }) => {
    try {
      await api.saveBrandGuide(currentEditingBrandGuideId, data);
      setSuccess(
        currentEditingBrandGuideId
          ? 'Brand guide updated successfully'
          : 'Brand guide created successfully'
      );
      setTimeout(() => setSuccess(null), 5000);
      setShowEditBrandGuideModal(false);
      setCurrentEditingBrandGuideId(null);
      await Promise.all([loadBrandGuides(), loadManagementLists()]);
    } catch (err: any) {
      setError(err.message || 'Failed to save brand guide');
    }
  };

  const handleDeleteBrandGuide = async () => {
    if (!currentEditingBrandGuideId) return;
    if (!confirm('Are you sure you want to delete this brand guide? This action cannot be undone.')) {
      return;
    }

    try {
      await api.deleteBrandGuide(currentEditingBrandGuideId);
      setSuccess('Brand guide deleted successfully');
      setTimeout(() => setSuccess(null), 5000);
      setShowEditBrandGuideModal(false);
      setCurrentEditingBrandGuideId(null);
      await Promise.all([loadBrandGuides(), loadManagementLists()]);
    } catch (err: any) {
      setError(err.message || 'Failed to delete brand guide');
    }
  };

  const loadManagementLists = useCallback(async () => {
    await Promise.all([loadFunnelTemplates(), loadBrandGuides()]);
  }, [loadFunnelTemplates, loadBrandGuides]);

  const handlePreviewFunnelTemplate = async (templateId: string) => {
    try {
      const data = await api.getFunnelTemplate(templateId);
      const template = data.funnelTemplate;
      setPreviewTitle('Funnel Template: ' + template.name);
      setPreviewContent({
        description: template.description,
        funnelJson: template.funnelJson,
      });
      setShowPreviewModal(true);
    } catch (err: any) {
      setError('Failed to load template: ' + err.message);
    }
  };

  const handlePreviewBrandGuide = async (guideId: string) => {
    try {
      const data = await api.getBrandGuide(guideId);
      const guide = data.brandGuide;
      setPreviewTitle('Brand Guide: ' + guide.name);
      setPreviewContent({
        description: guide.description,
        content: guide.content,
      });
      setShowPreviewModal(true);
    } catch (err: any) {
      setError('Failed to load brand guide: ' + err.message);
    }
  };

  const handleEditFunnelTemplate = (template: FunnelTemplate | null) => {
    setCurrentEditingTemplateId(template?.funnelTemplateId || null);
    setShowEditFunnelTemplateModal(true);
  };

  const handleEditBrandGuide = (guide: BrandGuide | null) => {
    setCurrentEditingBrandGuideId(guide?.brandGuideId || null);
    setShowEditBrandGuideModal(true);
  };

  return (
    <div className="container">
      <header>
        <h1>Full Turner - Runs Dashboard</h1>
        <p className="subtitle">View all processing runs and their outputs</p>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowManagementModal(true)}
          >
            Manage Templates & Guides
          </button>
        </div>
      </header>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading runs...</p>
        </div>
      )}

      {(error || success) && (
        <div
          className="error"
          style={{
            background: success ? '#d4edda' : '#fee',
            borderColor: success ? '#c3e6cb' : '#fcc',
            color: success ? '#155724' : '#c33',
          }}
        >
          <p>{error || success}</p>
        </div>
      )}

      {currentView === 'list' && (
        <RunsList
          runs={runs}
          onViewRun={handleViewRun}
          onRefresh={loadRuns}
          onCreateNew={() => setCurrentView('newRun')}
        />
      )}

      {currentView === 'newRun' && (
        <NewRunForm
          funnelTemplates={funnelTemplates}
          brandGuides={brandGuides}
          onSubmit={handleCreateRun}
          onCancel={() => setCurrentView('list')}
          onPreviewFunnelTemplate={handlePreviewFunnelTemplate}
          onPreviewBrandGuide={handlePreviewBrandGuide}
          onLoadTemplates={loadFunnelTemplates}
          onLoadGuides={loadBrandGuides}
        />
      )}

      {currentView === 'detail' && selectedRun && (
        <RunDetail
          run={selectedRun}
          onClose={handleCloseDetail}
          onRefresh={() => loadRunDetail(selectedRun.runId)}
        />
      )}

      {showManagementModal && (
        <ManagementModal
          funnelTemplates={funnelTemplates}
          brandGuides={brandGuides}
          onClose={() => setShowManagementModal(false)}
          onEditFunnelTemplate={handleEditFunnelTemplate}
          onEditBrandGuide={handleEditBrandGuide}
          onRefresh={loadManagementLists}
        />
      )}

      {showPreviewModal && (
        <PreviewModal
          title={previewTitle}
          content={previewContent}
          onClose={() => setShowPreviewModal(false)}
        />
      )}

      {showEditFunnelTemplateModal && (
        <EditFunnelTemplateModal
          templateId={currentEditingTemplateId}
          templateData={currentEditingTemplateId ? funnelTemplates.find(t => t.funnelTemplateId === currentEditingTemplateId) : null}
          onSave={handleSaveFunnelTemplate}
          onDelete={handleDeleteFunnelTemplate}
          onClose={() => {
            setShowEditFunnelTemplateModal(false);
            setCurrentEditingTemplateId(null);
          }}
        />
      )}

      {showEditBrandGuideModal && (
        <EditBrandGuideModal
          guideId={currentEditingBrandGuideId}
          guideData={currentEditingBrandGuideId ? brandGuides.find(g => g.brandGuideId === currentEditingBrandGuideId) : null}
          onSave={handleSaveBrandGuide}
          onDelete={handleDeleteBrandGuide}
          onClose={() => {
            setShowEditBrandGuideModal(false);
            setCurrentEditingBrandGuideId(null);
          }}
        />
      )}
    </div>
  );
}

export default App;

