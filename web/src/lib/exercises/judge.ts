// Compara saída esperada vs obtida tolerando diferenças irrelevantes:
//  - line endings (\r\n vs \n)
//  - whitespace no fim de cada linha
//  - linhas em branco no fim do output (Console.WriteLine sempre adiciona uma)
//
// Mantém sensível a maiúsculas/minúsculas e a espaços internos — quem decide
// é o `expected_stdout` que o autor do exercício escreveu.

export function normalizeOutput(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

export function compareOutputs(expected: string, got: string): boolean {
  return normalizeOutput(expected) === normalizeOutput(got);
}
