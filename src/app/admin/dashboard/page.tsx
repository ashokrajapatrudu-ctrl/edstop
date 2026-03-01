import { Suspense } from 'react';
import DashboardShell from './DashboardShell';

export const dynamic = 'force-dynamic';

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading Dashboard...</div>}>
      <DashboardShell />
    </Suspense>
  );
}