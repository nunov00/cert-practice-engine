// Types mirroring recipes/_schema/recipe.schema.json and
// bank/_schema/question.schema.json (recipe format v0.2).

export type Difficulty = "easy" | "medium" | "hard";
export type QuestionStatus = "draft" | "in_review" | "published" | "retired";

export interface Subdomain {
  id: string;
  title: string;
  target_questions: number;
}

export interface Domain {
  id: string;
  name: string;
  weight: number;
  subdomains: Subdomain[];
}

export interface Recipe {
  format_version: "0.2";
  exam: {
    id: string;
    name: string;
    issuer: string;
    disclaimer: string;
    outline: { source_url: string; version: string; last_checked: string };
  };
  format: {
    delivery: "adaptive" | "linear";
    questions: number | { min: number; max: number };
    duration_minutes: number;
    scoring: { scale: [number, number]; pass: number };
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
    mock: { questions: number; minutes: number; forms: number };
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
  };
}

export interface Issue {
  level: "error" | "warning";
  file: string;
  message: string;
}
