// app/kiosk/page.tsx
import { getAllItems } from "@/lib/actions/item";
import { getConsentFile } from "@/lib/actions/consent"; // 새로 만들 액션
import { getKioskSettings } from "@/lib/actions/settings";
import { KioskPageClient } from "./KioskPageClient";

export const dynamic = "force-dynamic";

export default async function KioskPage() {
  const [items, consentFile, settings] = await Promise.all([
    getAllItems(),
    getConsentFile(),
    getKioskSettings(),
  ]);

  return (
    <KioskPageClient
      items={items}
      consentFile={consentFile}
      schoolReconfirmMode={settings.schoolReconfirmMode}
    />
  );
}
