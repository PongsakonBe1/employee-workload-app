import { NextIntlClientProvider } from "next-intl";
import "./globals.css";
import { AuthProvider } from "../components/AuthProvider";
import FABVersionControl from "../components/FABVersionControl";
import thMessages from "../messages/th.json";

export const metadata = {
  title: "labboy Workload Recorder",
  description: "Employee workload recording system for labboy technical staff",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/labboy-logo.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    shortcut: "/labboy-logo.png",
    apple: "/labboy-logo.png",
    other: {
      rel: "apple-touch-icon",
      url: "/labboy-logo.png",
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Workload",
    startupImage: "/labboy-logo.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <NextIntlClientProvider locale="th" messages={thMessages}>
          <AuthProvider>
            {children}
            <FABVersionControl />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
