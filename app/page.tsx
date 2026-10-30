import HomeClient from "@/app/home-client";
import { getCatalog, getHomePromotion, getProfiles, isCatalogConnected } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, promotion, profiles] = await Promise.all([getCatalog(), getHomePromotion(), getProfiles()]);
  return <HomeClient products={products} promotion={promotion} profiles={profiles} demo={!isCatalogConnected()} />;
}
