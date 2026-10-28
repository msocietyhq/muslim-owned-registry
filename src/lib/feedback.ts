import { z } from "zod";

export const FEEDBACK_CHALLENGES = "feedbackChallenges";
export const FEEDBACK_MESSAGES = "feedbackMessages";
export const GITHUB_SOURCE_URL = "https://github.com/msocietyhq/muslim-owned-registry";

export const feedbackStartSchema = z.object({
  email: z.string().email(),
  message: z
    .string()
    .trim()
    .min(20, "Write a little more so we can understand.")
    .max(8000),
  prompt: z.string().trim().max(12000).optional(),
});

export function feedbackVerifyUrl(params: { siteUrl: string; email: string; token: string }) {
  const query = new URLSearchParams({ email: params.email, token: params.token });
  return `${params.siteUrl}/feedback/verify?${query.toString()}`;
}
