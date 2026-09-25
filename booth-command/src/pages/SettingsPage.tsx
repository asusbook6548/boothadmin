import { useEffect, useState } from 'react';
import { settingsApi } from '../api/settings.api';
import type { SystemSettings } from '../types';
import { Button, Spinner, ErrorState } from '../components/ui';
import { ConfirmDialog } from '../components/ui/Modal';
import {
  Info,
  CheckCircle2,
  Target,
  ShieldCheck,
  Save,
  RotateCcw,
  Sparkles,
  Sliders,
  TrendingUp,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/error';

interface FieldConfig {
  key: keyof Omit<SystemSettings, 'id' | 'createdAt' | 'updatedAt'>;
  label: string;
  description: string;
  group: 'Green Thresholds' | 'Yellow Thresholds' | 'Verification Thresholds';
  badgeColor: string;
}

const FIELDS: FieldConfig[] = [
  {
    key: 'strongGreenPercent',
    label: 'Strong Green Threshold',
    description: 'Minimum Green voter % to classify booth as "Strong"',
    group: 'Green Thresholds',
    badgeColor: 'text-emerald-700 bg-emerald-50',
  },
  {
    key: 'moderateGreenPercent',
    label: 'Moderate Green Threshold',
    description: 'Minimum Green voter % for "Moderate" classification',
    group: 'Green Thresholds',
    badgeColor: 'text-emerald-700 bg-emerald-50',
  },
  {
    key: 'highOpportunityYellow',
    label: 'High Yellow Opportunity',
    description: 'Minimum Yellow swing voter % to flag high opportunity',
    group: 'Yellow Thresholds',
    badgeColor: 'text-amber-700 bg-amber-50',
  },
  {
    key: 'mediumOpportunityYellow',
    label: 'Medium Yellow Opportunity',
    description: 'Minimum Yellow swing voter % for medium opportunity',
    group: 'Yellow Thresholds',
    badgeColor: 'text-amber-700 bg-amber-50',
  },
  {
    key: 'highVerification',
    label: 'High Verification Threshold',
    description: 'Minimum Verified voter % for high confidence data',
    group: 'Verification Thresholds',
    badgeColor: 'text-blue-700 bg-blue-50',
  },
  {
    key: 'mediumVerification',
    label: 'Medium Verification Threshold',
    description: 'Minimum Verified voter % for medium confidence data',
    group: 'Verification Thresholds',
    badgeColor: 'text-blue-700 bg-blue-50',
  },
];

function validateSettings(data: Record<string, number>): string | null {
  if (data.strongGreenPercent < data.moderateGreenPercent) {
    return 'Strong Green threshold must be greater than or equal to Moderate Green threshold.';
  }
  if (data.highOpportunityYellow < data.mediumOpportunityYellow) {
    return 'High Yellow threshold must be greater than or equal to Medium Yellow threshold.';
  }
  if (data.highVerification < data.mediumVerification) {
    return 'High Verification threshold must be greater than or equal to Medium Verification threshold.';
  }
  return null;
}

export function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [values, setValues] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Test simulation values for live preview
  const [simGreen, setSimGreen] = useState(48);
  const [simYellow, setSimYellow] = useState(30);
  const [simVerified, setSimVerified] = useState(65);

  const load = () => {
    setLoading(true);
    settingsApi.get()
      .then((r) => {
        setSettings(r.data);
        const v: Record<string, number> = {};
        FIELDS.forEach((f) => {
          v[f.key] = (r.data as unknown as Record<string, number>)[f.key] ?? 0;
        });
        setValues(v);
      })
      .catch((err) => setError(getErrorMessage(err, 'Failed to load settings')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (key: string, val: string | number) => {
    const n = Math.min(100, Math.max(0, Number(val) || 0));
    setValues((prev) => ({ ...prev, [key]: n }));
    setValidationError('');
  };

  const applyPreset = (preset: {
    strongGreen: number;
    moderateGreen: number;
    highYellow: number;
    mediumYellow: number;
    highVer: number;
    mediumVer: number;
  }) => {
    setValues({
      strongGreenPercent: preset.strongGreen,
      moderateGreenPercent: preset.moderateGreen,
      highOpportunityYellow: preset.highYellow,
      mediumOpportunityYellow: preset.mediumYellow,
      highVerification: preset.highVer,
      mediumVerification: preset.mediumVer,
    });
    setValidationError('');
    toast.success('Preset applied! Click Save to confirm.');
  };

  const handleSave = async () => {
    const err = validateSettings(values);
    if (err) {
      setValidationError(err);
      return;
    }
    setSaveLoading(true);
    try {
      await settingsApi.update(values as Omit<SystemSettings, 'id' | 'createdAt' | 'updatedAt'>);
      toast.success('Settings updated successfully');
      setConfirmOpen(false);
      load();
    } catch (apiErr) {
      toast.error(getErrorMessage(apiErr, 'Failed to save settings'));
    } finally {
      setSaveLoading(false);
    }
  };

  // Simulation calculations based on current slider values
  const getSimStrength = () => {
    const strong = values.strongGreenPercent ?? 50;
    const moderate = values.moderateGreenPercent ?? 35;
    if (simGreen >= strong) return { label: 'Stronghold', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (simGreen >= moderate) return { label: 'Moderate Support', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    return { label: 'Needs Groundwork', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const getSimOpportunity = () => {
    const high = values.highOpportunityYellow ?? 35;
    const med = values.mediumOpportunityYellow ?? 20;
    if (simYellow >= high) return { label: 'High Opportunity (Swing Priority)', color: 'text-amber-800 bg-amber-50 border-amber-200' };
    if (simYellow >= med) return { label: 'Moderate Opportunity', color: 'text-amber-700 bg-amber-50/60 border-amber-200' };
    return { label: 'Low Swing Factor', color: 'text-gray-700 bg-gray-50 border-gray-200' };
  };

  const getSimConfidence = () => {
    const high = values.highVerification ?? 70;
    const med = values.mediumVerification ?? 40;
    if (simVerified >= high) return { label: 'High Confidence', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
    if (simVerified >= med) return { label: 'Medium Confidence', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    return { label: 'Low Confidence (Unverified)', color: 'text-orange-700 bg-orange-50 border-orange-200' };
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header Card */}
      <div className="card p-6 border-l-4 border-l-indigo-600 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-sm flex-shrink-0">
              <Sliders className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Settings</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Configure analysis thresholds for booth categorization, opportunity scoring, and data confidence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={load}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              icon={<Save className="w-4 h-4" />}
              onClick={() => {
                const err = validateSettings(values);
                if (err) {
                  setValidationError(err);
                  return;
                }
                setConfirmOpen(true);
              }}
            >
              Save Settings
            </Button>
          </div>
        </div>

        {settings && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Last updated: {new Date(settings.updatedAt).toLocaleString()}
            </span>
            <span className="text-indigo-600 font-medium">Auto-applies to Booth Analytics</span>
          </div>
        )}
      </div>

      {/* Info Notice Banner */}
      <div className="flex items-start gap-3 p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl">
        <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-950">
          <p className="font-semibold mb-0.5">How These Thresholds Work</p>
          <p className="text-indigo-900/80 leading-relaxed text-xs">
            These thresholds determine how individual polling booths are scored across the analytics dashboard, report exports, and strategy views. Adjusting these values helps fine-tune which booths are prioritized for field volunteer mobilization.
          </p>
        </div>
      </div>

      {validationError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
          {validationError}
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Threshold Sliders & Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Green Affinity Thresholds */}
          <div className="card p-6 border-t-4 border-t-emerald-500">
            <div className="flex items-center justify-between pb-3 mb-5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Green Support Thresholds</h3>
                  <p className="text-xs text-gray-500">Categorizes loyal base and favorable booths</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                Support Strength
              </span>
            </div>

            <div className="space-y-6">
              {FIELDS.filter((f) => f.group === 'Green Thresholds').map((field) => {
                const val = values[field.key] ?? 0;
                return (
                  <div key={field.key} className="space-y-2 bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{field.label}</p>
                        <p className="text-xs text-gray-500">{field.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-xs">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="w-14 text-right font-bold text-gray-900 text-sm outline-none"
                          value={val}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                        />
                        <span className="text-xs font-bold text-gray-500">%</span>
                      </div>
                    </div>
                    {/* Visual Slider */}
                    <div className="pt-2 flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={val}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className="w-full h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                      <span className="text-xs font-mono font-medium text-gray-500 w-10 text-right">{val}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Yellow Opportunity Thresholds */}
          <div className="card p-6 border-t-4 border-t-amber-500">
            <div className="flex items-center justify-between pb-3 mb-5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Yellow Opportunity Thresholds</h3>
                  <p className="text-xs text-gray-500">Flags swing voters and persuadable booths</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                Swing Opportunity
              </span>
            </div>

            <div className="space-y-6">
              {FIELDS.filter((f) => f.group === 'Yellow Thresholds').map((field) => {
                const val = values[field.key] ?? 0;
                return (
                  <div key={field.key} className="space-y-2 bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{field.label}</p>
                        <p className="text-xs text-gray-500">{field.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-xs">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="w-14 text-right font-bold text-gray-900 text-sm outline-none"
                          value={val}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                        />
                        <span className="text-xs font-bold text-gray-500">%</span>
                      </div>
                    </div>
                    {/* Visual Slider */}
                    <div className="pt-2 flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={val}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className="w-full h-2 bg-amber-100 rounded-lg appearance-none cursor-pointer accent-amber-600"
                      />
                      <span className="text-xs font-mono font-medium text-gray-500 w-10 text-right">{val}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verification Confidence Thresholds */}
          <div className="card p-6 border-t-4 border-t-blue-500">
            <div className="flex items-center justify-between pb-3 mb-5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Verification Confidence</h3>
                  <p className="text-xs text-gray-500">Measures data reliability from ground door-to-door audits</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                Data Reliability
              </span>
            </div>

            <div className="space-y-6">
              {FIELDS.filter((f) => f.group === 'Verification Thresholds').map((field) => {
                const val = values[field.key] ?? 0;
                return (
                  <div key={field.key} className="space-y-2 bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{field.label}</p>
                        <p className="text-xs text-gray-500">{field.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-xs">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="w-14 text-right font-bold text-gray-900 text-sm outline-none"
                          value={val}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                        />
                        <span className="text-xs font-bold text-gray-500">%</span>
                      </div>
                    </div>
                    {/* Visual Slider */}
                    <div className="pt-2 flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={val}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <span className="text-xs font-mono font-medium text-gray-500 w-10 text-right">{val}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Live Preview & Quick Presets */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Simulator Preview */}
          <div className="card p-6 bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-xs">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Live Threshold Simulator</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Test how a sample booth would be classified in real-time under your current threshold values:
            </p>

            {/* Test Sliders */}
            <div className="space-y-4 mb-6">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-emerald-700">Sample Green %</span>
                  <span className="font-mono text-gray-900 font-bold">{simGreen}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={simGreen}
                  onChange={(e) => setSimGreen(Number(e.target.value))}
                  className="w-full h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-amber-700">Sample Yellow %</span>
                  <span className="font-mono text-gray-900 font-bold">{simYellow}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={simYellow}
                  onChange={(e) => setSimYellow(Number(e.target.value))}
                  className="w-full h-2 bg-amber-100 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-blue-700">Sample Verified %</span>
                  <span className="font-mono text-gray-900 font-bold">{simVerified}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={simVerified}
                  onChange={(e) => setSimVerified(Number(e.target.value))}
                  className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>

            {/* Live Outputs */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Simulated Booth Categorization:
              </p>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-white">
                <span className="text-xs text-gray-600 font-medium">Strength Label:</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${getSimStrength().color}`}>
                  {getSimStrength().label}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-white">
                <span className="text-xs text-gray-600 font-medium">Opportunity Label:</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${getSimOpportunity().color}`}>
                  {getSimOpportunity().label}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-white">
                <span className="text-xs text-gray-600 font-medium">Confidence Label:</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${getSimConfidence().color}`}>
                  {getSimConfidence().label}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="card p-6">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Campaign Strategy Presets</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Apply standard political strategy threshold presets:
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    strongGreen: 50,
                    moderateGreen: 35,
                    highYellow: 40,
                    mediumYellow: 25,
                    highVer: 70,
                    mediumVer: 40,
                  })
                }
                className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">Standard Balanced (Default)</span>
                  <span className="text-[11px] text-gray-400 font-mono">50% / 35%</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Balanced approach suitable for most assembly constituencies.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    strongGreen: 60,
                    moderateGreen: 40,
                    highYellow: 35,
                    mediumYellow: 20,
                    highVer: 80,
                    mediumVer: 50,
                  })
                }
                className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">High-Stakes Strict</span>
                  <span className="text-[11px] text-gray-400 font-mono">60% / 40%</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Requires higher green margin and rigorous ground verification.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    strongGreen: 45,
                    moderateGreen: 30,
                    highYellow: 30,
                    mediumYellow: 15,
                    highVer: 60,
                    mediumVer: 30,
                  })
                }
                className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-amber-400 hover:bg-amber-50/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">Aggressive Expansion</span>
                  <span className="text-[11px] text-gray-400 font-mono">45% / 30%</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Lower barrier to identify and focus on swing and growth opportunities.
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSave}
        title="Save Analysis Settings"
        message="Save these threshold settings? This will immediately affect analytics booth categorization across the entire campaign command center."
        confirmLabel="Confirm & Save"
        confirmVariant="primary"
        loading={saveLoading}
      />
    </div>
  );
}
