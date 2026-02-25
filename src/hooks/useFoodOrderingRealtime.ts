'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface LiveMenuPrice {
  externalId: string;
  restaurantSlug: string;
  price: number;
  originalPrice: number;
  isAvailable: boolean;
  stockLevel: number;
}

export interface LiveRestaurantStatus {
  slug: string;
  isAvailable: boolean;
  rating: number;
  deliveryTime: string;
  minimumOrder: number;
}

export interface LiveOrderConfirmation {
  orderId: string;
  orderNumber: string;
  status: string;
  estimatedDeliveryTime?: string;
  restaurantName?: string;
}

export interface FoodOrderingRealtimeResult {
  menuPrices: Record<string, LiveMenuPrice>;
  restaurantStatuses: Record<string, LiveRestaurantStatus>;
  orderConfirmation: LiveOrderConfirmation | null;
  isLive: boolean;
  clearOrderConfirmation: () => void;
}

interface DBMenuItem {
  id: string;
  restaurant_id: string;
  external_id: string;
  name: string;
  price: number;
  original_price: number;
  is_available: boolean;
  stock_level: number;
  restaurants?: { slug: string };
}

interface DBRestaurant {
  id: string;
  slug: string;
  name: string;
  is_available: boolean;
  rating: number;
  delivery_time: string;
  minimum_order: number;
}

interface DBOrder {
  id: string;
  order_number: string;
  status: string;
  estimated_delivery_time?: string;
  restaurant_name?: string;
  user_id: string;
}

