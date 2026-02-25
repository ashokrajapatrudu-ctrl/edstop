'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface AIUsageData {
  questionsUsed: number;
  questionsLimit: number;
  isPremium: boolean;
  lastResetAt: string | null;
  isLoading: boolean;
  isLive: boolean;
}

interface AIUsageRow {
  id: string;
  user_id: string;
  questions_used: number;
  questions_limit: number;
  is_premium: boolean;
  last_reset_at: string;
  updated_at: string;
}

export function useAICompanionRealtime(
  userId: string | undefined,
  defaultQuestionsUsed = 3,
  defaultIsPremium = false
): AIUsageData {
  const toast = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const prevDataRef = useRef<{ questionsUsed: number; isPremium: boolean; lastResetAt: string | null }>({
    questionsUsed: defaultQuestionsUsed,
    isPremium: defaultIsPremium,
    lastResetAt: null,
  });

  const [questionsUsed, setQuestionsUsed] = useState(defaultQuestionsUsed);
  const [questionsLimit, setQuestionsLimit] = useState(defaultIsPremium ? 50 : 5);
  const [isPremium, setIsPremium] = useState(defaultIsPremium);
  const [lastResetAt, setLastResetAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  // ── Initial data fetch ──────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        let supabase = createClient();
        const { data, error } = await supabase
          .from('ai_usage')
          .select('questions_used, questions_limit, is_premium, last_reset_at')
          .eq('user_id', userId)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          // Table may not exist yet — fall back to defaults silently
          return;
        }

        if (data) {
          setQuestionsUsed(data.questions_used);
          setQuestionsLimit(data.questions_limit);
          setIsPremium(data.is_premium);
          setLastResetAt(data.last_reset_at);
          prevDataRef.current = {
            questionsUsed: data.questions_used,
            isPremium: data.is_premium,
            lastResetAt: data.last_reset_at,
          };
        } else {
          // No row yet — upsert defaults so real-time can track it
          await supabase.from('ai_usage').upsert(
            {
              user_id: userId,
              questions_used: defaultQuestionsUsed,
              questions_limit: defaultIsPremium ? 50 : 5,
              is_premium: defaultIsPremium,
              last_reset_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
        }
      } catch {
        // Silently fall back to defaults
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchInitialData();
    return () => { cancelled = true; };
  }, [userId, defaultQuestionsUsed, defaultIsPremium]);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      try {
        let supabase = createClient();
        supabase.removeChannel(channelRef.current);
      } catch {
        // ignore cleanup errors
      }
      channelRef.current = null;
    }
    setIsLive(false);
  }, []);

  // ── Real-time subscription ──────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const channel = supabase
      .channel(`ai_usage:user:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_usage',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as AIUsageRow | null;
          if (!row) return;

          const prev = prevDataRef.current;

          // ── Daily question reset detection ──────────────────────────────
          if (
            payload.eventType === 'UPDATE' &&
            row.last_reset_at &&
            row.last_reset_at !== prev.lastResetAt
          ) {
            const prevDate = prev.lastResetAt ? new Date(prev.lastResetAt).toDateString() : null;
            const newDate = new Date(row.last_reset_at).toDateString();
            if (prevDate !== newDate) {
              toast.showToast(
                '🔄 Daily questions reset! You have fresh questions available.',
                'success'
              );
            }
            setLastResetAt(row.last_reset_at);
          }

          // ── Premium status change detection ────────────────────────────
          if (
            payload.eventType === 'UPDATE' &&
            row.is_premium !== prev.isPremium
          ) {
            if (row.is_premium) {
              toast.showToast(
                '⭐ Premium activated! You now have 50 daily questions.',
                'success'
              );
            } else {
              toast.showToast(
                'ℹ️ Premium plan ended. Daily limit reset to 5 questions.',
                'info'
              );
            }
            setIsPremium(row.is_premium);
            setQuestionsLimit(row.questions_limit);
          }

          // ── Usage count update ──────────────────────────────────────────
          if (
            (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') &&
            row.questions_used !== prev.questionsUsed
          ) {
            const remaining = row.questions_limit - row.questions_used;

            // Warn when running low (2 or fewer remaining)
            if (remaining === 2 && !row.is_premium) {
              toast.showToast(
                `⚡ Only 2 questions remaining today. Upgrade to Premium for more!`,
                'warning'
              );
            } else if (remaining === 1 && !row.is_premium) {
              toast.showToast(
                `⚠️ Last question remaining today!`,
                'warning'
              );
            } else if (remaining <= 0 && !row.is_premium) {
              toast.showToast(
                `🚫 Daily question limit reached. Upgrade to Premium for 50 questions.`,
                'error'
              );
            }

            setQuestionsUsed(row.questions_used);
            setQuestionsLimit(row.questions_limit);
          }

          // Update prev ref
          prevDataRef.current = {
            questionsUsed: row.questions_used,
            isPremium: row.is_premium,
            lastResetAt: row.last_reset_at,
          };
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return cleanup;
  }, [userId, toast, cleanup]);

  return {
    questionsUsed,
    questionsLimit,
    isPremium,
    lastResetAt,
    isLoading,
    isLive,
  };
}
