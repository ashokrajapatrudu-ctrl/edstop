'use client';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { useToast } from '@/contexts/ToastContext';
import { useOrderHistoryRealtime } from '@/hooks/useOrderHistoryRealtime';

type OrderStatus = 'delivered' | 'cancelled' | 'refunded' | 'pending' | 'preparing' | 'out-for-delivery';
type OrderType = 'food' | 'dark-store';
type PaymentMethod = 'EdCoins' | 'Razorpay' | 'UPI' | 'COD';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  available?: boolean;
}

interface Order {
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
}

const mockOrders: Order[] = [
  {
    id: 'ord001',
    orderNumber: 'FD2402240001',
    type: 'food',
    restaurantOrStore: 'Nescafe Canteen',
    date: '24/02/2026',
    time: '12:45 PM',
    items: [
      { id: 'i1', name: 'Veg Fried Rice', quantity: 2, price: 80, available: true },
      { id: 'i2', name: 'Masala Chai', quantity: 2, price: 20, available: true },
      { id: 'i3', name: 'Paneer Butter Masala', quantity: 1, price: 120, available: false },
    ],
    subtotal: 320,
    deliveryFee: 0,
    discount: 16,
    total: 304,
    paymentMethod: 'EdCoins',
    status: 'delivered',
    deliveryAddress: 'Hall 3, Room 204, IIT Kharagpur',
    cashbackEarned: 15.20,
    walletRedeemed: 50,
    riderName: 'Rahul Kumar',
    riderPhone: '+91 98765 43210',
    rating: 4,
  },
  {
    id: 'ord002',
    orderNumber: 'DS2402230002',
    type: 'dark-store',
    restaurantOrStore: 'EdStop Dark Store',
    date: '23/02/2026',
    time: '09:30 AM',
    items: [
      { id: 'i4', name: 'Maggi Noodles (Pack of 6)', quantity: 1, price: 84, available: true },
      { id: 'i5', name: 'Bisleri Water 1L', quantity: 3, price: 20, available: true },
      { id: 'i6', name: 'Lay\'s Classic Salted', quantity: 2, price: 20, available: true },
    ],
    subtotal: 184,
    deliveryFee: 0,
    discount: 0,
    total: 184,
    paymentMethod: 'Razorpay',
    status: 'delivered',
    deliveryAddress: 'Hall 3, Room 204, IIT Kharagpur',
    cashbackEarned: 9.20,
    walletRedeemed: 0,
    riderName: 'Amit Singh',
    riderPhone: '+91 87654 32109',
    rating: 5,
  },
  {
    id: 'ord003',
    orderNumber: 'FD2402220003',
    type: 'food',
    restaurantOrStore: 'Gyan Mandir Dhaba',
    date: '22/02/2026',
    time: '07:15 PM',
    items: [
      { id: 'i7', name: 'Dal Tadka', quantity: 1, price: 70, available: true },
      { id: 'i8', name: 'Roti (4 pcs)', quantity: 1, price: 40, available: true },
      { id: 'i9', name: 'Jeera Rice', quantity: 1, price: 60, available: true },
    ],
    subtotal: 170,
    deliveryFee: 30,
    discount: 0,
    total: 200,
    paymentMethod: 'COD',
    status: 'cancelled',
    deliveryAddress: 'Hall 3, Room 204, IIT Kharagpur',
    cancellationReason: 'Restaurant closed early',
  },
  {
    id: 'ord004',
    orderNumber: 'DS2402200004',
    type: 'dark-store',
    restaurantOrStore: 'EdStop Dark Store',
    date: '20/02/2026',
    time: '03:00 PM',
    items: [
      { id: 'i10', name: 'Notebook A4 (200 pages)', quantity: 2, price: 60, available: true },
      { id: 'i11', name: 'Blue Pen (Pack of 10)', quantity: 1, price: 45, available: true },
    ],
    subtotal: 165,
    deliveryFee: 0,
    discount: 0,
    total: 165,
    paymentMethod: 'UPI',
    status: 'refunded',
    deliveryAddress: 'Hall 3, Room 204, IIT Kharagpur',
    refundAmount: 165,
  },
  {
    id: 'ord005',
    orderNumber: 'FD2402180005',
    type: 'food',
    restaurantOrStore: 'Nescafe Canteen',
    date: '18/02/2026',
    time: '01:00 PM',
    items: [
      { id: 'i12', name: 'Chicken Biryani', quantity: 1, price: 150, available: true },
      { id: 'i13', name: 'Raita', quantity: 1, price: 30, available: true },
      { id: 'i14', name: 'Cold Coffee', quantity: 1, price: 60, available: true },
    ],
    subtotal: 240,
    deliveryFee: 0,
    discount: 12,
    total: 228,
    paymentMethod: 'EdCoins',
    status: 'delivered',
    deliveryAddress: 'Hall 3, Room 204, IIT Kharagpur',
    cashbackEarned: 11.40,
    walletRedeemed: 30,
    riderName: 'Suresh Yadav',
    riderPhone: '+91 76543 21098',
    rating: 5,
  },
  {
    id: 'ord006',
    orderNumber: 'DS2402150006',
    type: 'dark-store',
    restaurantOrStore: 'EdStop Dark Store',
    date: '15/02/2026',
    time: '11:20 AM',
    items: [
      { id: 'i15', name: 'Dettol Hand Sanitizer 200ml', quantity: 1, price: 99, available: true },
      { id: 'i16', name: 'Colgate Toothpaste 150g', quantity: 1, price: 65, available: true },
      { id: 'i17', name: 'Dove Soap (Pack of 3)', quantity: 1, price: 120, available: false },
    ],
    subtotal: 284,
    deliveryFee: 0,
    discount: 0,
    total: 284,
    paymentMethod: 'Razorpay',
    status: 'delivered',
    deliveryAddress: 'Hall 3, Room 204, IIT Kharagpur',
    cashbackEarned: 14.20,
    walletRedeemed: 0,
    riderName: 'Priya Sharma',
    riderPhone: '+91 65432 10987',
    rating: 4,
  },
];

