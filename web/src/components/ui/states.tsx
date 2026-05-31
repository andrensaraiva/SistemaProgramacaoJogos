import type { ReactNode } from "react";

// Estados de vazio e de erro padronizados (antes duplicados em várias telas).

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      {icon && <div className="text-3xl opacity-70">{icon}</div>}
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && (
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Não foi possível carregar",
  message,
}: {
  title?: string;
  message: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-danger/40 bg-danger/10 p-6">
      <h1 className="text-lg font-semibold text-danger">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
