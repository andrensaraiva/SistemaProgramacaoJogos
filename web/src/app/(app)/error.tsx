"use client";

import { useEffect } from "react";

import { ErrorView } from "@/components/ui/error-view";

// Error boundary de toda a área logada: qualquer erro numa página do (app) cai
// aqui com uma mensagem amigável + "tentar de novo", em vez do crash cru do Next.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log no console do servidor/cliente para investigar.
    console.error(error);
  }, [error]);

  return <ErrorView reset={reset} />;
}
