import { getAvailableItems } from "@/lib/actions/item";
import { KioskPageClient } from "./KioskPageClient";

export const dynamic = "force-dynamic";
export default async function KioskPage() {
  const items = await getAvailableItems();

  return <KioskPageClient items={items} />;
}
