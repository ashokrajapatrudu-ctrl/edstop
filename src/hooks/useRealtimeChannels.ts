'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface LiveTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'expired';
}

export interface LiveOrder {
  id: string;
  serviceName: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'out-for-delivery' | 'delivered' | 'cancelled';
  estimatedTime?: string;
  orderNumber: string;
  icon: 'ShoppingBagIcon' | 'ShoppingCartIcon';
}

export interface RealtimeData {
  walletBalance: number | null;
  cashbackEarned: number;
  activeOrders: LiveOrder[];
  recentTransactions: LiveTransaction[];
  isLoading: boolean;
  isLive: boolean;
}

interface OrderStatusChange {
  id: string;
  order_number: string;
  status: string;
  order_type: string;
  estimated_delivery_time?: string;
}

interface TransactionRow {
  id: string;
  transaction_type: 'credit' | 'debit' | 'refund';
  amount: number;
  description?: string;
  status: string;
  created_at: string;
}

interface WalletRow {
  id: string;
  balance: number;
}

const ORDER_STATUS_MESSAGES: Record<string, { title: string; message: string; type: 'success' | 'info' | 'warning' | 'error' }> = {
  confirmed: { title: '✅ Order Confirmed!', message: 'Your order has been accepted and is being processed.', type: 'success' },
  preparing: { title: '👨‍🍳 Preparing Your Order', message: 'The restaurant is preparing your order now.', type: 'info' },
  ready: { title: '📦 Order Ready!', message: 'Your order is packed and ready for pickup.', type: 'info' },
  out_for_delivery: { title: '🛵 Out for Delivery!', message: 'Your order is on the way. Get ready!', type: 'info' },
  delivered: { title: '🎉 Order Delivered!', message: 'Enjoy your order! Rate your experience.', type: 'success' },
  cancelled: { title: '❌ Order Cancelled', message: 'Your order has been cancelled.', type: 'error' },
};

// Map DB status (snake_case) to component status (kebab-case)
const mapOrderStatus = (dbStatus: string): LiveOrder['status'] => {
  const map: Record<string, LiveOrder['status']> = {
    pending: 'pending',
    confirmed: 'confirmed',
    preparing: 'preparing',
    ready: 'preparing',
    out_for_delivery: 'out-for-delivery',
    delivered: 'delivered',
    cancelled: 'cancelled',
  };
  return map[dbStatus] ?? 'pending';
};

const mapTransactionType = (dbType: string): 'credit' | 'debit' => {
  return dbType === 'debit' ? 'debit' : 'credit';
};

const formatDate = (isoDate: string): string => {
  try {
    const d = new Date(isoDate);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return isoDate;
  }
};

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'];

