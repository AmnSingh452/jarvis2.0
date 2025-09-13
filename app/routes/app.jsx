import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  console.log("🏠 Main app route accessed");
  
  try {
    const { session } = await authenticate.admin(request);
    console.log(`📍 App route session:`, {
      shop: session?.shop,
      hasToken: !!session?.accessToken,
      scopes: session?.scope
    });
    
    return { apiKey: process.env.SHOPIFY_API_KEY || "" };
  } catch (error) {
    console.log("❌ App route authentication failed:", error.message);
    throw error;
  }
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Dashboard
        </Link>
        <Link to="/app/welcome">
          Welcome Guide
        </Link>
        <Link to="/app/widget-settings">
          Widget Settings
        </Link>
        <Link to="/app/billing_v2">
          Billing & Plans
        </Link>
        <Link to="/app/additional">
          Additional Features
        </Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
