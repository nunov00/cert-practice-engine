import { VISITOR_DAILY_LIMIT, parseFeedback, saveFeedback } from "@/lib/feedback";
import { feedbackEnv, json, overRateLimit, sameOrigin } from "@/lib/feedback-server";

export const dynamic = "force-dynamic";

/** Anonymous feedback from the /feedback form. Stores no personal data (docs/feedback.md). */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Not allowed." }, 403);
  const env = await feedbackEnv();
  if (!env.FEEDBACK_DB) return json({ error: "Feedback isn't available right now." }, 503);
  if (await overRateLimit(env, request, "send")) {
    return json({ error: "That's a lot of feedback at once. Try again in a minute." }, 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Send a JSON object." }, 400);
  }
  const parsed = parseFeedback(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  if ("spam" in parsed) return json({ ok: true });

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const result = await saveFeedback(env.FEEDBACK_DB, parsed.value, new Date(), ip);
  if (result === "visitor-limit") {
    return json({ error: `You have sent ${VISITOR_DAILY_LIMIT} messages today, the most we take from one visitor in a day. Please try again tomorrow.` }, 429);
  }
  if (result === "daily-cap") {
    return json({ error: "We've had a lot of feedback today. Please try again tomorrow." }, 429);
  }
  return json({ ok: true });
}
