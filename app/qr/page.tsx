"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  ScannerHeader,
  ModeTabs,
  QRScannerView,
  ScanStatusDisplay,
} from "@/components/qr-scanner";
import {
  type ScannerMode,
  type ScanStatus,
  type ParticipantData,
  type EventData,
  DEBOUNCE_TIME,
  getModeConfig,
  parseQRPayload,
  getParticipantInfo,
  getEvents,
  registerParticipant,
} from "@/lib/qr-scanner/data";

export default function QRScannerPage() {
  const [mode, setMode] = useState<ScannerMode>("checkin");
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [participantData, setParticipantData] =
    useState<ParticipantData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const lastScannedRef = useRef<{ id: string; timestamp: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Event selection state for workshop/food modes
  const [events, setEvents] = useState<{
    workshops: EventData[];
    food: EventData[];
  }>({ workshops: [], food: [] });
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const modeConfig = getModeConfig(mode);

  // Fetch events when component mounts
  useEffect(() => {
    async function fetchEvents() {
      setIsLoadingEvents(true);
      try {
        const data = await getEvents();
        setEvents({
          workshops: data.grouped.workshops,
          food: data.grouped.food,
        });
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setIsLoadingEvents(false);
      }
    }
    fetchEvents();
  }, []);

  // Reset state when mode changes
  useEffect(() => {
    resetScanState();
    setSelectedEventId("");
  }, [mode]);

  const resetScanState = useCallback(() => {
    setScanStatus("idle");
    setParticipantData(null);
    setErrorMessage("");
    setSuccessMessage("");
    setIsProcessing(false);
  }, []);

  // Get current events based on mode
  const currentEvents = mode === "workshop" ? events.workshops : events.food;

  const handleScan = useCallback(
    async (detectedCodes: { rawValue: string }[]) => {
      if (detectedCodes.length === 0 || isProcessing) return;

      // For workshop/food modes, require event selection first
      if ((mode === "workshop" || mode === "food") && !selectedEventId) {
        setErrorMessage(
          `Please select a ${mode === "workshop" ? "workshop" : "food event"} before scanning`,
        );
        setScanStatus("error");
        return;
      }

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
          error instanceof Error
            ? error.message
            : "Invalid QR code. Please try again.",
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, mode, selectedEventId],
  );

  const handleCheckIn = useCallback(async () => {
    if (!participantData) return;

    // For workshop/food modes, require event selection
    if ((mode === "workshop" || mode === "food") && !selectedEventId) {
      setErrorMessage(
        `Please select a ${mode === "workshop" ? "workshop" : "food event"} first`,
      );
      return;
    }

    setIsProcessing(true);
    setScanStatus("loading");

    try {
      const result = await registerParticipant(
        participantData.uuid,
        mode,
        mode === "checkin" ? undefined : selectedEventId,
      );

      if (result.success) {
        setScanStatus("success");
        setSuccessMessage(result.message);
        if (mode === "checkin") {
          setParticipantData((prev) =>
            prev ? { ...prev, checkedIn: true } : null,
          );
        }
      } else {
        // Handle already registered/checked in case
        if (result.message.includes("already")) {
          setScanStatus("error");
          setErrorMessage(result.message);
        } else {
          setScanStatus("error");
          setErrorMessage(
            result.message ||
              "Registration failed. Please contact Web Team Lead.",
          );
        }
      }
    } catch (error) {
      setScanStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Connection error. Please try again.",
      );
    } finally {
      setIsProcessing(false);
    }
  }, [participantData, mode, selectedEventId]);

  const handleCancel = useCallback(() => {
    resetScanState();
    lastScannedRef.current = null;
  }, [resetScanState]);

  const handleScanError = useCallback(() => {
    setErrorMessage("Camera error. Please check permissions.");
  }, []);

  const handleEventChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedEventId(e.target.value);
      // Reset scan state when event changes
      if (scanStatus !== "idle") {
        resetScanState();
      }
    },
    [scanStatus, resetScanState],
  );

  // Get the selected event name for display
  const selectedEvent = currentEvents.find((e) => e.id === selectedEventId);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <ScannerHeader modeConfig={modeConfig} />

      <ModeTabs mode={mode} onModeChange={setMode} />

      {/* Event Selection for Workshop/Food modes */}
      {(mode === "workshop" || mode === "food") && (
        <div className="px-4 py-3 bg-white border-b">
          <label
            htmlFor="event-select"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Select {mode === "workshop" ? "Workshop" : "Food Event"}:
          </label>
          <select
            id="event-select"
            value={selectedEventId}
            onChange={handleEventChange}
            disabled={isLoadingEvents}
            className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">
              {isLoadingEvents
                ? "Loading events..."
                : `-- Select a ${mode === "workshop" ? "workshop" : "food event"} --`}
            </option>
            {currentEvents.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
                {event.location ? ` (${event.location})` : ""}
              </option>
            ))}
          </select>
          {selectedEvent && selectedEvent.description && (
            <p className="mt-2 text-sm text-gray-600">
              {selectedEvent.description}
            </p>
          )}
          {currentEvents.length === 0 && !isLoadingEvents && (
            <p className="mt-2 text-sm text-yellow-600">
              No {mode === "workshop" ? "workshops" : "food events"} available.
            </p>
          )}
        </div>
      )}

      <main className="flex-1 flex flex-col p-4 gap-4">
        <QRScannerView
          onScan={handleScan}
          onError={handleScanError}
          scanStatus={scanStatus}
        />

        <div className="w-full max-w-md mx-auto">
          <ScanStatusDisplay
            scanStatus={scanStatus}
            participantData={participantData}
            errorMessage={errorMessage}
            successMessage={successMessage}
            modeConfig={modeConfig}
            isProcessing={isProcessing}
            onCheckIn={handleCheckIn}
            onCancel={handleCancel}
            mode={mode}
            selectedEvent={selectedEvent}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 bg-white border-t">
        <p className="text-center text-sm text-gray-500">
          RevolutionUC QR Scanner
        </p>
      </footer>
    </div>
  );
}
