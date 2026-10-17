/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AISettings, Dataset, QualityIssue, ReviewStatus } from './types';
import { SAMPLE_DATASETS } from './data/sampleDatasets';
import { runQualityScan } from './utils/qualityEngine';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { DatasetsView } from './components/DatasetsView';
import { RunChecksView } from './components/RunChecksView';
import { AnnotationReviewView } from './components/AnnotationReviewView';
import { ReviewCentreView } from './components/ReviewCentreView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';

export default function App() {
  // Navigation
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');

  // Datasets State across all modalities
  const [datasets, setDatasets] = useState<Dataset[]>(() => {
    return [
      SAMPLE_DATASETS.image_retail_vision,     // Image Modality
      SAMPLE_DATASETS.reviews_ecommerce_sample, // Customer Reviews
      SAMPLE_DATASETS.audio_call_qa,           // Audio Modality
      SAMPLE_DATASETS.video_action_qa,         // Video Modality
      SAMPLE_DATASETS.retail,                  // Text Modality
      SAMPLE_DATASETS.real_estate,             // Text Modality
      SAMPLE_DATASETS.manufacturing,           // Text Modality
      SAMPLE_DATASETS.customer_service,        // Text Modality
    ];
  });

  const [activeDatasetId, setActiveDatasetId] = useState<string>(SAMPLE_DATASETS.reviews_ecommerce_sample.id);

  // Issues State: Pre-scan sample datasets so dashboard has actual numbers immediately
  const [issues, setIssues] = useState<QualityIssue[]>(() => {
    const initialIssues: QualityIssue[] = [];

    // Scan Customer Reviews
    const reviewIssues = runQualityScan(SAMPLE_DATASETS.reviews_ecommerce_sample);
    initialIssues.push(...reviewIssues);
    SAMPLE_DATASETS.reviews_ecommerce_sample.lastScannedAt = new Date().toISOString();

    // Scan Image dataset
    const imgIssues = runQualityScan(SAMPLE_DATASETS.image_retail_vision);
    initialIssues.push(...imgIssues);
    SAMPLE_DATASETS.image_retail_vision.lastScannedAt = new Date().toISOString();

    // Scan Audio dataset
    const audioIssues = runQualityScan(SAMPLE_DATASETS.audio_call_qa);
    initialIssues.push(...audioIssues);
    SAMPLE_DATASETS.audio_call_qa.lastScannedAt = new Date().toISOString();

    // Scan Video dataset
    const videoIssues = runQualityScan(SAMPLE_DATASETS.video_action_qa);
    initialIssues.push(...videoIssues);
    SAMPLE_DATASETS.video_action_qa.lastScannedAt = new Date().toISOString();

    // Scan Text retail dataset
    const retailIssues = runQualityScan(SAMPLE_DATASETS.retail);
    initialIssues.push(...retailIssues);
    SAMPLE_DATASETS.retail.lastScannedAt = new Date().toISOString();

    return initialIssues;
  });

  // Selected issue for inspector
  const [selectedIssue, setSelectedIssue] = useState<QualityIssue | null>(null);

  // AI Settings State (persisted in localStorage)
  const [aiSettings, setAiSettings] = useState<AISettings>(() => {
    try {
      const stored = localStorage.getItem('vattara_dataguard_ai_settings');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return {
      apiKey: '',
      model: 'gemini-2.5-flash',
      isConfigured: false,
      statusMessage: 'Not configured',
    };
  });

  // Save AI settings when changed
  useEffect(() => {
    try {
      localStorage.setItem('vattara_dataguard_ai_settings', JSON.stringify(aiSettings));
    } catch {
      // Ignore storage errors
    }
  }, [aiSettings]);

  const activeDataset = datasets.find((d) => d.id === activeDatasetId) || datasets[0];

  // Actions
  const handleSelectDataset = (dataset: Dataset) => {
    setActiveDatasetId(dataset.id);
  };

  const handleAddDataset = (newDataset: Dataset) => {
    setDatasets((prev) => [newDataset, ...prev]);
    setActiveDatasetId(newDataset.id);
  };

  const handleDeleteDataset = (id: string) => {
    if (datasets.length <= 1) {
      alert('At least one dataset must remain in the workspace.');
      return;
    }
    setDatasets((prev) => prev.filter((d) => d.id !== id));
    setIssues((prev) => prev.filter((i) => i.datasetId !== id));
    if (activeDatasetId === id) {
      const remaining = datasets.filter((d) => d.id !== id);
      setActiveDatasetId(remaining[0].id);
    }
  };

  const handleUpdateIssue = (
    issueId: string,
    reviewStatus: ReviewStatus,
    correctedValue?: any,
    reviewNotes?: string
  ) => {
    setIssues((prev) =>
      prev.map((i) => {
        if (i.id === issueId) {
          return {
            ...i,
            reviewStatus,
            correctedValue: correctedValue !== undefined ? correctedValue : i.suggestedValue,
            reviewNotes: reviewNotes !== undefined ? reviewNotes : i.reviewNotes,
            reviewedAt: new Date().toISOString(),
            reviewedBy: 'Compliance Auditor',
          };
        }
        return i;
      })
    );
  };

  const handleAddIssues = (newIssues: QualityIssue[]) => {
    setIssues((prev) => {
      const newIds = new Set(newIssues.map((ni) => ni.id));
      const filtered = prev.filter((p) => !newIds.has(p.id));
      return [...filtered, ...newIssues];
    });
  };

  const handleBatchConfirmSuggestions = () => {
    setIssues((prev) =>
      prev.map((i) => {
        if (i.reviewStatus === 'pending') {
          return {
            ...i,
            reviewStatus: 'confirmed',
            correctedValue:
              i.suggestedValue !== null && i.suggestedValue !== undefined ? i.suggestedValue : i.originalValue,
            reviewedAt: new Date().toISOString(),
            reviewedBy: 'Batch Rule Confirmer',
            reviewNotes: 'Auto-confirmed via algorithm suggested correction',
          };
        }
        return i;
      })
    );
  };

  const handleResetWorkspace = () => {
    const freshImg = { ...SAMPLE_DATASETS.image_retail_vision };
    const freshRev = { ...SAMPLE_DATASETS.reviews_ecommerce_sample };
    const freshAudio = { ...SAMPLE_DATASETS.audio_call_qa };
    const freshVideo = { ...SAMPLE_DATASETS.video_action_qa };
    const freshRetail = { ...SAMPLE_DATASETS.retail };
    const freshRealEstate = { ...SAMPLE_DATASETS.real_estate };
    const freshMfg = { ...SAMPLE_DATASETS.manufacturing };
    const freshCs = { ...SAMPLE_DATASETS.customer_service };

    const freshDatasets = [freshImg, freshRev, freshAudio, freshVideo, freshRetail, freshRealEstate, freshMfg, freshCs];
    setDatasets(freshDatasets);
    setActiveDatasetId(freshRev.id);

    const initial = [
      ...runQualityScan(freshRev),
      ...runQualityScan(freshImg),
      ...runQualityScan(freshAudio),
      ...runQualityScan(freshVideo),
      ...runQualityScan(freshRetail),
    ];
    freshRev.lastScannedAt = new Date().toISOString();
    freshImg.lastScannedAt = new Date().toISOString();
    freshAudio.lastScannedAt = new Date().toISOString();
    freshVideo.lastScannedAt = new Date().toISOString();
    freshRetail.lastScannedAt = new Date().toISOString();

    setIssues(initial);
    setSelectedIssue(null);
  };

  // Calculated counts for Sidebar
  const pendingReviewsCount = issues.filter((i) => i.reviewStatus === 'pending').length;
  const totalIssuesCount = issues.length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800 antialiased">
      {/* Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'review_centre') {
            setSelectedIssue(null);
          }
        }}
        pendingReviewsCount={pendingReviewsCount}
        totalIssuesCount={totalIssuesCount}
        datasetCount={datasets.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Header
          activeDataset={activeDataset}
          aiSettings={aiSettings}
          onOpenSettings={() => setCurrentTab('settings')}
          onOpenUpload={() => setCurrentTab('datasets')}
          onRunChecks={() => setCurrentTab('run_checks')}
        />

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              datasets={datasets}
              issues={issues}
              onNavigate={(tab) => setCurrentTab(tab)}
              onSelectDataset={handleSelectDataset}
            />
          )}

          {currentTab === 'datasets' && (
            <DatasetsView
              datasets={datasets}
              activeDataset={activeDataset}
              onSelectDataset={handleSelectDataset}
              onAddDataset={handleAddDataset}
              onDeleteDataset={handleDeleteDataset}
              onNavigate={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'run_checks' && (
            <RunChecksView
              dataset={activeDataset}
              allDatasets={datasets}
              onSelectDataset={handleSelectDataset}
              issues={issues}
              onSetIssues={setIssues}
              onNavigate={(tab) => setCurrentTab(tab)}
              onInspectIssue={(issue) => {
                setSelectedIssue(issue);
                setCurrentTab('review_centre');
              }}
            />
          )}

          {currentTab === 'annotation_review' && (
            <AnnotationReviewView
              dataset={activeDataset}
              allDatasets={datasets}
              onSelectDataset={handleSelectDataset}
              aiSettings={aiSettings}
              onNavigate={(tab) => setCurrentTab(tab)}
              onAddIssues={handleAddIssues}
            />
          )}

          {currentTab === 'review_centre' && (
            <ReviewCentreView
              issues={issues}
              datasets={datasets}
              selectedIssue={selectedIssue}
              onSelectIssue={setSelectedIssue}
              onUpdateIssue={handleUpdateIssue}
              onBatchConfirmSuggestions={handleBatchConfirmSuggestions}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              datasets={datasets}
              issues={issues}
              activeDataset={activeDataset}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              aiSettings={aiSettings}
              onUpdateAISettings={setAiSettings}
              onResetWorkspace={handleResetWorkspace}
              datasets={datasets}
              issues={issues}
              onImportBackup={(backup) => {
                setDatasets(backup.datasets);
                setIssues(backup.issues);
                if (backup.datasets.length > 0) {
                  setActiveDatasetId(backup.datasets[0].id);
                }
                if (backup.aiSettings) {
                  setAiSettings((prev) => ({ ...prev, ...backup.aiSettings }));
                }
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
