'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';

export default function DashboardUI({
  overview,
  monthlyRevenue,
  dailyRevenue,
  profitOverview,
  profitData,
  monthlyProfit,
  topProducts,
  topRestaurants,
  riderLifetime,
}: any) {
  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-8">
      <h1 className="text-4xl font-bold">Admin Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card title="Total Revenue" value={`₹${overview?.total_revenue ?? 0}`} />
        <Card title="Delivered Orders" value={overview?.total_delivered_orders ?? 0} />
        <Card title="Cancelled Orders" value={overview?.total_cancelled_orders ?? 0} />
        <Card
          title="Net Platform Profit"
          value={`₹${
            (profitData?.food_commission || 0) +
            (profitData?.store_revenue || 0) -
            (profitData?.rider_paid || 0) -
            (profitData?.restaurant_paid || 0)
          }`}
        />
      </div>

      <ChartCard
        title="Monthly Revenue"
        data={monthlyRevenue}
        dataKey="total_revenue"
        xKey="month"
        color="#6366f1"
      />

      <ChartCard
        title="Daily Revenue"
        data={dailyRevenue}
        dataKey="total_revenue"
        xKey="day"
        color="#10b981"
      />

      <Link
        href="/admin-promo-code-management"
        className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl"
      >
        Promo Code Management
      </Link>
    </div>
  );
}

function Card({ title, value }: any) {
  return (
    <div className="bg-white shadow rounded-xl p-6">
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function ChartCard({ title, data, dataKey, xKey, color }: any) {
  return (
    <div className="bg-white shadow rounded-xl p-6">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}