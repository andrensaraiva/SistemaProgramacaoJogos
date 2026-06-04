import Link from "next/link";

import { EsqueciForm } from "./_form";

export default function EsqueciSenhaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Esqueci minha senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe seu e-mail. Sua solicitação será enviada ao professor ou
          administrador responsável, que vai redefinir sua senha e te repassar
          uma senha temporária.
        </p>
      </div>
      <EsqueciForm />
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/entrar" className="font-medium text-primary hover:underline">
          Voltar ao login
        </Link>
      </p>
    </div>
  );
}
