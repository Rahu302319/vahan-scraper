"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("[PWA] Service Worker registered"))
        .catch((err) => console.warn("[PWA] Service Worker registration failed:", err));
    }

    // Check if running in standalone mode (already installed)
    if (
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true)
    ) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || dismissed || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-bounce-in">
      <div className="flex items-center gap-3.5 bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 rounded-2xl p-3.5 pl-4 backdrop-blur-md">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-400 font-bold text-lg">
          ⬇️
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-white tracking-wide">
            Install Vahan 4 App
          </span>
          <span className="text-[11px] text-slate-400">
            Install as a fast native desktop / mobile app
          </span>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <button
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold rounded-lg shadow-md hover:shadow-cyan-500/25 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Install
          </button>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

