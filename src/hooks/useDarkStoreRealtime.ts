'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface StockUpdate {
  productId: string;
  newStock: number;
  previousStock: number;
}

export type DarkStoreOrderStatus =
  | 'pending' |'confirmed' |'preparing' |'ready' |'out_for_delivery' |'delivered' |'cancelled';

export interface DarkStoreDelivery {
  orderId: string;
  orderNumber: string;
  status: DarkStoreOrderStatus;
  etaMinutes: number | null;
  estimatedDeliveryTime: string | null;
  updatedAt: string;
}

const DELIVERY_STATUS_CONFIG: Record<
  DarkStoreOrderStatus,
  { label: string; icon: string; description: string; toastType: 'success' | 'info' | 'warning' | 'error'; step: number }
> = {
  pending:          { label: 'Order Placed',     icon: '📋', description: 'Waiting for store confirmation',       toastType: 'info',    step: 0 },
  confirmed:        { label: 'Order Confirmed',  icon: '✅', description: 'Store accepted your order',            toastType: 'success', step: 1 },
  preparing:        { label: 'Packing Items',    icon: '📦', description: 'Your items are being packed',          toastType: 'info',    step: 2 },
  ready:            { label: 'Ready for Pickup', icon: '🏪', description: 'Order packed, rider picking up',       toastType: 'info',    step: 3 },
  out_for_delivery: { label: 'Out for Delivery', icon: '🛵', description: 'Rider is on the way to your hostel',  toastType: 'info',    step: 4 },
  delivered:        { label: 'Delivered!',       icon: '🎉', description: 'Enjoy your items!',                   toastType: 'success', step: 5 },
  cancelled:        { label: 'Cancelled',        icon: '❌', description: 'Your order has been cancelled',       toastType: 'error',   step: -1 },
};

export const DARK_STORE_STEPS: DarkStoreOrderStatus[] = [
  'pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered',
];

const calcEta = (estimatedDeliveryTime: string | null): number | null => {
  if (!estimatedDeliveryTime) return null;
  const diff = Math.round((new Date(estimatedDeliveryTime).getTime() - Date.now()) / 60000);
  return Math.max(0, diff);
};

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  estimated_delivery_time: string | null;
  items: Array<{ id: string; quantity: number }> | null;
  updated_at: string;
}

export interface DarkStoreRealtimeData {
  // Stock: map of productId -> live stock count (overrides mock stock when available)
  liveStockMap: Record<string, number>;
  // Active dark store delivery (most recent non-delivered order)
  activeDelivery: DarkStoreDelivery | null;
  isLoadingDelivery: boolean;
  statusConfig: typeof DELIVERY_STATUS_CONFIG;
  steps: typeof DARK_STORE_STEPS;
}

