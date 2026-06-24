import { avatarById, frameById, DEFAULT_AVATAR_ID } from "@/lib/cosmetics/registry";

/**
 * Avatar do aluno com a MOLDURA (anel) e a SKIN (fundo do círculo) equipadas.
 * Server component puro — reusável na sidebar, no perfil e no ranking.
 * Mostra a inicial do nome (upload de imagem real fica para depois).
 */
export function AvatarWithFrame({
  name,
  frameId,
  skinId,
  size = 40,
}: {
  name: string;
  frameId?: string | null;
  skinId?: string | null;
  size?: number;
}) {
  const frame = frameById(frameId);
  const skin = avatarById(skinId);
  const isDefaultSkin = skin.id === DEFAULT_AVATAR_ID;
  const ring = Math.max(2, Math.round(size * 0.08));

  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full"
      style={{ width: size + ring * 2, height: size + ring * 2, padding: ring, ...frame.style }}
      title={`Moldura: ${frame.name}`}
    >
      <span
        className={`grid place-items-center rounded-full font-semibold ${
          isDefaultSkin ? "bg-primary/15 text-primary" : ""
        }`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.4), ...(isDefaultSkin ? {} : skin.style) }}
      >
        {name.charAt(0).toUpperCase()}
      </span>
    </span>
  );
}
