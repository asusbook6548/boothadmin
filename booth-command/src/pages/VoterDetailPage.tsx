import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { votersApi } from '../api/voters.api';
import type { Voter } from '../types';
import { Spinner, ErrorState } from '../components/ui';
import { ClassificationBadge, VerificationBadge, VoteStatusBadge } from '../components/shared/Badges';
import { ChevronLeft } from 'lucide-react';

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 w-40 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right">{value ?? '—'}</span>
    </div>
  );
}

export function VoterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [voter, setVoter] = useState<Voter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    votersApi.getOne(id)
      .then((res) => setVoter(res.data))
      .catch(() => setError('Voter not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error || !voter) return <ErrorState message={error || 'Voter not found'} />;

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <Link to="/voters" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline mb-3">
          <ChevronLeft className="w-4 h-4" /> Back to Voters
        </Link>
        <h1 className="page-title">{voter.name}</h1>
        <p className="page-subtitle">EPIC: {voter.epic}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Info */}
        <div className="card p-5">
          <h3 className="section-title">Basic Information</h3>
          <InfoRow label="Full Name" value={voter.name} />
          <InfoRow label="Name (Hindi)" value={voter.nameHindi} />
          <InfoRow label="Father Name" value={voter.fatherName} />
          <InfoRow label="Gender" value={voter.gender} />
          <InfoRow label="Age" value={voter.age} />
          <InfoRow label="Mobile" value={voter.mobile} />
        </div>

        {/* Electoral Info */}
        <div className="card p-5">
          <h3 className="section-title">Electoral Information</h3>
          <InfoRow label="EPIC Number" value={voter.epic} />
          <InfoRow label="Part Number" value={voter.partNumber} />
          <InfoRow label="Serial Number" value={voter.serialNumber} />
          <InfoRow label="House Number" value={voter.houseNumber} />
          <InfoRow label="Booth" value={voter.booth ? `#${voter.booth.boothNumber} — ${voter.booth.boothName}` : undefined} />
          <InfoRow label="Assembly" value={voter.assembly?.assemblyName} />
        </div>

        {/* Classification & Status */}
        <div className="card p-5">
          <h3 className="section-title">Classification & Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Classification</span>
              <ClassificationBadge value={voter.classification} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Verification</span>
              <VerificationBadge value={voter.verification} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Vote Status</span>
              <VoteStatusBadge value={voter.voteStatus} />
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="card p-5">
          <h3 className="section-title">Audit / History</h3>
          <InfoRow label="Record Created" value={new Date(voter.createdAt).toLocaleString()} />
          <InfoRow label="Last Updated" value={new Date(voter.updatedAt).toLocaleString()} />
          <InfoRow label="Voter ID" value={voter.id} />
        </div>
      </div>

      <div className="flex gap-3">
        <Link to={`/classification?search=${voter.epic}`} className="btn btn-primary btn-sm">
          Update Classification
        </Link>
        {voter.booth && (
          <Link to={`/booths/${voter.booth.id}`} className="btn btn-secondary btn-sm">
            View Booth
          </Link>
        )}
      </div>
    </div>
  );
}
