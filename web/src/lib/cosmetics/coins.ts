// Economia de MOEDAS Celeste — funções puras (testáveis).
// O saldo é DERIVADO do nível para não precisar hookar todas as fontes de XP:
//   saldo = coinsForLevel(level) + bonus - spent
// `bonus` cobre fontes avulsas futuras (missões, streak); `spent` é o gasto na
// loja. Ambos vivem em profiles (coins_bonus / coins_spent).

const COINS_PER_LEVEL = 10;

/** Bônus extra ao alcançar certos níveis (marcos). */
function milestoneBonus(level: number): number {
  let bonus = 0;
  if (level >= 5) bonus += 20;
  if (level >= 10) bonus += 50;
  if (level >= 20) bonus += 100;
  // marcos altos recorrentes a cada 25 níveis
  bonus += Math.floor(level / 25) * 150;
  return bonus;
}

/** Total de moedas concedidas por ter alcançado `level` (cumulativo). */
export function coinsForLevel(level: number): number {
  const lvl = Math.max(1, Math.floor(level));
  // ganha COINS_PER_LEVEL por nível alcançado acima do 1.
  return (lvl - 1) * COINS_PER_LEVEL + milestoneBonus(lvl);
}

/** Saldo disponível para gastar na loja. */
export function coinBalance(level: number, coinsBonus: number, coinsSpent: number): number {
  return Math.max(0, coinsForLevel(level) + coinsBonus - coinsSpent);
}

/** Moedas ganhas ao passar de `from` para `to` níveis (para feedback de level-up). */
export function coinsGainedBetween(from: number, to: number): number {
  return Math.max(0, coinsForLevel(to) - coinsForLevel(from));
}
