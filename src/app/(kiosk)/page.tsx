import { getAvailableRamens } from "@/lib/actions/ramen";
import { KioskPageClient } from "./KioskPageClient";

export default async function KioskPage() {
  const ramens = await getAvailableRamens();

  return <KioskPageClient ramens={ramens} />;
}
