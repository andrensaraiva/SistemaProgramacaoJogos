# Plano: suporte a Arduino (PLANEJADO — não implementado)

Este documento descreve **como** adicionar Arduino à plataforma. O schema já está
preparado: a tabela `languages` tem uma linha `arduino` com `runner = 'simulator'`
e `is_enabled = false`. Nada de Arduino roda ainda — esta é a especificação para
a fase futura.

## Por que Arduino é diferente

As outras linguagens (C#, Python, C++, Java…) rodam no **Piston**: recebem stdin,
devolvem stdout, e o judge compara texto. Arduino **não** se encaixa nesse modelo:

- É C++ compilado para um microcontrolador (AVR/ESP), não para o SO do servidor.
- Não tem "stdin/stdout" no sentido comum — interage com hardware: LEDs, botões,
  sensores, e a porta **Serial**.
- `setup()` roda uma vez e `loop()` roda para sempre — não "termina" como um
  programa de console.

Por isso `runner = 'simulator'`: precisa de um caminho de execução próprio.

## Três abordagens (da mais simples à mais rica)

### Opção A — Compilar + validar Serial (mais barata)
- Worker com `arduino-cli` compila o sketch.
- Roda num **simulador headless** (ex: `simavr`) por um tempo fixo.
- Captura o que o sketch escreveu em `Serial.print` e compara com o esperado
  (igual ao judge atual, só que a "saída" é o Serial).
- **Bom para:** exercícios de lógica ("pisque o LED N vezes", "imprima a leitura").
- **Limite:** sem visual; o aluno não *vê* o circuito.

### Opção B — Simulador no browser (mais didático)
- [AVR8js](https://github.com/wokwi/avr8js) (motor por trás do Wokwi) roda um
  AVR **dentro do navegador**, em WebAssembly.
- O aluno escreve o sketch, a gente compila (worker com `arduino-cli` → hex) e o
  AVR8js executa o hex no browser, mostrando LED/Serial/display animados.
- **Bom para:** ensino visual real, sem hardware, roda no free-tier (compute no
  cliente).
- **Custo:** integração mais pesada (toolchain de compilação + componentes de UI
  para o circuito).

### Opção C — Embed do Wokwi (mais rápido de entregar, menos controle)
- Incorporar o [Wokwi](https://wokwi.com) via iframe/projeto.
- **Bom para:** validar a ideia rápido.
- **Limite:** correção automática e antifraude ficam fora do nosso controle.

## Recomendação

Faseado:
1. **Fase A** primeiro (compilar + validar Serial) — reaproveita o judge e o
   conceito de testes que já existe. Menor risco.
2. **Fase B** depois (AVR8js no browser) — para a experiência visual, que é o
   diferencial de ensinar Arduino.

## O que já está pronto no código para isso

- Tabela `languages` com a linha `arduino` (`runner='simulator'`, desabilitada).
- `executeCode()` em [web/src/lib/exercises/piston.ts](../web/src/lib/exercises/piston.ts)
  **rejeita explicitamente** `runner = 'simulator'` com mensagem clara — então
  ninguém consegue submeter Arduino por engano antes da implementação.
- O seletor de linguagens só mostra `is_enabled = true`, então Arduino fica
  invisível até a gente ligar.

## Passos para implementar (Fase A)

1. Subir um worker (fora da Vercel — ex: Fly.io/Render) com `arduino-cli` +
   `simavr`, expondo um endpoint `POST /arduino/run` que recebe `{ sketch, durationMs }`
   e devolve `{ serial, compileError }`.
2. Adicionar `runner = 'arduino'` (ou tratar `simulator`) em `executeCode`,
   roteando para esse worker em vez do Piston.
3. `is_enabled = true` na linha `arduino` da tabela `languages`.
4. Criar exercícios Arduino cujo `expected_stdout` é a saída esperada do Serial.

Nada acima precisa mudar o resto da plataforma — XP, listas, correção e
gamificação continuam funcionando igual.
