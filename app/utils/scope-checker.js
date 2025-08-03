/**
 * Utility to check if the current session has the required scopes
 * and redirect to reauthorization if needed
 */
import { redirect } from "@remix-run/node";

export async function ensureScope(session, requiredScope) {
  if (!session) {
    throw new Error("No session found");
  }
  
  const currentScopes = session.scope ? session.scope.split(',') : [];
  
  if (!currentScopes.includes(requiredScope)) {
    console.log(`Missing scope: ${requiredScope}. Current scopes:`, currentScopes);
    
    // Redirect to reauthorization
    throw redirect(`/auth?shop=${session.shop}&return_to=${encodeURIComponent(process.env.SHOPIFY_APP_URL)}`);
  }
  
  return true;
}

/**
 * Check if session has read_orders scope specifically
 */
export async function ensureReadOrdersScope(session) {
  return ensureScope(session, 'read_orders');
}
