// Regras puras de importação de identidades (sem I/O) — testáveis isoladamente.
// Converte texto colado / CSV em linhas validadas de aluno e resolve qual email
// é o canônico (institucional) para o Supabase Auth.
//
// Formato esperado por linha (separador vírgula, ponto-e-vírgula ou tab):
//   Nome Completo, email.institucional@..., email.pessoal@...
// Regras:
//   - nome obrigatório (>= 2 chars);
//   - pelo menos UM email (institucional OU pessoal);
//   - emails em formato válido e únicos dentro do lote.

export type ParsedStudent = {
  /** Número da linha (1-based) na entrada original, para mensagens de erro. */
  line: number;
  displayName: string;
  institutionalEmail: string | null;
  personalEmail: string | null;
};

export type ParseError = { line: number; message: string };

export type ParseResult = {
  rows: ParsedStudent[];
  errors: ParseError[];
};

// Validação simples e suficiente de email (sem RFC completa de propósito).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** Normaliza email para comparação/armazenamento (lower + trim). */
export function normalizeEmail(value: string | null | undefined): string | null {
  const v = (value ?? "").trim().toLowerCase();
  return v.length > 0 ? v : null;
}

/**
 * O email canônico do Auth é o institucional quando existe; senão, o pessoal.
 * (Toda conta precisa de pelo menos um — garantido pela validação.)
 */
export function canonicalEmail(row: {
  institutionalEmail: string | null;
  personalEmail: string | null;
}): string | null {
  return normalizeEmail(row.institutionalEmail) ?? normalizeEmail(row.personalEmail);
}

function splitFields(line: string): string[] {
  // Aceita vírgula, ponto-e-vírgula ou tab como separador.
  return line.split(/[,;\t]/).map((f) => f.trim());
}

/**
 * Faz o parse de um bloco de texto (colado ou conteúdo de CSV) em linhas de
 * aluno. Ignora linhas em branco. Detecta e reporta emails duplicados dentro do
 * próprio lote (institucional e pessoal compartilham o mesmo espaço de unicidade,
 * porque ambos servem para login).
 */
export function parseStudentsText(text: string): ParseResult {
  const rows: ParsedStudent[] = [];
  const errors: ParseError[] = [];
  const seenEmails = new Map<string, number>(); // email -> primeira linha onde apareceu

  const physicalLines = text.split(/\r?\n/);
  physicalLines.forEach((raw, idx) => {
    const line = idx + 1;
    if (raw.trim().length === 0) return; // linha em branco: ignora

    const fields = splitFields(raw);
    const displayName = fields[0] ?? "";
    const institutionalEmail = normalizeEmail(fields[1]);
    const personalEmail = normalizeEmail(fields[2]);

    if (displayName.trim().length < 2) {
      errors.push({ line, message: "Nome obrigatório (mínimo 2 caracteres)." });
      return;
    }

    const emails = [institutionalEmail, personalEmail].filter(
      (e): e is string => e !== null,
    );
    if (emails.length === 0) {
      errors.push({ line, message: "Informe ao menos um email (institucional ou pessoal)." });
      return;
    }

    let hasEmailError = false;
    for (const email of emails) {
      if (!isValidEmail(email)) {
        errors.push({ line, message: `Email inválido: ${email}` });
        hasEmailError = true;
        continue;
      }
      const firstSeen = seenEmails.get(email);
      if (firstSeen !== undefined) {
        errors.push({
          line,
          message: `Email duplicado no lote (já usado na linha ${firstSeen}): ${email}`,
        });
        hasEmailError = true;
      } else {
        seenEmails.set(email, line);
      }
    }
    if (hasEmailError) return;

    rows.push({ line, displayName: displayName.trim(), institutionalEmail, personalEmail });
  });

  return { rows, errors };
}

const TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/**
 * Gera uma senha temporária forte e legível (sem caracteres ambíguos como
 * O/0/I/l/1). Usa crypto quando disponível; cai num fallback só se necessário.
 */
export function generateTempPassword(length = 10): string {
  const n = TEMP_PASSWORD_ALPHABET.length;
  const out: string[] = [];
  const cryptoObj: Crypto | undefined =
    typeof globalThis !== "undefined" ? (globalThis.crypto as Crypto | undefined) : undefined;

  if (cryptoObj?.getRandomValues) {
    const buf = new Uint32Array(length);
    cryptoObj.getRandomValues(buf);
    for (let i = 0; i < length; i++) out.push(TEMP_PASSWORD_ALPHABET[buf[i] % n]);
  } else {
    for (let i = 0; i < length; i++) {
      out.push(TEMP_PASSWORD_ALPHABET[Math.floor(Math.random() * n)]);
    }
  }
  return out.join("");
}
