import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { PraxisLogo } from "@/components/praxis-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/">
            <PraxisLogo size="navbar" priority />
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <div className="pt-16">{children}</div>
    </div>
  );
}
