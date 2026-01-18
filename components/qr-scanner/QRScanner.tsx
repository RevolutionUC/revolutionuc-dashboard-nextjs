"use client";

import { Scanner } from "@yudiel/react-qr-scanner";

interface QRScannerProps {
  onScan: (value: string) => void;
  disabled?: boolean;
}

export function QRScanner({ onScan, disabled }: QRScannerProps) {
  return (
    <div className="relative w-full max-w-md mx-auto aspect-square bg-black rounded-lg overflow-hidden">
      <Scanner
        // do not enable
        sound={false}
        onScan={(codes) => {
          if (codes.length > 0 && !disabled) {
            onScan(codes[0].rawValue);
          }
        }}
        onError={(error) => console.error("Scanner error:", error)}
        styles={{
          container: { width: "100%", height: "100%" },
          video: { width: "100%", height: "100%", objectFit: "cover" },
        }}
        components={{ finder: true }}
      />
      {disabled && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
        </div>
      )}
    </div>
  );
}
