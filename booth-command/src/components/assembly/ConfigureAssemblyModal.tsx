import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui';
import { Building2, Layers, MapPin, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getErrorMessage } from '../../utils/error';

interface ConfigureAssemblyModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSubmit: (data: { number: string; name: string; district: string; electionYear: number }) => Promise<void>;
  isForced?: boolean; // When true, cannot close without configuring
}

export function ConfigureAssemblyModal({
  isOpen,
  onClose,
  onSubmit,
  isForced = false,
}: ConfigureAssemblyModalProps) {
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [electionYear, setElectionYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedNumber = number.trim();
    const trimmedName = name.trim();
    const trimmedDistrict = district.trim();

    if (!trimmedNumber) {
      setError('Assembly number is required');
      return;
    }

    if (!trimmedName || trimmedName.length < 2) {
      setError('Assembly name must be at least 2 characters');
      return;
    }

    if (!trimmedDistrict || trimmedDistrict.length < 2) {
      setError('District name must be at least 2 characters');
      return;
    }

    if (!electionYear || electionYear < 2000 || electionYear > 2100) {
      setError('Please provide a valid election year (2000-2100)');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await onSubmit({
        number: trimmedNumber,
        name: trimmedName,
        district: trimmedDistrict,
        electionYear: Number(electionYear),
      });
      // Reset form
      setNumber('');
      setName('');
      setDistrict('');
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to configure assembly. Please try again.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isForced && onClose) {
          onClose();
        }
      }}
      title="Configure Assembly Constituency"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              One-Time Assembly Setup Required
            </h3>
            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
              No active assembly was found in the database. Configure your constituency details below to initialize voter management, booth mappings, and analytics.
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Assembly Number */}
          <div className="space-y-1.5">
            <label htmlFor="assembly-number" className="block text-xs font-semibold text-gray-700">
              Assembly Number (AC No) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="assembly-number"
                type="text"
                required
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="e.g. 173"
                className="w-full px-3 py-2 pl-9 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder:text-gray-400"
              />
              <Layers className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
            <p className="text-[11px] text-gray-500">Official constituency number (part of Part/Booth mappings)</p>
          </div>

          {/* Assembly Name */}
          <div className="space-y-1.5">
            <label htmlFor="assembly-name" className="block text-xs font-semibold text-gray-700">
              Assembly Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="assembly-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lucknow East"
                className="w-full px-3 py-2 pl-9 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder:text-gray-400"
              />
              <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
            <p className="text-[11px] text-gray-500">Name of the assembly constituency</p>
          </div>

          {/* District */}
          <div className="space-y-1.5">
            <label htmlFor="assembly-district" className="block text-xs font-semibold text-gray-700">
              District <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="assembly-district"
                type="text"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Lucknow"
                className="w-full px-3 py-2 pl-9 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder:text-gray-400"
              />
              <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
            <p className="text-[11px] text-gray-500">District in which this assembly is located</p>
          </div>

          {/* Election Year */}
          <div className="space-y-1.5">
            <label htmlFor="assembly-year" className="block text-xs font-semibold text-gray-700">
              Election Year <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="assembly-year"
                type="number"
                min="2000"
                max="2100"
                required
                value={electionYear}
                onChange={(e) => setElectionYear(parseInt(e.target.value, 10) || 0)}
                placeholder="e.g. 2026"
                className="w-full px-3 py-2 pl-9 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder:text-gray-400"
              />
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
            <p className="text-[11px] text-gray-500">Current or upcoming election cycle year</p>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Header Preview
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-slate-700">
              Assembly No: <strong className="text-slate-900">#{number.trim() || '—'}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-semibold text-slate-700">
              Name: <strong className="text-slate-900">{name.trim() || '—'}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-semibold text-slate-700">
              District: <strong className="text-slate-900">{district.trim() || '—'}</strong>
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          {!isForced && onClose && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={loading}
              onClick={onClose}
            >
              Cancel
            </Button>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            icon={<CheckCircle2 className="w-4 h-4" />}
            className="px-5 shadow-sm"
          >
            Save Assembly Details
          </Button>
        </div>
      </form>
    </Modal>
  );
}
