"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "./button";

// Modal / diálogo no estilo Celeste Academy — Aurora Minimal.
// Theme-aware pelos tokens (superfície clara p/ instrutor, escura p/ aluno;
// borda lavanda no claro / roxa no escuro). Acessível: role=dialog, aria-modal,
// fecha no Esc e no backdrop, trava o scroll do body e foca o painel ao abrir.

export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  maxWidth = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  /** Pequeno ícone celestial opcional ao lado do título. */
  icon?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Trava o scroll do fundo enquanto o modal está aberto.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Foca o painel para navegação por teclado.
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="modal-overlay absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`modal-panel relative w-full ${maxWidth} rounded-[20px] border border-border bg-card p-6 shadow-e3 outline-none`}
      >
        {(title || icon) && (
          <div className="flex items-start gap-3">
            {icon && (
              <span
                aria-hidden="true"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary"
              >
                {icon}
              </span>
            )}
            <div className="min-w-0 flex-1">
              {title && (
                <h2 className="font-display text-lg font-semibold leading-tight text-foreground">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
        )}

        {children && <div className="mt-4 text-sm text-foreground">{children}</div>}

        {footer && (
          <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>
  );
}

// Diálogo de confirmação padrão. Substitui o confirm() nativo com o visual da
// marca, mantendo o fluxo "cancelar / confirmar".
export function ConfirmDialog({
  open,
  title = "Confirmar ação",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "primary",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: ReactNode;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" pinta o botão de confirmar como destrutivo. */
  tone?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const crescent = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={message}
      icon={crescent}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
