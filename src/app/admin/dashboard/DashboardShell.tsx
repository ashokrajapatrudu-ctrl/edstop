import { createClient } from '@/lib/supabase/server';
import DashboardUI from './DashboardUI';

export default async function DashboardShell({
  range,
}: {
  range: number;
}) {
  const supabase = await createClient();

  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - range);

  const breakdownRes = await supabase
    .from('admin_financial_breakdown')
    .select('*')
    .gte('created_at', dateLimit.toISOString());

  const breakdown = breakdownRes.data || [];

  /* ================= TOTALS ================= */

  const totalGross = breakdown.reduce((s, o) => s + (o.gross_revenue || 0), 0);
  const totalCommission = breakdown.reduce((s, o) => s + (o.platform_commission || 0), 0);
  const totalRider = breakdown.reduce((s, o) => s + (o.rider_cost || 0), 0);
  const totalRestaurant = breakdown.reduce((s, o) => s + (o.restaurant_payout || 0), 0);
  const netProfit = breakdown.reduce((s, o) => s + (o.net_platform_profit || 0), 0);

  const avgOrderValue =
    breakdown.length > 0 ? totalGross / breakdown.length : 0;

  const contributionMargin =
    totalGross > 0 ? ((netProfit / totalGross) * 100).toFixed(2) : 0;

  /* ================= ANOMALY DETECTION ================= */

  const dailyMap: any = {};
  breakdown.forEach((o) => {
    const day = o.created_at.split('T')[0];
    if (!dailyMap[day]) dailyMap[day] = 0;
    dailyMap[day] += o.gross_revenue || 0;
  });

  const dailyValues = Object.values(dailyMap);
  const avgDaily =
    dailyValues.reduce((a: any, b: any) => a + b, 0) /
    (dailyValues.length || 1);

  const anomalies = Object.entries(dailyMap)
    .filter(([_, value]: any) => value > avgDaily * 1.8 || value < avgDaily * 0.4)
    .map(([day, value]) => ({ day, value }));

  /* ================= FORECAST ================= */

  const forecast = [];
  const projectedDaily = avgDaily;

  for (let i = 1; i <= 30; i++) {
    forecast.push({
      day: `+${i}`,
      total_revenue: Math.round(projectedDaily),
    });
  }

  return (
    <DashboardUI
      totals={{
        totalGross,
        totalCommission,
        totalRider,
        totalRestaurant,
        netProfit,
        avgOrderValue,
        contributionMargin,
      }}
      forecast={forecast}
      anomalies={anomalies}
      orderCount={breakdown.length}
    />
  );
}