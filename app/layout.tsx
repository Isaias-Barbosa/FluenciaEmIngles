import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fluência — seu espaço de aprendizagem",
  description: "Aprenda inglês no seu ritmo, do primeiro hello à fluência.",
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
