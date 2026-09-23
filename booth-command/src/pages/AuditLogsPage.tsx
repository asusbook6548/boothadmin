import { ClipboardList } from 'lucide-react';
import { EmptyState } from '../components/ui';

export function AuditLogsPage() {
  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Audit Logs</h1>
        <p className="page-subtitle">System activity and change history</p>
      </div>

      <div className="card p-8">
        <EmptyState
          icon={<ClipboardList className="w-14 h-14 text-gray-300" />}
          title="Audit Logs API Not Yet Available"
          description="The backend does not currently expose an audit log listing endpoint. Classification changes are internally tracked in ClassificationHistory. Contact the backend team to expose GET /api/audit-logs."
        />
        <div className="mt-6 max-w-lg mx-auto p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <p className="font-semibold mb-1">Classification History is Tracked</p>
          <p>Every classification change (single or bulk) is automatically recorded in the database with actor, timestamp, old value, and new value. An admin API endpoint is needed to surface this data here.</p>
        </div>
      </div>
    </div>
  );
}
