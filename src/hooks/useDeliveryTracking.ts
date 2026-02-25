'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type DeliveryStatus =
  | 'pending' |'confirmed' |'preparing' |'ready' |'out_for_delivery' |'delivered' |'cancelled';

export interface RiderLocation {
  lat: number;
  lng: number;
  lastUpdated: string;
}

export interface DeliveryUpdate {
  orderId: string;
  orderNumber: string;
  status: DeliveryStatus;
  estimatedDeliveryTime: string | null;
  etaMinutes: number | null;
  riderName: string | null;
  riderPhone: string | null;
  riderLocation: RiderLocation | null;
  restaurantName: string | null;
  updatedAt: string;
}

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  estimated_delivery_time: string | null;
  rider_id: string | null;
  restaurant_name: string | null;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

const DELIVERY_STATUS_CONFIG: Record<
  string,
  { label: string; icon: string; description: string; toastType: 'success' | 'info' | 'warning' | 'error'; step: number }
> = {
  pending:          { label: 'Order Placed',       icon: '📋', description: 'Waiting for restaurant confirmation', toastType: 'info',    step: 0 },
  confirmed:        { label: 'Order Confirmed',    icon: '✅', description: 'Restaurant accepted your order',      toastType: 'success', step: 1 },
  preparing:        { label: 'Preparing',          icon: '👨‍🍳', description: 'Your food is being prepared',         toastType: 'info',    step: 2 },
  ready:            { label: 'Ready for Pickup',   icon: '📦', description: 'Order packed, rider picking up',      toastType: 'info',    step: 3 },
  out_for_delivery: { label: 'Out for Delivery',   icon: '🛵', description: 'Rider is on the way to you',          toastType: 'info',    step: 4 },
  delivered:        { label: 'Delivered',          icon: '🎉', description: 'Enjoy your meal!',                    toastType: 'success', step: 5 },
  cancelled:        { label: 'Cancelled',          icon: '❌', description: 'Order has been cancelled',            toastType: 'error',   step: -1 },
};

const STEPS: DeliveryStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];

const calcEta = (estimatedDeliveryTime: string | null): number | null => {
  if (!estimatedDeliveryTime) return null;
  const diff = Math.round((new Date(estimatedDeliveryTime).getTime() - Date.now()) / 60000);
  return Math.max(0, diff);
};

export function useDeliveryTracking(orderId: string | null, userId: string | undefined) {
  const toast = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  const [delivery, setDelivery] = useState<DeliveryUpdate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      try {
        let supabase = createClient();
        supabase.removeChannel(channelRef.current);
      } catch {
        // ignore
      }
      channelRef.current = null;
    }
  }, []);

  // ── Fetch initial order data ─────────────────────────────────────────────
  useEffect(() => {
    if (!orderId || !userId) {
      setDelivery(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const fetchOrder = async () => {
      try {
        let supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('orders')
          .select('id, order_number, status, estimated_delivery_time, rider_id, restaurant_name, updated_at')
          .eq('id', orderId)
          .eq('user_id', userId)
          .single();

        if (cancelled) return;
        if (fetchError || !data) {
          setError('Could not load order details.');
          setIsLoading(false);
          return;
        }

        const row = data as OrderRow;
        prevStatusRef.current = row.status;

        setDelivery({
          orderId: row.id,
          orderNumber: row.order_number,
          status: row.status as DeliveryStatus,
          estimatedDeliveryTime: row.estimated_delivery_time,
          etaMinutes: calcEta(row.estimated_delivery_time),
          riderName: null,
          riderPhone: null,
          riderLocation: null,
          restaurantName: row.restaurant_name,
          updatedAt: row.updated_at,
        });
      } catch {
        if (!cancelled) setError('Failed to fetch order.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchOrder();
    return () => { cancelled = true; };
  }, [orderId, userId]);

  // ── Real-time subscription ───────────────────────────────────────────────
  useEffect(() => {
    if (!orderId || !userId) return;

    cleanup();

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const channel = supabase
      .channel(`delivery:order:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const row = payload.new as OrderRow;
          const prevStatus = prevStatusRef.current;

          prevStatusRef.current = row.status;

          // Extract rider location from metadata if present
          let riderLocation: RiderLocation | null = null;
          if (row.metadata && typeof row.metadata === 'object') {
            const meta = row.metadata as Record<string, unknown>;
            if (meta.rider_lat && meta.rider_lng) {
              riderLocation = {
                lat: Number(meta.rider_lat),
                lng: Number(meta.rider_lng),
                lastUpdated: row.updated_at,
              };
            }
          }

          setDelivery((prev) => ({
            ...(prev ?? {
              orderId: row.id,
              orderNumber: row.order_number,
              riderName: null,
              riderPhone: null,
              restaurantName: row.restaurant_name,
            }),
            orderId: row.id,
            orderNumber: row.order_number,
            status: row.status as DeliveryStatus,
            estimatedDeliveryTime: row.estimated_delivery_time,
            etaMinutes: calcEta(row.estimated_delivery_time),
            riderLocation: riderLocation ?? prev?.riderLocation ?? null,
            restaurantName: row.restaurant_name,
            updatedAt: row.updated_at,
          }));

          // Toast only on status change
          if (prevStatus !== row.status) {
            const config = DELIVERY_STATUS_CONFIG[row.status];
            if (config) {
              const eta = calcEta(row.estimated_delivery_time);
              const etaText = eta !== null && row.status === 'out_for_delivery' ? ` ETA: ${eta} min` : '';
              toast[config.toastType](
                `${config.icon} ${config.label}`,
                `Order #${row.order_number} — ${config.description}${etaText}`
              );
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return cleanup;
  }, [orderId, userId, toast, cleanup]);

  // ── ETA ticker: refresh etaMinutes every 30s ─────────────────────────────
  useEffect(() => {
    if (!delivery?.estimatedDeliveryTime) return;
    const interval = setInterval(() => {
      setDelivery((prev) =>
        prev ? { ...prev, etaMinutes: calcEta(prev.estimatedDeliveryTime) } : prev
      );
    }, 30_000);
    return () => clearInterval(interval);
  }, [delivery?.estimatedDeliveryTime]);

  return {
    delivery,
    isLoading,
    error,
    statusConfig: DELIVERY_STATUS_CONFIG,
    steps: STEPS,
  };
}

export { DELIVERY_STATUS_CONFIG, STEPS };
export default useDeliveryTracking;
