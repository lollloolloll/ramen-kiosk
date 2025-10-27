import { db } from "@/lib/db";
import { ItemPageClient } from "./ItemPageClient";

export default async function AdminItemPage() {
  const itemList = await db.query.items.findMany();
  return <ItemPageClient initialItems={itemList} />;
}
