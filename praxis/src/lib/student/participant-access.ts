/**
 * A participant is either a signed-in student's record or an anonymous guest
 * record. Never let a browser session for one account reuse the other type's
 * participant ID from shared storage.
 */
export function canAccessParticipant({
  viewerUserId,
  participantUserId,
  isPreview,
  simulationOwnerId,
}: {
  viewerUserId: string | null;
  participantUserId: string | null;
  isPreview: boolean;
  simulationOwnerId: string | null | undefined;
}) {
  if (!viewerUserId) {
    return participantUserId === null;
  }

  return (
    participantUserId === viewerUserId ||
    (isPreview && simulationOwnerId === viewerUserId)
  );
}
