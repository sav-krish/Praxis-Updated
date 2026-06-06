"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";

function galleryCookieName(shareId: string) {
  return `praxis_gallery_${shareId}`;
}

type GalleryAccessSessionRow = {
  join_code?: string | null;
  response_gallery_access_code?: string | null;
};

export async function unlockResponseGallery(shareId: string, formData: FormData) {
  const code = String(formData.get("accessCode") ?? "").trim().toUpperCase();
  const supabase = createServiceRoleClient();

  let sessionResult = await supabase
    .from("sessions")
    .select("response_gallery_access_code, join_code")
    .eq("video_gallery_share_id", shareId)
    .single();

  if (sessionResult.error?.message?.includes("response_gallery_access_code")) {
    sessionResult = await supabase
      .from("sessions")
      .select("join_code")
      .eq("video_gallery_share_id", shareId)
      .single();
  }

  const sessionRow = sessionResult.data as GalleryAccessSessionRow | null;

  const session = sessionRow
    ? {
        ...sessionRow,
        response_gallery_access_code:
          sessionRow.response_gallery_access_code ?? sessionRow.join_code,
      }
    : null;

  const expectedCode = session?.response_gallery_access_code || session?.join_code;
  if (!expectedCode || code !== expectedCode.toUpperCase()) {
    redirect(`/response-gallery/${shareId}?error=invalid-code`);
  }

  const cookieStore = await cookies();
  cookieStore.set(galleryCookieName(shareId), expectedCode.toUpperCase(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
    path: `/response-gallery/${shareId}`,
  });

  redirect(`/response-gallery/${shareId}`);
}
