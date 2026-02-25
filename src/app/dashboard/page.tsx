'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export default function DashboardPage() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      router.push('/login');
    } catch (error: any) {
      console.error('Logout error:', error?.message);
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-gray-600">Welcome back to EdStop!</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="bg-red-600 text-white rounded-lg px-6 py-2.5 font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loggingOut ? 'Signing Out...' : 'Sign Out'}
            </button>
          </div>

          {user && (
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-indigo-900 mb-3">Account Information</h2>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-indigo-700">Email:</span>
                    <span className="text-sm text-indigo-900">{user.email}</span>
                  </div>
                  {user.user_metadata?.full_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-indigo-700">Name:</span>
                      <span className="text-sm text-indigo-900">{user.user_metadata.full_name}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-indigo-700">User ID:</span>
                    <span className="text-sm text-indigo-900 font-mono">{user.id.slice(0, 8)}...</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button className="bg-white border border-gray-300 rounded-lg p-4 text-left hover:border-indigo-500 hover:shadow-md transition-all">
                    <h3 className="font-medium text-gray-900 mb-1">Order Food</h3>
                    <p className="text-sm text-gray-600">Browse restaurants and menus</p>
                  </button>
                  <button className="bg-white border border-gray-300 rounded-lg p-4 text-left hover:border-indigo-500 hover:shadow-md transition-all">
                    <h3 className="font-medium text-gray-900 mb-1">Shop Store</h3>
                    <p className="text-sm text-gray-600">Get essentials delivered</p>
                  </button>
                  <button className="bg-white border border-gray-300 rounded-lg p-4 text-left hover:border-indigo-500 hover:shadow-md transition-all">
                    <h3 className="font-medium text-gray-900 mb-1">My Wallet</h3>
                    <p className="text-sm text-gray-600">Manage EdCoins</p>
                  </button>
                  <button className="bg-white border border-gray-300 rounded-lg p-4 text-left hover:border-indigo-500 hover:shadow-md transition-all">
                    <h3 className="font-medium text-gray-900 mb-1">AI Companion</h3>
                    <p className="text-sm text-gray-600">Get study help</p>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}