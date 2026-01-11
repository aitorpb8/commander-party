import type { Metadata, Viewport } from "next";
import { Cinzel, EB_Garamond } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

import OnboardingModal from "@/components/OnboardingModal";
import { Toaster } from 'react-hot-toast';

const cinzel = Cinzel({ 
  subsets: ["latin"],
  variable: '--font-cinzel',
});

const ebGaramond = EB_Garamond({ 
  subsets: ["latin"],
  variable: '--font-eb-garamond',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://commander-party.web.app'),
  title: "Commander Party",
  description: "Evoluciona tu mazo con inteligencia. La liga de Commander más gamberra donde el presupuesto es limitado (10€/mes).",
  keywords: ["Magic The Gathering", "Commander", "EDH", "League", "Budget Commander"],
  authors: [{ name: "Commander Party Team" }],
  openGraph: {
    title: "Commander Party - La Liga de los 10€",
    description: "Únete a la liga de Commander más gamberra. Construye, mejora y domina la mesa con presupuesto limitado.",
    url: "https://commander-party.web.app",
    siteName: "Commander Party",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Commander Party",
    description: "10€, 100 cartas, gloria infinita.",
    images: ["/og-image.jpg"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#D4AF37",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${cinzel.variable} ${ebGaramond.variable}`}>
      <body>
        <Navbar />
        <OnboardingModal />
        <main className="container">
          {children}
        </main>
        <Toaster position="bottom-right" toastOptions={{
          style: {
            background: '#222',
            color: '#fff',
            border: '1px solid #D4AF37',
          },
          success: {
            iconTheme: {
              primary: '#D4AF37',
              secondary: '#222',
            },
          },
        }} />
      </body>
    </html>
  );
}
