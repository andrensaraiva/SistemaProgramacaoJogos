// Ocupação de salas (puro, sem I/O) — testável. A partir dos dias de calendário
// com sala alocada, monta a grade (sala × data) e detecta CONFLITO: a mesma sala
// usada por 2+ turmas na mesma data.

export type OccupancyDay = {
  date: string; // YYYY-MM-DD
  roomId: string | null;
  classId: string;
  turma: string; // nome da turma (para exibir)
};

export type Slot = {
  roomId: string;
  date: string;
  turmas: { classId: string; turma: string }[];
  conflito: boolean; // 2+ turmas distintas na mesma sala/data
};

export type Occupancy = {
  slots: Slot[]; // ocupações (sala+data) com 1+ turma
  porSala: Map<string, Slot[]>; // agrupado por sala
  datas: string[]; // datas únicas ordenadas
  totalConflitos: number;
};

export function computeOccupancy(days: OccupancyDay[]): Occupancy {
  // Agrupa por sala+data.
  const map = new Map<string, Map<string, Slot>>(); // roomId -> date -> slot
  const datasSet = new Set<string>();

  for (const d of days) {
    if (!d.roomId) continue;
    datasSet.add(d.date);
    let byDate = map.get(d.roomId);
    if (!byDate) {
      byDate = new Map();
      map.set(d.roomId, byDate);
    }
    const slot = byDate.get(d.date) ?? { roomId: d.roomId, date: d.date, turmas: [], conflito: false };
    // Evita duplicar a mesma turma no mesmo slot (várias UCs da mesma turma no dia).
    if (!slot.turmas.some((t) => t.classId === d.classId)) {
      slot.turmas.push({ classId: d.classId, turma: d.turma });
    }
    slot.conflito = slot.turmas.length > 1;
    byDate.set(d.date, slot);
  }

  const slots: Slot[] = [];
  const porSala = new Map<string, Slot[]>();
  let totalConflitos = 0;
  for (const [roomId, byDate] of map) {
    const arr = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
    porSala.set(roomId, arr);
    for (const s of arr) {
      slots.push(s);
      if (s.conflito) totalConflitos += 1;
    }
  }

  return {
    slots,
    porSala,
    datas: [...datasSet].sort(),
    totalConflitos,
  };
}

/** Conflitos de uma sala numa data específica (para avisar ao alocar). */
export function conflitosEm(days: OccupancyDay[], roomId: string, date: string, exceptClassId?: string): string[] {
  const turmas = new Set<string>();
  for (const d of days) {
    if (d.roomId === roomId && d.date === date && d.classId !== exceptClassId) {
      turmas.add(d.turma);
    }
  }
  return [...turmas];
}
