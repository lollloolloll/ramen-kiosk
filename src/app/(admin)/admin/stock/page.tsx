import { db } from "@/lib/db";
import { StockPageClient } from "./StockPageClient";

export default async function AdminStockPage() {
  const ramenList = await db.query.ramens.findMany();
  return <StockPageClient initialRamens={ramenList} />;
}

