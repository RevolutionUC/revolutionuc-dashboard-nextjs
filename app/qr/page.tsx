"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { QRScanner, ScanResult } from "@/components/qr-scanner";
import {
  type ScannerMode,
  type ScanStatus,
  type Participant,
  type Event,
  MODE_CONFIG,
  parseQRCode,
  fetchParticipant,
  fetchEvents,
  registerScan,
} from "@/lib/qr-scanner/data";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 2000;

export default function QRScannerPage() {
  const [mode, setMode] = useState<ScannerMode>("checkin");
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Events for workshop/food modes
  const [events, setEvents] = useState<{ workshops: Event[]; food: Event[] }>({
    workshops: [],
    food: [],
  });
  const [selectedEventId, setSelectedEventId] = useState("");
  const lastScanRef = useRef<{ id: string; time: number } | null>(null);

  // Load events on mount
  useEffect(() => {
    fetchEvents()
      .then(setEvents)
      .catch((err: Error) => console.error("Failed to load events:", err));
  }, []);

  // Reset when mode changes
  useEffect(() => {
    reset();
    setSelectedEventId("");
  }, [mode]);

  const reset = useCallback(() => {
    setStatus("idle");
    setParticipant(null);
    setError(null);
    setIsProcessing(false);
  }, []);

  const currentEvents = mode === "workshop" ? events.workshops : events.food;
  const selectedEvent =
    currentEvents.find((e) => e.id === selectedEventId) || null;

  const handleScan = useCallback(
    async (rawValue: string) => {
      if (isProcessing) return;

      // Require event selection for workshop/food
      if ((mode === "workshop" || mode === "food") && !selectedEventId) {
        setError(`Select a ${mode} first`);
        setStatus("error");
        return;
      }

      // Debounce duplicate scans
      const now = Date.now();
      if (
        lastScanRef.current &&
        lastScanRef.current.id === rawValue &&
        now - lastScanRef.current.time < DEBOUNCE_MS
      ) {
        return;
      }
      lastScanRef.current = { id: rawValue, time: now };

      setIsProcessing(true);
      setError(null);

      try {
        const participantId = parseQRCode(rawValue);
        const data = await fetchParticipant(participantId);
        setParticipant(data);
        setStatus("scanning");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Invalid QR code");
        setStatus("error");
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, mode, selectedEventId],
  );

  const handleConfirm = useCallback(async () => {
    if (!participant) return;

    setIsProcessing(true);
    try {
      await registerScan(
        participant.uuid,
        mode,
        mode !== "checkin" ? selectedEventId : undefined,
      );
      setStatus("success");
      if (mode === "checkin") {
        setParticipant((p: Participant | null) =>
          p ? { ...p, checkedIn: true } : null,
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setStatus("error");
    } finally {
      setIsProcessing(false);
    }
  }, [participant, mode, selectedEventId]);

  const handleCancel = useCallback(() => {
    reset();
    lastScanRef.current = null;
  }, [reset]);

  const config = MODE_CONFIG[mode];

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className={cn("p-4 text-white text-center", config.bgClass)}>
        <h1 className="text-xl font-bold">{config.label} Mode</h1>
      </header>

      {/* Mode tabs */}
      <div className="flex border-b bg-white">
        {(["checkin", "workshop", "food"] as const).map((m) => {
          const c = MODE_CONFIG[m];
          const isActive = mode === m;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 py-3 px-4 font-medium transition-colors",
                isActive
                  ? `border-b-2 ${c.borderClass} ${c.textClass}`
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Event selector for workshop/food */}
      {(mode === "workshop" || mode === "food") && (
        <div className="px-4 py-3 bg-white border-b">
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              if (status !== "idle") reset();
            }}
            className="w-full p-3 border rounded-lg"
          >
            <option value="">-- Select {mode} --</option>
            {currentEvents.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
                {event.location ? ` (${event.location})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col p-4 gap-4">
        <QRScanner onScan={handleScan} disabled={isProcessing} />

        <div className="w-full max-w-md mx-auto">
          <ScanResult
            status={status}
            participant={participant}
            error={error}
            mode={mode}
            selectedEvent={selectedEvent}
            isProcessing={isProcessing}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 bg-white border-t text-center text-sm text-gray-500">
        RevolutionUC QR Scanner
      </footer>
    </div>
  );
}
