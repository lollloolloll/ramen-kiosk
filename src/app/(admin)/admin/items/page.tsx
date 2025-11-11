import { ItemPageClient } from "./ItemPageClient";
import { getAllItems } from "@/lib/actions/item";

export default async function AdminItemPage() {
  const itemList = await getAllItems();
  return <ItemPageClient initialItems={itemList} />;
}
