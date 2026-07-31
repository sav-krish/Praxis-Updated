import { StudentExperienceShell } from "@/components/simulation/student-experience-shell";

export default async function PlayLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <StudentExperienceShell code={code}>
      {children}
    </StudentExperienceShell>
  );
}
