import Link from "next/link";

import { Constellation } from "@/components/constellation";
import { Logo } from "@/components/logo";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </header>
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-12">
        {/* Detalhes celestiais sutis atrás do cartão de acesso */}
        <Constellation className="absolute -right-8 top-10 h-40 w-80 text-primary/15" />
        <Constellation className="absolute -left-12 bottom-8 h-32 w-64 text-gold/15" />
        <div className="relative w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
