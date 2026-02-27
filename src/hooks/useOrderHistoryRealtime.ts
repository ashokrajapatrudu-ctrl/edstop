'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type OrderStatus = 'delivered' | 'cancelled' | 'refunded' | 'pending' | 'preparing' | 'out-for-delivery';
export type OrderType = 'food' | 'dark-store';
export type PaymentMethod = 'EdCoins' | 'Razorpay' | 'UPI' | 'COD';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  available?: boolean;
}

export interface LiveOrder {
  id: string;
  orderNumber: string;
  type: OrderType;
  restaurantOrStore: string;
  date: string;
  time: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  deliveryAddress: string;
  cashbackEarned?: number;
  walletRedeemed?: number;
  riderName?: string;
  riderPhone?: string;
  rating?: number;
  cancellationReason?: string;
  refundAmount?: number;
  estimatedDeliveryTime?: string;
}

interface DBOrder {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  total_amount: number;
  final_amount: number;
  delivery_fee?: number;
  discount_amount?: number;
  payment_method?: string;
  delivery_address?: string;
  estimated_delivery_time?: string;
  actual_delivery_time?: string;
  restaurant_name?: string;
  items?: OrderItem[];
  notes?: string;
  created_at: string;
  updated_at: string;
  rider_id?: string;
  user_id?: string;
}

const DB_STATUS_MAP: Record<string, OrderStatus> = {
  pending: 'pending',
  confirmed: 'pending',
  preparing: 'preparing',
  ready: 'preparing',
  out_for_delivery: 'out-for-delivery',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

const PAYMENT_MAP: Record<string, PaymentMethod> = {
  edcoins: 'EdCoins',
  razorpay: 'Razorpay',
  upi: 'UPI',
  cod: 'COD',
};

function mapDBOrderToLive(row: DBOrder): LiveOrder {
  const createdAt = new Date(row.created_at);
  const dateStr = `${String(createdAt.getDate()).padStart(2, '0')}/${String(createdAt.getMonth() + 1).padStart(2, '0')}/${createdAt.getFullYear()}`;
  const timeStr = createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const rawStatus = row.status?.toLowerCase() || 'pending';
  const mappedStatus: OrderStatus = DB_STATUS_MAP[rawStatus] || 'pending';

  const rawPayment = (row.payment_method || '').toLowerCase();
  const paymentMethod: PaymentMethod = PAYMENT_MAP[rawPayment] || 'UPI';

  const orderType: OrderType = row.order_type === 'store' ? 'dark-store' : 'food';

  const items: OrderItem[] = Array.isArray(row.items)
    ? row.items.map((i: any) => ({
        id: i.id || String(Math.random()),
        name: i.name || 'Item',
        quantity: i.quantity || 1,
        price: i.price || 0,
        available: i.available !== false,
      }))
    : [];

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0) || Number(row.total_amount) || 0;
  const deliveryFee = Number(row.delivery_fee) || 0;
  const discount = Number(row.discount_amount) || 0;
  const total = Number(row.final_amount) || subtotal;

  return {
    id: row.id,
    orderNumber: row.order_number,
    type: orderType,
    restaurantOrStore: row.restaurant_name || (orderType === 'dark-store' ? 'EdStop Dark Store' : 'Restaurant'),
    date: dateStr,
    time: timeStr,
    items,
    subtotal,
    deliveryFee,
    discount,
    total,
    paymentMethod,
    status: mappedStatus,
    deliveryAddress: row.delivery_address || '',
    estimatedDeliveryTime: row.estimated_delivery_time,
  };
}

export interface OrderHistoryRealtimeResult {
  liveOrders: LiveOrder[];
  isLive: boolean;
  isLoading: boolean;
  hasLiveData: boolean;
}

export function useOrderHistoryRealtime(): OrderHistoryRealtimeResult {
  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLiveData, setHasLiveData] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const toast = useToast();

  const fetchOrders = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
    
      if (error) throw error;

      if (data && data.length > 0) {
        setLiveOrders(data.map(mapDBOrderToLive));
        setHasLiveData(true);
      }
    } catch (err) {
      console.error('[OrderHistoryRealtime] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setupChannel = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Clean up existing channel
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase
        .channel('order-history-realtime')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updated = payload.new as DBOrder;
            const mappedOrder = mapDBOrderToLive(updated);

            setLiveOrders(prev => {
              const exists = prev.find(o => o.id === mappedOrder.id);
              if (!exists) return prev;

              const oldOrder = exists;
              const newStatus = mappedOrder.status;

              // Status change notifications
              if (oldOrder.status !== newStatus) {
                const statusMessages: Record<OrderStatus, { title: string; msg: string }> = {
                  pending: { title: 'Order Received', msg: `Order ${mappedOrder.orderNumber} is pending confirmation.` },
                  preparing: { title: 'Order Preparing', msg: `${mappedOrder.restaurantOrStore} is preparing your order ${mappedOrder.orderNumber}.` },
                  'out-for-delivery': { title: '🛵 Out for Delivery!', msg: `Your order ${mappedOrder.orderNumber} is on the way!` },
                  delivered: { title: '✅ Order Delivered!', msg: `Order ${mappedOrder.orderNumber} has been delivered. Enjoy!` },
                  cancelled: { title: '❌ Order Cancelled', msg: `Order ${mappedOrder.orderNumber} was cancelled.` },
                  refunded: { title: '↩️ Refund Processed', msg: `Refund for order ${mappedOrder.orderNumber} has been processed.` },
                };

                const notif = statusMessages[newStatus];
                if (notif) {
                  if (newStatus === 'delivered') {
                    toast.success(notif.title, notif.msg);
                  } else if (newStatus === 'cancelled') {
                    toast.error(notif.title, notif.msg);
                  } else if (newStatus === 'refunded') {
                    toast.warning(notif.title, notif.msg);
                  } else if (newStatus === 'out-for-delivery') {
                    toast.success(notif.title, notif.msg);
                  } else {
                    toast.info(notif.title, notif.msg);
                  }
                }
              }

              return prev.map(o => o.id === mappedOrder.id ? mappedOrder : o);
            });

            setHasLiveData(true);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newOrder = mapDBOrderToLive(payload.new as DBOrder);
            setLiveOrders(prev => [newOrder, ...prev]);
            setHasLiveData(true);
            toast.success('New Order Placed', `Order ${newOrder.orderNumber} has been placed successfully!`);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsLive(true);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsLive(false);
          }
        });

      channelRef.current = channel;
    } catch (err) {
      console.error('[OrderHistoryRealtime] channel error:', err);
    }
  }, [toast]);

  useEffect(() => {
    fetchOrders();
    setupChannel();

    return () => {
      if (channelRef.current) {
        try {
          const supabase = createClient();
          supabase.removeChannel(channelRef.current);
        } catch (_) {}
        channelRef.current = null;
      }
      setIsLive(false);
    };
  }, [fetchOrders, setupChannel]);

  return { liveOrders, isLive, isLoading, hasLiveData };
}
