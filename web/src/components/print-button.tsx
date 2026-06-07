"use client";

import { Button } from "@/components/ui/button";

// Botão que dispara a impressão do navegador (Salvar como PDF). Tem a classe
// "no-print" para não aparecer no PDF gerado. Compartilhado pelos relatórios.
export function PrintButton({ label = "Imprimir / Salvar PDF" }: { label?: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => window.print()}
      className="no-print"
    >
      {label}
    </Button>
  );
}
