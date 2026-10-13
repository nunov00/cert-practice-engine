import { deleteFeedback, isStatus, listFeedback, setStatus, tokenMatches, toCsv } from "@/lib/feedback";
import { feedbackEnv, json, overRateLimit, text, type FeedbackEnv } from "@/lib/feedback-server";

export const dynamic = "force-dynamic";

// Owner-only: every method needs `Authorization: Bearer <FEEDBACK_READ_TOKEN>`.
// GET also accepts FEEDBACK_AGENT_TOKEN, a read-only key for Claude's reviews.
// Without a secret configured, everything is refused (docs/feedback.md).

type Guard = { env: FeedbackEnv & { FEEDBACK_DB: NonNullable<FeedbackEnv["FEEDBACK_DB"]> } } | { denied: Response };

async function guard(request: Request, readOnly = false): Promise<Guard> {
  const env = await feedbackEnv();
  if (await overRateLimit(env, request, "inbox")) return { denied: json({ error: "Too many attempts. Wait a minute." }, 429) };
  const auth = request.headers.get("authorization");
  const allowed =
    (await tokenMatches(auth, env.FEEDBACK_READ_TOKEN)) ||
    (readOnly && (await tokenMatches(auth, env.FEEDBACK_AGENT_TOKEN)));
  if (!allowed) {
    return { denied: json({ error: "Wrong or missing access key." }, 401) };
  }
  if (!env.FEEDBACK_DB) return { denied: json({ error: "Feedback storage isn't set up." }, 503) };
  return { env: env as Extract<Guard, { env: unknown }>["env"] };
}

export async function GET(request: Request) {
  const g = await guard(request, true);
  if ("denied" in g) return g.denied;
  const rows = await listFeedback(g.env.FEEDBACK_DB);
  if (new URL(request.url).searchParams.get("format") === "csv") {
    return text(toCsv(rows), "text/csv; charset=utf-8", {
      "content-disposition": `attachment; filename="feedback-${new Date().toISOString().slice(0, 10)}.csv"`,
    });
  }
  return json({ feedback: rows });
}

export async function PATCH(request: Request) {
  const g = await guard(request);
  if ("denied" in g) return g.denied;
  const body = (await request.json().catch(() => null)) as { id?: unknown; status?: unknown } | null;
  if (!body || !Number.isInteger(body.id) || !isStatus(body.status)) return json({ error: "Send an id and a status." }, 400);
  const ok = await setStatus(g.env.FEEDBACK_DB, body.id as number, body.status);
  return ok ? json({ ok: true }) : json({ error: "Not found." }, 404);
}

export async function DELETE(request: Request) {
  const g = await guard(request);
  if ("denied" in g) return g.denied;
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return json({ error: "Send an id." }, 400);
  const ok = await deleteFeedback(g.env.FEEDBACK_DB, id);
  return ok ? json({ ok: true }) : json({ error: "Not found." }, 404);
}
