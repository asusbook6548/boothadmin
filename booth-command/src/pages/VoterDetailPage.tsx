import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { votersApi } from '../api/voters.api';
import type { Voter } from '../types';
import { Spinner, ErrorState } from '../components/ui';
import { ClassificationBadge, VerificationBadge, VoteStatusBadge } from '../components/shared/Badges';
import {
  ChevronLeft,
  User,
  Vote,
  Landmark,
  ShieldCheck,
  MapPin,
  Phone,
  Clock,
  Tag,
  Copy,
  Check,
  ExternalLink,
  History,
  Home,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function VoterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [voter, setVoter] = useState<Voter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    votersApi.getOne(id)
      .then((res) => {
        setVoter(res.data);
      })
      .catch(() => setError('Voter not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (error || !voter) return <ErrorState message={error || 'Voter not found'} />;

  // Safely resolve booth and assembly fields to avoid 'undefined'
  const rawBooth = voter.booth as (typeof voter.booth & { name?: string }) | undefined;
  const boothNumber = rawBooth?.boothNumber ?? voter.partNumber ?? null;
  const boothName = rawBooth?.boothName || rawBooth?.name || voter.pollingStationName || '';
  const boothVillage = rawBooth?.village || voter.village || '';

  const rawAssembly = voter.assembly as (typeof voter.assembly & { name?: string; number?: string | number }) | undefined;
  const assemblyName = rawAssembly?.assemblyName || rawAssembly?.name || '';
  const assemblyNumber = rawAssembly?.assemblyNumber ?? rawAssembly?.number ?? '';

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Breadcrumb & Quick Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/voters"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Voters
        </Link>
        <div className="text-xs text-gray-500 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-md border border-gray-200">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span>Last modified: {new Date(voter.updatedAt).toLocaleString()}</span>
        </div>
      </div>

      {/* Hero Profile Header Card */}
      <div className="card p-6 border-l-4 border-l-indigo-600 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold text-2xl shadow flex-shrink-0">
              {voter.name?.charAt(0)?.toUpperCase() || 'V'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  {voter.name}
                </h1>
                {voter.nameHindi && (
                  <span className="text-base text-gray-500 font-medium">
                    ({voter.nameHindi})
                  </span>
                )}
              </div>

              {/* Meta Chips */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {/* EPIC copy button */}
                <button
                  type="button"
                  onClick={() => copyToClipboard(voter.epic, 'EPIC')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 font-mono text-xs font-semibold transition-colors cursor-pointer"
                  title="Click to copy EPIC"
                >
                  <span>EPIC: {voter.epic}</span>
                  {copiedField === 'EPIC' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </button>

                {voter.gender && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                    {voter.gender}
                  </span>
                )}
                {voter.age && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                    {voter.age} yrs
                  </span>
                )}
                {voter.houseNumber && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                    <Home className="w-3 h-3 text-gray-400" />
                    House: {voter.houseNumber}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={`/classification?search=${voter.epic}`}
              className="btn btn-primary shadow-sm flex items-center gap-2"
            >
              <Tag className="w-4 h-4" />
              Update Classification
            </Link>
            {voter.booth && (
              <Link
                to={`/booths/${voter.booth.id}`}
                className="btn btn-secondary flex items-center gap-2"
              >
                <Landmark className="w-4 h-4 text-indigo-600" />
                View Booth
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* KPI / Status Summary Strip across the page */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Classification */}
        <div className="card p-4 flex items-center justify-between border-t-2 border-t-indigo-500 hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Classification
            </p>
            <div className="mt-1.5">
              <ClassificationBadge value={voter.classification} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Political affinity</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl">
            <Tag className="w-5 h-5 text-indigo-600" />
          </div>
        </div>

        {/* Verification */}
        <div className="card p-4 flex items-center justify-between border-t-2 border-t-blue-500 hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Field Verification
            </p>
            <div className="mt-1.5">
              <VerificationBadge value={voter.verification} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Door-to-door ground status</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>
        </div>

        {/* Vote Status */}
        <div className="card p-4 flex items-center justify-between border-t-2 border-t-emerald-500 hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Election Day Status
            </p>
            <div className="mt-1.5">
              <VoteStatusBadge value={voter.voteStatus} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Turnout confirmation</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <Vote className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        {/* Booth */}
        <div className="card p-4 flex items-center justify-between border-t-2 border-t-amber-500 hover:shadow-md transition-shadow">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Assigned Booth
            </p>
            <p className="text-sm font-bold text-gray-900 mt-1 truncate">
              {boothNumber ? `Booth #${boothNumber}` : '—'}
            </p>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {boothName || 'No station name'}
            </p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl flex-shrink-0">
            <Landmark className="w-5 h-5 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Main Content: 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Detailed Information Cards */}
        <div className="lg:col-span-7 space-y-6">
          {/* Basic / Personal Information */}
          <div className="card p-6">
            <div className="flex items-center gap-2 pb-4 mb-5 border-b border-gray-100">
              <User className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Personal Information</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</p>
                <p className="mt-1 font-medium text-gray-900">{voter.name || '—'}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name (Hindi)</p>
                <p className="mt-1 font-medium text-gray-900">{voter.nameHindi || '—'}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Father / Guardian</p>
                <p className="mt-1 font-medium text-gray-900">{voter.fatherName || '—'}</p>
              </div>

              {voter.fatherNameHindi && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Father Name (Hindi)</p>
                  <p className="mt-1 font-medium text-gray-900">{voter.fatherNameHindi}</p>
                </div>
              )}

              {voter.husbandName && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Husband Name</p>
                  <p className="mt-1 font-medium text-gray-900">{voter.husbandName}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</p>
                <p className="mt-1 font-medium text-gray-900">{voter.gender || '—'}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Age</p>
                <p className="mt-1 font-medium text-gray-900">{voter.age ? `${voter.age} years` : '—'}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile Number</p>
                <p className="mt-1 font-medium text-gray-900">
                  {voter.mobile ? (
                    <a
                      href={`tel:${voter.mobile}`}
                      className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline font-mono"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {voter.mobile}
                    </a>
                  ) : (
                    '—'
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">House Number</p>
                <p className="mt-1 font-medium text-gray-900">{voter.houseNumber || '—'}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Village / Locality</p>
                <p className="mt-1 font-medium text-gray-900">{voter.village || boothVillage || '—'}</p>
              </div>
            </div>
          </div>

          {/* Electoral Information */}
          <div className="card p-6">
            <div className="flex items-center gap-2 pb-4 mb-5 border-b border-gray-100">
              <Vote className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Electoral Information</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">EPIC Number</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono font-semibold text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                    {voter.epic}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(voter.epic, 'EPIC')}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    title="Copy EPIC"
                  >
                    {copiedField === 'EPIC' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Part Number</p>
                <p className="mt-1 font-medium text-gray-900">{voter.partNumber ?? '—'}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</p>
                <p className="mt-1 font-medium text-gray-900">{voter.serialNumber || voter.partSerial || '—'}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Polling Booth</p>
                <p className="mt-1 font-medium text-gray-900">
                  {boothNumber ? (
                    <span>#{boothNumber}{boothName ? ` — ${boothName}` : ''}</span>
                  ) : (
                    '—'
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Assembly Constituency</p>
                <p className="mt-1 font-medium text-gray-900">
                  {assemblyName ? (
                    <span>{assemblyNumber ? `#${assemblyNumber} ` : ''}{assemblyName}</span>
                  ) : (
                    '—'
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">District</p>
                <p className="mt-1 font-medium text-gray-900">{voter.assembly?.district || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Spotlight Cards & Audit Metadata */}
        <div className="lg:col-span-5 space-y-6">
          {/* Polling Booth Spotlight Card */}
          <div className="card p-6 bg-gradient-to-br from-white to-gray-50">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">Polling Station</h3>
              </div>
              {voter.booth && (
                <Link
                  to={`/booths/${voter.booth.id}`}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  View details <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            {voter.booth ? (
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Booth #{boothNumber}
                  </span>
                  <h4 className="text-base font-bold text-gray-900 mt-2">
                    {boothName || `Polling Station #${boothNumber}`}
                  </h4>
                  {boothVillage && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      Village / Locality: {boothVillage}
                    </p>
                  )}
                </div>

                <Link
                  to={`/booths/${voter.booth.id}`}
                  className="btn btn-secondary w-full justify-center text-sm py-2"
                >
                  <Landmark className="w-4 h-4 text-indigo-600" />
                  Open Booth Dashboard
                </Link>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                No polling booth assigned
              </div>
            )}
          </div>

          {/* Audit / System Metadata Card */}
          <div className="card p-6">
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-gray-100">
              <Clock className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Audit & System Record</h3>
            </div>

            <div className="space-y-3.5 text-sm">
              <div className="flex items-start justify-between py-1 border-b border-gray-50">
                <span className="text-xs font-medium text-gray-500">Record Created</span>
                <span className="text-xs font-semibold text-gray-800">
                  {new Date(voter.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="flex items-start justify-between py-1 border-b border-gray-50">
                <span className="text-xs font-medium text-gray-500">Last Updated</span>
                <span className="text-xs font-semibold text-gray-800">
                  {new Date(voter.updatedAt).toLocaleString()}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-500">Voter Record ID</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(voter.id, 'Voter ID')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedField === 'Voter ID' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy ID
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-gray-50 p-2 rounded border border-gray-200 font-mono text-xs text-gray-700 break-all select-all">
                  {voter.id}
                </div>
              </div>
            </div>
          </div>

          {/* Classification History Timeline (if available) */}
          {voter.classificationHistory && voter.classificationHistory.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-2 pb-4 mb-4 border-b border-gray-100">
                <History className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">Classification History</h3>
              </div>

              <div className="space-y-3">
                {voter.classificationHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-gray-50 border border-gray-100 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {item.oldValue ? (
                          <span className="text-gray-500">{item.oldValue} →</span>
                        ) : null}
                        <ClassificationBadge value={item.newValue} />
                      </div>
                      <p className="text-gray-400 mt-1">
                        Changed by:{' '}
                        {item.changedBy?.name || item.changedByUser?.name || 'System / Volunteer'}
                      </p>
                    </div>
                    <span className="text-gray-400 text-[11px]">
                      {new Date(item.changedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
