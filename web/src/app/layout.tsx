import type { Metadata } from "next";
import { Inter, Sora, Cormorant_Garamond, Geist_Mono } from "next/font/google";
import "./globals.css";

// Aurora Minimal — Inter na UI, Sora em títulos/números, Cormorant Garamond na
// marca "Celeste Academy", Geist Mono no código.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema Jogos Programação",
  description:
    "Plataforma gamificada para aprender programação com C# e Unity. Exercícios práticos, duelos X1, ranking e correção automática.",
};

// Aplica o tema (.dark) ANTES da hidratação para evitar flash. Lê a preferência
// salva; se não houver, segue o sistema operacional.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${sora.variable} ${cormorant.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
