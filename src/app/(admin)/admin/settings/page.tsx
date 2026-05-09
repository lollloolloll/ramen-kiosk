import { getKioskSettings } from "@/lib/actions/settings";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getKioskSettings();

  return (
    <div className="container px-16 py-10">
      <h1 className="text-3xl font-bold mb-4">키오스크 설정</h1>
      <SettingsClient
        initialSchoolReconfirmMode={settings.schoolReconfirmMode}
      />
    </div>
  );
}
