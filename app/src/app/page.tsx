import { Catalogue } from "@/components/Catalogue";
import { buildCatalogue } from "@/lib/catalogue";
import { isOpenAccess, listExams, questionsFor } from "@/lib/content";

export default function Home() {
  // Built at prerender time; the browser only filters it.
  const entries = buildCatalogue(listExams(), (id) => questionsFor(id).length);
  const total = entries.reduce((n, e) => n + e.questions, 0);
  return (
    <>
      <section className="hero">
        <h1>Know where you stand before exam day</h1>
        <p className="lead">
          Original multiple-choice questions with an explanation for every option. Drill each domain, review what you
          missed, and watch your readiness grow.
        </p>
        <p className="hero-stats small">
          <span>
            <strong>{entries.length}</strong> exams
          </span>
          <span>
            <strong>{total.toLocaleString("en-US")}</strong> practice questions
          </span>
          <span>No account needed</span>
        </p>
      </section>
      <Catalogue entries={entries} free={!isOpenAccess()} />
    </>
  );
}
