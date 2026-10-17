import React, { useState, useRef } from 'react';
import {
  Settings,
  Sparkles,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
  Database,
  Info,
  Server,
  Layers,
  Save,
  Download,
  Upload,
  Copy,
  ExternalLink,
  Github,
  CloudCheck,
} from 'lucide-react';
import { AISettings, Dataset, QualityIssue } from '../types';
import { testGeminiConnection } from '../utils/aiVerification';

interface SettingsViewProps {
  aiSettings: AISettings;
  onUpdateAISettings: (settings: AISettings) => void;
  onResetWorkspace: () => void;
  datasets?: Dataset[];
  issues?: QualityIssue[];
  onImportBackup?: (backup: { datasets: Dataset[]; issues: QualityIssue[]; aiSettings?: AISettings }) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  aiSettings,
  onUpdateAISettings,
  onResetWorkspace,
  datasets = [],
  issues = [],
  onImportBackup,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState<string>(aiSettings.apiKey);
  const [modelInput, setModelInput] = useState<string>(aiSettings.model || 'gemini-2.5-flash');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sharedUrl = 'https://ais-pre-gu6fyhxcltsdflmqx2pp25-342354728852.asia-east1.run.app';

  const handleTestConnection = async () => {
    if (!apiKeyInput.trim()) {
      setTestResult({
        success: false,
        message: 'Please enter a valid Gemini API key before testing connection.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await testGeminiConnection(apiKeyInput);
    setIsTesting(false);
    setTestResult(res);

    if (res.success) {
      onUpdateAISettings({
        apiKey: apiKeyInput.trim(),
        model: modelInput,
        isConfigured: true,
        statusMessage: 'Connected and verified',
        lastTestedAt: new Date().toISOString(),
      });
    } else {
      onUpdateAISettings({
        apiKey: apiKeyInput.trim(),
        model: modelInput,
        isConfigured: false,
        statusMessage: res.message,
      });
    }
  };

  const handleSaveWithoutTesting = () => {
    const isConf = apiKeyInput.trim().length > 0;
    onUpdateAISettings({
      apiKey: apiKeyInput.trim(),
      model: modelInput,
      isConfigured: isConf,
      statusMessage: isConf ? 'Configured (pending verification)' : 'Not configured',
    });
    setTestResult({
      success: isConf,
      message: isConf ? 'Settings saved.' : 'API Key cleared. AI verification disabled.',
    });
  };

  const handleClearKey = () => {
    setApiKeyInput('');
    onUpdateAISettings({
      apiKey: '',
      model: 'gemini-2.5-flash',
      isConfigured: false,
      statusMessage: 'Not configured',
    });
    setTestResult(null);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(sharedUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleExportBackup = () => {
    const backupData = {
      appName: 'Vattara DataGuard AI',
      exportedAt: new Date().toISOString(),
      datasetsCount: datasets.length,
      issuesCount: issues.length,
      datasets,
      issues,
      aiSettings: {
        model: aiSettings.model,
        isConfigured: aiSettings.isConfigured,
      },
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vattara_dataguard_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setBackupMessage('Backup exported successfully! File downloaded.');
    setTimeout(() => setBackupMessage(null), 3000);
  };

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.datasets) && Array.isArray(parsed.issues)) {
          if (onImportBackup) {
            onImportBackup(parsed);
          }
          setBackupMessage(`Successfully restored ${parsed.datasets.length} datasets and ${parsed.issues.length} audit records.`);
        } else {
          setBackupMessage('Invalid backup format: Must contain datasets and issues arrays.');
        }
      } catch (err: any) {
        setBackupMessage(`Failed to read backup: ${err?.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Project Saving, Backups & Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage cloud auto-save status, download project backups, export to GitHub, and configure AI credentials.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols): Project Saving & AI Model Config */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: How to Save & Export this Project */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Save className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Project Auto-Save Status</h2>
                  <p className="text-xs text-slate-500">Google AI Studio Cloud Persistence</p>
                </div>
              </div>

              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Automatically Saved</span>
              </span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-2 leading-relaxed">
              <p className="font-semibold text-slate-900">
                Your code and workspace are automatically saved continuously in Google AI Studio.
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>
                  <strong>Cloud State:</strong> All code edits, dependencies, and settings are saved automatically in your account. You can close this tab and return anytime.
                </li>
                <li>
                  <strong>Live Deployment:</strong> Your app has an active shared URL ready for sharing or bookmarking.
                </li>
              </ul>
            </div>

            {/* Persistent App URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Live Shared App URL (Permanent Cloud Run Endpoint)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={sharedUrl}
                  className="flex-1 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
                </button>
                <a
                  href={sharedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors"
                  title="Open live app in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Download Full Workspace Backup */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Portable Workspace Backup (.json)</span>
                <span className="text-[11px] text-slate-500">
                  Save all {datasets.length} datasets, issues, and human review decisions to an offline file
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportBackupFile}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Backup</span>
                </button>
              </div>
            </div>

            {backupMessage && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600" />
                <span>{backupMessage}</span>
              </div>
            )}
          </div>

          {/* Card 2: AI Model Configuration */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">AI Classification Model Integration</h2>
                  <p className="text-xs text-slate-500">Optional: Connect Gemini for automated annotation verification</p>
                </div>
              </div>

              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  aiSettings.isConfigured
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {aiSettings.isConfigured ? 'Model Connected' : 'Not Configured'}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gemini API Key
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Stored securely in browser local storage.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Model Architecture
                </label>
                <select
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 font-medium focus:ring-1 focus:ring-blue-500"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra-low latency classification)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep reasoning)</option>
                </select>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg border flex items-center space-x-2 text-xs ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex items-center space-x-3 pt-2">
              <button
                disabled={isTesting}
                onClick={handleTestConnection}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs disabled:opacity-60"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <Server className="w-4 h-4" />
                    <span>Test Model Connection</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSaveWithoutTesting}
                className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Save
              </button>

              {aiSettings.apiKey && (
                <button
                  onClick={handleClearKey}
                  className="px-3 py-2 text-rose-600 hover:text-rose-700 text-xs font-medium hover:bg-rose-50 rounded-lg transition-colors"
                >
                  Disconnect Model
                </button>
              )}
            </div>
          </div>

          {/* Reset Workspace */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Workspace & Data Reset
            </h2>
            <p className="text-xs text-slate-500">
              Restore factory demo datasets (Photos, Videos, Audio, Reviews, CSVs) and reset audit queues.
            </p>
            <button
              onClick={() => {
                if (window.confirm('Reset all demo datasets and clear current audit review queue?')) {
                  onResetWorkspace();
                }
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors"
            >
              Reset All Datasets & Issues to Factory State
            </button>
          </div>
        </div>

        {/* Right Column (5 cols): How to Save & GitHub instructions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Exporting to GitHub or Downloading ZIP */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
              <Github className="w-4 h-4 text-slate-800" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Exporting Full Code & Git Repo
              </h2>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="font-bold text-slate-900 block">Method 1: Push to GitHub</span>
                <p>
                  Look at the top-right toolbar of Google AI Studio. Click the <strong>GitHub</strong> or <strong>Export</strong> button to push this entire repository directly to your personal GitHub account in 1 click.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="font-bold text-slate-900 block">Method 2: Download Code as ZIP</span>
                <p>
                  Click the <strong>Project Menu</strong> (three dots in top right) &rarr; <strong>Download ZIP</strong> to download the complete source code, TypeScript configuration, and assets to your local machine.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="font-bold text-slate-900 block">Method 3: In-App CSV & JSON Reports</span>
                <p>
                  Navigate to the <strong>Reports & Exports</strong> tab in this app to download:
                </p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-500">
                  <li>Complete Issue Audit Log (CSV)</li>
                  <li>Cleaned & Verified Dataset (CSV)</li>
                  <li>Full Workspace State (JSON)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* App Info Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs text-slate-600">
            <h2 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
              Tenant & Instance Info
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Platform:</span>
                <span className="font-semibold text-slate-900">Vattara DataGuard AI v1.2</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Owner:</span>
                <span className="font-semibold text-slate-900">Vattara Solutions</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Supported Formats:</span>
                <span className="font-semibold text-slate-900">Photos, Videos, Audio, Reviews, CSV</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Save Mode:</span>
                <span className="font-semibold text-emerald-700">Cloud Persistent + In-Browser</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
