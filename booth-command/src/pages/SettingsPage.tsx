import { useEffect, useState } from 'react';
import { settingsApi } from '../api/settings.api';
import type { SystemSettings } from '../types';
import { Button, Spinner, ErrorState } from '../components/ui';
import { ConfirmDialog } from '../components/ui/Modal';
import { Settings, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/error';

interface FieldConfig {
  key: keyof Omit<SystemSettings, 'id' | 'createdAt' | 'updatedAt'>;
  label: string;
  description: string;
  group: string;
}

const FIELDS: FieldConfig[] = [
  { key: 'strongGreenPercent', label: 'Strong Green Threshold', description: 'Minimum Green % to classify a booth as "Strong"', group: 'Green Thresholds' },
  { key: 'moderateGreenPercent', label: 'Moderate Green Threshold', description: 'Minimum Green % for "Moderate" classification', group: 'Green Thresholds' },
  { key: 'highOpportunityYellow', label: 'High Yellow Opportunity', description: 'Minimum Yellow % to flag booth as high opportunity', group: 'Yellow Thresholds' },
  { key: 'mediumOpportunityYellow', label: 'Medium Yellow Opportunity', description: 'Minimum Yellow % for medium opportunity', group: 'Yellow Thresholds' },
  { key: 'highVerification', label: 'High Verification Threshold', description: 'Minimum Verified % for high confidence classification', group: 'Verification Thresholds' },
  { key: 'mediumVerification', label: 'Medium Verification Threshold', description: 'Minimum Verified % for medium confidence', group: 'Verification Thresholds' },
];

function validateSettings(data: Record<string, number>): string | null {
  if (data.strongGreenPercent < data.moderateGreenPercent) return 'Strong Green must be ≥ Moderate Green';
  if (data.highOpportunityYellow < data.mediumOpportunityYellow) return 'High Yellow must be ≥ Medium Yellow';
  if (data.highVerification < data.mediumVerification) return 'High Verification must be ≥ Medium Verification';
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

  const load = () => {
    setLoading(true);
    settingsApi.get()
      .then((r) => {
        setSettings(r.data);
        const v: Record<string, number> = {};
        FIELDS.forEach((f) => { v[f.key] = (r.data as unknown as Record<string, number>)[f.key]; });
        setValues(v);
      })
      .catch((err) => setError(getErrorMessage(err, 'Failed to load settings')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleChange = (key: string, val: string) => {
    const n = Math.min(100, Math.max(0, Number(val)));
    setValues((v) => ({ ...v, [key]: n }));
    setValidationError('');
  };

  const handleSave = async () => {
    const err = validateSettings(values);
    if (err) { setValidationError(err); return; }
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

  const groups = [...new Set(FIELDS.map((f) => f.group))];

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">System Settings</h1>
        <p className="page-subtitle">Configure analysis thresholds for booth classification</p>
      </div>

      {/* Info panel */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">About These Settings</p>
          <p>These thresholds control how booths are categorized in the Analytics section (Strong, Weak, Opportunity, High Confidence). Changes take effect immediately on the next analytics query.</p>
        </div>
      </div>

      {/* Settings Groups */}
      {groups.map((group) => (
        <div key={group} className="card p-5 space-y-4">
          <h3 className="section-title">{group}</h3>
          {FIELDS.filter((f) => f.group === group).map((field) => (
            <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
              <div>
                <p className="text-sm font-medium text-gray-800">{field.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{field.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  className="form-input text-right w-24"
                  value={values[field.key] ?? 0}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
                <span className="text-sm text-gray-500 font-medium">%</span>
              </div>
            </div>
          ))}
        </div>
      ))}

      {validationError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-medium">{validationError}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          icon={<Settings className="w-4 h-4" />}
          onClick={() => {
            const err = validateSettings(values);
            if (err) { setValidationError(err); return; }
            setConfirmOpen(true);
          }}
        >
          Save Settings
        </Button>
        <Button variant="secondary" onClick={load}>Reset</Button>
      </div>

      {settings && (
        <p className="text-xs text-gray-400">Last updated: {new Date(settings.updatedAt).toLocaleString()}</p>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSave}
        title="Save Settings"
        message="Save these threshold settings? This will immediately affect analytics booth categorization."
        confirmLabel="Save Settings"
        confirmVariant="primary"
        loading={saveLoading}
      />
    </div>
  );
}
