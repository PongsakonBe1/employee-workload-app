import "./globals.css";
import { AuthProvider } from "../components/AuthProvider";

export const metadata = {
  title: "ICIT Workload Recorder",
  description: "Employee workload recording system for ICIT technical staff"
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
