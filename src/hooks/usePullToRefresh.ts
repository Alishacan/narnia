'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * KAN-13: Pull-to-refresh hook for mobile.
 * Returns touch handlers and state for rendering a pull indicator.
 */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const active = useRef(false);
  const pullDistanceRef = useRef(0);

  const THRESHOLD = 60;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
    active.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!active.current || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      setPulling(true);
      const clamped = Math.min(dy * 0.4, 80);
      pullDistanceRef.current = clamped;
      setPullDistance(clamped);
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    active.current = false;
    if (pullDistanceRef.current >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(40);
      await onRefresh();
      setRefreshing(false);
    }
    setPulling(false);
    setPullDistance(0);
    pullDistanceRef.current = 0;
  }, [refreshing, onRefresh]);

  useEffect(() => {
    return () => { active.current = false; };
  }, []);

  return {
    pulling: pulling || refreshing,
    pullDistance,
    refreshing,
    handlers: { onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd },
  };
}
