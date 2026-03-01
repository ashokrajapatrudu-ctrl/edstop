'use client';

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';

export default function DashboardUI({
  range,
  overview,
  dailyRevenue,
  financialSummary,
  weeklyData,
  restaurantData,
  riderData,
}: any) {

  /* ============================= */
  /* ======= SIMULATORS ========= */
  /* ============================= */

  const [commissionRate, setCommissionRate] = useState(0);
  const [riderBonus, setRiderBonus] = useState(0);

  const simulatedProfit = useMemo(() => {
    if (!financialSummary) return 0;

    const gross = financialSummary.total_gross_revenue || 0;
    const baseProfit = financialSummary.net_platform_profit || 0;

    const commissionImpact = (gross * commissionRate) / 100;
    const riderImpact = riderBonus;

    return baseProfit + commissionImpact - riderImpact;
  }, [commissionRate, riderBonus, financialSummary]);

  /* ============================= */
  /* ======= FORECASTING ========= */
  /* ============================= */

  const forecastData = useMemo(() => {
    if (!dailyRevenue?.length) return [];

    const avg =
      dailyRevenue.reduce((sum: number, d: any) => sum + d.total_revenue, 0) /
      dailyRevenue.length;

    const projection = [];

    for (let i = 1; i <= 30; i++) {
      projection.push({
        day: `+${i}`,
        total_revenue: Math.round(avg),
      });
    }

    return projection;
  }, [dailyRevenue]);

  /* ============================= */
  /* ======= CSV EXPORT ========= */
  /* ============================= */

  const downloadCSV = () => {
    if (!weeklyData?.length) return;

    const headers = ['Week','Restaurant Payout','Rider Cost','Net Profit'];

    const rows = weeklyData.map((w: any) => [
      w.week,
      w.restaurant_payout,
      w.rider_cost,
      w.net_profit,
    ]);

    const csvContent =
      [headers, ...rows]
        .map((e) => e.join(','))
        .join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `weekly_settlement_${range}d.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-200 p-10 space-y-12">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8 rounded-2xl shadow-2xl">
        <h1 className="text-4xl font-bold">Executive Intelligence Dashboard</h1>
        <p className="text-indigo-100 mt-2">Marketplace Control Center</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <KPI title="Total Revenue" value={overview?.total_revenue ?? 0} />
        <KPI title="Delivered Orders" value={overview?.total_delivered_orders ?? 0} />
        <KPI title="Profit Margin" value={financialSummary?.profit_margin_percent ?? 0} suffix="%" />
        <KPI
          title="Net Platform Profit"
          value={financialSummary?.net_platform_profit ?? 0}
          highlight={
            financialSummary?.net_platform_profit > 0
              ? 'text-green-400'
              : 'text-red-400'
          }
        />
      </div>

      {/* REVENUE TREND */}
      <Section title="Revenue Trend (Actual)">
        <ChartArea data={dailyRevenue} />
      </Section>

      {/* FORECAST */}
      <Section title="30-Day Revenue Projection">
        <ChartArea data={forecastData} />
      </Section>

      {/* SIMULATOR */}
      <Section title="Contribution Margin Simulator">
        <div className="space-y-6">

          <div>
            <label className="block text-gray-400 mb-2">
              Increase Commission (%)
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={commissionRate}
              onChange={(e) => setCommissionRate(Number(e.target.value))}
              className="w-full"
            />
            <p className="mt-1 text-indigo-400">
              +{commissionRate}% commission
            </p>
          </div>

          <div>
            <label className="block text-gray-400 mb-2">
              Rider Bonus Cost (₹)
            </label>
            <input
              type="range"
              min="0"
              max="5000"
              step="500"
              value={riderBonus}
              onChange={(e) => setRiderBonus(Number(e.target.value))}
              className="w-full"
            />
            <p className="mt-1 text-indigo-400">
              ₹{riderBonus} bonus payout
            </p>
          </div>

          <div className="text-2xl font-bold">
            Simulated Profit:{" "}
            <span className={simulatedProfit > 0 ? "text-green-400" : "text-red-400"}>
              ₹{Math.round(simulatedProfit)}
            </span>
          </div>

        </div>
      </Section>

      {/* WEEKLY */}
      <Section title="Weekly Settlement">
        <div className="flex justify-end mb-4">
          <button
            onClick={downloadCSV}
            className="bg-indigo-600 px-5 py-2 rounded-lg"
          >
            Download CSV
          </button>
        </div>

        <DataTable
          headers={['Week','Restaurant Payout','Rider Cost','Net Profit']}
          rows={weeklyData?.map((w:any)=>[
            w.week,
            `₹${Math.round(w.restaurant_payout)}`,
            `₹${Math.round(w.rider_cost)}`,
            `₹${Math.round(w.net_profit)}`
          ])}
        />
      </Section>

      {/* RESTAURANTS */}
      <Section title="Restaurant Profitability">
        <DataTable
          headers={['Restaurant','Orders','Net Profit']}
          rows={restaurantData?.map((r:any)=>[
            r.restaurant,
            r.orders,
            `₹${Math.round(r.net_profit)}`
          ])}
        />
      </Section>

      {/* RIDERS */}
      <Section title="Rider Performance">
        <DataTable
          headers={['Rider','Deliveries','Total Earned']}
          rows={riderData?.map((r:any)=>[
            r.rider,
            r.deliveries,
            `₹${Math.round(r.total_earned)}`
          ])}
        />
      </Section>

    </div>
  );
}

/* ================= COMPONENTS ================= */

function KPI({ title, value, suffix = '', highlight }: any) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 800;
    const increment = value / (duration / 16);

    const counter = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplayValue(value);
        clearInterval(counter);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(counter);
  }, [value]);

  return (
    <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-700">
      <p className="text-gray-400 text-sm mb-2">{title}</p>
      <p className={`text-2xl font-bold ${highlight || 'text-white'}`}>
        ₹{displayValue}{suffix}
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

function ChartArea({ data }: any) {
  return (
    <div style={{ width: '100%', height: 350 }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#334155" />
          <XAxis dataKey="day" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="total_revenue"
            stroke="#6366f1"
            fillOpacity={1}
            fill="url(#colorRev)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function DataTable({ headers, rows }: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-700 bg-[#0f172a]">
            {headers.map((h:any)=>
              <th key={h} className="py-3 px-3 text-sm text-gray-400">
                {h}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows?.map((row:any,i:number)=>(
            <tr key={i} className="border-b border-gray-800 hover:bg-[#273449] transition">
              {row.map((cell:any,j:number)=>
                <td key={j} className="py-3 px-3 text-gray-200">
                  {cell}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}