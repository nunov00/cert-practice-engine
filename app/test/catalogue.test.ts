import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { PublicContent, PublicExam } from "@cpe/tools/build";
import { buildCatalogue, groupByTopic, issuers, normalize, searchCatalogue } from "../src/lib/catalogue.ts";

const content = JSON.parse(readFileSync(new URL("../src/generated/content.json", import.meta.url), "utf8")) as PublicContent;
const real = content.exams;
const count = (id: string) => content.questions.filter((q) => q.exam === id).length;
const topics = content.topics;

// A catalogue the size the home page is designed for: about 50 exams from 10
// issuers, each with 8 domains of 6 subdomains (CISSP-sized, the largest today).
const TOPICS = [
  "cloud",
  "network",
  "privacy",
  "audit",
  "governance",
  "incident",
  "identity",
  "cryptography",
  "software",
  "data",
  "project",
  "continuity",
];
function synthetic(n: number): PublicExam[] {
  const base = real.find((e) => e.id === "cissp")!;
  return Array.from({ length: n }, (_, i) => ({
    ...base,
    id: `x${i}`,
    name: `EXAM${String(i).padStart(2, "0")}`,
    issuer: `Issuer ${String.fromCharCode(65 + (i % 10))}`,
    topic: topics[i % topics.length]!.id,
    domains: Array.from({ length: 8 }, (_, d) => ({
      id: `d${d + 1}`,
      name: `${TOPICS[(i + d) % TOPICS.length]} management and operations ${d + 1}`,
      weight: 0.125,
      subdomains: Array.from({ length: 6 }, (_, s) => ({
        id: `${d + 1}.${s + 1}`,
        title: `Apply ${TOPICS[(i + d + s) % TOPICS.length]} controls, assessment and reporting practice ${s}`,
      })),
    })),
  }));
}

test("normalize lowers case and drops accents and punctuation", () => {
  assert.equal(normalize("  Sécurité/Cloud-Ops! "), "securite cloud ops");
});

test("the real catalogue lists every exam, alphabetically", () => {
  const entries = buildCatalogue(real, topics, count);
  assert.equal(entries.length, real.length);
  const names = entries.map((e) => e.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
  for (const e of entries) assert.equal(e.questions, count(e.id));
});

test("search by name, issuer and topic", () => {
  const entries = buildCatalogue(real, topics, count);
  assert.deepEqual(searchCatalogue(entries, "ciss").map((h) => h.entry.id), ["cissp"]);
  const isaca = searchCatalogue(entries, "isaca").map((h) => h.entry.id);
  assert.ok(isaca.includes("aair") && !isaca.includes("cissp"));
  assert.ok(searchCatalogue(entries, "security").some((h) => h.entry.id === "cissp"));
  const hits = searchCatalogue(entries, "asset");
  assert.ok(hits.some((h) => h.entry.id === "cissp" && h.domain !== undefined));
  assert.deepEqual(searchCatalogue(entries, "zzz"), []);
  assert.equal(searchCatalogue(entries, "  ").length, entries.length);
});

test("every real exam has a known subject area, and search finds it", () => {
  const entries = buildCatalogue(real, topics, count);
  for (const e of entries) assert.ok(topics.some((t) => t.id === e.topic.id && t.label === e.topic.label), e.id);
  const ai = topics.find((t) => t.id === "ai-governance")!;
  const hits = searchCatalogue(entries, ai.label.split(" ")[0]!).map((h) => h.entry.id);
  assert.ok(hits.includes("aair") && !hits.includes("cissp"));
});

test("sections follow the topic order and leave out empty areas", () => {
  const entries = buildCatalogue(synthetic(10), topics, () => 10);
  const sections = groupByTopic(searchCatalogue(entries, ""), topics);
  const used = topics.filter((t) => entries.some((e) => e.topic.id === t.id));
  assert.deepEqual(
    sections.map((s) => s.topic.id),
    used.map((t) => t.id),
  );
  assert.equal(
    sections.reduce((n, s) => n + s.hits.length, 0),
    entries.length,
  );
  for (const s of sections) assert.ok(s.hits.every((h) => h.entry.topic.id === s.topic.id));
  const filtered = groupByTopic(searchCatalogue(entries, "", "Issuer A"), topics);
  assert.ok(filtered.every((s) => s.hits.length > 0 && s.hits.every((h) => h.entry.issuer === "Issuer A")));
});

test("a preview exam has no published length", () => {
  const entries = buildCatalogue(real, topics, count);
  for (const e of entries) {
    const exam = real.find((x) => x.id === e.id)!;
    assert.equal(e.preview, exam.preview);
    assert.equal(e.examQuestions === null, exam.preview, e.id);
  }
});

test("subdomain words are searchable but not stored twice", () => {
  const entries = buildCatalogue(real, topics, count);
  const aair = entries.find((e) => e.id === "aair")!;
  const kw = aair.keywords.split(" ");
  assert.equal(new Set(kw).size, kw.length);
  assert.ok(!kw.includes("and") && !kw.includes("risk"), "stopwords and topic words are dropped");
  assert.ok(searchCatalogue(entries, "decommissioning").some((h) => h.entry.id === "aair"));
});

test("issuer filter narrows results and lists counts", () => {
  const entries = buildCatalogue(synthetic(50), topics, () => 10);
  const list = issuers(entries);
  assert.equal(list.length, 10);
  assert.ok(list.every((i) => i.count === 5));
  const hits = searchCatalogue(entries, "", "Issuer C");
  assert.equal(hits.length, 5);
  assert.ok(hits.every((h) => h.entry.issuer === "Issuer C"));
});

test("name matches rank above topic matches", () => {
  const entries = buildCatalogue(synthetic(50), topics, () => 10);
  const hits = searchCatalogue(entries, "exam07");
  assert.equal(hits[0]?.entry.id, "x7");
  // Domain matches name the domain and rank above matches on subdomain words only.
  const multi = searchCatalogue(entries, "continuity");
  const inDomain = multi.map((h) => h.domain !== undefined);
  assert.ok(inDomain.includes(true) && inDomain.includes(false));
  assert.deepEqual(inDomain, [...inDomain].sort((a, b) => Number(b) - Number(a)));
});

test("a 50-exam index stays small and searches fast", () => {
  const entries = buildCatalogue(synthetic(50), topics, () => 900);
  const bytes = Buffer.byteLength(JSON.stringify(entries));
  // Sent twice with the home page (HTML and React payload); keep it well under 100 KB.
  assert.ok(bytes < 40_000, `index is ${bytes} bytes`);
  const t0 = performance.now();
  for (let i = 0; i < 100; i++) searchCatalogue(entries, "cloud gov");
  const perSearch = (performance.now() - t0) / 100;
  assert.ok(perSearch < 5, `search took ${perSearch.toFixed(2)} ms`);
});
