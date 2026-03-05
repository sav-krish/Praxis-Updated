import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: professor } = await supabase
    .from("professors")
    .select("*")
    .eq("id", user.id)
    .single();

  const admin = await isAdmin(user);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Manage your account and viewing mode
        </p>
      </div>

      <ProfileForm
        userId={user.id}
        email={user.email || ""}
        name={professor?.name || user.user_metadata?.name || ""}
        activeRole={professor?.active_role || "professor"}
        isAdmin={admin}
      />
    </div>
  );
}
