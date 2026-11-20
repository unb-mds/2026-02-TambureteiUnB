import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tamburetei UnB - Plataforma Acadêmica",
  description: "Plataforma de informações acadêmicas da Universidade de Brasília",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {`try {
            var preference = localStorage.getItem("tamburetei-theme");
            var dark = preference === "dark" ||
              (preference !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
            document.documentElement.dataset.theme = dark ? "dark" : "light";
            document.documentElement.classList.toggle("dark", dark);
            document.documentElement.style.colorScheme = dark ? "dark" : "light";
          } catch {
            document.documentElement.dataset.theme = "light";
          }`}
        </Script>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}