export function useFoodOrderingRealtime(
  userId: string | undefined,
  activeOrderId?: string | null
): FoodOrderingRealtimeResult {
  const toast = useToast();
  const menuChannelRef = useRef<RealtimeChannel | null>(null);
  const restaurantChannelRef = useRef<RealtimeChannel | null>(null);
  const orderChannelRef = useRef<RealtimeChannel | null>(null);
  const restaurantIdToSlugRef = useRef<Record<string, string>>({});

  const [menuPrices, setMenuPrices] = useState<Record<string, LiveMenuPrice>>({});
  const [restaurantStatuses, setRestaurantStatuses] = useState<Record<string, LiveRestaurantStatus>>({});
  const [orderConfirmation, setOrderConfirmation] = useState<LiveOrderConfirmation | null>(null);
  const [isLive, setIsLive] = useState(false);

  // ── Initial data fetch ────────────────────────────────────────────────────
  const fetchInitialData = useCallback(async () => {
    try {
      let supabase = createClient();

      // Fetch restaurants
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id, slug, name, is_available, rating, delivery_time, minimum_order');

      if (restaurants) {
        const statusMap: Record<string, LiveRestaurantStatus> = {};
        const idToSlug: Record<string, string> = {};
        restaurants.forEach((r: DBRestaurant) => {
          statusMap[r.slug] = {
            slug: r.slug,
            isAvailable: r.is_available,
            rating: Number(r.rating),
            deliveryTime: r.delivery_time,
            minimumOrder: Number(r.minimum_order),
          };
          idToSlug[r.id] = r.slug;
        });
        setRestaurantStatuses(statusMap);
        restaurantIdToSlugRef.current = idToSlug;
      }

      // Fetch menu items with restaurant slug
      const { data: menuItems } = await supabase
        .from('menu_items')
        .select('id, restaurant_id, external_id, name, price, original_price, is_available, stock_level');

      if (menuItems) {
        const priceMap: Record<string, LiveMenuPrice> = {};
        menuItems.forEach((item: DBMenuItem) => {
          const slug = restaurantIdToSlugRef.current[item.restaurant_id] || '';
          const key = `${slug}:${item.external_id}`;
          priceMap[key] = {
            externalId: item.external_id,
            restaurantSlug: slug,
            price: Number(item.price),
            originalPrice: Number(item.original_price),
            isAvailable: item.is_available,
            stockLevel: item.stock_level,
          };
        });
        setMenuPrices(priceMap);
      }
    } catch (err) {
      console.error('[FoodOrderingRealtime] fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // ── Real-time subscriptions ───────────────────────────────────────────────
  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    // ── Channel 1: Menu item price & stock & availability changes ──────────
    const menuChannel = supabase
      .channel('food-menu-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'menu_items' },
        (payload) => {
          const item = payload.new as DBMenuItem;
          const oldItem = payload.old as Partial<DBMenuItem>;
          const slug = restaurantIdToSlugRef.current[item.restaurant_id] || '';
          const key = `${slug}:${item.external_id}`;

          setMenuPrices((prev) => {
            const existing = prev[key];
            const updated: LiveMenuPrice = {
              externalId: item.external_id,
              restaurantSlug: slug,
              price: Number(item.price),
              originalPrice: Number(item.original_price),
              isAvailable: item.is_available,
              stockLevel: item.stock_level,
            };

            // Price change notification
            if (existing && existing.price !== updated.price) {
              const direction = updated.price > existing.price ? '📈 Price Increased' : '📉 Price Dropped';
              const msg = `${item.name}: ₹${existing.price} → ₹${updated.price}`;
              if (updated.price > existing.price) {
                toast.warning(direction, msg);
              } else {
                toast.success(direction, msg);
              }
            }

            // Availability change notification
            if (existing && existing.isAvailable !== updated.isAvailable) {
              if (!updated.isAvailable) {
                toast.warning('Item Unavailable', `${item.name} is currently out of stock.`);
              } else {
                toast.success('Item Available', `${item.name} is back in stock!`);
              }
            }

            // Low stock warning (threshold: 5)
            if (
              existing &&
              updated.stockLevel <= 5 &&
              updated.stockLevel > 0 &&
              existing.stockLevel > 5
            ) {
              toast.warning('Low Stock', `Only ${updated.stockLevel} left for ${item.name}. Order soon!`);
            }

            return { ...prev, [key]: updated };
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true);
        }
      });

    menuChannelRef.current = menuChannel;

    // ── Channel 2: Restaurant availability changes ─────────────────────────
    const restaurantChannel = supabase
      .channel('food-restaurant-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'restaurants' },
        (payload) => {
          const restaurant = payload.new as DBRestaurant;
          const oldRestaurant = payload.old as Partial<DBRestaurant>;

          // Update restaurant ID → slug mapping
          restaurantIdToSlugRef.current[restaurant.id] = restaurant.slug;

          setRestaurantStatuses((prev) => {
            const existing = prev[restaurant.slug];
            const updated: LiveRestaurantStatus = {
              slug: restaurant.slug,
              isAvailable: restaurant.is_available,
              rating: Number(restaurant.rating),
              deliveryTime: restaurant.delivery_time,
              minimumOrder: Number(restaurant.minimum_order),
            };

            // Availability change notification
            if (existing && existing.isAvailable !== updated.isAvailable) {
              if (!updated.isAvailable) {
                toast.error('Restaurant Closed', `${restaurant.name} is temporarily unavailable.`);
              } else {
                toast.success('Restaurant Open', `${restaurant.name} is now accepting orders!`);
              }
            }

            // Delivery time change notification
            if (existing && existing.deliveryTime !== updated.deliveryTime) {
              toast.info('Delivery Time Updated', `${restaurant.name}: ${updated.deliveryTime}`);
            }

            return { ...prev, [restaurant.slug]: updated };
          });
        }
      )
      .subscribe();

    restaurantChannelRef.current = restaurantChannel;

    return () => {
      supabase.removeChannel(menuChannel);
      supabase.removeChannel(restaurantChannel);
      setIsLive(false);
    };
  }, [toast]);

  // ── Channel 3: Order confirmation updates (per active order) ──────────────
  useEffect(() => {
    if (!userId) return;

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    // Clean up previous order channel
    if (orderChannelRef.current) {
      supabase.removeChannel(orderChannelRef.current);
      orderChannelRef.current = null;
    }

    const orderChannel = supabase
      .channel(`food-order-confirmation:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const order = payload.new as DBOrder;
          if (order.order_type !== 'food') return;

          setOrderConfirmation({
            orderId: order.id,
            orderNumber: order.order_number,
            status: order.status,
            estimatedDeliveryTime: order.estimated_delivery_time,
            restaurantName: order.restaurant_name,
          });

          toast.success(
            '✅ Order Confirmed!',
            `Order #${order.order_number} received by ${order.restaurant_name || 'restaurant'}.`
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const order = payload.new as DBOrder;
          const oldOrder = payload.old as Partial<DBOrder>;
          if (order.order_type !== 'food') return;

          // Only update confirmation if status changed
          if (oldOrder.status === order.status) return;

          setOrderConfirmation((prev) => {
            if (!prev || prev.orderId !== order.id) return prev;
            return {
              ...prev,
              status: order.status,
              estimatedDeliveryTime: order.estimated_delivery_time,
            };
          });

          const confirmationMessages: Record<string, { title: string; msg: string; type: 'success' | 'info' | 'warning' | 'error' }> = {
            confirmed: { title: '✅ Order Confirmed!', msg: `Order #${order.order_number} confirmed by ${order.restaurant_name || 'restaurant'}.`, type: 'success' },
            preparing: { title: '👨‍🍳 Preparing Your Order', msg: `${order.restaurant_name || 'Restaurant'} is preparing order #${order.order_number}.`, type: 'info' },
            ready: { title: '📦 Order Ready!', msg: `Order #${order.order_number} is packed and ready for pickup.`, type: 'info' },
            out_for_delivery: { title: '🛵 Out for Delivery!', msg: `Order #${order.order_number} is on the way!`, type: 'info' },
            delivered: { title: '🎉 Order Delivered!', msg: `Order #${order.order_number} delivered. Enjoy your meal!`, type: 'success' },
            cancelled: { title: '❌ Order Cancelled', msg: `Order #${order.order_number} has been cancelled.`, type: 'error' },
          };

          const notif = confirmationMessages[order.status];
          if (notif) {
            if (notif.type === 'success') toast.success(notif.title, notif.msg);
            else if (notif.type === 'error') toast.error(notif.title, notif.msg);
            else if (notif.type === 'warning') toast.warning(notif.title, notif.msg);
            else toast.info(notif.title, notif.msg);
          }
        }
      )
      .subscribe();

    orderChannelRef.current = orderChannel;

    return () => {
      supabase.removeChannel(orderChannel);
    };
  }, [userId, toast]);

  const clearOrderConfirmation = useCallback(() => {
    setOrderConfirmation(null);
  }, []);

  return {
    menuPrices,
    restaurantStatuses,
    orderConfirmation,
    isLive,
    clearOrderConfirmation,
  };
}
