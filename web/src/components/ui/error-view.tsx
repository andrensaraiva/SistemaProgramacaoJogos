"use client";

import { Button } from "@/components/ui/button";

// Visual amigável de erro para os error.tsx dos segmentos. Substitui o crash
// cru do Next por uma mensagem com opção de tentar de novo.
export function ErrorView({
  reset,
  title = "Algo deu errado",
  description = "Não foi possível carregar esta página. Tente novamente.",
}: {
  reset?: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-danger/40 bg-danger/5 p-10 text-center"
    >
      <span className="text-4xl" aria-hidden="true">
        ⚠️
      </span>
      <div>
        <h1 className="text-lg font-semibold text-danger">{title}</h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {reset && (
        <Button type="button" onClick={reset}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}
