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
  range,
  overview,
  dailyRevenue,
  financialSummary,
  weeklyData,
}: any) {
  return (
    <div className="min-h-screen bg-gray-100 p-8 space-y-8">
      <h1 className="text-4xl font-bold">Admin Dashboard</h1>

      {/* Range Buttons */}
      <div className="flex gap-3">
        {[7, 30, 90].map((r) => (
          <Link
            key={r}
            href={`/admin/dashboard?range=${r}`}
            className={`px-4 py-2 rounded-lg ${
              r === range
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200'
            }`}
          >
            {r} Days
          </Link>
        ))}
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card
          title="Total Revenue"
          value={`₹${overview?.total_revenue ?? 0}`}
        />
        <Card
          title="Delivered Orders"
          value={overview?.total_delivered_orders ?? 0}
        />
        <Card
          title="Cancelled Orders"
          value={overview?.total_cancelled_orders ?? 0}
        />
        <Card
          title="Profit Margin"
          value={`${financialSummary?.profit_margin_percent || 0}%`}
        />
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <Card
          title="Total Gross Revenue"
          value={`₹${Math.round(
            financialSummary?.total_gross_revenue || 0
          )}`}
        />
        <Card
          title="Commission Revenue"
          value={`₹${Math.round(
            financialSummary?.total_commission_revenue || 0
          )}`}
        />
        <Card
          title="Restaurant Payout"
          value={`₹${Math.round(
            financialSummary?.total_restaurant_payout || 0
          )}`}
        />
        <Card
          title="Rider Cost"
          value={`₹${Math.round(
            financialSummary?.total_rider_cost || 0
          )}`}
        />
        <Card
          title="Net Platform Profit"
          value={`₹${Math.round(
            financialSummary?.net_platform_profit || 0
          )}`}
        />
      </div>

      {/* Daily Revenue Chart */}
      <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
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

      {/* Weekly Settlement Table */}
      <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">
          Weekly Settlement Overview
        </h2>

        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="py-2">Week</th>
              <th className="py-2">Restaurant Payout</th>
              <th className="py-2">Rider Cost</th>
              <th className="py-2">Net Profit</th>
            </tr>
          </thead>
          <tbody>
            {weeklyData?.map((w: any) => (
              <tr key={w.week} className="border-b">
                <td className="py-2">{w.week}</td>
                <td className="py-2">
                  ₹{Math.round(w.restaurant_payout)}
                </td>
                <td className="py-2">
                  ₹{Math.round(w.rider_cost)}
                </td>
                <td
                  className={`py-2 font-semibold ${
                    w.net_profit > 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  ₹{Math.round(w.net_profit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

function Card({ title, value }: any) {
  return (
    <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}