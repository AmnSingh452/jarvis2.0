// Catch-all OPTIONS handler for CORS preflight requests
// This handles any API routes that might be missing OPTIONS handlers

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400"
};

export async function options() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
}

export async function loader() {
  return new Response("API endpoint not found", {
    status: 404,
    headers: corsHeaders
  });
}

export async function action() {
  return new Response("API endpoint not found", {
    status: 404,
    headers: corsHeaders
  });
}
