import { ItemPageClient } from "./ItemPageClient";
import { getAllItemsForAdmin } from "@/lib/actions/item";
import { processAndMutateExpiredRentals } from "@/lib/actions/rental";
export const dynamic = "force-dynamic";

export default async function AdminItemPage() {
  await processAndMutateExpiredRentals();
  const items = await getAllItemsForAdmin();
  return <ItemPageClient initialItems={items} />;
}
