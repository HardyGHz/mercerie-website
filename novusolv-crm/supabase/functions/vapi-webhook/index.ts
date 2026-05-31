import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.json();
  const msg = body?.message;

  // Only handle end-of-call reports
  if (msg?.type !== "end-of-call-report") {
    return new Response("OK", { status: 200 });
  }

  const call = msg.call;
  const data = msg.structuredData ?? {};

  // Map Vapi structured data → crm_leads
  const callerName = data.callerName ?? "";
  const partNeeded = data.partNeeded ?? "";
  const carMake = data.carMake ?? "";
  const carModel = data.carModel ?? "";
  const carYear = data.carYear ?? "";
  const callbackTime = data.callbackTime ?? "";

  const notes = [
    partNeeded ? `Alkatrész: ${partNeeded}` : "",
    carMake || carModel || carYear
      ? `Autó: ${[carMake, carModel, carYear].filter(Boolean).join(" ")}`
      : "",
    callbackTime ? `Visszahívás: ${callbackTime}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  const lead = {
    id: `voice-${call.id}`,
    niche: "Dezmembrare",
    company: callerName || "Ismeretlen hívó",
    phone: call.customer?.number ?? "",
    call_status: "interested",
    first_touch: "Phone",
    notes,
    callback_date: callbackTime ? callbackTime.split(" ")[0] : "",
    callback_time: callbackTime ? callbackTime.split(" ").slice(1).join(" ") : "",
    is_custom: true,
  };

  const { error } = await supabase.from("crm_leads").insert(lead);

  if (error) {
    console.error("Insert error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log(`Lead saved: ${lead.company} — ${lead.phone}`);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});