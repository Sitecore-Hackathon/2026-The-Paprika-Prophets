import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MarketplaceProvider } from "@/components/providers/marketplace-provider";
import { TenantProvider } from "@/components/providers/tenant-provider";
import { SiteProvider } from "@/components/providers/site-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Component Forge",
  description: "Forging Components with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MarketplaceProvider>
          <TenantProvider>
            <SiteProvider>{children}</SiteProvider>
          </TenantProvider>
        </MarketplaceProvider>
      </body>
    </html>
  );
}
