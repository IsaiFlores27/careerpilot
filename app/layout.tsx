import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CVitae — Coach de Carrera con IA",
  description:
    "Optimiza tu CV, encuentra vacantes reales y consigue entrevistas más rápido con tu coach de carrera impulsado por IA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} min-h-full bg-[#0f1117] text-white`}>
        {children}
      </body>
    </html>
  );
}
