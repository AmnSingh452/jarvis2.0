export const loader = async ({ request }) => {
  const url = new URL(request.url);
  console.log("🧪 CALLBACK TEST ROUTE HIT");
  console.log("📍 Full URL:", request.url);
  console.log("📍 Search params:", url.searchParams.toString());
  console.log("📍 Has code param:", !!url.searchParams.get('code'));
  console.log("📍 Has shop param:", !!url.searchParams.get('shop'));
  
  return new Response("Callback test route working - check logs for details", { 
    status: 200,
    headers: { "Content-Type": "text/plain" }
  });
};
