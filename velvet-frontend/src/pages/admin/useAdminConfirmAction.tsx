import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AdminConfirmDialog } from "../../components/admin/AdminConfirmDialog";

import type { AdminConfirmDialogVariant } from "../../components/admin/AdminConfirmDialog";

export type AdminConfirmRequest = {
  title: string;
  message: string;
  subject?: string;
  subjectLabel?: string;
  warningNotes?: string[];
  variant?: AdminConfirmDialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
};

type ActionFeedback = {
  kind: "success" | "error";
  message: string;
};

const FEEDBACK_AUTO_DISMISS_MS = 8_000;

export function useAdminConfirmAction() {
  const [pending, setPending] = useState<AdminConfirmRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const t = window.setTimeout(() => setFeedback(null), FEEDBACK_AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [feedback]);

  const confirm = useCallback((request: AdminConfirmRequest) => {
    setFeedback(null);
    setPending(request);
  }, []);

  const dismissConfirm = useCallback(() => {
    if (busy) return;
    setPending(null);
  }, [busy]);

  const runConfirm = useCallback(async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      await pending.onConfirm();
      setPending(null);
    } catch (err) {
      setFeedback({
        kind: "error",
        message: err instanceof Error ? err.message : "Operazione non riuscita.",
      });
      setPending(null);
    } finally {
      setBusy(false);
    }
  }, [busy, pending]);

  const showSuccess = useCallback((message: string) => {
    setFeedback({ kind: "success", message });
  }, []);

  const showError = useCallback((message: string) => {
    setFeedback({ kind: "error", message });
  }, []);

  const confirmDialog: ReactNode = (
    <AdminConfirmDialog
      open={Boolean(pending)}
      title={pending?.title ?? ""}
      message={pending?.message ?? ""}
      subject={pending?.subject}
      subjectLabel={pending?.subjectLabel}
      warningNotes={pending?.warningNotes}
      variant={pending?.variant}
      confirmLabel={pending?.confirmLabel}
      cancelLabel={pending?.cancelLabel}
      busy={busy}
      onConfirm={() => void runConfirm()}
      onCancel={dismissConfirm}
    />
  );

  const actionBanner: ReactNode = feedback ? (
    <p
      className={`velvet-alert velvet-admin-action-banner ${feedback.kind === "success" ? "velvet-alert--success" : "velvet-alert--error"}`}
      role={feedback.kind === "success" ? "status" : "alert"}
    >
      {feedback.message}
    </p>
  ) : null;

  return { confirm, showSuccess, showError, confirmDialog, actionBanner };
}
