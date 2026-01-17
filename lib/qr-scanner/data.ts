// Types
export type ScannerMode = "checkin" | "workshop" | "food";
export type ScanStatus = "idle" | "scanning" | "success" | "error";

export interface Participant {
  uuid: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string | null;
  checkedIn: boolean | null;
  shirtSize: string;
  dietRestrictions: string | null;
}

export interface Event {
  id: string;
  name: string;
  description: string | null;
  eventType: string;
  location: string | null;
}

// Mode display config
export const MODE_CONFIG = {
  checkin: {
    label: "Check-in",
    color: "green",
    bgClass: "bg-green-600",
    textClass: "text-green-600",
    borderClass: "border-green-600",
  },
  workshop: {
    label: "Workshop",
    color: "blue",
    bgClass: "bg-blue-600",
    textClass: "text-blue-600",
    borderClass: "border-blue-600",
  },
  food: {
    label: "Food",
    color: "orange",
    bgClass: "bg-orange-600",
    textClass: "text-orange-600",
    borderClass: "border-orange-600",
  },
} as const;

// Parse QR code - handles JSON or plain UUID
export function parseQRCode(value: string): string {
  try {
    const parsed = JSON.parse(value);
    return parsed.participantId || parsed.id || parsed.uuid || value;
  } catch {
    return value.trim();
  }
}

// API functions
export async function fetchParticipant(id: string): Promise<Participant> {
  const res = await fetch(`/api/qr?id=${encodeURIComponent(id)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Participant not found");
  }
  return res.json();
}

export async function fetchEvents(): Promise<{
  workshops: Event[];
  food: Event[];
}> {
  const res = await fetch("/api/qr?action=events");
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

export async function registerScan(
  participantId: string,
  mode: ScannerMode,
  eventId?: string,
): Promise<{ message: string }> {
  const res = await fetch("/api/qr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participantId, mode, eventId }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Registration failed");
  return data;
}
