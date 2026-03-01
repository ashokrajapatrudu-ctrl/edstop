'use client';

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useState, useEffect } from 'react';

export default function DashboardUI({
  totals,
  forecast,
  anomalies,
  orderCount,
}: any) {

  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      window.location.reload();
    }, 20000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-200 p-10 space-y-10">

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">
          EdStop Intelligence Engine
        </h1>

        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className="bg-indigo-600 px-4 py-2 rounded-lg"
        >
          {autoRefresh ? "Auto Refresh ON" : "Enable Auto Refresh"}
        </button>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card title="Gross Revenue" value={totals.totalGross} />
        <Card title="Net Profit" value={totals.netProfit} />
        <Card title="Avg Order Value" value={totals.avgOrderValue} />
        <Card title="Contribution Margin %" value={totals.contributionMargin} />
      </div>

      {/* FORECAST */}
      <Section title="30-Day Forecast Projection">
        <Chart data={forecast} />
      </Section>

      {/* UNIT ECONOMICS */}
      <Section title="Unit Economics">
        <p>Total Orders: {orderCount}</p>
        <p>Commission Revenue: ₹{totals.totalCommission}</p>
        <p>Restaurant Payout: ₹{totals.totalRestaurant}</p>
        <p>Rider Cost: ₹{totals.totalRider}</p>
      </Section>

      {/* ANOMALIES */}
      <Section title="Revenue Anomalies Detected">
        {anomalies.length === 0 ? (
          <p>No abnormal spikes detected</p>
        ) : (
          anomalies.map((a: any, i: number) => (
            <div key={i} className="text-red-400">
              {a.day} → ₹{a.value}
            </div>
          ))
        )}
      </Section>

    </div>
  );
}

/* COMPONENTS */

function Card({ title, value }: any) {
  return (
    <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-700">
      <p className="text-gray-400 text-sm mb-2">{title}</p>
      <p className="text-2xl font-bold text-white">
        ₹{Math.round(value)}
      </p>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="bg-[#1e293b] p-8 rounded-2xl border border-gray-700">
      <h2 className="text-2xl font-semibold mb-6 text-white">{title}</h2>
      {children}
    </div>
  );
}

function Chart({ data }: any) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <CartesianGrid stroke="#334155" />
          <XAxis dataKey="day" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="total_revenue"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}