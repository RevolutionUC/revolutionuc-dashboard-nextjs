"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  ParticipantData,
  ModeConfig,
  ScannerMode,
  EventData,
} from "@/lib/qr-scanner/data";

interface ScanStatusDisplayProps {
  scanStatus: "idle" | "scanning" | "loading" | "success" | "error";
  participantData: ParticipantData | null;
  errorMessage: string;
  successMessage: string;
  modeConfig: ModeConfig;
  isProcessing: boolean;
  onCheckIn: () => void;
  onCancel: () => void;
  mode: ScannerMode;
  selectedEvent?: EventData;
}

function IdleState({ mode }: { mode: ScannerMode }) {
  const getModeMessage = () => {
    switch (mode) {
      case "checkin":
        return "Point your camera at a participant's QR code to check them in";
      case "workshop":
        return "Select a workshop above, then scan a participant's QR code";
      case "food":
        return "Select a food event above, then scan a participant's QR code";
    }
  };

  return (
    <div className="text-center p-6 bg-white rounded-lg shadow">
      <p className="text-gray-600">{getModeMessage()}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="text-center p-6 bg-white rounded-lg shadow">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
      <p className="text-gray-600">Processing...</p>
    </div>
  );
}

function ErrorState({
  errorMessage,
  onRetry,
}: {
  errorMessage: string;
  onRetry: () => void;
}) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center gap-2 text-red-700 mb-3">
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
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
        onClick={onRetry}
        variant="outline"
        className="w-full border-red-300 text-red-600 hover:bg-red-100"
      >
        Retry
      </Button>
    </div>
  );
}

function SuccessState({
  participantData,
  onScanNext,
  mode,
  selectedEvent,
  successMessage,
}: {
  participantData: ParticipantData;
  onScanNext: () => void;
  mode: ScannerMode;
  selectedEvent?: EventData;
  successMessage: string;
}) {
  const getSuccessTitle = () => {
    switch (mode) {
      case "checkin":
        return "Checked In!";
      case "workshop":
        return "Registered for Workshop!";
      case "food":
        return "Registered for Food!";
    }
  };

  return (
    <div className="p-6 bg-green-50 border-2 border-green-500 rounded-lg">
      <div className="flex items-center justify-center gap-2 text-green-700 mb-4">
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-center text-green-800 mb-2">
        {getSuccessTitle()}
      </h2>
      <p className="text-center text-green-700 text-lg mb-2">
        {participantData.firstName} {participantData.lastName}
      </p>
      {selectedEvent && (mode === "workshop" || mode === "food") && (
        <p className="text-center text-green-600 text-sm mb-4">
          {selectedEvent.name}
        </p>
      )}
      {successMessage && (
        <p className="text-center text-green-600 text-sm mb-4">
          {successMessage}
        </p>
      )}
      <Button
        onClick={onScanNext}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
      >
        Scan Next
      </Button>
    </div>
  );
}

