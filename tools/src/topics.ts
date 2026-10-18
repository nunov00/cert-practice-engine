// Subject areas that group exams on the home page. Each recipe names one in
// exam.topic; the site shows them in this order, skipping empty ones. Add a
// topic here when a new exam fits none of these.
export interface Topic {
  id: string;
  label: string;
}

export const TOPICS: readonly Topic[] = [
  { id: "ai-governance", label: "AI governance, risk and security" },
  { id: "security-management", label: "Security leadership and management" },
  { id: "risk-compliance", label: "Risk and compliance" },
  { id: "audit", label: "Audit and assurance" },
  { id: "cloud-security", label: "Cloud security" },
  { id: "security-operations", label: "Security operations" },
  { id: "privacy", label: "Privacy" },
];
