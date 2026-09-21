import { slugify } from "../src/lib/slug";

async function main() {
  const { initAdmin } = await import("../src/lib/firebase/admin");
  const { db } = initAdmin();
  const tree: { name: string; children?: string[] }[] = [
    { name: "Food", children: ["Catering", "Bakery", "Restaurant", "Hawker"] },
    { name: "Venue", children: ["Hall", "Studio"] },
    { name: "Party logistics", children: ["Décor", "Rental", "Photography"] },
    { name: "Services" },
    { name: "Retail" },
    { name: "Education" },
    { name: "Health" },
    { name: "Professional" },
  ];

  for (const parent of tree) {
    const parentId = slugify(parent.name);
    await db.collection("tags").doc(parentId).set({
      id: parentId,
      name: parent.name,
      slug: parentId,
      parentId: null,
    });
    for (const child of parent.children || []) {
      const childId = slugify(child);
      await db.collection("tags").doc(childId).set({
        id: childId,
        name: child,
        slug: childId,
        parentId,
      });
    }
  }

  console.log("Seeded tags.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
