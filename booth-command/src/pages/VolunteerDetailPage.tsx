import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { volunteersApi } from '../api/volunteers.api';
import { boothsApi } from '../api/booths.api';
import type { Volunteer, Booth } from '../types';
import { Button, Spinner, ErrorState, Select } from '../components/ui';
import { VolunteerStatusBadge } from '../components/shared/Badges';
import { ConfirmDialog } from '../components/ui/Modal';
import { ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/error';

export function VolunteerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusConfirm, setStatusConfirm] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [selectedBooth, setSelectedBooth] = useState('');

  const load = () => {
    if (!id) return;
    volunteersApi.getOne(id)
      .then((r) => { setVolunteer(r.data); setSelectedBooth(r.data.boothId ?? ''); })
      .catch((err) => setError(getErrorMessage(err, 'Volunteer not found')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    boothsApi.getAll({ limit: 200 }).then((r) => {
      const d = r.data as unknown as { booths?: Booth[] } | Booth[];
      setBooths(Array.isArray(d) ? d : d.booths ?? []);
    }).catch(() => {});
  }, [id]);

  const toggleStatus = async () => {
    if (!volunteer) return;
    setStatusLoading(true);
    try {
      await volunteersApi.update(volunteer.id, { status: volunteer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      toast.success('Volunteer status updated');
      setStatusConfirm(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update status'));
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!volunteer) return;
    setAssignLoading(true);
    try {
      if (selectedBooth) {
        await volunteersApi.assignBooth(volunteer.id, selectedBooth);
        toast.success('Booth assigned successfully');
      } else {
        await volunteersApi.unassignBooth(volunteer.id);
        toast.success('Booth unassigned');
      }
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update booth assignment'));
    } finally {
      setAssignLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error || !volunteer) return <ErrorState message={error || 'Volunteer not found'} />;

  const boothOpts = [{ value: '', label: 'Unassigned' }, ...booths.map((b) => ({ value: b.id, label: `#${b.boothNumber} ${b.boothName}` }))];

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      <div>
        <Link to="/volunteers" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline mb-3">
          <ChevronLeft className="w-4 h-4" /> Back to Volunteers
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="page-title">{volunteer.name}</h1>
          <VolunteerStatusBadge value={volunteer.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Details */}
        <div className="card p-5 space-y-3">
          <h3 className="section-title">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-gray-500 text-xs">Name</p><p className="font-medium">{volunteer.name}</p></div>
            <div><p className="text-gray-500 text-xs">Mobile</p><p className="font-medium font-mono">{volunteer.mobile}</p></div>
            <div><p className="text-gray-500 text-xs">Status</p><VolunteerStatusBadge value={volunteer.status} /></div>
            <div><p className="text-gray-500 text-xs">Created</p><p className="font-medium">{new Date(volunteer.createdAt).toLocaleDateString()}</p></div>
          </div>
        </div>

        {/* Booth Assignment */}
        <div className="card p-5 space-y-3">
          <h3 className="section-title">Booth Assignment</h3>
          <p className="text-xs text-gray-500">
            {volunteer.booth
              ? `Currently assigned to: Booth #${volunteer.booth.boothNumber} — ${volunteer.booth.boothName}`
              : 'Not assigned to any booth'}
          </p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Select label="Assign to Booth" options={boothOpts} value={selectedBooth} onChange={(e) => setSelectedBooth(e.target.value)} />
            </div>
            <Button variant="primary" size="sm" onClick={handleAssign} loading={assignLoading}>
              {selectedBooth ? 'Assign' : 'Unassign'}
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="card p-5 space-y-3">
          <h3 className="section-title">Actions</h3>
          <div className="flex gap-3">
            <Button variant={volunteer.status === 'ACTIVE' ? 'danger' : 'success'} size="sm" onClick={() => setStatusConfirm(true)}>
              {volunteer.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} Volunteer
            </Button>
          </div>
          <p className="text-xs text-gray-400">Passwords are securely hashed and cannot be viewed. Contact support to reset.</p>
        </div>
      </div>

      <ConfirmDialog
        isOpen={statusConfirm}
        onClose={() => setStatusConfirm(false)}
        onConfirm={toggleStatus}
        title={volunteer.status === 'ACTIVE' ? 'Deactivate Volunteer' : 'Activate Volunteer'}
        message={`Are you sure you want to ${volunteer.status === 'ACTIVE' ? 'deactivate' : 'activate'} ${volunteer.name}?`}
        confirmVariant={volunteer.status === 'ACTIVE' ? 'danger' : 'success'}
        confirmLabel={volunteer.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        loading={statusLoading}
      />
    </div>
  );
}
