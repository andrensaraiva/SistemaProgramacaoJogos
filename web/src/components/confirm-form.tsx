"use client";

import { useRef, useState } from "react";

import { ConfirmDialog } from "@/components/ui/modal";

interface Props {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  children: React.ReactNode;
  /** Título do diálogo (padrão "Confirmar ação"). */
  title?: string;
  /** Confirmação destrutiva pinta o botão de confirmar como perigo. */
  danger?: boolean;
}

// Envolve um form cuja submissão exige confirmação. Mesma API de antes
// (action + message + children), mas agora com o diálogo da marca no lugar do
// confirm() nativo. Ao confirmar, re-dispara a submissão do form preservando
// a server action.
export function ConfirmForm({ action, message, children, title, danger }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);
  const [open, setOpen] = useState(false);

  return (
    <>
      <form
        ref={formRef}
        action={action}
        onSubmit={(e) => {
          // Primeira submissão: intercepta e abre o diálogo. Após confirmar,
          // confirmedRef libera a submissão nativa (server action) real.
          if (!confirmedRef.current) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {children}
      </form>

      <ConfirmDialog
        open={open}
        title={title}
        message={message}
        tone={danger ? "danger" : "primary"}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          confirmedRef.current = true;
          formRef.current?.requestSubmit();
          confirmedRef.current = false;
        }}
      />
    </>
  );
}
