// Types mirroring recipes/_schema/recipe.schema.json and
// bank/_schema/question.schema.json (recipe format v0.2).

export type Difficulty = "easy" | "medium" | "hard";
/**
 * "preview": the issuer has announced the exam but not published its outline.
 * The recipe then leaves out what the issuer hasn't said (weights, length,
 * delivery, scoring) and the mock; the site offers untimed drills only.
 */
export type OutlineStatus = "published" | "preview";
export type QuestionStatus = "draft" | "in_review" | "published" | "retired";

export interface Subdomain {
  id: string;
  title: string;
  target_questions: number;
}

export interface Domain {
  id: string;
  name: string;
  /** Absent only in a preview recipe (no published outline yet). */
  weight?: number;
  subdomains: Subdomain[];
}

export interface Recipe {
  format_version: "0.2";
  exam: {
    id: string;
    name: string;
    issuer: string;
    disclaimer: string;
    outline: { source_url: string; version: string; last_checked: string; status?: OutlineStatus };
  };
  /** delivery, questions and scoring are absent only in a preview recipe. */
  format: {
    delivery?: "adaptive" | "linear";
    questions?: number | { min: number; max: number };
    duration_minutes: number;
    scoring?: { scale: [number, number]; pass: number };
    question_types: string[];
  };
  style: { voice: string; options_per_question: number; rules: string[] };
  domains: Domain[];
  bank: {
    target_total: number;
    difficulty_mix: Record<Difficulty, number>;
    review: {
      independent_check: boolean;
      retire_if_report_rate_above: number;
      flag_if_common_wrong_answer_above: number;
    };
  };
  product: {
    free_sample_per_domain: number;
    unlock: { price_chf: number; access_days: number };
    readiness: { min_answered: number; min_accuracy_per_domain: number };
    /** Absent only in a preview recipe: no mock until the real format is known. */
    mock?: { questions: number; minutes: number; forms: number };
    /** Preview only: owner-approved estimated pace that times the Quick 10. */
    estimated_pace?: { questions: number; minutes: number; basis: string };
  };
}

export interface Question {
  id: string;
  subdomain: string;
  difficulty: Difficulty;
  stem: string;
  options: Record<string, string>;
  answer: string;
  explanation: { why_correct: string; why_not: Record<string, string> };
  status: QuestionStatus;
  outline_version: string;
  sample: boolean;
  provenance: {
    generated_by: "claude" | "codex" | "human";
    run_id: string;
    checked_by?: string;
    check_verdict: "pass" | "fail" | "pending";
    /**
     * Result of the checker's options-only test (docs/calibration/standard.md):
     * "obvious" when the key could be picked confidently without the stem.
     * Required on every new or changed published question.
     */
    options_only?: "obvious" | "not_obvious";
  };
}

/** recipes/<exam>/calibration.yaml: how the exam's difficulty was calibrated and the targets it sets. */
export interface CalibrationProfile {
  format_version: "0.1";
  exam: string;
  /** The recipe outline version this profile was built against. */
  outline_version: string;
  calibrated_on: string;
  sources: { kind: "outline" | "official_samples" | "official_guidance"; url: string; used_for: string }[];
  /** Official material that exists but could not be used, and why. */
  unavailable?: string[];
  method: string;
  /** Structure of the official samples, never their wording. */
  official_profile: string[];
  targets: {
    /** Highest share of new or changed questions whose key is obvious from the options alone. */
    options_only_obvious_max: number;
    /** Lowest share of published questions labelled hard. */
    hard_share_min: number;
    /** Highest share of questions whose key is the only longest option (chance is 1/options). */
    key_only_longest_max: number;
    stem_words: { min: number; max: number };
  };
  /** Exam-specific guidance for writers and checkers. */
  writer_notes: string[];
  history: { date: string; scope: string; pr: number; result: string }[];
}

export interface Issue {
  level: "error" | "warning";
  file: string;
  message: string;
}
