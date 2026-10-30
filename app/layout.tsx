import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JUEGUE Callao · Ideas para la noche",
  description: "Juegos, productos y planes para una cita ligera. Una reserva, una elección.",
  applicationName: "JUEGUE Callao",
};

export const viewport: Viewport = {
  themeColor: "#090812",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
