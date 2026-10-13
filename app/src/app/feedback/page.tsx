import type { Metadata } from "next";
import { FeedbackForm } from "@/components/FeedbackForm";

export const metadata: Metadata = {
  title: "Send feedback",
  description: "Tell us what to improve. Feedback is anonymous.",
};

export default function FeedbackPage() {
  return (
    <>
      <h1>Send feedback</h1>
      <p className="lead">
        Ideas, problems, or a question that looks wrong: tell us what would make practice better. It is anonymous and
        private: only the site owner and the assistants they use to review it read it.
      </p>
      <FeedbackForm />
    </>
  );
}
