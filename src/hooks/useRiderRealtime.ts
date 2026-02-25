'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface RiderOrder {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  landmark: string;
  items: { id: string; name: string; quantity: number; price: number }[];
  totalAmount: number;
  paymentMethod: 'COD' | 'ONLINE';
  codAmount?: number;
  status: 'pending-pickup' | 'in-transit' | 'delivered';
  estimatedTime: string;
  specialInstructions?: string;
  restaurantName: string;
  restaurantAddress: string;
  pickupTime?: string;
}

export interface RiderBatchOrder {
  orderId: string;
  orderNumber: string;
  customerName: string;
  deliveryAddress: string;
  landmark: string;
  estimatedTime: string;
  sequence: number;
}

export interface RiderBatchGroup {
  zoneId: string;
  zoneName: string;
  orders: RiderBatchOrder[];
  totalDistance: string;
  estimatedDuration: string;
}

export interface RiderStats {
  dailyDeliveries: number;
  completedOrders: number;
  totalEarnings: number;
  baseIncentive: number;
  bonusIncentive: number;
  targetDeliveries: number;
}

export interface RiderRealtimeData {
  activeOrders: RiderOrder[];
  completedOrders: RiderOrder[];
  batchDeliveries: RiderBatchGroup[];
  riderStats: RiderStats;
  isLoading: boolean;
}

// DB order row shape
interface DBOrder {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  total_amount: number;
  final_amount: number;
  payment_method?: string;
  delivery_address?: string;
  delivery_instructions?: string;
  estimated_delivery_time?: string;
  restaurant_name?: string;
  items?: Array<{ id?: string; name: string; quantity: number; price: number }>;
  notes?: string;
  created_at: string;
  rider_id?: string;
  user_id?: string;
}

const BASE_PAY_PER_DELIVERY = 50; // ₹50 per delivery
const BONUS_THRESHOLD = 15;
const BONUS_AMOUNT = 200;

const mapDBStatusToRider = (dbStatus: string): RiderOrder['status'] => {
  const map: Record<string, RiderOrder['status']> = {
    pending: 'pending-pickup',
    confirmed: 'pending-pickup',
    preparing: 'pending-pickup',
    ready: 'pending-pickup',
    out_for_delivery: 'in-transit',
    delivered: 'delivered',
  };
  return map[dbStatus] ?? 'pending-pickup';
};

const isActiveStatus = (status: string) =>
  ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(status);

const formatETA = (estimatedTime?: string): string => {
  if (!estimatedTime) return '~20 mins';
  try {
    const mins = Math.max(0, Math.round((new Date(estimatedTime).getTime() - Date.now()) / 60000));
    return mins <= 0 ? 'Now' : `${mins} mins`;
  } catch {
    return '~20 mins';
  }
};