const statusConfig: Record<OrderStatus, { label: string; color: string; bg: string; border: string; icon: string; dotColor: string }> = {
  delivered: { label: 'Delivered', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', icon: '✅', dotColor: 'bg-emerald-400' },
  cancelled: { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30', icon: '❌', dotColor: 'bg-red-400' },
  refunded: { label: 'Refunded', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', icon: '↩️', dotColor: 'bg-amber-400' },
  pending: { label: 'Pending', color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30', icon: '⏳', dotColor: 'bg-blue-400' },
  preparing: { label: 'Preparing', color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30', icon: '👨‍🍳', dotColor: 'bg-purple-400' },
  'out-for-delivery': { label: 'On the way', color: 'text-indigo-400', bg: 'bg-indigo-500/15', border: 'border-indigo-500/30', icon: '🛵', dotColor: 'bg-indigo-400' },
};

const paymentIcons: Record<PaymentMethod, string> = {
  EdCoins: '🪙',
  Razorpay: '💳',
  UPI: '📱',
  COD: '💵',
};

export default function OrderHistoryPage() {
  const router = useRouter();
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [reorderingIds, setReorderingIds] = useState<Set<string>>(new Set());
  const [isHydrated, setIsHydrated] = useState(false);

  const { liveOrders, isLive, isLoading: isRealtimeLoading, hasLiveData } = useOrderHistoryRealtime();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Merge live DB orders with mock orders — live data takes precedence
  useEffect(() => {
    if (hasLiveData && liveOrders.length > 0) {
      // Cast live orders to local Order type (compatible shape)
      setOrders(liveOrders as unknown as Order[]);
    }
  }, [liveOrders, hasLiveData]);

  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const handleReorder = async (order: Order) => {
    setReorderingIds(prev => new Set(prev).add(order.id));
    await new Promise(r => setTimeout(r, 1200));
    const unavailable = order.items.filter(i => !i.available);
    if (unavailable.length > 0) {
      toast.warning(
        'Some items unavailable',
        `${unavailable.map(i => i.name).join(', ')} ${unavailable.length === 1 ? 'is' : 'are'} currently unavailable. Other items added to cart.`
      );
    } else {
      toast.success('Added to cart!', `${order.items.length} items from ${order.restaurantOrStore} added to your cart.`);
    }
    setReorderingIds(prev => { const next = new Set(prev); next.delete(order.id); return next; });
    setTimeout(() => {
      router.push(order.type === 'food' ? '/food-ordering-interface' : '/dark-store-shopping');
    }, 800);
  };

  const handleReorderItem = async (orderId: string, item: OrderItem) => {
    if (!item.available) {
      toast.error('Item unavailable', `${item.name} is currently out of stock.`);
      return;
    }
    setReorderingIds(prev => new Set(prev).add(`${orderId}-${item.id}`));
    await new Promise(r => setTimeout(r, 800));
    toast.success('Item added!', `${item.name} added to your cart.`);
    setReorderingIds(prev => { const next = new Set(prev); next.delete(`${orderId}-${item.id}`); return next; });
  };

  const filteredOrders = orders
    .filter(o => filterStatus === 'all' || o.status === filterStatus)
    .filter(o => filterType === 'all' || o.type === filterType)
    .filter(o => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        o.restaurantOrStore.toLowerCase().includes(q) ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.items.some(i => i.name.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.date.split('/').reverse().join('-')).getTime() - new Date(a.date.split('/').reverse().join('-')).getTime();
      if (sortBy === 'oldest') return new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime();
      if (sortBy === 'highest') return b.total - a.total;
      return a.total - b.total;
    });

const deliveredOrders = orders.filter(o => o.status === 'delivered');

// Totals
const totalSpent = deliveredOrders.reduce((sum, o) => sum + o.total, 0);
const totalCashback = deliveredOrders.reduce((sum, o) => sum + (o.cashbackEarned || 0), 0);
const deliveredCount = deliveredOrders.length;

// Monthly Spend Aggregation
const monthlySpendMap: Record<string, number> = {};

deliveredOrders.forEach(order => {
  const [day, month, year] = order.date.split('/');
  const key = `${month}/${year}`;
  monthlySpendMap[key] = (monthlySpendMap[key] || 0) + order.total;
});

const monthlySpendData = Object.entries(monthlySpendMap)
  .map(([month, total]) => ({ month, total }))
  .sort((a, b) => {
    const [m1, y1] = a.month.split('/');
    const [m2, y2] = b.month.split('/');
    return new Date(`${y1}-${m1}-01`).getTime() - new Date(`${y2}-${m2}-01`).getTime();
  });
  const cashbackComparisonData = [
  { name: 'Total Spent', amount: totalSpent },
  { name: 'Cashback Earned', amount: totalCashback }
];
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/8 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/8 rounded-full blur-3xl"></div>
        </div>
        {/* Skeleton Header */}
        <header className="relative z-20 glass-strong border-b border-white/10 sticky top-0">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <div className="animate-pulse w-9 h-9 bg-white/10 rounded-xl"></div>
              <div className="flex items-center gap-3">
                <div className="animate-pulse w-9 h-9 bg-white/10 rounded-xl"></div>
                <div className="space-y-1.5">
                  <div className="animate-pulse h-4 bg-white/10 rounded w-28"></div>
                  <div className="animate-pulse h-3 bg-white/5 rounded w-20"></div>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
          {/* Skeleton Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card rounded-2xl p-4 border border-white/10 text-center">
                <div className="animate-pulse h-7 bg-white/10 rounded w-16 mx-auto mb-2"></div>
                <div className="animate-pulse h-3 bg-white/5 rounded w-20 mx-auto"></div>
              </div>
            ))}
          </div>
          {/* Skeleton Filters */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 mb-6">
            <div className="animate-pulse h-10 bg-white/5 rounded-xl mb-3"></div>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(i => <div key={i} className="animate-pulse h-8 bg-white/5 rounded-lg w-20"></div>)}
            </div>
          </div>
          {/* Skeleton Order Cards */}
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card rounded-2xl border border-white/10 overflow-hidden p-5 animate-slide-up">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-pulse w-11 h-11 bg-white/10 rounded-xl flex-shrink-0"></div>
                    <div className="space-y-2">
                      <div className="animate-pulse h-4 bg-white/10 rounded w-36"></div>
                      <div className="animate-pulse h-3 bg-white/5 rounded w-48"></div>
                    </div>
                  </div>
                  <div className="animate-pulse h-6 bg-white/10 rounded-full w-20 flex-shrink-0"></div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="animate-pulse h-3 bg-white/5 rounded w-full"></div>
                  <div className="animate-pulse h-3 bg-white/5 rounded w-3/4"></div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="animate-pulse h-4 bg-white/10 rounded w-16"></div>
                  <div className="animate-pulse h-8 bg-white/10 rounded-xl w-24"></div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/8 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/8 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative z-20 glass-strong border-b border-white/10 sticky top-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/student-dashboard"
              className="flex items-center justify-center w-9 h-9 rounded-xl glass border border-white/10 hover:border-white/20 transition-smooth focus-ring"
              aria-label="Back to dashboard"
            >
              <Icon name="ArrowLeftIcon" size={18} className="text-white/70" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center shadow-glow-purple">
                <Icon name="ClipboardDocumentListIcon" size={18} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-white leading-tight">Order History</h1>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-white/40">{orders.length} total orders</p>
                  {isLive && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-[10px] font-bold text-emerald-400">LIVE</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="ml-auto">
              <Link
                href="/student-dashboard"
                className="flex items-center gap-2 px-4 py-2 glass rounded-xl border border-white/10 hover:border-purple-500/40 transition-smooth text-sm text-white/70 hover:text-white focus-ring"
              >
                <Icon name="HomeIcon" size={16} />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
        {/* Analytics Section */}
{/* Analytics Section */}
{monthlySpendData.length > 0 ? (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 animate-slide-up">

    {/* Line Chart */}
    <div className="glass-card rounded-2xl p-4 border border-white/10">
      <h2 className="text-white font-semibold mb-3">📈 Spend Trend</h2>
      <div style={{ width: '100%', height: 250 }}>
        <ResponsiveContainer>
          <LineChart data={monthlySpendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="month" stroke="#ffffff50" />
            <YAxis stroke="#ffffff50" />
            <Tooltip
              contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
              labelStyle={{ color: '#aaa' }}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* Bar Chart */}
    <div className="glass-card rounded-2xl p-4 border border-white/10">
      <h2 className="text-white font-semibold mb-3">📊 Monthly Spend</h2>
      <div style={{ width: '100%', height: 250 }}>
        <ResponsiveContainer>
          <BarChart data={monthlySpendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="month" stroke="#ffffff50" />
            <YAxis stroke="#ffffff50" />
            <Tooltip
              contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
              labelStyle={{ color: '#aaa' }}
            />
            <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>

  </div>
) : (
  <div className="glass-card rounded-2xl p-6 border border-white/10 text-center text-white/40 mb-6">
    No analytics yet — place your first order 🚀
  </div>
)}
{/* Cashback vs Spend */}
<div className="glass-card rounded-2xl p-5 border border-white/10 mb-6 animate-slide-up">
  <h2 className="text-white font-semibold mb-4">🪙 Cashback vs Spend</h2>

  <div style={{ width: '100%', height: 220 }}>
    <ResponsiveContainer>
      <BarChart
        data={cashbackComparisonData}
        layout="vertical"
        margin={{ top: 10, right: 20, left: 40, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
        <XAxis type="number" stroke="#ffffff50" />
        <YAxis type="category" dataKey="name" stroke="#ffffff50" />
        <Tooltip
          contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
          labelStyle={{ color: '#aaa' }}
        />
        <Bar dataKey="amount" fill="#22c55e" radius={[6, 6, 6, 6]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6 animate-slide-up">
          <div className="glass-card rounded-2xl p-4 border border-white/10 text-center">
            <p className="text-2xl font-bold text-white">{deliveredCount}</p>
            <p className="text-xs text-white/50 mt-1">Orders Delivered</p>
          </div>
          <div className="glass-card rounded-2xl p-4 border border-white/10 text-center">
            <p className="text-2xl font-bold text-white">₹{totalSpent.toFixed(0)}</p>
            <p className="text-xs text-white/50 mt-1">Total Spent</p>
          </div>
          <div className="glass-card rounded-2xl p-4 border border-emerald-500/20 text-center">
            <p className="text-2xl font-bold text-emerald-400">₹{totalCashback.toFixed(2)}</p>
            <p className="text-xs text-white/50 mt-1">EdCoins Earned</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="glass-card rounded-2xl p-4 border border-white/10 mb-6 animate-slide-up space-y-3" style={{ animationDelay: '0.05s' }}>
          {/* Search */}
          <div className="relative">
            <Icon name="MagnifyingGlassIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search by restaurant, item, or order number..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-smooth"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-smooth"
              >
                <Icon name="XMarkIcon" size={16} />
              </button>
            )}
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['all', 'delivered', 'cancelled', 'refunded'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-smooth ${
                    filterStatus === status
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50' :'bg-white/5 text-white/50 border border-white/10 hover:border-white/20'
                  }`}
                >
                  {status === 'all' ? 'All Status' : statusConfig[status as OrderStatus]?.label || status}
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-white/10 self-center hidden sm:block"></div>

            {/* Type Filter */}
            <div className="flex items-center gap-1.5">
              {(['all', 'food', 'dark-store'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-smooth ${
                    filterType === type
                      ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50' :'bg-white/5 text-white/50 border border-white/10 hover:border-white/20'
                  }`}
                >
                  {type === 'all' ? 'All Types' : type === 'food' ? '🍔 Food' : '🛒 Store'}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="ml-auto">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 focus:outline-none focus:border-purple-500/50 transition-smooth cursor-pointer"
              >
                <option value="newest" className="bg-gray-900">Newest First</option>
                <option value="oldest" className="bg-gray-900">Oldest First</option>
                <option value="highest" className="bg-gray-900">Highest Amount</option>
                <option value="lowest" className="bg-gray-900">Lowest Amount</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results count */}
        {(filterStatus !== 'all' || filterType !== 'all' || searchQuery) && (
          <p className="text-xs text-white/40 mb-3 px-1">
            Showing {filteredOrders.length} of {orders.length} orders
          </p>
        )}

        {/* Order Cards */}
        {isRealtimeLoading && !hasLiveData ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card rounded-2xl border border-white/10 overflow-hidden p-5 animate-slide-up">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-pulse w-11 h-11 bg-white/10 rounded-xl flex-shrink-0"></div>
                    <div className="space-y-2">
                      <div className="animate-pulse h-4 bg-white/10 rounded w-36"></div>
                      <div className="animate-pulse h-3 bg-white/5 rounded w-48"></div>
                    </div>
                  </div>
                  <div className="animate-pulse h-6 bg-white/10 rounded-full w-20 flex-shrink-0"></div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="animate-pulse h-3 bg-white/5 rounded w-full"></div>
                  <div className="animate-pulse h-3 bg-white/5 rounded w-3/4"></div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="animate-pulse h-4 bg-white/10 rounded w-16"></div>
                  <div className="animate-pulse h-8 bg-white/10 rounded-xl w-24"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 border border-white/10 text-center animate-slide-up">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-white font-semibold text-lg mb-2">No orders found</p>
            <p className="text-white/40 text-sm mb-6">Try adjusting your filters or search query</p>
            <button
              onClick={() => { setFilterStatus('all'); setFilterType('all'); setSearchQuery(''); }}
              className="px-6 py-2.5 gradient-primary rounded-xl text-white text-sm font-semibold hover-lift transition-smooth"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order, index) => {
              const isExpanded = expandedOrders.has(order.id);
              const status = statusConfig[order.status];
              const isReordering = reorderingIds.has(order.id);

              return (
                <div
                  key={order.id}
                  className="glass-card rounded-2xl border border-white/10 overflow-hidden animate-slide-up hover:border-white/20 transition-smooth"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {/* Card Header */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                          order.type === 'food' ?'bg-gradient-to-br from-orange-500 to-red-600' :'bg-gradient-to-br from-blue-500 to-indigo-600'
                        }`}>
                          {order.type === 'food' ? '🍔' : '🛒'}
                        </div>
                        <div>
                          <p className="font-bold text-white text-base leading-tight">{order.restaurantOrStore}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-white/40 font-mono">{order.orderNumber}</span>
                            <span className="text-white/20">·</span>
                            <span className="text-xs text-white/40">{order.date} at {order.time}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 ${status.bg} rounded-full border ${status.border} flex-shrink-0`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`}></div>
                        <span className={`text-xs font-bold ${status.color}`}>{status.label}</span>
                      </div>
                    </div>

                    {/* Items Preview */}
                    <div className="mb-4">
                      <div className={`space-y-1 ${!isExpanded && order.items.length > 2 ? 'max-h-14 overflow-hidden' : ''}`}>
                        {order.items.map(item => (
                          <div key={item.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/40 w-5 text-center font-semibold">{item.quantity}×</span>
                              <span className={`text-sm ${item.available === false ? 'text-white/30 line-through' : 'text-white/80'}`}>
                                {item.name}
                              </span>
                              {item.available === false && (
                                <span className="text-xs text-red-400/70 bg-red-500/10 px-1.5 py-0.5 rounded-full">Unavailable</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/50">₹{(item.price * item.quantity).toFixed(0)}</span>
                              {/* Per-item reorder for dark store */}
                              {order.type === 'dark-store' && order.status === 'delivered' && (
                                <button
                                  onClick={() => handleReorderItem(order.id, item)}
                                  disabled={reorderingIds.has(`${order.id}-${item.id}`) || item.available === false}
                                  className={`text-xs px-2 py-0.5 rounded-lg transition-smooth ${
                                    item.available === false
                                      ? 'text-white/20 cursor-not-allowed'
                                      : reorderingIds.has(`${order.id}-${item.id}`)
                                      ? 'bg-blue-500/20 text-blue-300 cursor-wait' :'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20'
                                  }`}
                                >
                                  {reorderingIds.has(`${order.id}-${item.id}`) ? '...' : '+ Add'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {order.items.length > 2 && (
                        <button
                          onClick={() => toggleExpand(order.id)}
                          className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition-smooth flex items-center gap-1"
                        >
                          {isExpanded ? (
                            <><Icon name="ChevronUpIcon" size={12} /> Show less</>
                          ) : (
                            <><Icon name="ChevronDownIcon" size={12} /> +{order.items.length - 2} more items</>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Price & Payment Row */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/8">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{paymentIcons[order.paymentMethod]}</span>
                          <span className="text-xs text-white/50">{order.paymentMethod}</span>
                        </div>
                        {order.cashbackEarned && order.cashbackEarned > 0 && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                            <span className="text-xs text-emerald-400">+₹{order.cashbackEarned.toFixed(2)} cashback</span>
                          </div>
                        )}
                        {order.refundAmount && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                            <span className="text-xs text-amber-400">₹{order.refundAmount} refunded</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-white text-lg">₹{order.total.toFixed(0)}</p>
                        {order.discount > 0 && (
                          <p className="text-xs text-emerald-400">-₹{order.discount} saved</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-5 pb-4 border-t border-white/8 pt-4 space-y-3 bg-white/2">
                      {/* Delivery Address */}
                      <div className="flex items-start gap-2">
                        <Icon name="MapPinIcon" size={14} className="text-white/40 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-white/40 mb-0.5">Delivery Address</p>
                          <p className="text-sm text-white/70">{order.deliveryAddress}</p>
                        </div>
                      </div>

                      {/* Rider Info */}
                      {order.riderName && (
                        <div className="flex items-center gap-2">
                          <Icon name="UserIcon" size={14} className="text-white/40 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-white/40 mb-0.5">Delivery Partner</p>
                            <p className="text-sm text-white/70">{order.riderName} · {order.riderPhone}</p>
                          </div>
                        </div>
                      )}

                      {/* Rating */}
                      {order.rating && (
                        <div className="flex items-center gap-2">
                          <Icon name="StarIcon" size={14} className="text-amber-400 flex-shrink-0" />
                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5].map(star => (
                              <span key={star} className={`text-sm ${star <= order.rating! ? 'text-amber-400' : 'text-white/20'}`}>★</span>
                            ))}
                            <span className="text-xs text-white/40 ml-1">Your rating</span>
                          </div>
                        </div>
                      )}

                      {/* Cancellation Reason */}
                      {order.cancellationReason && (
                        <div className="flex items-start gap-2">
                          <Icon name="InformationCircleIcon" size={14} className="text-red-400/70 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-white/40 mb-0.5">Cancellation Reason</p>
                            <p className="text-sm text-red-300/70">{order.cancellationReason}</p>
                          </div>
                        </div>
                      )}

                      {/* Price Breakdown */}
                      <div className="glass rounded-xl p-3 border border-white/8 space-y-1.5">
                        <p className="text-xs font-semibold text-white/60 mb-2">Price Breakdown</p>
                        <div className="flex justify-between text-xs text-white/50">
                          <span>Subtotal</span>
                          <span>₹{order.subtotal.toFixed(0)}</span>
                        </div>
                        {order.deliveryFee > 0 && (
                          <div className="flex justify-between text-xs text-white/50">
                            <span>Delivery Fee</span>
                            <span>₹{order.deliveryFee.toFixed(0)}</span>
                          </div>
                        )}
                        {order.deliveryFee === 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-white/50">Delivery Fee</span>
                            <span className="text-emerald-400">FREE</span>
                          </div>
                        )}
                        {order.discount > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-white/50">Discount</span>
                            <span className="text-emerald-400">-₹{order.discount.toFixed(0)}</span>
                          </div>
                        )}
                        {order.walletRedeemed && order.walletRedeemed > 0 ? (
                          <div className="flex justify-between text-xs">
                            <span className="text-white/50">EdCoins Redeemed</span>
                            <span className="text-purple-400">-₹{order.walletRedeemed.toFixed(0)}</span>
                          </div>
                        ) : null}
                        <div className="flex justify-between text-sm font-bold text-white pt-1.5 border-t border-white/10">
                          <span>Total Paid</span>
                          <span>₹{order.total.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card Footer Actions */}
                  <div className="px-5 py-3 border-t border-white/8 flex items-center justify-between gap-3">
                    <button
                      onClick={() => toggleExpand(order.id)}
                      className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-smooth"
                    >
                      <Icon name={isExpanded ? 'ChevronUpIcon' : 'ChevronDownIcon'} size={14} />
                      {isExpanded ? 'Hide details' : 'View details'}
                    </button>

                    <div className="flex items-center gap-2">
                      {order.status === 'delivered' && order.type === 'food' && (
                        <button
                          onClick={() => handleReorder(order)}
                          disabled={isReordering}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-smooth ${
                            isReordering
                              ? 'bg-orange-500/20 text-orange-300 cursor-wait' :'bg-gradient-to-r from-orange-500 to-red-600 text-white hover-lift shadow-geometric-sm'
                          }`}
                        >
                          {isReordering ? (
                            <><div className="w-3.5 h-3.5 border-2 border-orange-300/50 border-t-orange-300 rounded-full animate-spin"></div> Adding...</>
                          ) : (
                            <><Icon name="ArrowPathIcon" size={14} /> Reorder</>
                          )}
                        </button>
                      )}
                      {order.status === 'delivered' && order.type === 'dark-store' && (
                        <button
                          onClick={() => handleReorder(order)}
                          disabled={isReordering}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-smooth ${
                            isReordering
                              ? 'bg-blue-500/20 text-blue-300 cursor-wait' :'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover-lift shadow-geometric-sm'
                          }`}
                        >
                          {isReordering ? (
                            <><div className="w-3.5 h-3.5 border-2 border-blue-300/50 border-t-blue-300 rounded-full animate-spin"></div> Adding...</>
                          ) : (
                            <><Icon name="ArrowPathIcon" size={14} /> Reorder All</>
                          )}
                        </button>
                      )}
                      {order.status === 'cancelled' && (
                        <Link
                          href={order.type === 'food' ? '/food-ordering-interface' : '/dark-store-shopping'}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white/8 text-white/70 hover:bg-white/12 hover:text-white transition-smooth border border-white/10"
                        >
                          <Icon name="ShoppingBagIcon" size={14} />
                          Order Again
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom padding */}
        <div className="h-8"></div>
      </main>
    </div>
  );
}
