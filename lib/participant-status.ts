export const PARTICIPANT_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "WAITLISTED",
  "CHECKED_IN",
] as const;

export type ParticipantStatus = (typeof PARTICIPANT_STATUSES)[number];

export function isParticipantStatus(value: unknown): value is ParticipantStatus {
  return (
    typeof value === "string" &&
    (PARTICIPANT_STATUSES as readonly string[]).includes(value)
  );
}

