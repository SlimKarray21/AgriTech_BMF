import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get clients with subscriptions expiring within 30 days
    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("*")
      .not("date_exp_abo", "is", null)
      .gte("date_exp_abo", today.toISOString().split("T")[0])
      .lte("date_exp_abo", in30Days.toISOString().split("T")[0]);

    if (clientsError) throw clientsError;
    if (!clients || clients.length === 0) {
      return new Response(JSON.stringify({ message: "No expiring subscriptions found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { email: string; days: number; status: string }[] = [];

    for (const client of clients) {
      const expDate = new Date(client.date_exp_abo);
      const daysRemaining = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Only send every 4 days: at 30, 26, 22, 18, 14, 10, 6, 2 days
      if (daysRemaining > 30 || daysRemaining <= 0) continue;
      if ((30 - daysRemaining) % 4 !== 0 && daysRemaining !== 1) continue;

      // Check if we already sent a notification for this exact day count today
      const todayStr = today.toISOString().split("T")[0];
      const { data: existing } = await supabase
        .from("subscription_notifications")
        .select("id")
        .eq("client_email", client.email)
        .eq("days_remaining", daysRemaining)
        .gte("sent_at", `${todayStr}T00:00:00Z`)
        .limit(1);

      if (existing && existing.length > 0) {
        results.push({ email: client.email, days: daysRemaining, status: "already_sent" });
        continue;
      }

      const clientName = `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() || "Client";

      // Send email via Supabase Auth admin (using Resend/SMTP configured in Supabase)
      // We use the built-in Supabase email sending via the auth.admin API
      // Alternative: send via a direct SMTP/Resend call
      
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f7f6; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1a6b3c, #2d9b5e); padding: 30px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; }
    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 30px; }
    .alert-box { background: #fff8e1; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-bottom: 20px; }
    .alert-box .emoji { font-size: 20px; }
    .days-badge { display: inline-block; background: #ef4444; color: white; padding: 4px 14px; border-radius: 20px; font-weight: bold; font-size: 16px; }
    .offer { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center; }
    .offer strong { color: #059669; font-size: 18px; }
    .footer { padding: 20px 30px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280; }
    .footer a { color: #1a6b3c; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌱 Tesla Energie : Smart Farm</h1>
      <p>Système d'irrigation intelligent</p>
    </div>
    <div class="body">
      <p>Bonjour <strong>${clientName}</strong>,</p>
      
      <div class="alert-box">
        <span class="emoji">🔔</span> <strong>Expiration prochaine de votre abonnement</strong>
      </div>
      
      <p>Votre abonnement expirera dans <span class="days-badge">${daysRemaining} jours</span>.</p>
      
      <p>Renouvelez dès maintenant pour éviter toute interruption de service et profitez d'une réduction exclusive de 5% sur votre renouvellement.</p>
      
      <div class="offer">
        <strong>👉 Offre valable avant la date d'expiration.</strong>
      </div>
      
      <p>Pour toute information ou assistance, merci de nous contacter :</p>
      <p>📞 <a href="tel:+21693031182">+216 93 031 182</a><br>
         📧 <a href="mailto:contact@teslaenergie.com">contact@teslaenergie.com</a></p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Tesla Energie : Smart Farm — Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`;

      // Send email using Supabase's built-in email via auth.admin
      // Since we can't directly send arbitrary emails via Supabase Auth,
      // we use the Resend API if available, or log for manual sending
      
      // Try sending via Supabase's internal email (inviteUserByEmail workaround won't work)
      // Instead, we'll use a simple fetch to Resend if configured, 
      // or use Supabase's built-in SMTP
      
      const resendKey = Deno.env.get("RESEND_API_KEY");
      
      if (resendKey) {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Tesla Energie : Smart Farm <onboarding@resend.dev>",
            to: [client.email],
            subject: "🔔 Expiration prochaine de votre abonnement",
            html: emailHtml,
          }),
        });

        if (!emailRes.ok) {
          const errText = await emailRes.text();
          console.error(`Failed to send email to ${client.email}:`, errText);
          results.push({ email: client.email, days: daysRemaining, status: "email_failed" });
          continue;
        }
      } else {
        // No Resend key - log the notification
        console.log(`[NOTIFICATION] Would send email to ${client.email} - ${daysRemaining} days remaining`);
      }

      // Record the notification
      await supabase.from("subscription_notifications").insert({
        client_email: client.email,
        client_name: clientName,
        days_remaining: daysRemaining,
      });

      results.push({ email: client.email, days: daysRemaining, status: resendKey ? "sent" : "logged" });
    }

    return new Response(JSON.stringify({ success: true, notifications: results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in subscription-notifications:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
