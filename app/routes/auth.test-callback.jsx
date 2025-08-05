// Test route to verify callback path works
export const loader = async ({ request }) => {
  console.log("🧪 TEST CALLBACK ROUTE HIT - This proves the route exists and works");
  console.log("📍 URL:", request.url);
  
  return new Response("Test callback route working", { 
    status: 200,
    headers: { "Content-Type": "text/plain" }
  });
};
