"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { ArrowLeft, X } from "@phosphor-icons/react";
import { apiFetch, ApiRequestError } from "@/src/lib/api/client";
import type { Profile } from "@/src/lib/api/generated";
import AccountMenu from "@/src/components/AccountMenu";

export const button = "ws-button";
export const field = "ws-field";
export const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "That did not go through. Please try again.";
export async function read<T>(path: string): Promise<T> {
  return (await apiFetch<T>(path)).data;
}
export async function write<T>(
  path: string,
  method: string,
  body?: unknown,
): Promise<T> {
  return (
    await apiFetch<T>(path, {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  ).data;
}

function SessionGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useQuery({
    queryKey: ["workspace-session"],
    queryFn: () => read<{ profile: Profile | null }>("/api/auth/session"),
    retry: false,
  });
  useEffect(() => {
    if (
      session.error instanceof ApiRequestError &&
      session.error.status === 401
    )
      router.replace("/signin");
    if (
      session.data &&
      (!session.data.profile?.onboardingComplete ||
        !session.data.profile.userId)
    )
      router.replace("/onboarding");
  }, [session.data, session.error, router]);
  if (session.isPending) return <Notice>Opening your workspace...</Notice>;
  if (session.error)
    return (
      <Notice error={session.error} retry={() => void session.refetch()} />
    );
  if (
    !session.data?.profile?.onboardingComplete ||
    !session.data.profile.userId
  )
    return <Notice>Opening your profile...</Notice>;
  return children;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <SessionGate>{children}</SessionGate>
    </QueryClientProvider>
  );
}

export function WorkspaceHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <header className="ws-header">
      <Link href="/home" className={button} aria-label="Back to home">
        <ArrowLeft size={18} />
        <span className="hidden sm:inline">Home</span>
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-foreground-muted">
          {subtitle ?? "Pacific Aurora"}
        </p>
        <h1 className="truncate text-lg font-medium">{title}</h1>
      </div>
      {children}
      <AccountMenu />
    </header>
  );
}

export function Notice({
  children,
  error,
  retry,
}: {
  children?: ReactNode;
  error?: unknown;
  retry?: () => void;
}) {
  const missing = error instanceof ApiRequestError && error.status === 404;
  return (
    <div
      className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center gap-5 p-8 text-center"
      role={error ? "alert" : "status"}
    >
      <p className="text-foreground-muted">
        {error
          ? missing
            ? "This page could not be found."
            : message(error)
          : children}
      </p>
      {retry && !missing && (
        <button className={button} onClick={retry}>
          Try again
        </button>
      )}
      {missing && (
        <Link className={button} href="/home">
          Return home
        </Link>
      )}
    </div>
  );
}

export function Dialog({
  title,
  children,
  onClose,
  side = false,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  side?: boolean;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={side ? "ws-dialog ws-panel" : "ws-dialog"}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <h2 className="font-serif text-2xl">{title}</h2>
        <button
          className={button}
          onClick={onClose}
          disabled={busy}
          aria-label="Close panel"
        >
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-foreground-muted">
      {label}
      {children}
    </label>
  );
}

export function Confirm({
  title,
  detail,
  onConfirm,
  onClose,
  confirmLabel = "Delete",
}: {
  title: string;
  detail: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  confirmLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog title={title} onClose={onClose} busy={busy}>
      <p className="mb-6 text-sm leading-6 text-foreground-muted">{detail}</p>
      {error && (
        <p role="alert" className="mb-4">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <button className={button} disabled={busy} onClick={onClose}>
          Not now
        </button>
        <button
          className="ws-button ws-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onClose();
            } catch (e) {
              setError(message(e));
              setBusy(false);
            }
          }}
        >
          {busy ? "Working..." : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
