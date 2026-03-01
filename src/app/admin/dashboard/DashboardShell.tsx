// src/app/admin/dashboard/DashboardShell.tsx

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

  const [overviewRes, dailyRes, breakdownRes] = await Promise.all([
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

  const breakdown = breakdownRes.data || [];

  // ================= FINANCIAL SUMMARY =================

  const totalGrossRevenue = breakdown.reduce(
    (sum: number, o: any) => sum + (o.gross_revenue || 0),
    0
  );

  const totalCommissionRevenue = breakdown.reduce(
    (sum: number, o: any) => sum + (o.platform_commission || 0),
    0
  );

  const totalRestaurantPayout = breakdown.reduce(
    (sum: number, o: any) => sum + (o.restaurant_payout || 0),
    0
  );

  const totalRiderCost = breakdown.reduce(
    (sum: number, o: any) => sum + (o.rider_cost || 0),
    0
  );

  const netPlatformProfit = breakdown.reduce(
    (sum: number, o: any) => sum + (o.net_platform_profit || 0),
    0
  );

  const profitMarginPercent =
    totalGrossRevenue > 0
      ? Number(
          ((netPlatformProfit / totalGrossRevenue) * 100).toFixed(2)
        )
      : 0;

  // ================= WEEKLY GROUPING =================

  const weeklyMap: any = {};

  breakdown.forEach((order: any) => {
    const week = new Date(order.created_at);
    week.setDate(week.getDate() - week.getDay());
    const weekKey = week.toISOString().split('T')[0];

    if (!weeklyMap[weekKey]) {
      weeklyMap[weekKey] = {
        week: weekKey,
        restaurant_payout: 0,
        rider_cost: 0,
        net_profit: 0,
      };
    }

    weeklyMap[weekKey].restaurant_payout +=
      order.restaurant_payout || 0;

    weeklyMap[weekKey].rider_cost +=
      order.rider_cost || 0;

    weeklyMap[weekKey].net_profit +=
      order.net_platform_profit || 0;
  });

  const weeklyData = Object.values(weeklyMap).sort(
    (a: any, b: any) =>
      new Date(b.week).getTime() -
      new Date(a.week).getTime()
  );

  // ================= RESTAURANT PROFITABILITY =================

  const restaurantMap: any = {};

  breakdown.forEach((order: any) => {
    const name = order.restaurant_name;

    if (!restaurantMap[name]) {
      restaurantMap[name] = {
        restaurant: name,
        orders: 0,
        gross: 0,
        commission: 0,
        net_profit: 0,
      };
    }

    restaurantMap[name].orders += 1;
    restaurantMap[name].gross += order.gross_revenue || 0;
    restaurantMap[name].commission +=
      order.platform_commission || 0;
    restaurantMap[name].net_profit +=
      order.net_platform_profit || 0;
  });

  const restaurantData = Object.values(restaurantMap).sort(
    (a: any, b: any) => b.net_profit - a.net_profit
  );

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
      weeklyData={weeklyData}
      restaurantData={restaurantData}
    />
  );
}