import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { Providers } from "@/providers/Providers";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "Sistema de Gestión Notarial",
  description: "Plataforma profesional de gestión de archivos notariales",
  icons: "/favicon.ico",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${roboto.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
