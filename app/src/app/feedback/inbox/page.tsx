import type { Metadata } from "next";
import { FeedbackInbox } from "@/components/FeedbackInbox";

export const metadata: Metadata = {
  title: "Feedback inbox",
  robots: { index: false, follow: false },
};

// The page itself holds no feedback. It loads it in the browser only after the
// owner enters the access key (docs/feedback.md).
export default function FeedbackInboxPage() {
  return (
    <>
      <h1>Feedback inbox</h1>
      <FeedbackInbox />
    </>
  );
}
