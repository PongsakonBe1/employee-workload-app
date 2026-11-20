import { AppShell } from "../../../components/AppShell";
import TemplateCleanup from "../../../components/TemplateCleanup";

export default function CleanupPage() {
  return (
    <AppShell>
      <h1 className="mb-5 text-3xl font-semibold tracking-tight">ตรวจเทมเพลตซ้ำ</h1>
      <TemplateCleanup />
    </AppShell>
  );
}
