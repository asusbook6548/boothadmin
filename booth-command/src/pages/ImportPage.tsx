import { useCallback, useEffect, useRef, useState } from 'react';
import { votersApi } from '../api/voters.api';
import { assembliesApi } from '../api/assemblies.api';
import type { Assembly, ImportResult } from '../types';
import { Button } from '../components/ui';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  ShieldCheck,
  FileDown,
  Layers,
  Database,
  RefreshCw,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { getErrorMessage } from '../utils/error';

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
    assembliesApi
      .getAll()
      .then((r) => {
        const d = r.data;

        const list = Array.isArray(d)
          ? d
          : (
              d as unknown as {
                assemblies?: Assembly[];
              }
            ).assemblies ?? [];

        setAssemblies(list);

        const active = list.find((a) => a.isActive);

        if (active) {
          setAssemblyId(active.id);
        } else if (list.length > 0) {
          setAssemblyId(list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleFile = (f: File) => {
    const allowed = ['.xlsx', '.xls', '.csv'];

    const ext = f.name
      .toLowerCase()
      .slice(f.name.lastIndexOf('.'));

    if (!allowed.includes(ext)) {
      toast.error(
        'Only .xlsx, .xls, and .csv files are supported'
      );
      return;
    }

    setFile(f);
    setResult(null);
    setError('');
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);

      const dropped = e.dataTransfer.files[0];

      if (dropped) {
        handleFile(dropped);
      }
    },
    []
  );

  const handleImport = async () => {
    if (!file || !assemblyId) {
      toast.error(
        'Please select a file and a target assembly'
      );
      return;
    }

    setImporting(true);
    setError('');
    setResult(null);

    try {
      const res = await votersApi.import(
        file,
        assemblyId
      );

      setResult(res.data ?? res);

      toast.success(
        'Voter import completed successfully!'
      );
    } catch (err: unknown) {
      const msg = getErrorMessage(
        err,
        'Import failed. Please check your spreadsheet format.'
      );

      setError(msg);
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  /**
   * Download a complete synthetic sample file.
   *
   * IMPORTANT:
   * These headers match the backend voter-import format:
   *
   * epicNo
   * epicName
   * epicName1
   * Gender
   * mobileNo
   * enrollDob
   * Age
   * fathersOrGuardian
   * fathersOrGuardianHindi
   * mothersName
   * spouseName
   * houseNo
   * acNo
   * partNo
   * partSerial
   * pollingStation
   *
   * The data is synthetic test data only.
   */
  const handleDownloadSample = () => {
    const headers = [
      'epicNo',
      'epicName',
      'epicName1',
      'Gender',
      'mobileNo',
      'enrollDob',
      'Age',
      'fathersOrGuardian',
      'fathersOrGuardianHindi',
      'mothersName',
      'spouseName',
      'houseNo',
      'acNo',
      'partNo',
      'partSerial',
      'pollingStation',
    ];

    const sampleRows = [
      [
        'TEST001',
        'Rajesh Kumar',
        'राजेश कुमार',
        'Male',
        '9000000001',
        '1992-04-15',
        '34',
        'Ramesh Kumar',
        'रमेश कुमार',
        'Sunita Kumar',
        '',
        'H-101',
        '001',
        '001',
        '1',
        'Government Primary School, Booth 001',
      ],

      [
        'TEST002',
        'Sunita Devi',
        'सुनीता देवी',
        'Female',
        '9000000002',
        '1997-08-21',
        '29',
        'Suresh Sharma',
        'सुरेश शर्मा',
        'Kamla Devi',
        '',
        'H-102',
        '001',
        '001',
        '2',
        'Government Primary School, Booth 001',
      ],

      [
        'TEST003',
        'Amit Verma',
        'अमित वर्मा',
        'Male',
        '9000000003',
        '1984-11-05',
        '42',
        'Mahesh Verma',
        'महेश वर्मा',
        'Rekha Verma',
        '',
        'H-103',
        '001',
        '001',
        '3',
        'Government Primary School, Booth 001',
      ],

      [
        'TEST004',
        'Pooja Singh',
        'पूजा सिंह',
        'Female',
        '9000000004',
        '1995-02-12',
        '31',
        'Rajendra Singh',
        'राजेंद्र सिंह',
        'Meena Singh',
        '',
        'H-104',
        '001',
        '001',
        '4',
        'Government Primary School, Booth 001',
      ],

      [
        'TEST005',
        'Vikas Yadav',
        'विकास यादव',
        'Male',
        '9000000005',
        '1981-09-28',
        '45',
        'Ram Prasad Yadav',
        'राम प्रसाद यादव',
        'Shanti Devi',
        '',
        'H-105',
        '001',
        '001',
        '5',
        'Government Primary School, Booth 001',
      ],

      [
        'TEST006',
        'Neha Sharma',
        'नेहा शर्मा',
        'Female',
        '9000000006',
        '1999-06-10',
        '27',
        'Anil Sharma',
        'अनिल शर्मा',
        'Sunita Sharma',
        '',
        'H-201',
        '001',
        '002',
        '1',
        'Community Hall, Booth 002',
      ],

      [
        'TEST007',
        'Mohit Gupta',
        'मोहित गुप्ता',
        'Male',
        '9000000007',
        '1988-01-19',
        '38',
        'Rakesh Gupta',
        'राकेश गुप्ता',
        'Usha Gupta',
        '',
        'H-202',
        '001',
        '002',
        '2',
        'Community Hall, Booth 002',
      ],

      [
        'TEST008',
        'Kavita Mishra',
        'कविता मिश्रा',
        'Female',
        '9000000008',
        '1990-12-03',
        '36',
        'Deepak Mishra',
        'दीपक मिश्रा',
        'Asha Mishra',
        '',
        'H-203',
        '001',
        '002',
        '3',
        'Community Hall, Booth 002',
      ],

      [
        'TEST009',
        'Sandeep Singh',
        'संदीप सिंह',
        'Male',
        '9000000009',
        '1975-05-25',
        '51',
        'Harish Singh',
        'हरीश सिंह',
        'Kamla Singh',
        '',
        'H-204',
        '001',
        '002',
        '4',
        'Community Hall, Booth 002',
      ],

      [
        'TEST010',
        'Anjali Verma',
        'अंजली वर्मा',
        'Female',
        '2000000010',
        '2002-10-17',
        '24',
        'Sunil Verma',
        'सुनील वर्मा',
        'Madhuri Verma',
        '',
        'H-205',
        '001',
        '002',
        '5',
        'Community Hall, Booth 002',
      ],
    ];

    /**
     * Escape CSV values correctly.
     * This protects commas, quotes and new lines.
     */
    const escapeCsvValue = (value: string) => {
      if (
        value.includes(',') ||
        value.includes('"') ||
        value.includes('\n')
      ) {
        return `"${value.replace(/"/g, '""')}"`;
      }

      return value;
    };

    const csvRows = sampleRows.map((row) =>
      row.map(escapeCsvValue).join(',')
    );

    const csvContent = [
      headers.join(','),
      ...csvRows,
    ].join('\n');

    const blob = new Blob(
      [csvContent],
      {
        type: 'text/csv;charset=utf-8;',
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;
    link.download =
      'booth_command_voter_import_sample_10_records.csv';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    toast.success(
      '10-record sample template downloaded'
    );
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const selectedAssembly = assemblies.find(
    (a) => a.id === assemblyId
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">

      {/* Header */}
      <div className="card p-6 border-l-4 border-l-indigo-600 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div className="flex items-center gap-4">

            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-sm flex-shrink-0">
              <Database className="w-7 h-7" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Import Voter Data
              </h1>

              <p className="text-sm text-gray-500 mt-0.5">
                Bulk import or update voter lists from Excel
                (.xlsx, .xls) and CSV electoral rolls
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={handleDownloadSample}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors shadow-xs cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-indigo-600" />
            Download 10-Record Sample
          </button>

        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left */}
        <div className="lg:col-span-7 space-y-6">

          {/* Assembly */}
          <div className="card p-6 space-y-4">

            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Layers className="w-5 h-5 text-indigo-600" />

              <h3 className="font-semibold text-gray-900">
                Target Constituency
              </h3>
            </div>

            <div>

              <label
                className="form-label"
                htmlFor="assemblySelect"
              >
                Select Assembly Constituency{' '}
                <span className="text-red-500">*</span>
              </label>

              <select
                id="assemblySelect"
                className="form-select text-sm py-2.5"
                value={assemblyId}
                onChange={(e) =>
                  setAssemblyId(e.target.value)
                }
              >

                <option value="">
                  Select assembly constituency...
                </option>

                {assemblies.map((a) => (
                  <option
                    key={a.id}
                    value={a.id}
                  >
                    #
                    {a.assemblyNumber ??
                      (
                        a as unknown as {
                          number?: string | number;
                        }
                      ).number}
                    {' — '}
                    {a.assemblyName ??
                      (
                        a as unknown as {
                          name?: string;
                        }
                      ).name}
                    {a.isActive ? ' (Active)' : ''}
                  </option>
                ))}

              </select>

              {selectedAssembly && (
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">

                  <span className="font-medium text-gray-700">
                    Selected:
                  </span>

                  <span>
                    District:{' '}
                    {selectedAssembly.district || '—'}
                  </span>

                  <span>•</span>

                  <span>
                    Election Year:{' '}
                    {selectedAssembly.electionYear || '—'}
                  </span>

                </div>
              )}

            </div>
          </div>

          {/* Upload */}
          <div className="card p-6 space-y-4">

            <div className="flex items-center justify-between pb-3 border-b border-gray-100">

              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />

                <h3 className="font-semibold text-gray-900">
                  Upload Voter File
                </h3>
              </div>

              <span className="text-xs text-gray-400 font-mono">
                Max size: 50MB
              </span>

            </div>

            <div
              className={clsx(
                'border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer',
                dragging
                  ? 'border-indigo-500 bg-indigo-50/80 scale-[1.01]'
                  : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50/80 bg-white'
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() =>
                setDragging(false)
              }
              onDrop={onDrop}
              onClick={() =>
                inputRef.current?.click()
              }
            >

              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  handleFile(e.target.files[0])
                }
              />

              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Upload className="w-8 h-8" />
              </div>

              <p className="text-base font-semibold text-gray-800">
                {dragging
                  ? 'Drop your voter spreadsheet here'
                  : 'Drag & drop your file here, or click to browse'}
              </p>

              <p className="text-xs text-gray-500 mt-1.5">
                Supported formats:{' '}
                <strong className="text-gray-700">
                  .xlsx
                </strong>
                ,{' '}
                <strong className="text-gray-700">
                  .xls
                </strong>
                ,{' '}
                <strong className="text-gray-700">
                  .csv
                </strong>
              </p>

              <div className="mt-4 flex items-center justify-center gap-2">

                <span className="px-2.5 py-1 rounded bg-gray-100 text-gray-600 text-[11px] font-mono font-medium">
                  Excel 2007+ (.xlsx)
                </span>

                <span className="px-2.5 py-1 rounded bg-gray-100 text-gray-600 text-[11px] font-mono font-medium">
                  CSV (Comma-delimited)
                </span>

              </div>

            </div>

            {/* Selected file */}
            {file && (
              <div className="flex items-center justify-between p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">

                <div className="flex items-center gap-3 min-w-0">

                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">

                    <p className="text-sm font-bold text-gray-900 truncate">
                      {file.name}
                    </p>

                    <p className="text-xs text-emerald-800">
                      {formatSize(file.size)} • Ready for import
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setResult(null);
                    setError('');
                  }}
                  className="text-gray-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                  title="Remove file"
                >
                  <XCircle className="w-5 h-5" />
                </button>

              </div>
            )}

            {/* Import button */}
            <div className="pt-2">

              <Button
                variant="primary"
                size="lg"
                icon={
                  importing ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )
                }
                loading={importing}
                disabled={
                  !file ||
                  !assemblyId ||
                  importing
                }
                onClick={handleImport}
                className="w-full justify-center py-3 text-base font-semibold shadow-md"
              >
                {importing
                  ? 'Processing & Merging Records...'
                  : 'Start Voter Import'}
              </Button>

            </div>

          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">

              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />

              <div>
                <p className="text-sm font-semibold text-rose-900">
                  Import Encountered an Error
                </p>

                <p className="text-xs text-rose-800 mt-0.5">
                  {error}
                </p>
              </div>

            </div>
          )}

        </div>

        {/* Right */}
        <div className="lg:col-span-5 space-y-6">

          {/* Smart merge */}
          <div className="card p-6 border-t-4 border-t-blue-500">

            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100">

              <ShieldCheck className="w-5 h-5 text-blue-600" />

              <h3 className="font-semibold text-gray-900">
                Smart Merge & Ground Data Protection
              </h3>

            </div>

            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              Voter records are matched based on{' '}
              <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-800">
                Assembly + EPIC
              </code>
              . Official voter roll updates do not overwrite
              valuable ground data collected by volunteers.
            </p>

            <div className="space-y-4">

              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">

                <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">

                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />

                  Preserved Field Data
                </p>

                <ul className="text-xs text-emerald-800 space-y-1 list-disc list-inside">

                  <li>
                    Voter Mobile Numbers
                  </li>

                  <li>
                    Classification
                    (Green / Yellow / Red / Black)
                  </li>

                  <li>
                    Ground Verification Status
                  </li>

                  <li>
                    Vote Status
                  </li>

                </ul>

              </div>

              <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200">

                <p className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">

                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />

                  Updated Electoral Roll Data
                </p>

                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">

                  <li>
                    Name (English & Hindi)
                  </li>

                  <li>
                    Father / Mother / Husband Name
                  </li>

                  <li>
                    Age & Gender
                  </li>

                  <li>
                    Date of Birth
                  </li>

                  <li>
                    House Number
                  </li>

                  <li>
                    Assembly Number
                  </li>

                  <li>
                    Part Number & Serial Number
                  </li>

                  <li>
                    Polling Station
                  </li>

                </ul>

              </div>

            </div>
          </div>

          {/* Expected columns */}
          <div className="card p-6">

            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100">

              <Info className="w-5 h-5 text-indigo-600" />

              <h3 className="font-semibold text-gray-900">
                Expected Column Headers
              </h3>

            </div>

            <p className="text-xs text-gray-500 mb-3">
              Column names are case-insensitive and should
              match the backend import format.
            </p>

            <div className="space-y-2 text-xs">

              <div className="grid grid-cols-2 gap-2">

                {[
                  ['epicNo', 'Required'],
                  ['epicName', 'Required'],
                  ['epicName1', 'Optional'],
                  ['Gender', 'Optional'],
                  ['mobileNo', 'Optional'],
                  ['enrollDob', 'Optional'],
                  ['Age', 'Optional'],
                  ['fathersOrGuardian', 'Optional'],
                  ['fathersOrGuardianHindi', 'Optional'],
                  ['mothersName', 'Optional'],
                  ['spouseName', 'Optional'],
                  ['houseNo', 'Optional'],
                  ['acNo', 'Optional'],
                  ['partNo', 'Optional'],
                  ['partSerial', 'Optional'],
                  ['pollingStation', 'Optional'],
                ].map(([name, requirement]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between gap-2 p-2 rounded bg-gray-50 border border-gray-100"
                  >
                    <span className="font-mono font-medium text-indigo-700">
                      {name}
                    </span>

                    <span
                      className={
                        requirement === 'Required'
                          ? 'text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded'
                          : 'text-[10px] text-gray-400'
                      }
                    >
                      {requirement}
                    </span>
                  </div>
                ))}
              </div>

            </div>

          </div>

          {/* Sample information */}
          <div className="card p-5 bg-indigo-50/50 border border-indigo-100">

            <div className="flex items-start gap-3">

              <Info className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />

              <div>

                <p className="text-sm font-semibold text-indigo-900">
                  Sample data
                </p>

                <p className="text-xs text-indigo-800 mt-1 leading-relaxed">
                  The downloaded file contains 10 completely
                  synthetic voter records for testing the import
                  workflow. It does not contain real voter data.
                </p>

              </div>

            </div>

          </div>

        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="card p-6 space-y-6 border-t-4 border-t-emerald-500 shadow-sm">

          <div className="flex items-center justify-between pb-4 border-b border-gray-100">

            <div className="flex items-center gap-2.5">

              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>

                <h3 className="text-lg font-bold text-gray-900">
                  Import Completed Successfully
                </h3>

                <p className="text-xs text-gray-500">
                  Summary of batch processing and database reconciliation
                </p>

              </div>

            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-400">

              <Clock className="w-3.5 h-3.5" />

              <span>
                Processed just now
              </span>

            </div>

          </div>

          {/* KPI */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">

              <p className="text-2xl font-bold text-gray-900">
                {result.totalRows?.toLocaleString() ?? 0}
              </p>

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">
                Total Rows
              </p>

            </div>

            <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 text-center">

              <p className="text-2xl font-bold text-blue-800">
                {result.validRows?.toLocaleString() ?? 0}
              </p>

              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-1">
                Valid Records
              </p>

            </div>

            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 text-center">

              <p className="text-2xl font-bold text-emerald-800">
                {result.importedRows?.toLocaleString() ?? 0}
              </p>

              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mt-1">
                Imported / Updated
              </p>

            </div>

            <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 text-center">

              <p className="text-2xl font-bold text-amber-800">
                {result.duplicateRows?.toLocaleString() ?? 0}
              </p>

              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mt-1">
                Duplicates
              </p>

            </div>

            <div className="p-4 bg-rose-50/70 rounded-xl border border-rose-200 text-center">

              <p className="text-2xl font-bold text-rose-800">
                {result.errorRows?.toLocaleString() ?? 0}
              </p>

              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mt-1">
                Errors
              </p>

            </div>

          </div>

          {/* Errors */}
          {result.errors &&
            result.errors.length > 0 && (
              <div className="space-y-3 pt-2">

                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">

                  <AlertCircle className="w-4 h-4 text-rose-600" />

                  Row-Level Errors (
                  {result.errors.length}
                  )

                </h4>

                <div className="table-container shadow-xs">

                  <table className="data-table text-xs">

                    <thead>
                      <tr>
                        <th className="w-20">
                          Row
                        </th>

                        <th className="w-64">
                          Error Description
                        </th>

                        <th>
                          Raw Data Preview
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      {result.errors
                        .slice(0, 50)
                        .map((err, i) => (
                          <tr key={i}>

                            <td className="font-mono font-bold text-gray-700">
                              {err.row}
                            </td>

                            <td className="text-rose-700 font-medium">
                              {err.error}
                            </td>

                            <td className="text-gray-600 font-mono text-[11px] max-w-lg truncate">
                              {err.data
                                ? JSON.stringify(err.data)
                                : '—'}
                            </td>

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