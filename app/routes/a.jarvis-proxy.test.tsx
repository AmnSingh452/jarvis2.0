import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";

// Simple test endpoint to verify proxy is working
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  
  return json({
    success: true,
    message: "🎉 Shopify App Proxy is working!",
    proxy_status: "ACTIVE",
    request_info: {
      url: url.toString(),
      pathname: url.pathname,
      search: url.search,
      timestamp: new Date().toISOString()
    },
    expected_urls: [
      "https://your-shop.myshopify.com/a/jarvis/test",
      "https://jarvis2-0-djg1.onrender.com/a/jarvis-proxy/test"
    ]
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json"
    }
  });
}

export async function action({ request }: LoaderFunctionArgs) {
  return json({
    success: true,
    message: "🎉 POST request to proxy test endpoint works!",
    method: request.method,
    timestamp: new Date().toISOString()
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json"
    }
  });
}
