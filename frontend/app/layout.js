import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "../components/PwaRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "Nox — Debug code. Build skill. Prove it.",
  description:
    "Practice real-world debugging by fixing intentionally broken code, passing hidden tests, and building a developer profile that shows what you can actually debug.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nox",
  },
  icons: {
    icon: [
      { url: "/nox-192.png", sizes: "192x192", type: "image/png" },
      { url: "/nox-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#090909",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${inter.variable} h-full antialiased`}
      style={{ colorScheme: "dark" }}
    >
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="flex min-h-full flex-col bg-canvas font-body text-ink">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
