import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is ADMIN or SOUS_ADMIN
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    const { data: callerRole } = await userClient.rpc("get_user_role", { _user_id: caller.id });
    if (!["ADMIN", "SOUS_ADMIN"].includes(callerRole)) {
      throw new Error("Insufficient permissions");
    }

    // Get caller's profile id for created_by
    const { data: callerProfileId } = await userClient.rpc("get_profile_id", { _user_id: caller.id });

    const { email, password, firstName, lastName, role, phone, location, aboElectrovanne, aboSantePlante } = await req.json();

    // SOUS_ADMIN can only create CLIENT
    if (callerRole === "SOUS_ADMIN" && role !== "CLIENT") {
      throw new Error("Sous-admin can only create clients");
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Create auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });
    if (createError) throw createError;

    // Compute type_abo based on selected options
    const electro = !!aboElectrovanne;
    const sante = !!aboSantePlante;
    const typeAbo = electro && sante ? "full" : (electro || sante ? "op1_op2" : "op1");

    // Update profile with role and created_by
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        user_role: role || "CLIENT",
        first_name: firstName,
        last_name: lastName,
        phone_number: phone || null,
        location: location || null,
        created_by: callerProfileId || null,
        email: email,
        abo_capteur_sol: true,
        abo_electrovanne: electro,
        abo_sante_plante: sante,
        type_abo: typeAbo,
      })
      .eq("user_id", newUser.user!.id);
    if (profileError) throw profileError;

    return new Response(JSON.stringify({ user: newUser.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