const dbOrderToRiderOrder = (o: DBOrder): RiderOrder => ({
  orderId: o.id,
  orderNumber: o.order_number,
  customerName: (o.notes && JSON.parse(o.notes || '{}')?.customer_name) || 'Customer',
  customerPhone: (o.notes && JSON.parse(o.notes || '{}')?.customer_phone) || '',
  deliveryAddress: o.delivery_address || 'Campus Address',
  landmark: (o.notes && JSON.parse(o.notes || '{}')?.landmark) || '',
  items: Array.isArray(o.items)
    ? o.items.map((item, idx) => ({
        id: item.id || String(idx),
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }))
    : [],
  totalAmount: Number(o.final_amount || o.total_amount),
  paymentMethod: o.payment_method === 'COD' ? 'COD' : 'ONLINE',
  codAmount: o.payment_method === 'COD' ? Number(o.final_amount || o.total_amount) : undefined,
  status: mapDBStatusToRider(o.status),
  estimatedTime: formatETA(o.estimated_delivery_time),
  specialInstructions: o.delivery_instructions,
  restaurantName: o.restaurant_name || 'Restaurant',
  restaurantAddress: 'IIT KGP Campus',
  pickupTime: o.estimated_delivery_time
    ? new Date(o.estimated_delivery_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : undefined,
});

const computeStats = (completed: RiderOrder[]): RiderStats => {
  const count = completed.length;
  const base = count * BASE_PAY_PER_DELIVERY;
  const bonus = count >= BONUS_THRESHOLD ? BONUS_AMOUNT : 0;
  return {
    dailyDeliveries: count,
    completedOrders: count,
    totalEarnings: base + bonus,
    baseIncentive: base,
    bonusIncentive: bonus,
    targetDeliveries: BONUS_THRESHOLD,
  };
};

// Group active orders into batch zones by delivery address prefix
const groupIntoBatches = (orders: RiderOrder[]): RiderBatchGroup[] => {
  const zoneMap: Record<string, RiderOrder[]> = {};
  orders.forEach((o) => {
    // Extract hall/zone name from address (first meaningful segment)
    const match = o.deliveryAddress.match(/([A-Za-z]+\s+Hall|[A-Za-z]+\s+Hostel|[A-Za-z]+\s+Block)/i);
    const zone = match ? match[0] : 'Campus Zone';
    if (!zoneMap[zone]) zoneMap[zone] = [];
    zoneMap[zone].push(o);
  });

  // Only create batches for zones with 2+ orders
  return Object.entries(zoneMap)
    .filter(([, orders]) => orders.length >= 2)
    .map(([zoneName, zoneOrders], idx) => ({
      zoneId: `zone-${idx + 1}`,
      zoneName: `${zoneName} Zone`,
      totalDistance: `${(Math.random() * 1.5 + 0.5).toFixed(1)} km`,
      estimatedDuration: `${Math.round(zoneOrders.length * 5 + 10)} mins`,
      orders: zoneOrders.map((o, seq) => ({
        orderId: o.orderId,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        deliveryAddress: o.deliveryAddress,
        landmark: o.landmark,
        estimatedTime: o.estimatedTime,
        sequence: seq + 1,
      })),
    }));
};

export function useRiderRealtime(riderId: string | undefined): RiderRealtimeData {
  const toast = useToast();
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const prevStatusRef = useRef<Record<string, string>>({});

  const [activeOrders, setActiveOrders] = useState<RiderOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<RiderOrder[]>([]);
  const [batchDeliveries, setBatchDeliveries] = useState<RiderBatchGroup[]>([]);
  const [riderStats, setRiderStats] = useState<RiderStats>({
    dailyDeliveries: 0,
    completedOrders: 0,
    totalEarnings: 0,
    baseIncentive: 0,
    bonusIncentive: 0,
    targetDeliveries: BONUS_THRESHOLD,
  });
  const [isLoading, setIsLoading] = useState(true);

  // ── Recompute batches whenever active orders change ───────────────────────
  const refreshBatches = useCallback((orders: RiderOrder[]) => {
    setBatchDeliveries(groupIntoBatches(orders));
  }, []);

  // ── Initial data fetch ────────────────────────────────────────────────────
  useEffect(() => {
    if (!riderId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        let supabase = createClient();

        // Fetch today's active orders assigned to this rider
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: activeData } = await supabase
          .from('orders')
          .select('id, order_number, order_type, status, total_amount, final_amount, payment_method, delivery_address, delivery_instructions, estimated_delivery_time, restaurant_name, items, notes, created_at, rider_id, user_id')
          .eq('rider_id', riderId)
          .in('status', ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'])
          .order('created_at', { ascending: false });

        // Fetch today's completed orders for earnings
        const { data: completedData } = await supabase
          .from('orders')
          .select('id, order_number, order_type, status, total_amount, final_amount, payment_method, delivery_address, delivery_instructions, estimated_delivery_time, restaurant_name, items, notes, created_at, rider_id, user_id')
          .eq('rider_id', riderId)
          .eq('status', 'delivered')
          .gte('created_at', todayStart.toISOString())
          .order('created_at', { ascending: false });

        if (cancelled) return;

        const mappedActive: RiderOrder[] = (activeData || []).map(dbOrderToRiderOrder);
        const mappedCompleted: RiderOrder[] = (completedData || []).map(dbOrderToRiderOrder);

        setActiveOrders(mappedActive);
        setCompletedOrders(mappedCompleted);
        setRiderStats(computeStats(mappedCompleted));
        refreshBatches(mappedActive);

        // Track statuses for change detection
        (activeData || []).forEach((o) => { prevStatusRef.current[o.id] = o.status; });
        (completedData || []).forEach((o) => { prevStatusRef.current[o.id] = o.status; });
      } catch {
        // silently fall back to mock data in parent
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchInitialData();
    return () => { cancelled = true; };
  }, [riderId, refreshBatches]);

  const cleanup = useCallback(() => {
    channelsRef.current.forEach((ch) => {
      try {
        createClient().removeChannel(ch);
      } catch {
        // ignore
      }
    });
    channelsRef.current = [];
  }, []);

  // ── Real-time subscriptions ───────────────────────────────────────────────
  useEffect(() => {
    if (!riderId) return;

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    // ── Channel 1: New order assignments (INSERT where rider_id = riderId) ──
    const assignmentChannel = supabase
      .channel(`rider:assignments:${riderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `rider_id=eq.${riderId}`,
        },
        (payload) => {
          const order = payload.new as DBOrder;
          if (!isActiveStatus(order.status)) return;

          const mapped = dbOrderToRiderOrder(order);
          prevStatusRef.current[order.id] = order.status;

          setActiveOrders((prev) => {
            // Avoid duplicates
            if (prev.find((o) => o.orderId === order.id)) return prev;
            let updated = [mapped, ...prev];
            refreshBatches(updated);
            return updated;
          });

          toast.success(
            '🚴 New Order Assigned!',
            `Order #${order.order_number} — ${order.delivery_address || 'Campus'}`
          );
        }
      )
      .subscribe();

    // ── Channel 2: Order status updates (UPDATE where rider_id = riderId) ───
    const statusChannel = supabase
      .channel(`rider:status:${riderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `rider_id=eq.${riderId}`,
        },
        (payload) => {
          const order = payload.new as DBOrder;
          const prevStatus = prevStatusRef.current[order.id];

          if (prevStatus === order.status) return;
          prevStatusRef.current[order.id] = order.status;

          const mapped = dbOrderToRiderOrder(order);

          if (order.status === 'delivered') {
            // Move from active → completed
            setActiveOrders((prev) => {
              let updated = prev.filter((o) => o.orderId !== order.id);
              refreshBatches(updated);
              return updated;
            });
            setCompletedOrders((prev) => {
              let updated = [mapped, ...prev.filter((o) => o.orderId !== order.id)];
              setRiderStats(computeStats(updated));
              return updated;
            });
            toast.success(
              '✅ Delivery Confirmed!',
              `Order #${order.order_number} marked as delivered. Earnings updated!`
            );
          } else if (isActiveStatus(order.status)) {
            // Update status within active orders
            setActiveOrders((prev) => {
              const exists = prev.find((o) => o.orderId === order.id);
              let updated: RiderOrder[];
              if (exists) {
                updated = prev.map((o) => (o.orderId === order.id ? mapped : o));
              } else {
                updated = [mapped, ...prev];
              }
              refreshBatches(updated);
              return updated;
            });

            const statusMessages: Record<string, string> = {
              confirmed: '✅ Order confirmed by restaurant',
              preparing: '👨‍🍳 Restaurant is preparing the order',
              ready: '📦 Order ready for pickup!',
              out_for_delivery: '🛵 Order is out for delivery',
            };
            if (statusMessages[order.status]) {
              toast.info('Order Update', `#${order.order_number}: ${statusMessages[order.status]}`);
            }
          } else if (order.status === 'cancelled') {
            setActiveOrders((prev) => {
              let updated = prev.filter((o) => o.orderId !== order.id);
              refreshBatches(updated);
              return updated;
            });
            toast.error('❌ Order Cancelled', `Order #${order.order_number} has been cancelled.`);
          }
        }
      )
      .subscribe();

    channelsRef.current = [assignmentChannel, statusChannel];

    return cleanup;
  }, [riderId, toast, cleanup, refreshBatches]);

  return { activeOrders, completedOrders, batchDeliveries, riderStats, isLoading };
}
