"use client";

import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  ArrowRight,
  RefreshCw,
  Lock,
  X,
  ShieldAlert,
} from "lucide-react";

/* =========================================================================
   1. REUSABLE EMPTY STATE
   ========================================================================= */
interface EmptyStateProps {
  icon?: any;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = Info,
  title,
  description,
  actionHref,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`p-8 sm:p-12 text-center rounded-2xl bg-white/70 border border-ink/15 space-y-4 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-[#DFE968]/30 border border-ink/15 text-ink flex items-center justify-center mx-auto shadow-sm">
        <Icon className="w-7 h-7" />
      </div>
      <div className="max-w-md mx-auto space-y-1.5">
        <h3 className="text-lg font-bold text-ink">{title}</h3>
        <p className="text-xs text-ink/70 leading-relaxed">{description}</p>
      </div>
      {(actionLabel && (actionHref || onAction)) && (
        <div className="pt-2">
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ink text-[#FBF1CF] hover:bg-ink/90 text-xs font-semibold transition-all shadow-sm"
            >
              <span>{actionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ink text-[#FBF1CF] hover:bg-ink/90 text-xs font-semibold transition-all shadow-sm"
            >
              <span>{actionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   2. REUSABLE LOADING STATE & SKELETON
   ========================================================================= */
interface LoadingStateProps {
  label?: string;
  detail?: string;
  className?: string;
}

export function LoadingState({
  label = "Processing & Synchronizing...",
  detail = "Verifying cryptographic signatures and data normalization.",
  className = "",
}: LoadingStateProps) {
  return (
    <div
      className={`p-10 text-center rounded-2xl bg-white/60 border border-ink/15 space-y-3 ${className}`}
    >
      <div className="w-10 h-10 rounded-full border-2 border-ink/20 border-t-ink animate-spin mx-auto" />
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-ink">{label}</h4>
        {detail && <p className="text-xs text-ink/60">{detail}</p>}
      </div>
    </div>
  );
}

/* =========================================================================
   3. REUSABLE ERROR STATE
   ========================================================================= */
interface ErrorStateProps {
  title?: string;
  message: string;
  recoveryGuidance?: string;
  onRetry?: () => void;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "Operation Encountered an Error",
  message,
  recoveryGuidance,
  onRetry,
  actionHref,
  actionLabel = "Return to Safety",
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`p-6 sm:p-8 rounded-2xl bg-rose-50/70 border border-rose-300 text-rose-950 space-y-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
        <div className="space-y-1 flex-1">
          <h3 className="text-base font-bold text-rose-950">{title}</h3>
          <p className="text-xs text-rose-900/80 leading-relaxed">{message}</p>
          {recoveryGuidance && (
            <div className="p-3 mt-2 rounded-xl bg-white/80 border border-rose-200 text-[11px] text-rose-900 leading-relaxed">
              <span className="font-bold">Recovery Guidance: </span>
              {recoveryGuidance}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Operation</span>
          </button>
        )}
        {actionHref && (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-rose-300 text-rose-900 hover:bg-rose-50 text-xs font-semibold shadow-sm transition-all"
          >
            <span>{actionLabel}</span>
          </Link>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   4. REUSABLE PARTIAL-SUCCESS STATE
   ========================================================================= */
interface PartialSuccessProps {
  title: string;
  successCount: number;
  attentionCount: number;
  successDetails: string[];
  attentionDetails: string[];
  onAction?: () => void;
  actionLabel?: string;
}

export function PartialSuccessState({
  title,
  successCount,
  attentionCount,
  successDetails,
  attentionDetails,
  onAction,
  actionLabel = "Review Flagged Items",
}: PartialSuccessProps) {
  return (
    <div className="p-6 rounded-2xl bg-amber-50/80 border border-amber-300 text-amber-950 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-base font-bold">{title}</h3>
          <p className="text-xs text-amber-900/80">
            {successCount} items completed successfully, while {attentionCount}{" "}
            items require manual attention or conflict review.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
        <div className="p-3.5 rounded-xl bg-white border border-emerald-200 space-y-1.5">
          <span className="font-bold text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Successfully Processed ({successCount}):
          </span>
          <ul className="space-y-1 text-ink/75 text-[11px] list-disc list-inside">
            {successDetails.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-amber-200 space-y-1.5">
          <span className="font-bold text-amber-800 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Requires Human Review ({attentionCount}):
          </span>
          <ul className="space-y-1 text-ink/75 text-[11px] list-disc list-inside">
            {attentionDetails.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {onAction && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onAction}
            className="px-4 py-2 rounded-xl bg-ink text-[#FBF1CF] hover:bg-ink/90 text-xs font-semibold shadow-sm"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   5. REUSABLE ACCESS-DENIED / RESTRICTED STATE
   ========================================================================= */
interface AccessDeniedStateProps {
  title?: string;
  reason: string;
  requiredRole?: string;
  returnHref?: string;
  returnLabel?: string;
}

export function AccessDeniedState({
  title = "Access Restricted",
  reason,
  requiredRole,
  returnHref = "/app/passport",
  returnLabel = "Return to Passport Overview",
}: AccessDeniedStateProps) {
  return (
    <div className="p-8 text-center rounded-2xl bg-white border border-ink/15 max-w-lg mx-auto space-y-4 my-10 shadow-sm">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center mx-auto">
        <Lock className="w-7 h-7 text-ink/70" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-bold text-ink">{title}</h3>
        <p className="text-xs text-ink/70 leading-relaxed">{reason}</p>
        {requiredRole && (
          <div className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-ink/5 border border-ink/10 text-[10px] font-mono font-bold text-ink/80">
            Required Role: {requiredRole}
          </div>
        )}
      </div>
      <div className="pt-2">
        <Link
          href={returnHref}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ink text-[#FBF1CF] hover:bg-ink/90 text-xs font-semibold transition-all shadow-sm"
        >
          <span>{returnLabel}</span>
        </Link>
      </div>
    </div>
  );
}

/* =========================================================================
   6. REUSABLE CONFIRMATION MODAL (ACCESSIBLE DIALOG)
   ========================================================================= */
interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  consequenceWarning?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  consequenceWarning,
  confirmLabel = "Confirm Action",
  cancelLabel = "Cancel",
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl border-2 border-ink shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {isDestructive ? (
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-300">
                <ShieldAlert className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300">
                <Info className="w-5 h-5" />
              </div>
            )}
            <h3 className="text-base font-bold text-ink">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg text-ink/50 hover:text-ink hover:bg-ink/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-ink/75 leading-relaxed">{message}</p>

        {consequenceWarning && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-950 leading-relaxed font-medium">
            <span className="font-bold">Important Note: </span>
            {consequenceWarning}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-ink/10">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-white border border-ink/20 text-ink hover:bg-ink/5 text-xs font-semibold transition-all"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-all ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-ink hover:bg-ink/90 text-[#FBF1CF]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
