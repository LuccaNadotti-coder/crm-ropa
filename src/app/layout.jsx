import "./globals.css";

export const metadata = {
  title: "CRM Ropa",
  description: "Clientes y cumpleaños",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
