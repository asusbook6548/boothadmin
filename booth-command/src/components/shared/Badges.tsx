import type { Classification, Verification, VoteStatus, UserStatus, VolunteerStatus, BoothStatus } from '../../types';

// ============================================================
// CLASSIFICATION BADGE
// ============================================================
export function ClassificationBadge({ value }: { value?: Classification | null }) {
  if (!value) return <span className="badge badge-gray">Unclassified</span>;
  const map: Record<Classification, string> = {
    GREEN: 'badge-green',
    YELLOW: 'badge-yellow',
    RED: 'badge-red',
    BLACK: 'badge-black',
  };
  return <span className={`badge ${map[value]}`}>{value}</span>;
}

// ============================================================
// VERIFICATION BADGE
// ============================================================
export function VerificationBadge({ value }: { value: Verification }) {
  return value === 'VERIFIED'
    ? <span className="badge badge-blue">Verified</span>
    : <span className="badge badge-gray">Unverified</span>;
}

// ============================================================
// VOTE STATUS BADGE
// ============================================================
export function VoteStatusBadge({ value }: { value: VoteStatus }) {
  return value === 'DONE'
    ? <span className="badge badge-green">Done</span>
    : <span className="badge badge-gray">Pending</span>;
}

// ============================================================
// USER STATUS BADGE
// ============================================================
export function UserStatusBadge({ value }: { value: UserStatus }) {
  return value === 'ACTIVE'
    ? <span className="badge badge-green">Active</span>
    : <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>Inactive</span>;
}

// ============================================================
// VOLUNTEER STATUS BADGE
// ============================================================
export function VolunteerStatusBadge({ value }: { value: VolunteerStatus }) {
  return value === 'ACTIVE'
    ? <span className="badge badge-green">Active</span>
    : <span className="badge badge-gray">Inactive</span>;
}

// ============================================================
// BOOTH STATUS BADGE
// ============================================================
export function BoothStatusBadge({ value }: { value: BoothStatus }) {
  const map: Record<BoothStatus, string> = {
    NOT_STARTED: 'badge-gray',
    VOTING_STARTED: 'badge-blue',
    PROBLEM: 'badge-red',
  };
  const labels: Record<BoothStatus, string> = {
    NOT_STARTED: 'Not Started',
    VOTING_STARTED: 'Active',
    PROBLEM: 'Problem',
  };
  return <span className={`badge ${map[value]}`}>{labels[value]}</span>;
}
