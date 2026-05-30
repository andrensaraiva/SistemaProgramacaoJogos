import Link from "next/link";

// Trilha de navegação estilo Canvas. Renderiza "A › B › C" onde os itens
// anteriores são links e o último é a página atual.
export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Trilha" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {item.href && !last ? (
                <Link href={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              ) : (
                <span className={last ? "font-medium text-foreground" : ""}>
                  {item.label}
                </span>
              )}
              {!last && <span className="text-muted-foreground/50">›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
