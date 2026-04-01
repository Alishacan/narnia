'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

export default function SessionGuard() {
  const { sessionExpired } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const handledRef = useRef(false);

  useEffect(() => {
    if (sessionExpired && !handledRef.current) {
      handledRef.current = true;
      showToast('Your session expired. Please sign in again.', 'error');
      setTimeout(() => router.replace('/login'), 500);
    }
  }, [sessionExpired, showToast, router]);

  return null;
}
