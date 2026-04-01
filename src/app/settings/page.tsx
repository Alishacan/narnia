'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  if (authLoading) return null;

  const userName = user?.user_metadata?.full_name || user?.email || 'User';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-lg sticky top-0 z-40 border-b border-gray-100 px-4 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      </div>

      <div className="p-4 space-y-3">
        {/* User card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-clossie-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">{userName.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">{userName}</h2>
              <p className="text-sm text-gray-400">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          <Link href="/stats" className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="text-lg">&#x1F4CA;</span>
              <span className="text-sm font-medium text-gray-700">Closet Insights</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Link>

          <Link href="/calendar" className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="text-lg">&#x1F4C5;</span>
              <span className="text-sm font-medium text-gray-700">Wear Calendar</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Link>

          <button className="w-full flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="text-lg">&#x1F3A8;</span>
              <span className="text-sm font-medium text-gray-700">Appearance</span>
            </div>
            <span className="text-xs text-gray-400">Coming soon</span>
          </button>

          <button className="w-full flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="text-lg">&#x1F4E6;</span>
              <span className="text-sm font-medium text-gray-700">Backup Data</span>
            </div>
            <span className="text-xs text-gray-400">Coming soon</span>
          </button>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center text-red-500 font-medium text-sm"
        >
          Sign Out
        </button>

        <p className="text-center text-xs text-gray-300 pt-4">
          Clossie v1.0
        </p>
      </div>
    </div>
  );
}
