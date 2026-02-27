"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2, GraduationCap, BookOpen } from "lucide-react";
import { toast } from "sonner";

type ActiveRole = "professor" | "student";

interface ProfileFormProps {
  userId: string;
  email: string;
  name: string;
  activeRole: ActiveRole;
}

export function ProfileForm({ userId, email, name: initialName, activeRole: initialRole }: ProfileFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(initialName);
  const [activeRole, setActiveRole] = useState<ActiveRole>(initialRole);

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("professors")
      .update({ name, active_role: activeRole })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to update profile");
      console.error(error);
    } else {
      toast.success("Profile updated");
      router.refresh();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Your basic information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Viewing Mode</CardTitle>
          <CardDescription>
            Switch between Professor and Student mode to change your dashboard experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setActiveRole("professor")}
              className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
                activeRole === "professor"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-muted-foreground/40 hover:bg-muted/50"
              }`}
            >
              <GraduationCap className={`h-8 w-8 ${activeRole === "professor" ? "text-primary" : "text-muted-foreground"}`} />
              <div className="text-center">
                <p className={`font-medium text-sm ${activeRole === "professor" ? "text-primary" : ""}`}>
                  Professor
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create, edit, and run simulations
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveRole("student")}
              className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
                activeRole === "student"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-muted-foreground/40 hover:bg-muted/50"
              }`}
            >
              <BookOpen className={`h-8 w-8 ${activeRole === "student" ? "text-primary" : "text-muted-foreground"}`} />
              <div className="text-center">
                <p className={`font-medium text-sm ${activeRole === "student" ? "text-primary" : ""}`}>
                  Student
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Browse library and join simulations
                </p>
              </div>
            </button>
          </div>

          {activeRole === "student" && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                In Student mode, your dashboard will show the Simulation Library instead of your personal simulations.
                The &quot;New Simulation&quot; button will be hidden.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="min-h-[44px]">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
