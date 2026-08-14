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
    <div className="praxis-student-ui min-h-dvh">
      <StudentExperienceShell code={code}>
        {children}
      </StudentExperienceShell>
    </div>
  );
}
