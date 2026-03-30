'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { user, loading, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && configured) {
      if (user) {
        router.replace('/closet');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, configured, router]);

  if (!configured) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-narnia-50 to-white">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">&#x1F6AA;</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Narnia</h1>
          <p className="text-gray-500 mb-8">Your smart closet organizer</p>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left">
            <h3 className="font-semibold text-amber-800 mb-2">Setup Required</h3>
            <p className="text-sm text-amber-700 mb-3">
              To get Narnia running, you need to connect it to a Supabase database. Here&apos;s what to do:
            </p>
            <ol className="text-sm text-amber-700 space-y-2 list-decimal list-inside">
              <li>Create a free account at <strong>supabase.com</strong></li>
              <li>Create a new project</li>
              <li>Run the <strong>supabase-setup.sql</strong> script in the SQL Editor</li>
              <li>Copy your project URL and anon key into <strong>.env.local</strong></li>
              <li>Restart the dev server</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">&#x1F6AA;</div>
        <p className="text-gray-400">Opening Narnia...</p>
      </div>
    </div>
  );
}
