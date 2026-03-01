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
    <div className="min-h-screen bg-gray-100 p-8 space-y-8">

      <h1 className="text-4xl font-bold">Admin Dashboard</h1>

      {/* Range Buttons */}
      <div className="flex gap-3">
        {[7,30,90].map((r) => (
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

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card title="Total Revenue" value={`₹${overview?.total_revenue ?? 0}`} />
        <Card title="Delivered Orders" value={overview?.total_delivered_orders ?? 0} />
        <Card title="Cancelled Orders" value={overview?.total_cancelled_orders ?? 0} />
        <Card title="Profit Margin" value={`${financialSummary?.profit_margin_percent || 0}%`} />
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <Card title="Gross Revenue" value={`₹${Math.round(financialSummary?.total_gross_revenue || 0)}`} />
        <Card title="Commission Revenue" value={`₹${Math.round(financialSummary?.total_commission_revenue || 0)}`} />
        <Card title="Restaurant Payout" value={`₹${Math.round(financialSummary?.total_restaurant_payout || 0)}`} />
        <Card title="Rider Cost" value={`₹${Math.round(financialSummary?.total_rider_cost || 0)}`} />
        <Card title="Net Platform Profit" value={`₹${Math.round(financialSummary?.net_platform_profit || 0)}`} />
      </div>

      {/* Daily Revenue Chart */}
      <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Daily Revenue</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total_revenue" stroke="#10b981" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly Settlement */}
      <Section title="Weekly Settlement Overview">
        <div className="flex justify-end mb-4">
          <button
            onClick={downloadCSV}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
          >
            Download CSV
          </button>
        </div>

        <Table
          headers={['Week','Restaurant Payout','Rider Cost','Net Profit']}
          rows={weeklyData?.map((w:any)=>[
            w.week,
            `₹${Math.round(w.restaurant_payout)}`,
            `₹${Math.round(w.rider_cost)}`,
            `₹${Math.round(w.net_profit)}`
          ])}
        />
      </Section>

      {/* Restaurant Profitability */}
      <Section title="Restaurant Profitability Breakdown">
        <Table
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

      {/* Rider Performance */}
      <Section title="Rider Performance Overview">
        <Table
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

function Card({ title, value }: any) {
  return (
    <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Table({ headers, rows }: any) {
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b">
          {headers.map((h:any)=><th key={h} className="py-2">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows?.map((row:any,i:number)=>(
          <tr key={i} className="border-b">
            {row.map((cell:any,j:number)=><td key={j} className="py-2">{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}