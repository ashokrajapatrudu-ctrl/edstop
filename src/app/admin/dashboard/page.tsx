import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
      <Link
        href="/admin-promo-code-management"
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
      >
        Promo Code Management
      </Link>
    </div>
  );
}