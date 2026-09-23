import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { assembliesApi } from '../api/assemblies.api';
import type { Assembly } from '../types';
import { SkeletonRow, EmptyState, ErrorState } from '../components/ui';
import { Building2, CheckCircle } from 'lucide-react';

function AssemblyRow({ a }: { a: Assembly }) {
  return (
    <tr className={a.isActive ? 'bg-indigo-50/50' : ''}>
      <td className="px-4 py-3 font-medium text-gray-900">
        <div className="flex items-center gap-2">
          {a.isActive && <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />}
          #{a.assemblyNumber}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-gray-900">{a.assemblyName}</div>
        {a.isActive && <div className="text-xs text-indigo-600 font-medium">● Active Assembly</div>}
      </td>
      <td className="px-4 py-3 text-gray-600">{a.district}</td>
      <td className="px-4 py-3 text-gray-600">{a.electionYear}</td>
      <td className="px-4 py-3">
        {a.isActive
          ? <span className="badge badge-indigo">Active</span>
          : <span className="badge badge-gray">Inactive</span>}
      </td>
      <td className="px-4 py-3 text-gray-600">{a._count?.booths ?? '—'}</td>
      <td className="px-4 py-3 text-gray-600">{a._count?.voters?.toLocaleString() ?? '—'}</td>
      <td className="px-4 py-3">
        <Link to={`/assemblies/${a.id}`} className="btn btn-secondary btn-sm">View</Link>
      </td>
    </tr>
  );
}

export function AssembliesPage() {
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    assembliesApi.getAll()
      .then((res) => {
        const d = res.data;
        setAssemblies(Array.isArray(d) ? d : (d as unknown as { assemblies?: Assembly[] }).assemblies ?? []);
      })
      .catch(() => setError('Failed to load assemblies'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Assemblies</h1>
          <p className="page-subtitle">Only one active assembly is supported at a time</p>
        </div>
      </div>

      {/* Active assembly warning banner */}
      {!loading && assemblies.length > 0 && !assemblies.some(a => a.isActive) && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            Warning: No active assembly is configured. Voter imports and analytics will not function correctly.
          </p>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Number</th>
              <th>Assembly Name</th>
              <th>District</th>
              <th>Election Year</th>
              <th>Status</th>
              <th>Booths</th>
              <th>Voters</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
            ) : error ? (
              <tr><td colSpan={8}><ErrorState message={error} onRetry={load} /></td></tr>
            ) : assemblies.length === 0 ? (
              <tr><td colSpan={8}><EmptyState icon={<Building2 className="w-12 h-12" />} title="No assemblies found" /></td></tr>
            ) : (
              assemblies.map((a) => <AssemblyRow key={a.id} a={a} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
