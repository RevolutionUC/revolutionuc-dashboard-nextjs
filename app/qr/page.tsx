"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Types
interface QRPayload {
  participantId: string;
  metadata?: Record<string, unknown>;
}

interface ParticipantData {
  participantId: string;
  firstName: string;
  lastName: string;
  status: "PENDING" | "CONFIRMED" | "WAITLISTED" | "CHECKED_IN";
  checkedIn: boolean;
  metadata?: Record<string, unknown>;
}

type ScanStatus = "idle" | "scanning" | "loading" | "success" | "error";
type ScannerMode = "checkin" | "workshop" | "food";

// Parse QR code payload - only contains participantId and metadata
function parseQRPayload(qrValue: string): QRPayload {
  try {
    const parsed = JSON.parse(qrValue);
    // Handle different possible field names
    const participantId = parsed.participantId || parsed.Participant_ID || parsed.id;

    if (!participantId) {
      throw new Error("No participant ID found in QR code");
    }

    return {
      participantId: String(participantId),
      metadata: parsed.metadata,
    };
  } catch {
    // If not valid JSON, treat the raw value as the participant ID
    if (qrValue && qrValue.trim()) {
      return {
        participantId: qrValue.trim(),
      };
    }
    throw new Error("Invalid QR code format");
  }
}

