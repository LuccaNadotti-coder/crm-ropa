import "./globals.css";
import { ProveedorAvisos } from "@/components/Avisos";

export const metadata = {
  title: "SFIDA — Investor CRM",
  description: "Gestión de clientes, catálogos y cumpleaños de las tiendas SFIDA.",
};

export const viewport = {
  themeColor: "#22201C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <ProveedorAvisos>{children}</ProveedorAvisos>
      </body>
    </html>
  );
}
