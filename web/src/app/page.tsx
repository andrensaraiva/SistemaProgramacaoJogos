import Link from "next/link";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: "💻",
    title: "Código que roda na hora",
    text: "Editor profissional no navegador. Escreva C#, dê run, e veja seu código sendo testado caso por caso.",
  },
  {
    icon: "⚔️",
    title: "Duelos X1",
    text: "Desafie um colega para um duelo de programação. O primeiro a passar todos os testes vence.",
  },
  {
    icon: "🤖",
    title: "Exercícios infinitos com IA",
    text: "Não está com vontade do que está disponível? Peça para a IA gerar um exercício novo do seu nível.",
  },
  {
    icon: "🏆",
    title: "XP, níveis e ranking",
    text: "Cada exercício resolvido vira XP. Suba de nível, ganhe conquistas e suba no ranking da turma.",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link href="/entrar">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link href="/cadastrar">
              <Button variant="primary">Criar conta</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
        <div className="rounded-full border border-border bg-card px-4 py-1 text-xs font-medium text-muted-foreground">
          Foco em <span className="text-primary">C# e Unity</span> · gratuito
          para alunos
        </div>
        <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight md:text-6xl">
          Aprenda programação{" "}
          <span className="text-primary">jogando</span>, com correção
          automática.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Uma plataforma feita para professores que querem dar aulas práticas
          sem se afogar em correções. E para alunos que aprendem mais fazendo
          do que vendo slides.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/cadastrar">
            <Button variant="primary" className="px-6 py-3 text-base glow-primary">
              Começar agora →
            </Button>
          </Link>
          <Link href="/entrar">
            <Button variant="secondary" className="px-6 py-3 text-base">
              Já tenho conta
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
            >
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="mb-2 font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <Logo className="text-sm" />
          <span>Feito por professores, para alunos.</span>
        </div>
      </footer>
    </main>
  );
}
