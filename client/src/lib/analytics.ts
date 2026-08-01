// Lightweight analytics helper.
// Track calls Vercel Analytics als het geladen is en Umami als het script actief is.
// Umami wordt via een <script> in index.html toegevoegd zodra je een website-id hebt.

import { track as vercelTrack } from "@vercel/analytics";

type EventProps = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    umami?: {
      track: (name: string, data?: EventProps) => void;
    };
  }
}

export function track(name: string, props?: EventProps): void {
  try {
    // Vercel Analytics
    vercelTrack(name, props as Record<string, string | number | boolean | null>);
  } catch {
    // stil falen, analytics mag nooit de app breken
  }
  try {
    // Umami
    if (typeof window !== "undefined" && window.umami) {
      window.umami.track(name, props);
    }
  } catch {
    // stil falen
  }
}
