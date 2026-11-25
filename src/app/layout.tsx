import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/silkscreen/400.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";
import Providers from "@/components/Providers";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: "Xarme Collective",
  description: "Mine social attention from viral X posts.",
};
export const viewport: Viewport = { themeColor: "#1b1311", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
