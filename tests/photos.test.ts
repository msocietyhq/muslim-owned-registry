import { describe, expect, it } from "vitest";
import { movePhoto, parsePhotos } from "@/lib/photos";

describe("listing photos", () => {
  it("keeps at most five public urls", () => {
    expect(
      parsePhotos([
        "/demo-photos/1.svg",
        "https://example.com/a.jpg",
        "javascript:alert(1)",
        12,
        "https://example.com/b.jpg",
        "/demo-photos/2.svg",
        "/demo-photos/3.svg",
        "/demo-photos/4.svg",
      ]),
    ).toEqual([
      "/demo-photos/1.svg",
      "https://example.com/a.jpg",
      "https://example.com/b.jpg",
      "/demo-photos/2.svg",
      "/demo-photos/3.svg",
    ]);
  });

  it("preserves upload order and can move a photo earlier or later", () => {
    const photos = ["/a.jpg", "/b.jpg", "/c.jpg"];
    expect(parsePhotos(photos)).toEqual(photos);
    expect(movePhoto(photos, 2, -1)).toEqual(["/a.jpg", "/c.jpg", "/b.jpg"]);
    expect(movePhoto(photos, 0, 1)).toEqual(["/b.jpg", "/a.jpg", "/c.jpg"]);
    expect(movePhoto(photos, 0, -1)).toEqual(photos);
    expect(movePhoto(photos, 2, 1)).toEqual(photos);
  });

  it("keeps the first occurrence when the same url is sent twice", () => {
    expect(parsePhotos(["/c.jpg", "/a.jpg", "/c.jpg", "/b.jpg"])).toEqual([
      "/c.jpg",
      "/a.jpg",
      "/b.jpg",
    ]);
  });
});
