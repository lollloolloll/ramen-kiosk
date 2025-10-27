import { getItems } from "@/lib/actions/item";
import { KioskPageClient } from "./KioskPageClient";

export const dynamic = "force-dynamic";
export default async function KioskPage() {
  const items = await getItems();

  return <KioskPageClient items={items} />;
}
