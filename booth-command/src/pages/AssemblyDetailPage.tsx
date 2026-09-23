import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { assembliesApi } from '../api/assemblies.api';
import type { Assembly } from '../types';
import { Spinner, ErrorState } from '../components/ui';
import { ChevronLeft, Building2, Calendar, MapPin, Hash } from 'lucide-react';

export function AssemblyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [assembly, setAssembly] = useState<Assembly | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    assembliesApi.getOne(id)
      .then((res) => setAssembly(res.data))
      .catch(() => setError('Assembly not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error || !assembly) return <ErrorState message={error || 'Assembly not found'} />;

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <Link to="/assemblies" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline mb-3">
          <ChevronLeft className="w-4 h-4" /> Back to Assemblies
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="page-title">{assembly.assemblyName}</h1>
          {assembly.isActive && <span className="badge badge-indigo">Active</span>}
        </div>
      </div>

      <div className="card divide-y divide-gray-100">
        {[
          { icon: <Hash className="w-4 h-4 text-gray-400" />, label: 'Assembly Number', value: `#${assembly.assemblyNumber}` },
          { icon: <MapPin className="w-4 h-4 text-gray-400" />, label: 'District', value: assembly.district },
          { icon: <Calendar className="w-4 h-4 text-gray-400" />, label: 'Election Year', value: assembly.electionYear },
          { icon: <Building2 className="w-4 h-4 text-gray-400" />, label: 'Total Booths', value: assembly._count?.booths ?? '—' },
          { icon: <Building2 className="w-4 h-4 text-gray-400" />, label: 'Total Voters', value: assembly._count?.voters?.toLocaleString() ?? '—' },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-3 px-5 py-4">
            {row.icon}
            <div className="flex-1">
              <p className="text-xs text-gray-500 font-medium">{row.label}</p>
              <p className="text-sm text-gray-900 font-medium mt-0.5">{row.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Link to={`/booths?assemblyId=${assembly.id}`} className="btn btn-primary btn-sm">View Booths</Link>
        <Link to={`/voters?assemblyId=${assembly.id}`} className="btn btn-secondary btn-sm">View Voters</Link>
      </div>
    </div>
  );
}
