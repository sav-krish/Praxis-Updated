import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { AdminLibraryPinsView } from "./admin-library-pins-view";

export default async function AdminLibraryPinsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!(await isAdmin(user ?? null))) {
    redirect("/dashboard");
  }

  const { data: rows, error } = await supabase
    .from("simulations")
    .select("id, title, course_topic, is_public, is_pinned, pinned_order, favorite_count, created_at")
    .eq("is_public", true)
    .order("title", { ascending: true });

  if (error) {
    console.error(error);
  }

  const simulations = (rows ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    course_topic: r.course_topic,
    is_pinned: Boolean(r.is_pinned),
    pinned_order: r.pinned_order ?? null,
    favorite_count: r.favorite_count ?? 0,
    created_at: r.created_at,
  }));

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Library Top Picks</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pin public simulations to feature them in the library Top Picks strip. Lower order numbers appear first.
        </p>
      </div>
      <AdminLibraryPinsView simulations={simulations} />
    </div>
  );
}
