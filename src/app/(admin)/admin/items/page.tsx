import { ItemPageClient } from "./ItemPageClient";
import { getAllItemsForAdmin } from "@/lib/actions/item";

export default async function AdminItemPage() {
  const items = await getAllItemsForAdmin();
  return <ItemPageClient initialItems={items} />;
}
