import { getAvailableRamens } from "@/lib/actions/ramen";
import { KioskPageClient } from "./KioskPageClient";

export const dynamic = "force-dynamic";
export default async function KioskPage() {
  const ramens = await getAvailableRamens();

  return <KioskPageClient ramens={ramens} />;
}
