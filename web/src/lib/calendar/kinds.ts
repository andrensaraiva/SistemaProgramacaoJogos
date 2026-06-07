// Tipos de feriado/evento (não-server, pode ser importado por client e server).
export const HOLIDAY_KINDS = [
  { value: "feriado", label: "Feriado" },
  { value: "recesso", label: "Recesso" },
  { value: "ferias", label: "Férias" },
  { value: "capacitacao", label: "Capacitação" },
  { value: "conselho", label: "Conselho de classe" },
  { value: "evento", label: "Evento" },
] as const;
