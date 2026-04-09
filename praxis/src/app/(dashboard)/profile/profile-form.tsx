"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldInfoHint } from "@/components/ui/field-info-hint";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2, GraduationCap, BookOpen, Shield, MessageSquareHeart, Mail } from "lucide-react";
import { toast } from "sonner";

type ActiveRole = "professor" | "student";

interface ProfileFormProps {
  userId: string;
  email: string;
  name: string;
  activeRole: ActiveRole;
  isAdmin?: boolean;
}

export function ProfileForm({ userId, email, name: initialName, activeRole: initialRole, isAdmin }: ProfileFormProps) {
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
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="flex-1">Account Details</CardTitle>
            <FieldInfoHint className="shrink-0">Your basic information</FieldInfoHint>
          </div>
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
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="flex-1">Viewing Mode</CardTitle>
            <FieldInfoHint className="shrink-0">
              Switch between Professor and Student mode to change your dashboard experience. Professor: create, edit, and run simulations. Student: browse the library and join simulations. In Student mode, your dashboard shows the Simulation Library instead of your personal simulations and the New Simulation button is hidden.
            </FieldInfoHint>
          </div>
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
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="flex flex-1 items-center gap-2 min-w-0">
                <Shield className="h-5 w-5 shrink-0" />
                <span>Admin</span>
              </CardTitle>
              <FieldInfoHint className="shrink-0">
                View feedback and manage email campaigns
              </FieldInfoHint>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/feedback">
                <MessageSquareHeart className="h-4 w-4 mr-2" />
                Feedback
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/emails">
                <Mail className="h-4 w-4 mr-2" />
                Emails
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/library-pins">
                Library pins
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/analytics">
                Analytics
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

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
