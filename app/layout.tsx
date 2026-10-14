import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fluência em Inglês | Do zero ao avançado",
  description: "Aprenda inglês no seu ritmo, descubra seu nível e comece sua jornada de aprendizagem.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
