import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import DashboardUI from './DashboardUI';

export default async function DashboardShell() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const [
    overviewRes,
    monthlyRes,
    dailyRes,
    profitRes,
  ] = await Promise.all([
    supabase.from('admin_platform_overview').select('*').single(),
    supabase.from('admin_monthly_revenue').select('*'),
    supabase.from('admin_daily_revenue').select('*'),
    supabase.from('admin_platform_profit').select('*').single(),
  ]);

  return (
    <DashboardUI
      overview={overviewRes.data}
      monthlyRevenue={monthlyRes.data || []}
      dailyRevenue={dailyRes.data || []}
      profitData={profitRes.data}
    />
  );
}