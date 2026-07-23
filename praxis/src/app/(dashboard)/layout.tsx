import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Plus, BookOpen, User, Mail, MessageSquareHeart, CreditCard, Home, BarChart3, Pin } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { CopilotLazy } from "@/components/copilot/copilot-lazy";
import { ReplayTutorialMenuItem } from "@/components/tutorial/replay-tutorial-menu-item";
import { TourProvider } from "@/components/tutorial/tour-provider";
import { LandingBackground } from "@/components/landing/landing-background";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  let professor: {
    active_role?: string;
    is_admin?: boolean;
    tutorial_completed_at?: string | null;
  } | null = null;
  const { data: profById } = await supabase
    .from("professors")
    .select("active_role, is_admin, tutorial_completed_at")
    .eq("id", user.id)
    .single();
  professor = profById;

  if (!professor && user.email) {
    try {
      const adminSupabase = createServiceRoleClient();
      const { data: profByEmail } = await adminSupabase
        .from("professors")
        .select("active_role, is_admin, tutorial_completed_at")
        .eq("email", user.email.toLowerCase())
        .maybeSingle();
      if (profByEmail) professor = profByEmail;
    } catch {
      /* service role not configured */
    }
  }

  const isStudentMode = professor?.active_role === "student";
  const tutorialCompleted = Boolean(professor?.tutorial_completed_at);

  // Drives whether the tutorial's "favorite" step is included at all.
  // The step spotlights the heart icon on a public library card; if there
  // are zero public sims there's no card to point at, so we drop the step
  // from the tour up-front rather than letting the watchdog auto-skip it
  // mid-flight (the latter briefly shows a card pointing at nothing).
  //
  // We query whenever the tour can mount (i.e. non-student mode), even
  // when `tutorial_completed_at` is set, so that "Replay tutorial" from
  // the avatar menu also gets the correctly-built tour. The query is a
  // single-row existence check — cheap enough for every layout render.
  let libraryHasFavoritableSims = false;
  if (!isStudentMode) {
    const { data: publicSimRow } = await supabase
      .from("simulations")
      .select("id")
      .eq("is_public", true)
      .limit(1)
      .maybeSingle();
    libraryHasFavoritableSims = Boolean(publicSimRow);
  }
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const admin =
    !isStudentMode &&
    (adminEmails.includes(user.email?.toLowerCase() ?? "") || professor?.is_admin === true);

  const initials = user.user_metadata?.name
    ? user.user_metadata.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : user.email?.[0].toUpperCase() || "U";

  // Whole-layout shell — wrapped in TourProvider for non-student modes so:
  //   1. `useNextStep()` works in the header's ReplayTutorialMenuItem.
  //   2. The tour state survives in-app navigations (the layout is the
  //      stable mount point above the route segment).
  // Students don't see the tour, so we skip the provider entirely.
  const shell = (
    <div
      className="relative isolate min-h-screen text-ink"
      data-app="true"
    >
      {/* Shared marketing-page gradient — keeps every dashboard route on the
          same visual surface as the landing page. */}
      <LandingBackground />

      {/* Header */}
      <header className="bg-white dark:bg-[#292724] border-b border-line/60 dark:border-[#44403b] sticky top-0 z-50 safe-area-inset-top">
        <div className="container mx-auto px-3 sm:px-4 min-h-16 sm:min-h-18 flex items-center justify-between gap-2 py-2">
          <Link href="/dashboard" className="flex items-center min-w-0">
            <span className="inline-flex h-12 shrink-0 items-center justify-center rounded-sm bg-white dark:bg-transparent p-0.5 sm:h-14">
              <Image
                src="/new_logo.png"
                alt="Praxis"
                width={300}
                height={73}
                className="h-full w-auto"
                priority
              />
            </span>
          </Link>
          
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <ThemeToggle />
            <Link href="/dashboard" title={isStudentMode ? "Student dashboard" : "Your simulations"}>
              <Button variant="ghost" className="min-h-[44px] px-3 text-sm">
                <Home className="h-4 w-4 mr-1.5 shrink-0" />
                <span className="hidden sm:inline">{isStudentMode ? "Dashboard" : "Home"}</span>
              </Button>
            </Link>
            {!isStudentMode && (
            <Link href="/library" data-tour="library-link">
              <Button variant="ghost" className="min-h-[44px] px-3 text-sm">
                <BookOpen className="h-4 w-4 mr-1.5 shrink-0" />
                <span className="hidden sm:inline">Library</span>
              </Button>
            </Link>
            )}
            {!isStudentMode && (
              <Link href="/create" data-tour="new-sim">
                <Button className="min-h-[44px] px-3 sm:px-4 text-sm sm:text-base">
                  <Plus className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0" />
                  <span className="hidden sm:inline">New Simulation</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </Link>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  id="dashboard-profile-menu-trigger"
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                  data-tour="profile-menu"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                id="dashboard-profile-menu-content"
                align="end"
                className="w-56"
              >
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {user.user_metadata?.name && (
                      <p className="font-medium">{user.user_metadata.name}</p>
                    )}
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                {admin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/analytics" className="cursor-pointer">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Admin – Analytics
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/feedback" className="cursor-pointer">
                        <MessageSquareHeart className="mr-2 h-4 w-4" />
                        Admin – Feedback
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/library-pins" className="cursor-pointer">
                        <Pin className="mr-2 h-4 w-4" />
                        Admin – Library Pins
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/emails" className="cursor-pointer">
                        <Mail className="mr-2 h-4 w-4" />
                        Admin – Emails
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/pricing" className="cursor-pointer">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pricing
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                {!isStudentMode && <ReplayTutorialMenuItem />}
                <DropdownMenuSeparator />
                <form action={signOut}>
                  <DropdownMenuItem asChild>
                    <button type="submit" className="w-full cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {children}
      </main>

      {!isStudentMode && <CopilotLazy />}
    </div>
  );

  if (isStudentMode) return shell;
  return (
    <TourProvider
      tutorialCompleted={tutorialCompleted}
      libraryHasFavoritableSims={libraryHasFavoritableSims}
    >
      {shell}
    </TourProvider>
  );
}
