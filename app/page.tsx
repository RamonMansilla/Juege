import HomeClient from "@/app/home-client";
import { getCatalog, getHomePromotion, isCatalogConnected } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, promotion] = await Promise.all([getCatalog(), getHomePromotion()]);
  return <HomeClient products={products} promotion={promotion} demo={!isCatalogConnected()} />;
}
