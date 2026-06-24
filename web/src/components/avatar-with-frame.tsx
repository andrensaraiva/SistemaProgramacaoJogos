import { frameById } from "@/lib/cosmetics/registry";

/**
 * Avatar do aluno com a MOLDURA equipada (anel de gradiente em volta).
 * Server component puro — reusável na sidebar, no perfil e no ranking.
 * Mostra a inicial do nome (upload de imagem real vem num próximo incremento).
 */
export function AvatarWithFrame({
  name,
  frameId,
  size = 40,
}: {
  name: string;
  frameId?: string | null;
  size?: number;
}) {
  const frame = frameById(frameId);
  const ring = Math.max(2, Math.round(size * 0.08));

  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full"
      style={{ width: size + ring * 2, height: size + ring * 2, padding: ring, ...frame.style }}
      title={`Moldura: ${frame.name}`}
    >
      <span
        className="grid h-full w-full place-items-center rounded-full bg-primary/15 font-semibold text-primary"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      >
        {name.charAt(0).toUpperCase()}
      </span>
    </span>
  );
}
