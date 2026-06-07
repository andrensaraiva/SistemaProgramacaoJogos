// Tipos de sala/ambiente (não-server, importável por client e server).
export const ROOM_KINDS = [
  { value: "sala", label: "Sala de aula" },
  { value: "laboratorio", label: "Laboratório" },
  { value: "auditorio", label: "Auditório" },
] as const;

export const ROOM_KIND_LABEL: Record<string, string> = Object.fromEntries(
  ROOM_KINDS.map((k) => [k.value, k.label]),
);
