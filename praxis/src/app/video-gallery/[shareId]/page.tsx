import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ shareId: string }>;
}

export default async function LegacyVideoGalleryRedirect({ params }: PageProps) {
  const { shareId } = await params;
  redirect(`/response-gallery/${shareId}`);
}
