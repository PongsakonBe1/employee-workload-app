import { NextIntlClientProvider } from "next-intl";
import "./ui-foundation.css";
import "./globals.css";
import "./quick-liquid-pilot.css";
import "@zakisheriff/liquid-glass/styles.css";
import "./zak-button-pilot.css";
import { AuthProvider } from "../components/AuthProvider";
import FABVersionControl from "../components/FABVersionControl";
import thMessages from "../messages/th.json";
import { AppearanceProvider } from "../components/ui/AppearanceProvider";
import { ButtonMaterialProvider } from "../components/ui/ButtonMaterialProvider";
import { appearanceBootstrap } from "../lib/appearance";

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
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        {/* Send this before body parsing, including when Next streams metadata. */}
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
        <script id="ui-appearance-bootstrap" dangerouslySetInnerHTML={{ __html: appearanceBootstrap }} />
      </head>
      <body>
        <AppearanceProvider>
          <ButtonMaterialProvider>
            <NextIntlClientProvider locale="th" messages={thMessages}>
              <AuthProvider>
                {children}
                <FABVersionControl />
              </AuthProvider>
            </NextIntlClientProvider>
          </ButtonMaterialProvider>
        </AppearanceProvider>
      </body>
    </html>
  );
}