export function useDarkStoreRealtime(
  userId: string | undefined,
  activeOrderId: string | null,
  mockStockMap: Record<string, number>
): DarkStoreRealtimeData {
  const toast = useToast();
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const prevStatusRef = useRef<string | null>(null);
  const prevStockRef = useRef<Record<string, number>>({});

  const [liveStockMap, setLiveStockMap] = useState<Record<string, number>>({});
  const [activeDelivery, setActiveDelivery] = useState<DarkStoreDelivery | null>(null);
  const [isLoadingDelivery, setIsLoadingDelivery] = useState(false);

  const cleanup = useCallback(() => {
    channelsRef.current.forEach((ch) => {
      try {
        let supabase = createClient();
        supabase.removeChannel(ch);
      } catch {
        // ignore
      }
    });
    channelsRef.current = [];
  }, []);

  // ── Fetch active dark store order on mount / when activeOrderId changes ──
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    setIsLoadingDelivery(true);

   const fetchActiveOrder = async () => {
  try {
    const supabase = createClient();

    let data;

    if (activeOrderId) {
      // Fetch specific order by order_number (NOT id)
      const response = await supabase
        .from('orders')
        .select('id, order_number, status, estimated_delivery_time, items, updated_at')
        .eq('order_number', activeOrderId)
        .eq('user_id', userId)
        .single();

      data = response.data ? [response.data] : [];
    } else {
      // Fetch latest active store order
      const response = await supabase
        .from('orders')
        .select('id, order_number, status, estimated_delivery_time, items, updated_at')
        .eq('user_id', userId)
        .eq('order_type', 'store')
        .not('status', 'in', '("delivered","cancelled")')
        .order('created_at', { ascending: false })
        .limit(1);

      data = response.data;
    }

    if (cancelled) return;

    if (data && data.length > 0) {
      const row = data[0] as OrderRow;
      prevStatusRef.current = row.status;

      setActiveDelivery({
        orderId: row.id,
        orderNumber: row.order_number,
        status: row.status as DarkStoreOrderStatus,
        etaMinutes: calcEta(row.estimated_delivery_time),
        estimatedDeliveryTime: row.estimated_delivery_time,
        updatedAt: row.updated_at,
      });
    }
  } catch (err) {
    console.error('Fetch active order failed:', err);
  } finally {
    if (!cancelled) setIsLoadingDelivery(false);
  }
};

    fetchActiveOrder();
    return () => { cancelled = true; };
  }, [userId, activeOrderId]);

  // ── Real-time: delivery status updates for active dark store order ────────
  useEffect(() => {
    if (!userId) return;

    cleanup();

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    // Channel 1: Track delivery status of active store order
    const deliveryFilter = activeOrderId
  ? `order_number=eq.${activeOrderId}`
  : `user_id=eq.${userId}`;
    const deliveryChannel = supabase
      .channel(`darkstore:delivery:${userId}:${activeOrderId ?? 'latest'}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: deliveryFilter,
        },
        (payload) => {
          const row = payload.new as OrderRow;

          // Only handle store-type orders
          if ((payload.new as Record<string, unknown>).order_type !== 'store') return;

          const prevStatus = prevStatusRef.current;
          prevStatusRef.current = row.status;

          setActiveDelivery({
            orderId: row.id,
            orderNumber: row.order_number,
            status: row.status as DarkStoreOrderStatus,
            etaMinutes: calcEta(row.estimated_delivery_time),
            estimatedDeliveryTime: row.estimated_delivery_time,
            updatedAt: row.updated_at,
          });

          // Toast on status change
          if (prevStatus !== row.status) {
            const config = DELIVERY_STATUS_CONFIG[row.status as DarkStoreOrderStatus];
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

    channelsRef.current.push(deliveryChannel);

    // Channel 2: Listen for new store orders (INSERT) to track stock consumption
    const stockChannel = supabase
      .channel(`darkstore:stock:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `order_type=eq.store`,
        },
        (payload) => {
          const row = payload.new as OrderRow;
          if (!row.items || !Array.isArray(row.items)) return;

          // Reduce live stock based on ordered quantities
          setLiveStockMap((prev) => {
            const updated = { ...prev };
            row.items!.forEach((item: { id: string; quantity: number }) => {
              const currentStock = updated[item.id] ?? mockStockMap[item.id] ?? 0;
              const newStock = Math.max(0, currentStock - item.quantity);
              updated[item.id] = newStock;

              // Out-of-stock alert
              const prevStock = prevStockRef.current[item.id] ?? currentStock;
              if (newStock === 0 && prevStock > 0) {
                toast.error(
                  '🚫 Out of Stock',
                  `A product just went out of stock due to high demand.`
                );
              } else if (newStock <= 3 && newStock > 0 && prevStock > 3) {
                toast.warning(
                  '⚠️ Low Stock Alert',
                  `Only ${newStock} unit${newStock === 1 ? '' : 's'} left — grab it fast!`
                );
              }
              prevStockRef.current[item.id] = newStock;
            });
            return updated;
          });
        }
      )
      .subscribe();

    channelsRef.current.push(stockChannel);

    return cleanup;
  }, [userId, activeOrderId, mockStockMap, toast, cleanup]);

  // ── ETA ticker: refresh etaMinutes every 30s ─────────────────────────────
  useEffect(() => {
    if (!activeDelivery?.estimatedDeliveryTime) return;
    const interval = setInterval(() => {
      setActiveDelivery((prev) =>
        prev ? { ...prev, etaMinutes: calcEta(prev.estimatedDeliveryTime) } : prev
      );
    }, 30_000);
    return () => clearInterval(interval);
  }, [activeDelivery?.estimatedDeliveryTime]);

  return {
    liveStockMap,
    activeDelivery,
    isLoadingDelivery,
    statusConfig: DELIVERY_STATUS_CONFIG,
    steps: DARK_STORE_STEPS,
  };
}

export { DELIVERY_STATUS_CONFIG };
export default useDarkStoreRealtime;
