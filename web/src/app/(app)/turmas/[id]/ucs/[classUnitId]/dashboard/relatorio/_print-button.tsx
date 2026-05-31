"use client";

import { Button } from "@/components/ui/button";

// Botão que dispara a impressão do navegador (Salvar como PDF). Tem a classe
// "no-print" para não aparecer no PDF gerado.
export function PrintButton() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()} className="no-print">
      Imprimir / Salvar PDF
    </Button>
  );
}
