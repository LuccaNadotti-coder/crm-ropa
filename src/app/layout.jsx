import "./globals.css";

export const metadata = {
  title: "SFIDA - INVESTOR CRM",
  description: "Clientes y cumpleaños",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
