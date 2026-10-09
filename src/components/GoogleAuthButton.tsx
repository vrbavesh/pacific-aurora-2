"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  apiFetch,
  ApiRequestError,
  redirectAfterAuth,
  setToken,
} from "@/src/lib/api/client";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GSI_SRC = "https://accounts.google.com/gsi/client";
const CALM_FAILURE =
  "google sign-in didn't work, but don't worry you can try again";

interface GoogleCredentialResponse {
  credential?: string;
  error?: string;
}

interface GoogleIdClient {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (container: HTMLElement, options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdClient } };
  }
}

// FedCM signals the user dismissed the prompt; those are not failures to report.
const DISMISSAL_ERRORS = new Set([
  "canceled",
  "opt_out_or_no_session",
  "suppressed_by_user",
]);

let gsiLoading: Promise<void> | null = null;

function loadGsi(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no window"));
  }
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiLoading) {
    gsiLoading = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      const timer = window.setTimeout(
        () => reject(new Error("Google sign-in timed out")),
        10000,
      );
      script.onload = () => {
        window.clearTimeout(timer);
        resolve();
      };
      script.onerror = () => {
        window.clearTimeout(timer);
        gsiLoading = null;
        reject(new Error("Google sign-in failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return gsiLoading;
}

interface GoogleAuthButtonProps {
  onError: (message: string) => void;
}

export default function GoogleAuthButton({ onError }: GoogleAuthButtonProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  const postingRef = useRef(false);
  const [unavailable, setUnavailable] = useState(!CLIENT_ID);

  const handleCredential = async (credential: string) => {
    if (postingRef.current) return;
    postingRef.current = true;
    try {
      const { data } = await apiFetch<{
        session?: { access_token?: string } | null;
      }>("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential }),
      });
      const token = data.session?.access_token;
      if (!token) {
        onError(CALM_FAILURE);
        return;
      }
      setToken(token);
      // Flag check: new/incomplete profiles land on onboarding (username is
      // prefilled there), complete ones go home.
      await redirectAfterAuth((path) => {
        router.push(path);
        router.refresh();
      });
    } catch (err) {
      onError(
        err instanceof ApiRequestError ? err.message : CALM_FAILURE,
      );
    } finally {
      postingRef.current = false;
    }
  };

  // Keep the GIS callback and error handler on the latest render without
  // re-running the one-shot render effect below.
  const handleCredentialRef = useRef(handleCredential);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    handleCredentialRef.current = handleCredential;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!CLIENT_ID) {
      setUnavailable(true);
      return;
    }
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || renderedRef.current || !containerRef.current) return;
        const id = window.google?.accounts?.id;
        if (!id) {
          setUnavailable(true);
          return;
        }
        id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            if (response?.credential) {
              void handleCredentialRef.current(response.credential);
            } else if (
              response?.error &&
              !DISMISSAL_ERRORS.has(response.error)
            ) {
              onErrorRef.current(CALM_FAILURE);
            }
          },
        });
        const width = containerRef.current.clientWidth;
        id.renderButton(containerRef.current, {
          theme: "filled_black",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          ...(width >= 200 ? { width } : {}),
        });
        renderedRef.current = true;
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (unavailable) {
    return (
      <motion.button
        type="button"
        onClick={() =>
          onError(
            "google sign-in isn't available right now, but don't worry you can try again",
          )
        }
        whileHover={{ y: -1, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-medium text-foreground transition-all duration-200 hover:border-white/25 hover:bg-white/[0.07]"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l1.68-1.68C18.78 4.18 15.9 2.5 12 2.5 8.74 2.5 5.95 4.32 4.5 6.78L1.4 4.24C2.55 2.26 5.14 1 8.5 1c3.02 0 5.56 1.53 6.94 3.88z"
          />
        </svg>
        <span>Continue with Google</span>
      </motion.button>
    );
  }

  return (
    <div className="flex w-full justify-center">
      <div ref={containerRef} className="min-h-[44px]" />
    </div>
  );
}
