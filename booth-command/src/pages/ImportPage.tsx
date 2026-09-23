import { useCallback, useEffect, useRef, useState } from 'react';
import { votersApi } from '../api/voters.api';
import { assembliesApi } from '../api/assemblies.api';
import type { Assembly, ImportResult } from '../types';
import { Button } from '../components/ui';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [assemblyId, setAssemblyId] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    assembliesApi.getAll()
      .then((r) => {
        const d = r.data;
        const list = Array.isArray(d) ? d : (d as unknown as { assemblies?: Assembly[] }).assemblies ?? [];
        setAssemblies(list);
        const active = list.find((a) => a.isActive);
        if (active) setAssemblyId(active.id);
      })
      .catch(() => {});
  }, []);

  const handleFile = (f: File) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = f.name.toLowerCase().slice(f.name.lastIndexOf('.'));
    if (!allowed.includes(ext)) {
      toast.error('Only .xlsx, .xls, and .csv files are supported');
      return;
    }
    setFile(f);
    setResult(null);
    setError('');
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }, []);

  const handleImport = async () => {
    if (!file || !assemblyId) {
      toast.error('Please select a file and an assembly');
      return;
    }
    setImporting(true);
    setError('');
    setResult(null);
    try {
      const res = await votersApi.import(file, assemblyId);
      setResult(res.data ?? res);
      toast.success('Import completed successfully');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const msg = e.response?.data?.message ?? 'Import failed. Please check your file format.';
      setError(msg);
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="page-header">
        <h1 className="page-title">Import Voters</h1>
        <p className="page-subtitle">Upload Excel or CSV file to import voter data</p>
      </div>

      {/* Smart merge info */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Smart Merge Behavior</p>
          <p>Voters are matched using <code className="bg-blue-100 px-1 rounded">Assembly ID + EPIC</code>. Existing voter data is updated with official electoral fields.</p>
          <p className="mt-1 font-medium">The following field-team data is <strong>never overwritten</strong> during import:</p>
          <ul className="mt-1 list-disc list-inside space-y-0.5 text-xs">
            <li>Mobile Number</li>
            <li>Classification (GREEN / YELLOW / RED / BLACK)</li>
            <li>Verification Status</li>
            <li>Vote Status</li>
          </ul>
        </div>
      </div>

      {/* Assembly Select */}
      <div className="card p-5 space-y-4">
        <div>
          <label className="form-label" htmlFor="assemblySelect">Target Assembly *</label>
          <select
            id="assemblySelect"
            className="form-select"
            value={assemblyId}
            onChange={(e) => setAssemblyId(e.target.value)}
          >
            <option value="">Select assembly...</option>
            {assemblies.map((a) => (
              <option key={a.id} value={a.id}>
                #{a.assemblyNumber} — {a.assemblyName} {a.isActive ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Drag & Drop Zone */}
        <div>
          <label className="form-label">Voter File *</label>
          <div
            className={clsx(
              'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
              dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300 hover:bg-gray-50'
            )}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">
              {dragging ? 'Drop your file here' : 'Drag & drop your file, or click to browse'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Supports .xlsx, .xls, .csv</p>
          </div>

          {file && (
            <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <FileSpreadsheet className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatSize(file.size)} · {file.type || file.name.split('.').pop()?.toUpperCase()}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <Button
          variant="primary"
          size="lg"
          icon={importing ? undefined : <Upload className="w-5 h-5" />}
          loading={importing}
          disabled={!file || !assemblyId}
          onClick={handleImport}
        >
          {importing ? 'Importing...' : 'Start Import'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Import Result */}
      {result && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="section-title mb-0">Import Complete</h3>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-5 gap-3 text-center">
            {[
              { label: 'Total Rows', value: result.totalRows, color: 'text-gray-900' },
              { label: 'Valid', value: result.validRows, color: 'text-gray-700' },
              { label: 'Imported', value: result.importedRows, color: 'text-green-700' },
              { label: 'Duplicates', value: result.duplicateRows, color: 'text-amber-700' },
              { label: 'Errors', value: result.errorRows, color: 'text-red-700' },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-3">
                <p className={`text-xl font-bold ${s.color}`}>{s.value?.toLocaleString() ?? 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {result.errors && result.errors.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Import Errors ({result.errors.length})</h4>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="data-table text-xs">
                  <thead>
                    <tr><th>Row</th><th>Error</th><th>Data Preview</th></tr>
                  </thead>
                  <tbody>
                    {result.errors.slice(0, 50).map((err, i) => (
                      <tr key={i}>
                        <td className="font-mono">{err.row}</td>
                        <td className="text-red-700">{err.error}</td>
                        <td className="text-gray-500 max-w-xs truncate">{err.data ? JSON.stringify(err.data) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
