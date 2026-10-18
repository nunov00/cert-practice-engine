// The exam catalogue on the home page: a small index built when the page is
// prerendered, searched in the browser. No server search, so a search costs no
// Worker request (docs/platform-limits.md). Sized for about 50 exams: each entry
// carries the domain names plus a deduplicated keyword list from the subdomain
// headings, not the headings themselves (test/catalogue.test.ts checks the size).
import type { PublicExam, Topic } from "@cpe/tools/build";
import { formatQuestionCount } from "./format";

export interface CatalogueEntry {
  id: string;
  name: string;
  issuer: string;
  /** Subject area the home page groups the exam under. */
  topic: Topic;
  /** Domain names, shown on the card and searched. */
  domains: string[];
  /** Extra search words from subdomain headings, lower case, space separated. */
  keywords: string;
  /** Published questions the site can serve now. */
  questions: number;
  /** Real exam length, e.g. "90" or "100–150"; null while the outline is unpublished. */
  examQuestions: string | null;
  /** The issuer hasn't published the exam outline yet. */
  preview: boolean;
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

export function buildCatalogue(
  exams: PublicExam[],
  topics: Topic[],
  questionCount: (examId: string) => number,
): CatalogueEntry[] {
  return exams
    .map((exam) => {
      const topic = topics.find((t) => t.id === exam.topic) ?? { id: exam.topic, label: exam.topic };
      const domains = exam.domains.map((d) => d.name);
      const known = new Set([exam.name, exam.issuer, topic.label, ...domains].flatMap(words));
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
        topic,
        domains,
        keywords: [...extra].join(" "),
        questions: questionCount(exam.id),
        examQuestions: formatQuestionCount(exam),
        preview: exam.preview,
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
  /** The domain name that matched, when the match came from a domain. */
  domain?: string;
}

/**
 * Every query word must start a word in the exam's name, issuer, subject area,
 * domains or keywords. Name matches rank first, then issuer, then subject area,
 * then domains; ties keep the catalogue's alphabetical order.
 */
export function searchCatalogue(entries: CatalogueEntry[], query: string, issuer = ""): SearchHit[] {
  const terms = words(query);
  const pool = issuer ? entries.filter((e) => e.issuer === issuer) : entries;
  if (terms.length === 0) return pool.map((entry) => ({ entry }));

  const hits: { hit: SearchHit; score: number; order: number }[] = [];
  pool.forEach((entry, order) => {
    const name = words(entry.name);
    const iss = words(entry.issuer);
    const area = words(entry.topic.label);
    const domainWords = entry.domains.map(words);
    const kw = entry.keywords.split(" ");
    const starts = (list: string[], t: string) => list.some((w) => w.startsWith(t));

    let score = 0;
    let domain: string | undefined;
    for (const t of terms) {
      if (starts(name, t)) score += name.includes(t) ? 100 : 60;
      else if (starts(iss, t)) score += 30;
      else if (starts(area, t)) score += 20;
      else {
        const i = domainWords.findIndex((dw) => starts(dw, t));
        if (i >= 0) {
          score += 10;
          domain ??= entry.domains[i];
        } else if (starts(kw, t)) score += 5;
        else return;
      }
    }
    hits.push({ hit: { entry, domain }, score, order });
  });
  return hits.sort((a, b) => b.score - a.score || a.order - b.order).map((h) => h.hit);
}

export interface TopicSection {
  topic: Topic;
  hits: SearchHit[];
}

/** Hits grouped by subject area, in the order of `topics`; empty areas are left out. */
export function groupByTopic(hits: SearchHit[], topics: Topic[]): TopicSection[] {
  const order = new Map(topics.map((t, i) => [t.id, i]));
  const sections = new Map<string, TopicSection>();
  for (const hit of hits) {
    const t = hit.entry.topic;
    let section = sections.get(t.id);
    if (!section) sections.set(t.id, (section = { topic: t, hits: [] }));
    section.hits.push(hit);
  }
  const rank = (id: string) => order.get(id) ?? topics.length;
  return [...sections.values()].sort((a, b) => rank(a.topic.id) - rank(b.topic.id));
}
