import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import WhatsAppSupport from "@/components/WhatsAppSupport";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Quick Smart",
  description: "Digital Top-Up and Point Management System",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  // Prevent iOS Safari from zooming on input focus
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.variable} font-sans min-h-screen bg-gray-50`}>
        {children}
        <WhatsAppSupport />
      </body>
    </html>
  );
}