// API functions
async function getParticipantInfo(participantId: string): Promise<ParticipantData> {
  const response = await fetch(`/api/get-info?participantId=${encodeURIComponent(participantId)}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 404) {
      throw new Error("No participant found for this QR code");
    }
    throw new Error(errorData.message || "Failed to fetch participant info");
  }

  const data = await response.json();
  return {
    participantId,
    firstName: data.FirstName,
    lastName: data.LastName,
    status: data.Status,
    checkedIn: data.Status === "CHECKED_IN",
    metadata: data.participant_metadata,
  };
}

async function registerParticipant(
  participantId: string,
  eventId: string,
): Promise<{ success: boolean; message: string }> {
  const response = await fetch("/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      participantId,
      eventID: eventId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to register participant");
  }

  const data = await response.json();
  return {
    success: data.Message === "REGISTERED",
    message: data.Message,
  };
}

// Debounce time in milliseconds
const DEBOUNCE_TIME = 3000;

export default function QRScannerPage() {
  const [mode, setMode] = useState<ScannerMode>("checkin");
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [participantData, setParticipantData] = useState<ParticipantData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [_, setSuccessMessage] = useState<string>("");
  const lastScannedRef = useRef<{ id: string; timestamp: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when mode changes
  useEffect(() => {
    resetScanState();
  }, [mode]);

  const resetScanState = useCallback(() => {
    setScanStatus("idle");
    setParticipantData(null);
    setErrorMessage("");
    setSuccessMessage("");
    setIsProcessing(false);
  }, []);

  const handleScan = useCallback(
    async (detectedCodes: { rawValue: string }[]) => {
      if (detectedCodes.length === 0 || isProcessing) return;

      const qrValue = detectedCodes[0].rawValue;
      const now = Date.now();

      // Debounce: ignore duplicate scans within DEBOUNCE_TIME
      if (
        lastScannedRef.current &&
        lastScannedRef.current.id === qrValue &&
        now - lastScannedRef.current.timestamp < DEBOUNCE_TIME
      ) {
        return;
      }

      lastScannedRef.current = { id: qrValue, timestamp: now };
      setIsProcessing(true);
      setScanStatus("loading");
      setErrorMessage("");
      setSuccessMessage("");
      setParticipantData(null);

      try {
        // Parse QR code - only contains participantId and metadata
        const qrPayload = parseQRPayload(qrValue);

        // Fetch full participant info from API
        const data = await getParticipantInfo(qrPayload.participantId);
        setParticipantData(data);
        setScanStatus("scanning");
      } catch (error) {
        setScanStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Invalid QR code. Please try again.",
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing],
  );

  const handleCheckIn = useCallback(async () => {
    if (!participantData) return;

    setIsProcessing(true);
    setScanStatus("loading");

    try {
      const result = await registerParticipant(participantData.participantId, "CHECKIN");

      if (result.success) {
        setScanStatus("success");
        setSuccessMessage("Checked in successfully!");
        setParticipantData((prev) =>
          prev ? { ...prev, status: "CHECKED_IN", checkedIn: true } : null,
        );
      } else {
        setScanStatus("error");
        setErrorMessage(result.message || "Check-in failed. Please contact Web Team Lead.");
      }
    } catch (error) {
      setScanStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Connection error. Please try again.",
      );
    } finally {
      setIsProcessing(false);
    }
  }, [participantData]);

  const handleCancel = useCallback(() => {
    resetScanState();
    lastScannedRef.current = null;
  }, [resetScanState]);

  const getModeConfig = (currentMode: ScannerMode) => {
    switch (currentMode) {
      case "checkin":
        return {
          label: "Check-in Mode",
          bgColor: "bg-green-600",
          textColor: "text-green-600",
          borderColor: "border-green-600",
          hoverBg: "hover:bg-green-700",
          lightBg: "bg-green-50",
        };
      case "workshop":
        return {
          label: "Workshop Mode",
          bgColor: "bg-blue-600",
          textColor: "text-blue-600",
          borderColor: "border-blue-600",
          hoverBg: "hover:bg-blue-700",
          lightBg: "bg-blue-50",
        };
      case "food":
        return {
          label: "Food Mode",
          bgColor: "bg-red-600",
          textColor: "text-red-600",
          borderColor: "border-red-600",
          hoverBg: "hover:bg-red-700",
          lightBg: "bg-red-50",
        };
    }
  };

  const modeConfig = getModeConfig(mode);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className={cn("p-4 text-white text-center", modeConfig.bgColor)}>
        <h1 className="text-xl font-bold">{modeConfig.label}</h1>
      </header>

      {/* Mode Tabs */}
      <div className="flex border-b bg-white">
        <button
          type="button"
          onClick={() => setMode("checkin")}
          className={cn(
            "flex-1 py-3 px-4 text-center font-medium transition-colors",
            mode === "checkin"
              ? "border-b-2 border-green-600 text-green-600 bg-green-50"
              : "text-gray-500 hover:text-gray-700",
          )}
        >
          Check-in
        </button>
        <button
          type="button"
          onClick={() => setMode("workshop")}
          disabled
          className={cn(
            "flex-1 py-3 px-4 text-center font-medium transition-colors opacity-50 cursor-not-allowed",
            mode === "workshop"
              ? "border-b-2 border-blue-600 text-blue-600 bg-blue-50"
              : "text-gray-400",
          )}
        >
          Workshops
        </button>
        <button
          type="button"
          onClick={() => setMode("food")}
          disabled
          className={cn(
            "flex-1 py-3 px-4 text-center font-medium transition-colors opacity-50 cursor-not-allowed",
            mode === "food" ? "border-b-2 border-red-600 text-red-600 bg-red-50" : "text-gray-400",
          )}
        >
          Food
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 gap-4">
        {/* QR Scanner */}
        <div className="relative w-full max-w-md mx-auto aspect-square bg-black rounded-lg overflow-hidden">
          <Scanner
            onScan={handleScan}
            onError={(error) => {
              console.error("Scanner error:", error);
              setErrorMessage("Camera error. Please check permissions.");
            }}
            styles={{
              container: {
                width: "100%",
                height: "100%",
              },
              video: {
                width: "100%",
                height: "100%",
                objectFit: "cover",
              },
            }}
            components={{
              finder: true,
            }}
          />

          {/* Loading overlay */}
          {scanStatus === "loading" && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
            </div>
          )}
        </div>

        {/* Status/Result Area */}
        <div className="w-full max-w-md mx-auto">
          {/* Idle State */}
          {scanStatus === "idle" && (
            <div className="text-center p-6 bg-white rounded-lg shadow">
              <p className="text-gray-600">
                Point your camera at a participant&apos;s QR code to scan
              </p>
            </div>
          )}

          {/* Error State */}
          {scanStatus === "error" && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-semibold">Error</span>
              </div>
              <p className="text-red-600 mb-4">{errorMessage}</p>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="w-full border-red-300 text-red-600 hover:bg-red-100"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Success State */}
          {scanStatus === "success" && participantData && (
            <div className="p-6 bg-green-50 border-2 border-green-500 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-green-700 mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-center text-green-800 mb-2">Checked In!</h2>
              <p className="text-center text-green-700 text-lg mb-4">
                {participantData.firstName} {participantData.lastName}
              </p>
              <Button
                onClick={handleCancel}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Scan Next
              </Button>
            </div>
          )}

          {/* Participant Info (after scan, before check-in) */}
          {scanStatus === "scanning" && participantData && (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Participant Header */}
              <div className={cn("p-4", modeConfig.lightBg)}>
                <h2 className="text-xl font-bold text-gray-800">
                  {participantData.firstName} {participantData.lastName}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium",
                      participantData.status === "CONFIRMED"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800",
                    )}
                  >
                    {participantData.status}
                  </span>
                  {participantData.checkedIn && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      Already Checked In
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 space-y-3">
                {participantData.status === "WAITLISTED" ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-center font-medium">
                      ⚠️ This participant is on the waitlist
                    </p>
                    <p className="text-yellow-600 text-center text-sm mt-1">
                      Check-in is not available for waitlisted participants
                    </p>
                  </div>
                ) : participantData.checkedIn ? (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 text-center font-medium">
                      ✓ This participant has already checked in
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={handleCheckIn}
                    disabled={isProcessing}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                  >
                    {isProcessing ? "Processing..." : "Check In"}
                  </Button>
                )}

                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="w-full"
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 bg-white border-t text-center text-sm text-gray-500">
        RevolutionUC Check-in System
      </footer>
    </div>
  );
}
