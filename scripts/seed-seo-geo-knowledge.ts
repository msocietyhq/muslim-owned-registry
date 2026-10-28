import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chunkCourseMarkdown, KNOWLEDGE_COLLECTION } from "../src/lib/seo-geo/knowledge";

async function main() {
  const dir =
    process.env.SEO_GEO_COURSE_DIR ||
    path.resolve(process.cwd(), "../seo_geo_synscribe_course_clean");
  const { initAdmin } = await import("../src/lib/firebase/admin");
  const { db } = initAdmin();
  const existing = await db.collection(KNOWLEDGE_COLLECTION).get();
  for (const doc of existing.docs) {
    await doc.ref.delete();
  }
  const files = (await readdir(dir)).filter((name) => name.endsWith(".md") && name !== "README.md");
  let count = 0;
  for (const file of files) {
    const markdown = await readFile(path.join(dir, file), "utf8");
    const lesson = file.replace(/^\d+-/, "").replace(/\.md$/, "");
    for (const chunk of chunkCourseMarkdown(markdown, lesson)) {
      const ref = db.collection(KNOWLEDGE_COLLECTION).doc();
      await ref.set({
        lesson: chunk.lesson,
        title: chunk.title,
        text: chunk.text,
      });
      count += 1;
    }
  }
  console.log(JSON.stringify({ files: files.length, chunks: count }));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
