import { getTags } from "@/lib/data";
import { json } from "@/lib/http";

export async function GET() {
  const tags = await getTags();
  return json({ tags });
}
