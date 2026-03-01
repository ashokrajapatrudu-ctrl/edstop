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
  restaurantData,
  riderData,
}: any) {

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
    <div className="min-h-screen bg-slate-100 p-10 space-y-10">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8 rounded-2xl shadow-xl">
        <h1 className="text-4xl font-bold tracking-tight">
          Admin Financial Dashboard
        </h1>
        <p className="text-indigo-100 mt-2">
          Real-time marketplace intelligence
        </p>
      </div>

      {/* RANGE FILTER */}
      <div className="flex gap-4">
        {[7,30,90].map((r) => (
          <Link
            key={r}
            href={`/admin/dashboard?range=${r}`}
            className={`px-5 py-2 rounded-lg font-medium transition ${
              r === range
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {r} Days
          </Link>
        ))}
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <KPI title="Total Revenue" value={`₹${overview?.total_revenue ?? 0}`} />
        <KPI title="Delivered Orders" value={overview?.total_delivered_orders ?? 0} />
        <KPI title="Cancelled Orders" value={overview?.total_cancelled_orders ?? 0} />
        <KPI title="Profit Margin" value={`${financialSummary?.profit_margin_percent || 0}%`} />
      </div>

      {/* FINANCIAL SUMMARY */}
      <Section title="Financial Summary">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <KPI title="Gross Revenue" value={`₹${Math.round(financialSummary?.total_gross_revenue || 0)}`} />
          <KPI title="Commission Revenue" value={`₹${Math.round(financialSummary?.total_commission_revenue || 0)}`} />
          <KPI title="Restaurant Payout" value={`₹${Math.round(financialSummary?.total_restaurant_payout || 0)}`} />
          <KPI title="Rider Cost" value={`₹${Math.round(financialSummary?.total_rider_cost || 0)}`} />
          <KPI
            title="Net Platform Profit"
            value={`₹${Math.round(financialSummary?.net_platform_profit || 0)}`}
            highlight={
              financialSummary?.net_platform_profit > 0
                ? 'text-green-600'
                : 'text-red-600'
            }
          />
        </div>
      </Section>

      {/* DAILY REVENUE CHART */}
      <Section title="Daily Revenue Trend">
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
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
      </Section>

      {/* WEEKLY SETTLEMENT */}
      <Section title="Weekly Settlement Overview">
        <div className="flex justify-end mb-4">
          <button
            onClick={downloadCSV}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg shadow-md"
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

      {/* RESTAURANT PROFITABILITY */}
      <Section title="Restaurant Profitability">
        <DataTable
          headers={['Restaurant','Orders','Gross','Commission','Net Profit']}
          rows={restaurantData?.map((r:any)=>[
            r.restaurant,
            r.orders,
            `₹${Math.round(r.gross)}`,
            `₹${Math.round(r.commission)}`,
            `₹${Math.round(r.net_profit)}`
          ])}
        />
      </Section>

      {/* RIDER PERFORMANCE */}
      <Section title="Rider Performance">
        <DataTable
          headers={['Rider','Deliveries','Total Earned','Avg / Order']}
          rows={riderData?.map((r:any)=>[
            r.rider,
            r.deliveries,
            `₹${Math.round(r.total_earned)}`,
            `₹${r.avg_per_order}`
          ])}
        />
      </Section>

    </div>
  );
}

/* COMPONENTS */

function KPI({ title, value, highlight }: any) {
  return (
    <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
      <p className="text-gray-500 text-sm mb-2">{title}</p>
      <p className={`text-2xl font-bold ${highlight || 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-200">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">
        {title}
      </h2>
      {children}
    </div>
  );
}

function DataTable({ headers, rows }: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b bg-gray-50">
            {headers.map((h:any)=>
              <th key={h} className="py-3 px-3 text-sm font-semibold text-gray-700">
                {h}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows?.map((row:any,i:number)=>(
            <tr key={i} className="border-b hover:bg-gray-50 transition">
              {row.map((cell:any,j:number)=>
                <td key={j} className="py-3 px-3 text-gray-800 font-medium">
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