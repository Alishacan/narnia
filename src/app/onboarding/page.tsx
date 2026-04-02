'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const STEPS = [
  {
    emoji: '👋',
    title: (name: string) => `Welcome to Clossie${name ? `, ${name}` : ''}!`,
    subtitle: 'Your smart closet organizer',
    description:
      'Photograph your clothes, and let AI organize everything. Build outfits, track what you wear, and never wonder "what should I wear?" again.',
    bg: 'from-clossie-50 to-white',
  },
  {
    emoji: '📸',
    title: () => 'AI does the heavy lifting',
    subtitle: 'Snap a photo, we handle the rest',
    description:
      'Take a photo of any clothing item. AI instantly removes the background and tags it by category, color, season, and occasion.',
    bg: 'from-purple-50 to-white',
  },
  {
    emoji: '👗',
    title: () => 'Get outfit suggestions',
    subtitle: 'Your personal AI stylist',
    description:
      'AI analyzes your wardrobe and suggests complete outfits. Track what you wear on the calendar and discover your style stats.',
    bg: 'from-pink-50 to-white',
  },
  {
    emoji: '🚀',
    title: () => 'Ready to build your closet?',
    subtitle: 'Start with your first item',
    description:
      'Add a clothing item and watch the AI work its magic. It only takes a few seconds!',
    bg: 'from-clossie-50 to-white',
    isFinal: true,
  },
];

export default function OnboardingPage() {
  const { user, loading, onboarded, completeOnboarding } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const touchRef = useRef<{ startX: number; startY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (!loading && user && onboarded) router.replace('/closet');
  }, [user, loading, onboarded, router]);

  const goToStep = useCallback(
    (next: number) => {
      if (next < 0 || next >= STEPS.length || transitioning) return;
      setTransitioning(true);
      setTimeout(() => {
        setStep(next);
        setTransitioning(false);
      }, 200);
    },
    [transitioning]
  );

  const handleSkip = async () => {
    await completeOnboarding();
    router.replace('/closet');
  };

  const handleAddFirst = async () => {
    await completeOnboarding();
    router.push('/add');
  };

  const handleExplore = async () => {
    await completeOnboarding();
    router.replace('/closet');
  };

  // Touch swipe handling
  const onTouchStart = (e: React.TouchEvent) => {
    touchRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
    };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const deltaX = e.changedTouches[0].clientX - touchRef.current.startX;
    const deltaY = e.changedTouches[0].clientY - touchRef.current.startY;
    touchRef.current = null;

    // Only swipe if horizontal movement is dominant
    if (Math.abs(deltaX) < 50 || Math.abs(deltaY) > Math.abs(deltaX)) return;

    if (deltaX < 0) {
      goToStep(step + 1);
    } else {
      goToStep(step - 1);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-clossie-200 border-t-clossie-600 rounded-full animate-spin" />
      </div>
    );
  }

  const current = STEPS[step];
  const name = user.user_metadata?.full_name?.split(' ')[0] || '';

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={`min-h-screen bg-gradient-to-b ${current.bg} flex flex-col transition-colors duration-300`}
    >
      {/* Skip button */}
      {!current.isFinal && (
        <div className="flex justify-end p-4">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-400 px-3 py-1"
          >
            Skip
          </button>
        </div>
      )}
      {current.isFinal && <div className="h-12" />}

      {/* Content */}
      <div
        className={`flex-1 flex flex-col items-center justify-center px-8 transition-opacity duration-200 ${
          transitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="text-7xl mb-6">{current.emoji}</div>
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          {current.title(name)}
        </h1>
        <p className="text-clossie-600 font-medium text-center mb-4">
          {current.subtitle}
        </p>
        <p className="text-gray-500 text-center text-sm leading-relaxed max-w-xs">
          {current.description}
        </p>

        {/* Final step buttons */}
        {current.isFinal && (
          <div className="mt-8 w-full max-w-xs space-y-3">
            <button
              onClick={handleAddFirst}
              className="w-full py-3.5 bg-clossie-600 text-white rounded-xl font-semibold text-sm active:scale-[0.98] transition"
            >
              Add Your First Item
            </button>
            <button
              onClick={handleExplore}
              className="w-full py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm active:scale-[0.98] transition"
            >
              Explore First
            </button>
          </div>
        )}
      </div>

      {/* Bottom: dots + next button */}
      <div className="pb-12 px-8">
        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => goToStep(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-6 bg-clossie-600'
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Next button (not on final step) */}
        {!current.isFinal && (
          <button
            onClick={() => goToStep(step + 1)}
            className="w-full py-3.5 bg-clossie-600 text-white rounded-xl font-semibold text-sm active:scale-[0.98] transition"
          >
            {step === STEPS.length - 2 ? "Let's Go" : 'Next'}
          </button>
        )}
      </div>
    </div>
  );
}
