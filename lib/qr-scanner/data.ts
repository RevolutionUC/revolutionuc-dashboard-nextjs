// Types
export interface QRPayload {
  participantId: string;
  metadata?: Record<string, unknown>;
}

export interface ParticipantData {
  uuid: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string | null;
  checkedIn: boolean | null;
  shirtSize: string;
  dietRestrictions: string | null;
}

export interface EventData {
  id: string;
  name: string;
  description: string | null;
  eventType: string;
  startTime: Date | null;
  endTime: Date | null;
  location: string | null;
  capacity: number | null;
}

export interface RegistrationResult {
  success: boolean;
  message: string;
  data?: {
    participant?: {
      uuid: string;
      firstName: string;
      lastName: string;
    };
    event?: {
      id: string;
      name: string;
      eventType: string;
    };
    registeredAt?: Date;
    uuid?: string;
    firstName?: string;
    lastName?: string;
    status?: string | null;
    checkedIn?: boolean | null;
  };
}

export type ScanStatus = "idle" | "scanning" | "loading" | "success" | "error";
export type ScannerMode = "checkin" | "workshop" | "food";

export interface ModeConfig {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  hoverBg: string;
  lightBg: string;
}

// Constants
export const DEBOUNCE_TIME = 3000;

// Mode configurations
export const MODE_CONFIGS: Record<ScannerMode, ModeConfig> = {
  checkin: {
    label: "Check-in Mode",
    bgColor: "bg-green-600",
    textColor: "text-green-600",
    borderColor: "border-green-600",
    hoverBg: "hover:bg-green-700",
    lightBg: "bg-green-50",
  },
  workshop: {
    label: "Workshop Mode",
    bgColor: "bg-blue-600",
    textColor: "text-blue-600",
    borderColor: "border-blue-600",
    hoverBg: "hover:bg-blue-700",
    lightBg: "bg-blue-50",
  },
  food: {
    label: "Food Mode",
    bgColor: "bg-red-600",
    textColor: "text-red-600",
    borderColor: "border-red-600",
    hoverBg: "hover:bg-red-700",
    lightBg: "bg-red-50",
  },
};

// Helper function to get mode configuration
export function getModeConfig(mode: ScannerMode): ModeConfig {
  return MODE_CONFIGS[mode];
}

// Parse QR code payload - only contains participantId and metadata
export function parseQRPayload(qrValue: string): QRPayload {
  try {
    const parsed = JSON.parse(qrValue);
    // Handle different possible field names
    const participantId =
      parsed.participantId || parsed.Participant_ID || parsed.id || parsed.uuid;

    if (!participantId) {
      throw new Error("No participant ID found in QR code");
    }

    return {
      participantId: String(participantId),
      metadata: parsed.metadata,
    };
  } catch {
    // If not valid JSON, treat the raw value as the participant ID (UUID)
    if (qrValue && qrValue.trim()) {
      return {
        participantId: qrValue.trim(),
      };
    }
    throw new Error("Invalid QR code format");
  }
}

/**
 * Fetch participant info from the database by UUID
 */
export async function getParticipantInfo(
  participantId: string,
): Promise<ParticipantData> {
  const response = await fetch(
    `/api/qr?id=${encodeURIComponent(participantId)}`,
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 404) {
      throw new Error("No participant found for this QR code");
    }
    throw new Error(errorData.error || "Failed to fetch participant info");
  }

  const result = await response.json();
  return result.data;
}

/**
 * Fetch available events (workshops and food) from the database
 */
export async function getEvents(
  type?: "WORKSHOP" | "FOOD" | "all",
): Promise<{
  events: EventData[];
  grouped: { workshops: EventData[]; food: EventData[]; other: EventData[] };
}> {
  const url = type ? `/api/qr/events?type=${type}` : "/api/qr/events";
  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch events");
  }

  const result = await response.json();
  return result.data;
}

/**
 * Register a participant for the main event check-in
 * Updates the checkedIn column in the participants table
 */
export async function checkInParticipant(
  participantId: string,
): Promise<RegistrationResult> {
  const response = await fetch("/api/qr", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      participantId,
      mode: "checkin",
    }),
  });

  const data = await response.json();

  if (!response.ok && response.status !== 409) {
    throw new Error(data.error || "Failed to check in participant");
  }

  return {
    success: data.success ?? false,
    message: data.message || data.error || "Unknown response",
    data: data.data,
  };
}

/**
 * Register a participant for a workshop event
 * Creates a record in the eventRegistrations table
 */
export async function registerForWorkshop(
  participantId: string,
  eventId: string,
): Promise<RegistrationResult> {
  const response = await fetch("/api/qr", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      participantId,
      mode: "workshop",
      eventId,
    }),
  });

  const data = await response.json();

  if (!response.ok && response.status !== 409) {
    throw new Error(data.error || "Failed to register for workshop");
  }

  return {
    success: data.success ?? false,
    message: data.message || data.error || "Unknown response",
    data: data.data,
  };
}

/**
 * Register a participant for a food event
 * Creates a record in the eventRegistrations table
 */
export async function registerForFood(
  participantId: string,
  eventId: string,
): Promise<RegistrationResult> {
  const response = await fetch("/api/qr", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      participantId,
      mode: "food",
      eventId,
    }),
  });

  const data = await response.json();

  if (!response.ok && response.status !== 409) {
    throw new Error(data.error || "Failed to register for food");
  }

  return {
    success: data.success ?? false,
    message: data.message || data.error || "Unknown response",
    data: data.data,
  };
}

/**
 * Generic registration function that handles all modes
 * - checkin: Updates participants.checkedIn
 * - workshop: Creates eventRegistrations record for WORKSHOP event
 * - food: Creates eventRegistrations record for FOOD event
 */
export async function registerParticipant(
  participantId: string,
  mode: ScannerMode,
  eventId?: string,
): Promise<RegistrationResult> {
  switch (mode) {
    case "checkin":
      return checkInParticipant(participantId);
    case "workshop":
      if (!eventId) {
        throw new Error("Event ID is required for workshop registration");
      }
      return registerForWorkshop(participantId, eventId);
    case "food":
      if (!eventId) {
        throw new Error("Event ID is required for food registration");
      }
      return registerForFood(participantId, eventId);
    default:
      throw new Error(`Invalid mode: ${mode}`);
  }
}
