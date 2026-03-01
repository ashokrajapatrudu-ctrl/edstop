import { Suspense } from 'react';
import DashboardShell from './DashboardShell';

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading Dashboard...</div>}>
      <DashboardShell />
    </Suspense>
  );
}