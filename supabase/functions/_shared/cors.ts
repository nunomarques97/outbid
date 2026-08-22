// Shared CORS headers for Edge Functions invoked directly from the browser
// (supabase-js `functions.invoke`). The webhook function does not use
// this — Stripe calls it server-to-server, no browser CORS involved.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
