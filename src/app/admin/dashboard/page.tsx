'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profitOverview, setProfitOverview] = useState<any>(null);
  const [topRestaurants, setTopRestaurants] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [revenueGrowth, setRevenueGrowth] = useState<any[]>([]); 
  const [riderLifetime, setRiderLifetime] = useState<any[]>([]);
  const [riderWeekly, setRiderWeekly] = useState<any[]>([]);
  const [riderPending, setRiderPending] = useState<any[]>([]);
  useEffect(() => {
    const fetchAdminAnalytics = async () => {
      const supabase = createClient();

      const { data: overviewData } = await supabase
        .from('admin_platform_overview')
        .select('*')
        .single();

      const { data: monthlyData } = await supabase
        .from('admin_monthly_revenue')
        .select('*');

      const { data: dailyData } = await supabase
        .from('admin_daily_revenue')
        .select('*');
      const { data: profitData } = await supabase
        .from('admin_profit_overview')
       .select('*')
       .single();

       const { data: restaurantData } = await supabase
        .from('admin_top_restaurants')
        .select('*');

       const { data: productData } = await supabase
        .from('admin_top_products')
        .select('*');

       const { data: growthData } = await supabase
       .from('admin_revenue_growth')
       .select('*');
       const { data: lifetimeData } = await supabase
       .from('rider_lifetime_summary')
       .select('*');

       const { data: weeklyData } = await supabase
       .from('rider_weekly_payout')
       .select('*');

       const { data: pendingData } = await supabase
       .from('rider_pending_settlements')
       .select('*');

      setRiderLifetime(lifetimeData || []);
      setRiderWeekly(weeklyData || []);
      setRiderPending(pendingData || []);

      setProfitOverview(profitData);
      setTopRestaurants(restaurantData || []);
      setTopProducts(productData || []);
      setRevenueGrowth(growthData || []);
      setOverview(overviewData);
      setMonthlyRevenue(monthlyData || []);
      setDailyRevenue(dailyData || []);
      setLoading(false);
    };

    fetchAdminAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-8">
      <h1 className="text-4xl font-bold text-gray-900">
        Admin Dashboard
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white shadow rounded-xl p-6">
          <p className="text-gray-500 text-sm">Total Revenue</p>
          <p className="text-2xl font-bold">
            ₹{overview?.total_revenue ?? 0}
          </p>
        </div>

        <div className="bg-white shadow rounded-xl p-6">
          <p className="text-gray-500 text-sm">Delivered Orders</p>
          <p className="text-2xl font-bold">
            {overview?.total_delivered_orders ?? 0}
          </p>
        </div>

        <div className="bg-white shadow rounded-xl p-6">
          <p className="text-gray-500 text-sm">Cancelled Orders</p>
          <p className="text-2xl font-bold">
            {overview?.total_cancelled_orders ?? 0}
          </p>
        </div>

        <div className="bg-white shadow rounded-xl p-6">
          <p className="text-gray-500 text-sm">Avg Delivery Time</p>
          <p className="text-2xl font-bold">
            {overview?.avg_delivery_time_minutes
              ? Math.round(overview.avg_delivery_time_minutes)
              : 0}{' '}
            min
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
  <div className="bg-white shadow rounded-xl p-6">
    <p className="text-gray-500 text-sm">Gross Revenue</p>
    <p className="text-2xl font-bold">
      ₹{profitOverview?.gross_revenue ?? 0}
    </p>
  </div>

  <div className="bg-white shadow rounded-xl p-6">
    <p className="text-gray-500 text-sm">Total Discounts</p>
    <p className="text-2xl font-bold">
      ₹{profitOverview?.total_discounts ?? 0}
    </p>
  </div>

  <div className="bg-white shadow rounded-xl p-6">
    <p className="text-gray-500 text-sm">Net Revenue</p>
    <p className="text-2xl font-bold text-green-600">
      ₹{profitOverview?.net_revenue ?? 0}
    </p>
  </div>
</div> 
      <div className="bg-white shadow rounded-xl p-6">
  <h2 className="text-xl font-semibold mb-4">Top Restaurants</h2>
  <table className="w-full text-left">
    <thead>
      <tr className="border-b">
        <th className="py-2">Restaurant</th>
        <th className="py-2">Orders</th>
        <th className="py-2">Revenue</th>
      </tr>
    </thead>
    <tbody>
      {topRestaurants.map((r, i) => (
        <tr key={i} className="border-b">
          <td className="py-2">{r.restaurant_name}</td>
          <td className="py-2">{r.total_orders}</td>
          <td className="py-2">₹{r.total_revenue}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
      <div className="bg-white shadow rounded-xl p-6">
  <h2 className="text-xl font-semibold mb-4">Top Products</h2>
  <table className="w-full text-left">
    <thead>
      <tr className="border-b">
        <th className="py-2">Product</th>
        <th className="py-2">Quantity</th>
        <th className="py-2">Revenue</th>
      </tr>
    </thead>
    <tbody>
      {topProducts.map((p, i) => (
        <tr key={i} className="border-b">
          <td className="py-2">{p.product_name}</td>
          <td className="py-2">{p.total_quantity}</td>
          <td className="py-2">₹{p.total_revenue}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
    const latestGrowth = revenueGrowth.length
  ? revenueGrowth[revenueGrowth.length - 1]
  : null;
      <div className="bg-white shadow rounded-xl p-6">
  <p className="text-gray-500 text-sm">Monthly Growth</p>
  <p className={`text-2xl font-bold ${
    latestGrowth?.growth_percent > 0
      ? 'text-green-600'
      : 'text-red-600'
  }`}>
    {latestGrowth?.growth_percent ?? 0}%
  </p>
</div>
       <div className="bg-white shadow rounded-xl p-6">
  <h2 className="text-xl font-semibold mb-4">Top Riders</h2>

  <table className="w-full text-left">
    <thead>
      <tr className="border-b">
        <th className="py-2">Rider ID</th>
        <th className="py-2">Deliveries</th>
        <th className="py-2">Total Earned</th>
      </tr>
    </thead>
    <tbody>
      {riderLifetime
        .sort((a, b) => b.total_earned - a.total_earned)
        .slice(0, 5)
        .map((r, i) => (
          <tr key={i} className="border-b">
            <td className="py-2">{r.rider_id}</td>
            <td className="py-2">{r.total_deliveries}</td>
            <td className="py-2">₹{r.total_earned}</td>
          </tr>
        ))}
    </tbody>
  </table>
</div>
       <div className="bg-white shadow rounded-xl p-6">
  <h2 className="text-xl font-semibold mb-4">Pending Rider Payments</h2>

  <table className="w-full text-left">
    <thead>
      <tr className="border-b">
        <th className="py-2">Rider</th>
        <th className="py-2">Week</th>
        <th className="py-2">Pending</th>
      </tr>
    </thead>
    <tbody>
      {riderPending
        .filter(r => r.pending_amount > 0)
        .map((r, i) => (
          <tr key={i} className="border-b">
            <td className="py-2">{r.rider_id}</td>
            <td className="py-2">
              {new Date(r.week_start).toLocaleDateString()}
            </td>
            <td className="py-2 text-red-600 font-semibold">
  ₹{r.pending_amount}

  <button
    onClick={async () => {
      const supabase = createClient();

      await supabase.rpc('mark_rider_payout_paid', {
        p_rider_id: r.rider_id,
        p_week_start: r.week_start,
        p_amount: r.pending_amount,
      });

      alert('Payout marked as paid');
      window.location.reload();
    }}
    className="ml-3 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs"
  >
    Mark Paid
  </button>
</td>
          </tr>
        ))}
    </tbody>
  </table>
</div>
      {/* Monthly Revenue Chart */}
      <div className="bg-white shadow rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">
          Monthly Revenue
        </h2>

        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="total_revenue"
                stroke="#6366f1"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Revenue Chart */}
      <div className="bg-white shadow rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">
          Daily Revenue
        </h2>

        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="total_revenue"
                stroke="#10b981"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Link
        href="/admin-promo-code-management"
        className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl"
      >
        Promo Code Management
      </Link>
    </div>
  );
}