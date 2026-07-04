// Skeleton de carregamento — placeholder animado enquanto a página busca dados.
// Usado nos loading.tsx dos segmentos do aluno. Puro CSS (classe .skeleton).

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} aria-hidden="true" />;
}

/** Bloco de página em carregamento: cabeçalho + linhas de cards. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Carregando…">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-40" />
      <span className="sr-only">Carregando conteúdo…</span>
    </div>
  );
}
