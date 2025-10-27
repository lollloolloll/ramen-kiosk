import { db } from "@/lib/db";
import { StockPageClient } from "./StockPageClient";

export default async function AdminStockPage() {
  const itemList = await db.query.items.findMany();
  return <StockPageClient initialItems={itemList} />;
}
