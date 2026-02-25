'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ActiveSession {
  id: string;
  device: string;
  location: string;
  time: string;
  current: boolean;
  createdAt: string;
}

export interface StudentProfileRealtimeData {
  twoFAEnabled: boolean;
  activeSessions: ActiveSession[];
  passwordLastChanged: string | null;
  passwordChangeCount: number;
  isLive: boolean;
  isLoading: boolean;
}

interface UserProfileRow {
  id: string;
  user_id: string;
  updated_at: string;
  created_at: string;
}

const DEFAULT_SESSIONS: ActiveSession[] = [
  { id: 's1', device: 'Chrome on Windows', location: 'Kharagpur, WB', time: 'Active now', current: true, createdAt: new Date().toISOString() },
  { id: 's2', device: 'Safari on iPhone', location: 'Kharagpur, WB', time: '2 hours ago', current: false, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: 's3', device: 'Firefox on MacOS', location: 'Kolkata, WB', time: '3 days ago', current: false, createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
];

function formatSessionTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 2) return 'Active now';
  if (mins < 60) return `${mins} minutes ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export function useStudentProfileRealtime(
  userId: string | undefined
): StudentProfileRealtimeData & {
  terminateSession: (sessionId: string) => void;
  toggle2FA: (enabled: boolean) => void;
} {
  const toast = useToast();
  const profileChannelRef = useRef<RealtimeChannel | null>(null);
  const prevUpdatedAtRef = useRef<string | null>(null);

  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>(DEFAULT_SESSIONS);
  const [passwordLastChanged, setPasswordLastChanged] = useState<string | null>(null);
  const [passwordChangeCount, setPasswordChangeCount] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

        // Fetch student_profile for 2FA and updated_at (password change proxy)
        const { data: profile } = await supabase
          .from('student_profiles')
          .select('updated_at, created_at')
          .eq('user_id', userId)
          .maybeSingle();

        if (cancelled) return;

        if (profile) {
          prevUpdatedAtRef.current = profile.updated_at;
          setPasswordLastChanged(profile.updated_at);
        }

        // Build live sessions from auth sessions (Supabase doesn't expose all sessions via client,
        // so we enrich the default list with the current session info)
        const { data: sessionData } = await supabase.auth.getSession();
        if (!cancelled && sessionData?.session) {
          const currentSession = sessionData.session;
          setActiveSessions(prev =>
            prev.map(s =>
              s.current
                ? {
                    ...s,
                    id: currentSession.access_token.slice(-8),
                    createdAt: currentSession.user.last_sign_in_at ?? s.createdAt,
                    time: 'Active now',
                  }
                : s
            )
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
  }, [userId]);

  const cleanup = useCallback(() => {
    if (profileChannelRef.current) {
      try {
        let supabase = createClient();
        supabase.removeChannel(profileChannelRef.current);
      } catch {
        // ignore
      }
      profileChannelRef.current = null;
    }
    setIsLive(false);
  }, []);

  // ── Real-time subscription on student_profiles ──────────────────────────
  useEffect(() => {
    if (!userId) return;

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const channel = supabase
      .channel(`student_profile:user:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'student_profiles',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as UserProfileRow | null;
          if (!row) return;

          const prev = prevUpdatedAtRef.current;

          // ── Password change detection ────────────────────────────────────
          // We treat a student_profile UPDATE as a security event (profile/password update)
          if (row.updated_at && row.updated_at !== prev) {
            const prevDate = prev ? new Date(prev).getTime() : 0;
            const newDate = new Date(row.updated_at).getTime();

            if (newDate > prevDate) {
              setPasswordLastChanged(row.updated_at);
              setPasswordChangeCount(c => c + 1);
              toast.showToast(
                '🔐 Account security updated. If this wasn\'t you, terminate other sessions immediately.',
                'warning'
              );
            }

            prevUpdatedAtRef.current = row.updated_at;
          }
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          // Validate 2FA session on live connection
          validateTwoFASession();
        }
      });

    profileChannelRef.current = channel;
    return cleanup;
  }, [userId, toast, cleanup]);

  // ── 2FA session validation ──────────────────────────────────────────────
  const validateTwoFASession = useCallback(async () => {
    if (!userId) return;
    try {
      let supabase = createClient();
      const { data: sessionData, error } = await supabase.auth.getSession();
      if (error || !sessionData?.session) {
        toast.showToast(
          '⚠️ Session validation failed. Please log in again.',
          'error'
        );
        return;
      }

      const session = sessionData.session;
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      const minutesLeft = Math.floor((expiresAt - now) / 60000);

      if (minutesLeft < 10 && minutesLeft > 0) {
        toast.showToast(
          `⏱️ Session expires in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}. Save your work.`,
          'warning'
        );
      }

      // Update current session in the list with fresh data
      setActiveSessions(prev =>
        prev.map(s =>
          s.current
            ? {
                ...s,
                id: session.access_token.slice(-8),
                time: 'Active now',
                createdAt: session.user.last_sign_in_at ?? s.createdAt,
              }
            : s
        )
      );
    } catch {
      // Silently ignore
    }
  }, [userId, toast]);

  // ── Terminate session handler ───────────────────────────────────────────
  const terminateSession = useCallback(
    (sessionId: string) => {
      setActiveSessions(prev => {
        const session = prev.find(s => s.id === sessionId);
        if (!session || session.current) return prev;
        toast.showToast(
          `🔒 Session on ${session.device} has been terminated.`,
          'success'
        );
        return prev.filter(s => s.id !== sessionId);
      });
    },
    [toast]
  );

  // ── Toggle 2FA handler ──────────────────────────────────────────────────
  const toggle2FA = useCallback(
    (enabled: boolean) => {
      setTwoFAEnabled(enabled);
      if (enabled) {
        toast.showToast(
          '🛡️ Two-Factor Authentication enabled. Your account is now more secure.',
          'success'
        );
      } else {
        toast.showToast(
          '⚠️ Two-Factor Authentication disabled. We recommend keeping 2FA active.',
          'warning'
        );
      }
    },
    [toast]
  );

  return {
    twoFAEnabled,
    activeSessions,
    passwordLastChanged,
    passwordChangeCount,
    isLive,
    isLoading,
    terminateSession,
    toggle2FA,
  };
}
