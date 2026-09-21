import { describe, expect, it } from "vitest";
import {
  parseTeamMemberInput,
  teamInitials,
  TEAM_NEED_ONE,
  TEAM_BAD_URL,
} from "@/lib/team";

describe("team members", () => {
  it("accepts any one of name, photo, or link", () => {
    expect(parseTeamMemberInput({ name: "  Afiq  " })).toEqual({
      name: "Afiq",
      photoUrl: null,
      url: null,
    });
    expect(parseTeamMemberInput({ photoUrl: "https://example.com/a.jpg" }).photoUrl).toBe(
      "https://example.com/a.jpg",
    );
    expect(parseTeamMemberInput({ url: "linkedin.com/in/afiq" }).url).toBe(
      "https://linkedin.com/in/afiq",
    );
  });

  it("rejects an empty person and a bad link", () => {
    expect(() => parseTeamMemberInput({})).toThrow(TEAM_NEED_ONE);
    expect(() => parseTeamMemberInput({ name: "  ", url: "not a url" })).toThrow(TEAM_BAD_URL);
  });

  it("makes initials from a name, or the link host", () => {
    expect(teamInitials({ name: "Mohamed Afiq", url: null })).toBe("MA");
    expect(teamInitials({ name: null, url: "https://www.playtours.app" })).toBe("P");
    expect(teamInitials({ name: null, url: null })).toBe("?");
  });
});
