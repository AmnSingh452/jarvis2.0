import { LoaderFunction } from "@remix-run/node";
import fs from "fs";
import path from "path";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  let filename = "";
  if (pathname.includes("privacy-policy")) {
    filename = "privacy-policy.html";
  } else if (pathname.includes("support")) {
    filename = "support.html";
  } else if (pathname.includes("terms-of-service")) {
    filename = "terms-of-service.html";
  }
  
  if (!filename) {
    throw new Response("Not Found", { status: 404 });
  }
  
  try {
    const filePath = path.join(process.cwd(), "public", "legal", filename);
    const content = fs.readFileSync(filePath, "utf-8");
    
    return new Response(content, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    throw new Response("Not Found", { status: 404 });
  }
};
