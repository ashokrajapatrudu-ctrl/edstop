import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Fetch all promo codes
    const { data: promoCodes, error: promoError } = await supabase
      .from('promo_codes')
      .select('*');

    if (promoError) throw promoError;

    // Fetch alert thresholds
    const { data: thresholds, error: thresholdError } = await supabase
      .from('promo_alert_thresholds')
      .select('*')
      .limit(1)
      .single();

    if (thresholdError || !thresholds) {
      return NextResponse.json({ error: 'No alert thresholds configured' }, { status: 400 });
    }

    if (!thresholds.alert_emails || thresholds.alert_emails.length === 0) {
      return NextResponse.json({ message: 'No admin emails configured', triggered: [] });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const now = new Date();
    const triggered: string[] = [];

    for (const promo of promoCodes || []) {
      // Check redemption cap (80% threshold)
      if (promo.usage_limit && promo.used_count > 0) {
        const pct = (promo.used_count / promo.usage_limit) * 100;
        if (pct >= thresholds.redemption_cap_pct) {
          // Check if already alerted recently (within 24h)
          const { data: recentLog } = await supabase
            .from('promo_alert_logs')
            .select('id')
            .eq('promo_code_id', promo.id)
            .eq('alert_type', 'redemption_cap')
            .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .limit(1);

          if (!recentLog || recentLog.length === 0) {
            await triggerAlert(supabaseUrl, serviceRoleKey, {
              alertType: 'redemption_cap',
              promoCode: promo.code,
              details: {
                currentPct: Math.round(pct),
                usedCount: promo.used_count,
                usageLimit: promo.usage_limit,
                threshold: thresholds.redemption_cap_pct,
              },
              adminEmails: thresholds.alert_emails,
            });

            await supabase.from('promo_alert_logs').insert({
              promo_code_id: promo.id,
              alert_type: 'redemption_cap',
              promo_code: promo.code,
              details: { currentPct: Math.round(pct), usedCount: promo.used_count, usageLimit: promo.usage_limit },
            });

            triggered.push(`${promo.code}:redemption_cap`);
          }
        }
      }

      // Check expiry
      if (promo.expires_at) {
        const expiresAt = new Date(promo.expires_at);
        const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Already expired
        if (expiresAt < now) {
          const { data: recentLog } = await supabase
            .from('promo_alert_logs')
            .select('id')
            .eq('promo_code_id', promo.id)
            .eq('alert_type', 'expired')
            .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .limit(1);

          if (!recentLog || recentLog.length === 0) {
            await triggerAlert(supabaseUrl, serviceRoleKey, {
              alertType: 'expired',
              promoCode: promo.code,
              details: { expiredAt: expiresAt.toLocaleDateString() },
              adminEmails: thresholds.alert_emails,
            });

            await supabase.from('promo_alert_logs').insert({
              promo_code_id: promo.id,
              alert_type: 'expired',
              promo_code: promo.code,
              details: { expiredAt: expiresAt.toLocaleDateString() },
            });

            triggered.push(`${promo.code}:expired`);
          }
        } else if (daysLeft <= thresholds.expiry_days_before && daysLeft > 0) {
          // Expiring soon
          const { data: recentLog } = await supabase
            .from('promo_alert_logs')
            .select('id')
            .eq('promo_code_id', promo.id)
            .eq('alert_type', 'expiring_soon')
            .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .limit(1);

          if (!recentLog || recentLog.length === 0) {
            await triggerAlert(supabaseUrl, serviceRoleKey, {
              alertType: 'expiring_soon',
              promoCode: promo.code,
              details: { daysLeft, expiresAt: expiresAt.toLocaleDateString() },
              adminEmails: thresholds.alert_emails,
            });

            await supabase.from('promo_alert_logs').insert({
              promo_code_id: promo.id,
              alert_type: 'expiring_soon',
              promo_code: promo.code,
              details: { daysLeft, expiresAt: expiresAt.toLocaleDateString() },
            });

            triggered.push(`${promo.code}:expiring_soon`);
          }
        }
      }

      // Check ROI target
      const avgDiscount = promo.discount_type === 'flat'
        ? promo.discount_value
        : (promo.discount_value / 100) * (promo.min_order_amount || 100);
      const discountGiven = avgDiscount * promo.used_count;
      const revenueInfluenced = (promo.min_order_amount || 100) * 1.5 * promo.used_count;
      const currentRoi = discountGiven > 0
        ? Math.round(((revenueInfluenced - discountGiven) / discountGiven) * 100)
        : 0;

      if (currentRoi >= thresholds.roi_target_pct && promo.used_count > 0) {
        const { data: recentLog } = await supabase
          .from('promo_alert_logs')
          .select('id')
          .eq('promo_code_id', promo.id)
          .eq('alert_type', 'roi_target')
          .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (!recentLog || recentLog.length === 0) {
          await triggerAlert(supabaseUrl, serviceRoleKey, {
            alertType: 'roi_target',
            promoCode: promo.code,
            details: { currentRoi, roiTarget: thresholds.roi_target_pct, redemptions: promo.used_count },
            adminEmails: thresholds.alert_emails,
          });

          await supabase.from('promo_alert_logs').insert({
            promo_code_id: promo.id,
            alert_type: 'roi_target',
            promo_code: promo.code,
            details: { currentRoi, roiTarget: thresholds.roi_target_pct },
          });

          triggered.push(`${promo.code}:roi_target`);
        }
      }
    }

    return NextResponse.json({ success: true, triggered, count: triggered.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function triggerAlert(
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: {
    alertType: string;
    promoCode: string;
    details: Record<string, any>;
    adminEmails: string[];
  }
) {
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-promo-alert`;
  const res = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('Edge function error:', err);
  }
}
