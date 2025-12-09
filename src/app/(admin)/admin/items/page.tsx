import { ItemPageClient } from "./ItemPageClient";
import { getAllItemsForAdmin } from "@/lib/actions/item";

export const dynamic = "force-dynamic";

export default async function AdminItemPage() {
  const items = await getAllItemsForAdmin();
  return <ItemPageClient initialItems={items} />;
}
