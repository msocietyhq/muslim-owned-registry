import { agentApiDocs } from "@/lib/agent-api-docs";
import { json } from "@/lib/http";
import { siteUrl } from "@/lib/site-url";

export async function GET() {
  const origin = siteUrl().replace(/\/$/, "");
  return json({
    ...agentApiDocs,
    origin,
    docsUrl: `${origin}/api/v1/docs`,
  });
}
