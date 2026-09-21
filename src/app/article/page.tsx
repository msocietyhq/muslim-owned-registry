import { permanentRedirect } from "next/navigation";

export default function ArticleIndexPage() {
  permanentRedirect("/blog");
}
