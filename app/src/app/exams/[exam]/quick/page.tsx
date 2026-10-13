import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { quickPace, TestPage } from "@/components/TestPage";
import { getExam, listExams } from "@/lib/content";

type Params = { exam: string };

export function generateStaticParams(): Params[] {
  return listExams()
    .filter((e) => quickPace(e) !== null)
    .map((e) => ({ exam: e.id }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const exam = getExam((await params).exam);
  return { title: exam ? `${exam.name} quick test` : "Quick test" };
}

export default async function QuickPage({ params }: { params: Promise<Params> }) {
  const exam = getExam((await params).exam);
  if (!exam || !quickPace(exam)) notFound();
  return <TestPage exam={exam} kind="quick" />;
}
