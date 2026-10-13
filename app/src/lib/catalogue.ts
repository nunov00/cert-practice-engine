// The exam catalogue on the home page: a small index built when the page is
// prerendered, searched in the browser. No server search, so a search costs no
// Worker request (docs/platform-limits.md). Sized for about 50 exams: each entry
// carries the domain names plus a deduplicated keyword list from the subdomain
// headings, not the headings themselves (test/catalogue.test.ts checks the size).
import type { PublicExam } from "@cpe/tools/build";
import { formatQuestionCount } from "./format";

export interface CatalogueEntry {
  id: string;
  name: string;
  issuer: string;
  /** Domain names, shown on the card and searched as topics. */
  topics: string[];
  /** Extra search words from subdomain headings, lower case, space separated. */
  keywords: string;
  /** Published questions the site can serve now. */
  questions: number;
  /** Real exam length, e.g. "90" or "100–150". */
  examQuestions: string;
  minutes: number;
}

const STOPWORDS = new Set(
  "and the for with from into of to in on or an a its their your our by at as is are be vs via e.g including".split(" "),
);

/** Lower case, accents dropped, punctuation turned into spaces. */
export function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function words(text: string): string[] {
  return normalize(text).split(" ").filter(Boolean);
}

export function buildCatalogue(exams: PublicExam[], questionCount: (examId: string) => number): CatalogueEntry[] {
  return exams
    .map((exam) => {
      const topics = exam.domains.map((d) => d.name);
      const known = new Set([exam.name, exam.issuer, ...topics].flatMap(words));
      const extra = new Set<string>();
      for (const d of exam.domains) {
        for (const s of d.subdomains) {
          for (const w of words(s.title)) {
            if (w.length > 2 && !STOPWORDS.has(w) && !known.has(w)) extra.add(w);
          }
        }
      }
      return {
        id: exam.id,
        name: exam.name,
        issuer: exam.issuer,
        topics,
        keywords: [...extra].join(" "),
        questions: questionCount(exam.id),
        examQuestions: formatQuestionCount(exam),
        minutes: exam.format.duration_minutes,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Issuers with how many exams each has, alphabetical. */
export function issuers(entries: CatalogueEntry[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.issuer, (counts.get(e.issuer) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
}

export interface SearchHit {
  entry: CatalogueEntry;
  /** The domain name that matched, when the match came from a topic. */
  topic?: string;
}

/**
 * Every query word must start a word in the exam's name, issuer, topics or
 * keywords. Name matches rank first, then issuer, then topics; ties keep the
 * catalogue's alphabetical order.
 */
export function searchCatalogue(entries: CatalogueEntry[], query: string, issuer = ""): SearchHit[] {
  const terms = words(query);
  const pool = issuer ? entries.filter((e) => e.issuer === issuer) : entries;
  if (terms.length === 0) return pool.map((entry) => ({ entry }));

  const hits: { hit: SearchHit; score: number; order: number }[] = [];
  pool.forEach((entry, order) => {
    const name = words(entry.name);
    const iss = words(entry.issuer);
    const topicWords = entry.topics.map(words);
    const kw = entry.keywords.split(" ");
    const starts = (list: string[], t: string) => list.some((w) => w.startsWith(t));

    let score = 0;
    let topic: string | undefined;
    for (const t of terms) {
      if (starts(name, t)) score += name.includes(t) ? 100 : 60;
      else if (starts(iss, t)) score += 30;
      else {
        const i = topicWords.findIndex((tw) => starts(tw, t));
        if (i >= 0) {
          score += 10;
          topic ??= entry.topics[i];
        } else if (starts(kw, t)) score += 5;
        else return;
      }
    }
    hits.push({ hit: { entry, topic }, score, order });
  });
  return hits.sort((a, b) => b.score - a.score || a.order - b.order).map((h) => h.hit);
}
