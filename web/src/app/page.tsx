import { redirect } from "next/navigation";

// A tela inicial da Celeste Academy é o login. Não há mais landing de cadastro
// aberto — identidades vêm de admin (professores) e professor (alunos).
export default function Home() {
  redirect("/entrar");
}
