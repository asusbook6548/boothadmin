import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { boothsApi } from '../api/booths.api';
import { analyticsApi } from '../api/analytics.api';
import { votersApi } from '../api/voters.api';
import type { Booth, SingleBoothAnalytics, Voter } from '../types';
import { Spinner, ErrorState, EmptyState, Pagination } from '../components/ui';
import { ClassificationBadge, VerificationBadge, BoothStatusBadge } from '../components/shared/Badges';
import { ChevronLeft, Landmark } from 'lucide-react';

export function BoothDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [booth, setBooth] = useState<Booth | null>(null);
  const [analytics, setAnalytics] = useState<SingleBoothAnalytics | null>(null);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [voterPage, setVoterPage] = useState(1);
  const [voterTotal, setVoterTotal] = useState(0);
  const [voterTotalPages, setVoterTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [voterLoading, setVoterLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      boothsApi.getOne(id),
      analyticsApi.getBoothById(id).catch(() => ({ data: null })),
    ]).then(([boothRes, analyticsRes]) => {
      const rawBoothObj = (boothRes.data as unknown as { booth?: Booth })?.booth ?? boothRes.data;
      if (rawBoothObj) {
        if (!rawBoothObj.boothName && (rawBoothObj as unknown as { name?: string }).name) {
          rawBoothObj.boothName = (rawBoothObj as unknown as { name: string }).name;
        }
      }
      setBooth(rawBoothObj);

      const rawAnObj = ((analyticsRes as unknown as { data?: unknown })?.data) as Record<string, unknown> | null;
      const rawAn = (rawAnObj?.booth ?? rawAnObj) as Record<string, unknown> | null;
      if (rawAn) {
        const v = (rawAn.voters ?? {}) as Record<string, number>;
        const p = (rawAn.percentages ?? {}) as Record<string, number>;
        const a = (rawAn.analysis ?? {}) as Record<string, string>;
        const safeNum = (val: unknown): number => (typeof val === 'number' && !isNaN(val) ? val : 0);

        const normalizedAn: SingleBoothAnalytics = {
          booth: rawBoothObj,
          totalVoters: safeNum(v.total ?? rawAn.totalVoters),
          greenCount: safeNum(v.green ?? rawAn.greenCount),
          yellowCount: safeNum(v.yellow ?? rawAn.yellowCount),
          redCount: safeNum(v.red ?? rawAn.redCount),
          blackCount: safeNum(v.black ?? rawAn.blackCount),
          unclassifiedCount: safeNum(v.unclassified ?? rawAn.unclassifiedCount),
          greenPercent: safeNum(p.green ?? rawAn.greenPercent),
          yellowPercent: safeNum(p.yellow ?? rawAn.yellowPercent),
          redPercent: safeNum(p.red ?? rawAn.redPercent),
          blackPercent: safeNum(p.black ?? rawAn.blackPercent),
          unclassifiedPercent: safeNum(p.unclassified ?? rawAn.unclassifiedPercent),
          verifiedCount: safeNum(v.verified ?? rawAn.verifiedCount),
          unverifiedCount: safeNum(v.unverified ?? rawAn.unverifiedCount),
          verifiedPercent: safeNum(p.verified ?? rawAn.verifiedPercent),
          strength: String(a.greenStrength ?? rawAn.strength ?? '—'),
          opportunity: String(a.yellowOpportunity ?? rawAn.opportunity ?? '—'),
          confidence: String(a.dataConfidence ?? rawAn.confidence ?? '—'),
        };
        setAnalytics(normalizedAn);
      } else {
        setAnalytics(null);
      }
    }).catch(() => setError('Failed to load booth')).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setVoterLoading(true);
    votersApi.getAll({ boothId: id, page: voterPage, limit: 20 })
      .then((res) => {
        const raw = (res.data as unknown as { voters?: Voter[]; data?: Voter[]; total?: number; totalPages?: number; pagination?: { total: number; totalPages: number } }) ?? {};
        const list = raw.voters ?? raw.data ?? (Array.isArray(raw) ? raw : []);
        const total = typeof raw.total === 'number' ? raw.total : (raw.pagination?.total ?? list.length);
        const totalPages = typeof raw.totalPages === 'number' ? raw.totalPages : (raw.pagination?.totalPages ?? Math.max(1, Math.ceil(total / 20)));
        setVoters(list);
        setVoterTotal(total);
        setVoterTotalPages(totalPages);
      })
      .finally(() => setVoterLoading(false));
  }, [id, voterPage]);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error || !booth) return <ErrorState message={error || 'Booth not found'} />;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link to="/booths" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline mb-3">
          <ChevronLeft className="w-4 h-4" /> Back to Booths
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="page-title">Booth #{booth.boothNumber} — {booth.boothName ?? (booth as unknown as { name?: string }).name}</h1>
          <BoothStatusBadge value={booth.status} />
        </div>
      </div>

      {/* Booth Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5 space-y-3">
          <h3 className="section-title">Booth Information</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-gray-500 text-xs">Booth Number</p><p className="font-medium">#{booth.boothNumber}</p></div>
            <div><p className="text-gray-500 text-xs">Village</p><p className="font-medium">{booth.village ?? '—'}</p></div>
            <div><p className="text-gray-500 text-xs">Volunteer</p><p className="font-medium">{booth.volunteer?.name ?? 'Unassigned'}</p></div>
            <div><p className="text-gray-500 text-xs">Volunteer Mobile</p><p className="font-medium">{booth.volunteer?.mobile ?? '—'}</p></div>
            <div><p className="text-gray-500 text-xs">Total Voters</p><p className="font-medium">{booth._count?.voters?.toLocaleString() ?? voterTotal.toLocaleString()}</p></div>
          </div>
        </div>

        {analytics && (
          <div className="card p-5 space-y-3">
            <h3 className="section-title">Booth Analytics</h3>
            <div className="space-y-2">
              {[
                { label: 'Green', pct: analytics.greenPercent, count: analytics.greenCount, color: '#10b981' },
                { label: 'Yellow', pct: analytics.yellowPercent, count: analytics.yellowCount, color: '#f59e0b' },
                { label: 'Red', pct: analytics.redPercent, count: analytics.redCount, color: '#ef4444' },
                { label: 'Black', pct: analytics.blackPercent, count: analytics.blackCount, color: '#1e293b' },
                { label: 'Unclassified', pct: analytics.unclassifiedPercent, count: analytics.unclassifiedCount, color: '#d1d5db' },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>{row.label}</span>
                    <span>{row.count} ({row.pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-1.5 rounded-full" style={{ width: `${row.pct}%`, backgroundColor: row.color }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-2 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-gray-500">Verified</p>
                <p className="font-semibold text-gray-900">{analytics.verifiedPercent.toFixed(1)}%</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-gray-500">Strength</p>
                <p className="font-semibold text-gray-900">{analytics.strength}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-gray-500">Confidence</p>
                <p className="font-semibold text-gray-900">{analytics.confidence}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Voters */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="section-title mb-0">Voters in this Booth</h3>
          <p className="text-xs text-gray-500 mt-1">{voterTotal.toLocaleString()} total voters</p>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>EPIC</th>
              <th>Name</th>
              <th>Gender</th>
              <th>Age</th>
              <th>Classification</th>
              <th>Verification</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {voterLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((__, j) => <td key={j} className="px-4 py-3"><div className="skeleton h-4 w-full" /></td>)}</tr>
              ))
            ) : voters.length === 0 ? (
              <tr><td colSpan={7}><EmptyState icon={<Landmark className="w-10 h-10" />} title="No voters found for this booth" /></td></tr>
            ) : (
              voters.map((v) => (
                <tr key={v.id}>
                  <td className="font-mono text-xs text-gray-700">{v.epic}</td>
                  <td className="font-medium text-gray-900">{v.name}</td>
                  <td className="text-gray-600">{v.gender ?? '—'}</td>
                  <td className="text-gray-600">{v.age ?? '—'}</td>
                  <td><ClassificationBadge value={v.classification} /></td>
                  <td><VerificationBadge value={v.verification} /></td>
                  <td><Link to={`/voters/${v.id}`} className="btn btn-secondary btn-sm">View</Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!voterLoading && voterTotalPages > 1 && (
          <Pagination page={voterPage} totalPages={voterTotalPages} total={voterTotal} limit={20} onPageChange={setVoterPage} />
        )}
      </div>
    </div>
  );
}