export function useRealtimeChannels(userId: string | undefined): RealtimeData {
  const toast = useToast();
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const prevOrderStatusRef = useRef<Record<string, string>>({});
  const prevWalletBalanceRef = useRef<Record<string, number>>({});

  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [cashbackEarned, setCashbackEarned] = useState<number>(0);
  const [activeOrders, setActiveOrders] = useState<LiveOrder[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<LiveTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  // ── Initial data fetch ────────────────────────────────────────────────────
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

        // Fetch wallet
        const { data: walletData } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('user_id', userId)
          .single();

        // Fetch active orders
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id, order_number, order_type, status, estimated_delivery_time')
          .eq('user_id', userId)
          .in('status', ACTIVE_STATUSES)
          .order('created_at', { ascending: false })
          .limit(10);

        // Fetch recent transactions
        const { data: txnData } = await supabase
          .from('transactions')
          .select('id, transaction_type, amount, description, status, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        // Fetch cashback (sum of credit transactions)
        const { data: cashbackData } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', userId)
          .eq('transaction_type', 'credit')
          .eq('status', 'completed');

        if (cancelled) return;

        if (walletData) {
          setWalletBalance(Number(walletData.balance));
          prevWalletBalanceRef.current[walletData.id] = Number(walletData.balance);
        }

        if (ordersData) {
          const mapped: LiveOrder[] = ordersData.map((o) => ({
            id: o.id,
            serviceName: o.order_type === 'food' ? 'Food Delivery' : 'Dark Store Shopping',
            status: mapOrderStatus(o.status),
            estimatedTime: o.estimated_delivery_time
              ? `${Math.max(0, Math.round((new Date(o.estimated_delivery_time).getTime() - Date.now()) / 60000))} mins`
              : undefined,
            orderNumber: o.order_number,
            icon: o.order_type === 'food' ? 'ShoppingBagIcon' : 'ShoppingCartIcon',
          }));
          setActiveOrders(mapped);
          ordersData.forEach((o) => { prevOrderStatusRef.current[o.id] = o.status; });
        }

        if (txnData) {
          const mapped: LiveTransaction[] = txnData.map((t) => ({
            id: t.id,
            type: mapTransactionType(t.transaction_type),
            amount: Number(t.amount),
            description: t.description || 'Transaction',
            date: formatDate(t.created_at),
            status: (t.status === 'completed' || t.status === 'pending') ? t.status : 'completed',
          }));
          setRecentTransactions(mapped);
        }

        if (cashbackData) {
          const total = cashbackData.reduce((sum, t) => sum + Number(t.amount), 0);
          setCashbackEarned(Math.round(total * 0.05 * 100) / 100); // 5% cashback
        }
      } catch {
        // silently fall back to mock data in parent
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchInitialData();
    return () => { cancelled = true; };
  }, [userId]);

  const cleanup = useCallback(() => {
    channelsRef.current.forEach((channel) => {
      try {
        let supabase = createClient();
        supabase.removeChannel(channel);
      } catch {
        // ignore cleanup errors
      }
    });
    channelsRef.current = [];
  }, []);

  // ── Real-time subscriptions ───────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    // ── Channel 1: Order status & delivery updates ──────────────────────────
    const ordersChannel = supabase
      .channel(`orders:user:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const order = payload.new as OrderStatusChange;
          const prevStatus = prevOrderStatusRef.current[order.id];

          if (prevStatus === order.status) return;
          prevOrderStatusRef.current[order.id] = order.status;

          // Update active orders state
          if (ACTIVE_STATUSES.includes(order.status)) {
            setActiveOrders((prev) => {
              const exists = prev.find((o) => o.id === order.id);
              const updated: LiveOrder = {
                id: order.id,
                serviceName: order.order_type === 'food' ? 'Food Delivery' : 'Dark Store Shopping',
                status: mapOrderStatus(order.status),
                estimatedTime: order.estimated_delivery_time
                  ? `${Math.max(0, Math.round((new Date(order.estimated_delivery_time).getTime() - Date.now()) / 60000))} mins`
                  : exists?.estimatedTime,
                orderNumber: order.order_number,
                icon: order.order_type === 'food' ? 'ShoppingBagIcon' : 'ShoppingCartIcon',
              };
              if (exists) {
                return prev.map((o) => (o.id === order.id ? updated : o));
              }
              return [updated, ...prev];
            });
          } else {
            // Remove from active orders when delivered/cancelled
            setActiveOrders((prev) => prev.filter((o) => o.id !== order.id));
          }

          // Toast notification
          const config = ORDER_STATUS_MESSAGES[order.status];
          if (!config) return;

          const orderLabel = order.order_number ? `Order #${order.order_number}` : 'Your order';
          const message =
            order.status === 'out_for_delivery' && order.estimated_delivery_time
              ? `${config.message} ETA: ${new Date(order.estimated_delivery_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : config.message;

          toast[config.type](config.title, `${orderLabel} — ${message}`);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const order = payload.new as OrderStatusChange;
          prevOrderStatusRef.current[order.id] = order.status;

          // Add to active orders
          if (ACTIVE_STATUSES.includes(order.status)) {
            const newOrder: LiveOrder = {
              id: order.id,
              serviceName: order.order_type === 'food' ? 'Food Delivery' : 'Dark Store Shopping',
              status: mapOrderStatus(order.status),
              estimatedTime: order.estimated_delivery_time
                ? `${Math.max(0, Math.round((new Date(order.estimated_delivery_time).getTime() - Date.now()) / 60000))} mins`
                : undefined,
              orderNumber: order.order_number,
              icon: order.order_type === 'food' ? 'ShoppingBagIcon' : 'ShoppingCartIcon',
            };
            setActiveOrders((prev) => [newOrder, ...prev]);
          }

          const typeLabel = order.order_type === 'food' ? '🍔 Food' : '🛒 Store';
          toast.success(
            `${typeLabel} Order Placed!`,
            `Order #${order.order_number} received. We'll notify you on every update.`
          );
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    // ── Channel 2: Wallet transactions ──────────────────────────────────────
    const transactionsChannel = supabase
      .channel(`transactions:user:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const txn = payload.new as TransactionRow;
          const amount = Number(txn.amount).toFixed(0);
          const desc = txn.description || 'Transaction';

          // Prepend new transaction to list
          const newTxn: LiveTransaction = {
            id: txn.id,
            type: mapTransactionType(txn.transaction_type),
            amount: Number(txn.amount),
            description: desc,
            date: formatDate(txn.created_at),
            status: (txn.status === 'completed' || txn.status === 'pending') ? txn.status : 'completed',
          };
          setRecentTransactions((prev) => [newTxn, ...prev].slice(0, 10));

          if (txn.transaction_type === 'credit') {
            toast.success(`💰 ₹${amount} Credited`, desc);
          } else if (txn.transaction_type === 'refund') {
            toast.success(`↩️ ₹${amount} Refunded`, desc);
          } else if (txn.transaction_type === 'debit') {
            toast.info(`💸 ₹${amount} Debited`, desc);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const txn = payload.new as TransactionRow;
          const prev = payload.old as TransactionRow;
          if (prev.status === txn.status) return;

          // Update transaction status in list
          setRecentTransactions((prevList) =>
            prevList.map((t) =>
              t.id === txn.id
                ? { ...t, status: (txn.status === 'completed' || txn.status === 'pending') ? txn.status : t.status }
                : t
            )
          );

          if (txn.status === 'failed') {
            toast.error(
              '⚠️ Transaction Failed',
              txn.description || 'A payment could not be processed. Please retry.'
            );
          } else if (txn.status === 'completed' && prev.status === 'pending') {
            const amount = Number(txn.amount).toFixed(0);
            toast.success(
              `✅ Payment Confirmed`,
              `₹${amount} — ${txn.description || 'Transaction completed'}`
            );
          }
        }
      )
      .subscribe();

    // ── Channel 3: Wallet balance updates ───────────────────────────────────
    const walletsChannel = supabase
      .channel(`wallets:user:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const wallet = payload.new as WalletRow;
          const prevBalance = prevWalletBalanceRef.current[wallet.id];

          const newBalance = Number(wallet.balance);

          // Update wallet balance state immediately
          setWalletBalance(newBalance);

          if (prevBalance === undefined) {
            prevWalletBalanceRef.current[wallet.id] = newBalance;
            return;
          }

          const diff = newBalance - prevBalance;
          prevWalletBalanceRef.current[wallet.id] = newBalance;

          if (Math.abs(diff) < 0.01) return;

          if (diff > 0) {
            toast.success(
              '🪙 Wallet Topped Up',
              `₹${diff.toFixed(0)} added. New balance: ₹${newBalance.toFixed(0)}`
            );
          } else {
            toast.info(
              '🪙 Wallet Updated',
              `₹${Math.abs(diff).toFixed(0)} deducted. Balance: ₹${newBalance.toFixed(0)}`
            );
          }
        }
      )
      .subscribe();

    channelsRef.current = [ordersChannel, transactionsChannel, walletsChannel];

    return cleanup;
  }, [userId, toast, cleanup]);

  return { walletBalance, cashbackEarned, activeOrders, recentTransactions, isLoading, isLive };
}

export default useRealtimeChannels;
