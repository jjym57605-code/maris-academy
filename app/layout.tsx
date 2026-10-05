import type { Metadata, Viewport } from "next";
import { Tajawal, Space_Grotesk } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-tajawal",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "MARIS ACADEMY ²⁰²⁷ — منصة بكالوريا 2027",
    template: "%s | MARIS ACADEMY ²⁰²⁷",
  },
  description:
    "منصة تعليمية متكاملة لمساعدة تلاميذ بكالوريا 2027 على تنظيم دراستهم، متابعة تقدمهم، والتعلم بطريقة تفاعلية.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#020b18",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${tajawal.variable} ${grotesk.variable}`}>
        {children}
      </body>
    </html>
  );
}
