import type { Metadata } from "next";
import ClientAdmin from "./client-admin";

export const metadata: Metadata = { title: "Clientes30 · Admin JUEGUE", robots: { index: false, follow: false } };

export default function Clientes30Page() {
  return <ClientAdmin />;
}
