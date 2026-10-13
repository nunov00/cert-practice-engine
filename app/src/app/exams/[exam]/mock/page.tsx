import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasTimedTests, TestPage } from "@/components/TestPage";
import { getExam, listExams } from "@/lib/content";

type Params = { exam: string };

export function generateStaticParams(): Params[] {
  return listExams()
    .filter(hasTimedTests)
    .map((e) => ({ exam: e.id }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const exam = getExam((await params).exam);
  return { title: exam ? `${exam.name} mock exam` : "Mock exam" };
}

export default async function MockPage({ params }: { params: Promise<Params> }) {
  const exam = getExam((await params).exam);
  if (!exam || !hasTimedTests(exam)) notFound();
  return <TestPage exam={exam} kind="mock" />;
}