function ScanningState({
  participantData,
  modeConfig,
  isProcessing,
  onCheckIn,
  onCancel,
  mode,
  selectedEvent,
}: {
  participantData: ParticipantData;
  modeConfig: ModeConfig;
  isProcessing: boolean;
  onCheckIn: () => void;
  onCancel: () => void;
  mode: ScannerMode;
  selectedEvent?: EventData;
}) {
  const getActionButtonText = () => {
    if (isProcessing) return "Processing...";
    switch (mode) {
      case "checkin":
        return "Check In";
      case "workshop":
        return "Register for Workshop";
      case "food":
        return "Register for Food";
    }
  };

  const isMainCheckinBlocked =
    mode === "checkin" &&
    (participantData.status === "WAITLISTED" || participantData.checkedIn);

  const needsEventSelection =
    (mode === "workshop" || mode === "food") && !selectedEvent;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Participant Header */}
      <div className={cn("p-4", modeConfig.lightBg)}>
        <h2 className="text-xl font-bold text-gray-800">
          {participantData.firstName} {participantData.lastName}
        </h2>
        <p className="text-sm text-gray-600 mt-1">{participantData.email}</p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span
            className={cn(
              "px-3 py-1 rounded-full text-sm font-medium",
              participantData.status === "CONFIRMED"
                ? "bg-green-100 text-green-800"
                : participantData.status === "WAITLISTED"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-gray-100 text-gray-800",
            )}
          >
            {participantData.status || "PENDING"}
          </span>
          {participantData.checkedIn && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              Checked In
            </span>
          )}
        </div>
      </div>

      {/* Event Info for Workshop/Food modes */}
      {selectedEvent && (mode === "workshop" || mode === "food") && (
        <div className="px-4 py-3 bg-gray-50 border-t border-b">
          <p className="text-sm font-medium text-gray-700">
            {mode === "workshop" ? "Workshop:" : "Food Event:"}
          </p>
          <p className="text-base font-semibold text-gray-900">
            {selectedEvent.name}
          </p>
          {selectedEvent.location && (
            <p className="text-sm text-gray-600">{selectedEvent.location}</p>
          )}
        </div>
      )}

      {/* Additional Info */}
      {(participantData.shirtSize || participantData.dietRestrictions) && (
        <div className="px-4 py-3 bg-gray-50 border-b">
          {participantData.shirtSize && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Shirt Size:</span>{" "}
              {participantData.shirtSize}
            </p>
          )}
          {participantData.dietRestrictions && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Diet:</span>{" "}
              {participantData.dietRestrictions}
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4 space-y-3">
        {mode === "checkin" && participantData.status === "WAITLISTED" && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-center font-medium">
              ⚠️ This participant is on the waitlist
            </p>
            <p className="text-yellow-600 text-center text-sm mt-1">
              Check-in is not available for waitlisted participants
            </p>
          </div>
        )}

        {mode === "checkin" &&
          participantData.checkedIn &&
          participantData.status !== "WAITLISTED" && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-center font-medium">
                ✓ This participant has already checked in
              </p>
            </div>
          )}

        {needsEventSelection && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-center font-medium">
              ⚠️ Please select a{" "}
              {mode === "workshop" ? "workshop" : "food event"} first
            </p>
          </div>
        )}

        {!isMainCheckinBlocked && !needsEventSelection && (
          <Button
            onClick={onCheckIn}
            disabled={isProcessing}
            className={cn(
              "w-full text-white text-lg py-6",
              modeConfig.bgColor,
              modeConfig.hoverBg,
            )}
          >
            {getActionButtonText()}
          </Button>
        )}

        <Button
          onClick={onCancel}
          variant="outline"
          className="w-full"
          disabled={isProcessing}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function ScanStatusDisplay({
  scanStatus,
  participantData,
  errorMessage,
  successMessage,
  modeConfig,
  isProcessing,
  onCheckIn,
  onCancel,
  mode,
  selectedEvent,
}: ScanStatusDisplayProps) {
  if (scanStatus === "loading") {
    return <LoadingState />;
  }

  if (scanStatus === "idle") {
    return <IdleState mode={mode} />;
  }

  if (scanStatus === "error") {
    return <ErrorState errorMessage={errorMessage} onRetry={onCancel} />;
  }

  if (scanStatus === "success" && participantData) {
    return (
      <SuccessState
        participantData={participantData}
        onScanNext={onCancel}
        mode={mode}
        selectedEvent={selectedEvent}
        successMessage={successMessage}
      />
    );
  }

  if (scanStatus === "scanning" && participantData) {
    return (
      <ScanningState
        participantData={participantData}
        modeConfig={modeConfig}
        isProcessing={isProcessing}
        onCheckIn={onCheckIn}
        onCancel={onCancel}
        mode={mode}
        selectedEvent={selectedEvent}
      />
    );
  }

  return null;
}
