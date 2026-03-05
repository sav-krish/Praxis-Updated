import { redirect } from "next/navigation";
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
import { LogOut, Plus, BookOpen, User, Mail, MessageSquareHeart, CreditCard } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let professor: { active_role?: string; is_admin?: boolean } | null = null;
  const { data: profById } = await supabase
    .from("professors")
    .select("active_role, is_admin")
    .eq("id", user.id)
    .single();
  professor = profById;

  if (!professor && user.email) {
    try {
      const adminSupabase = createServiceRoleClient();
      const { data: profByEmail } = await adminSupabase
        .from("professors")
        .select("active_role, is_admin")
        .eq("email", user.email.toLowerCase())
        .maybeSingle();
      if (profByEmail) professor = profByEmail;
    } catch {
      /* service role not configured */
    }
  }

  const isStudentMode = professor?.active_role === "student";
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const admin =
    !isStudentMode &&
    (adminEmails.includes(user.email?.toLowerCase() ?? "") || professor?.is_admin === true);

  const initials = user.user_metadata?.name
    ? user.user_metadata.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : user.email?.[0].toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-50 safe-area-inset-top">
        <div className="container mx-auto px-3 sm:px-4 min-h-14 sm:h-16 flex items-center justify-between gap-2">
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
            <span className="inline-flex shrink-0 items-center justify-center rounded-sm bg-white p-0.5">
            <img src="/logo.jpg" alt="Praxis" className="h-8 w-auto sm:h-9" />
          </span>
            <span className="text-lg sm:text-xl font-bold truncate">Praxis</span>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link href="/library">
              <Button variant="ghost" className="min-h-[44px] px-3 text-sm">
                <BookOpen className="h-4 w-4 mr-1.5 shrink-0" />
                <span className="hidden sm:inline">Library</span>
              </Button>
            </Link>
            {!isStudentMode && (
              <Link href="/create">
                <Button className="min-h-[44px] px-3 sm:px-4 text-sm sm:text-base">
                  <Plus className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0" />
                  <span className="hidden sm:inline">New Simulation</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </Link>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
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
                      <Link href="/admin/feedback" className="cursor-pointer">
                        <MessageSquareHeart className="mr-2 h-4 w-4" />
                        Admin – Feedback
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
    </div>
  );
}
