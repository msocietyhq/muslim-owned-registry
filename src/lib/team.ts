import { isPublicPhoto } from "@/lib/photos";

export type TeamMember = {
  id: string;
  name: string | null;
  photoUrl: string | null;
  url: string | null;
  createdAt: string;
};

export const TEAM_COLLECTION = "teamMembers";
export const TEAM_NAME_MAX = 80;
export const TEAM_NEED_ONE = "Add a name, a photo, or a link.";
export const TEAM_BAD_URL = "Enter a valid link, such as https://linkedin.com/in/name.";
export const TEAM_BAD_PHOTO = "Choose a photo file, or paste a photo link that starts with https://.";

export function parseTeamMemberInput(input: {
  name?: string | null;
  photoUrl?: string | null;
  url?: string | null;
}): Pick<TeamMember, "name" | "photoUrl" | "url"> {
  const name = typeof input.name === "string" ? input.name.trim().slice(0, TEAM_NAME_MAX) : "";
  const photoUrl = typeof input.photoUrl === "string" ? input.photoUrl.trim() : "";
  let url = typeof input.url === "string" ? input.url.trim() : "";
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error(TEAM_BAD_URL);
      }
    } catch (error) {
      if (error instanceof Error && error.message === TEAM_BAD_URL) throw error;
      throw new Error(TEAM_BAD_URL);
    }
  }
  if (photoUrl && !isPublicPhoto(photoUrl)) {
    throw new Error(TEAM_BAD_PHOTO);
  }
  if (!name && !photoUrl && !url) {
    throw new Error(TEAM_NEED_ONE);
  }
  return {
    name: name || null,
    photoUrl: photoUrl || null,
    url: url || null,
  };
}

export function asTeamMember(id: string, data: Record<string, unknown>): TeamMember {
  return {
    id,
    name: typeof data.name === "string" && data.name.trim() ? data.name.trim().slice(0, TEAM_NAME_MAX) : null,
    photoUrl: typeof data.photoUrl === "string" && isPublicPhoto(data.photoUrl) ? data.photoUrl : null,
    url: typeof data.url === "string" && data.url.trim() ? data.url.trim() : null,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
  };
}

export function teamInitials(member: Pick<TeamMember, "name" | "url">) {
  const name = member.name?.trim() || "";
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const letters = (parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "");
    return letters.toUpperCase() || "?";
  }
  if (member.url) {
    try {
      const host = new URL(member.url).hostname.replace(/^www\./, "");
      return (host[0] || "?").toUpperCase();
    } catch {
      return "?";
    }
  }
  return "?";
}
