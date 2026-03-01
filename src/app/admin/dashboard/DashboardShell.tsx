// src/app/admin/dashboard/DashboardShell.tsx

import { createClient } from '@/lib/supabase/server';
import DashboardUI from './DashboardUI';

export default async function DashboardShell() {
  const supabase = await createClient();   // 👈 MUST AWAIT

  const [
    overviewRes,
    monthlyRes,
    dailyRes,
    profitRes,
    financialSummaryRes
  ] = await Promise.all([
    supabase.from('admin_platform_overview').select('*').maybeSingle(),
    supabase.from('admin_monthly_revenue').select('*'),
    supabase.from('admin_daily_revenue').select('*'),
    supabase.from('admin_platform_profit').select('*').maybeSingle(),
    supabase.from('admin_financial_summary').select('*').maybeSingle(),
  ]);

  return (
    <DashboardUI
      overview={overviewRes.data}
      monthlyRevenue={monthlyRes.data || []}
      dailyRevenue={dailyRes.data || []}
      profitData={profitRes.data}
      financialSummary={financialSummaryRes.data}
    />
  );
}