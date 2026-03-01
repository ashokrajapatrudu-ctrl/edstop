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

  const [
    overviewRes,
    dailyRes,
    financialBreakdownRes,
  ] = await Promise.all([
    supabase
      .from('admin_platform_overview')
      .select('*')
      .maybeSingle(),

    supabase
      .from('admin_daily_revenue')
      .select('*')
      .gte('day', dateLimit.toISOString()),

    supabase
      .from('admin_financial_breakdown')
      .select('*')
      .gte('created_at', dateLimit.toISOString()),
  ]);

  const breakdown = financialBreakdownRes.data || [];

  const totalGrossRevenue = breakdown.reduce(
    (sum, o) => sum + (o.gross_revenue || 0),
    0
  );

  const totalCommissionRevenue = breakdown.reduce(
    (sum, o) => sum + (o.platform_commission || 0),
    0
  );

  const totalRestaurantPayout = breakdown.reduce(
    (sum, o) => sum + (o.restaurant_payout || 0),
    0
  );

  const totalRiderCost = breakdown.reduce(
    (sum, o) => sum + (o.rider_cost || 0),
    0
  );

  const netPlatformProfit = breakdown.reduce(
    (sum, o) => sum + (o.net_platform_profit || 0),
    0
  );

  const profitMarginPercent =
    totalGrossRevenue > 0
      ? ((netPlatformProfit / totalGrossRevenue) * 100).toFixed(2)
      : 0;

  return (
    <DashboardUI
      range={range}
      overview={overviewRes.data}
      dailyRevenue={dailyRes.data || []}
      financialSummary={{
        total_gross_revenue: totalGrossRevenue,
        total_commission_revenue: totalCommissionRevenue,
        total_restaurant_payout: totalRestaurantPayout,
        total_rider_cost: totalRiderCost,
        net_platform_profit: netPlatformProfit,
        profit_margin_percent: profitMarginPercent,
      }}
    />
  );
}