import { json } from "@remix-run/node";

export async function loader({ request }) {
  try {
    return json({
      status: "ok",
      message: "Server is responding",
      timestamp: new Date().toISOString(),
      shop: new URL(request.url).searchParams.get("shop") || "none"
    });
  } catch (error) {
    return json({
      status: "error",
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}