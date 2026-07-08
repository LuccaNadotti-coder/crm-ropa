import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F3F1EC] p-6">
      <div className="bg-white p-10 rounded-2xl shadow-md text-center max-w-md w-full">
        <h1 className="text-3xl font-bold mb-2 text-ink">CRM Empresa de Ropa</h1>
        <p className="mb-8 text-gray-500">Clientes, cumpleaños y seguimiento comercial.</p>

        <div className="flex flex-col gap-3">
          <Link
            href="/clientes"
            className="bg-ink text-white px-5 py-3 rounded-xl font-medium hover:opacity-90"
          >
            Registrar / ver clientes
          </Link>

          <Link
            href="/dashboard"
            className="bg-wine text-white px-5 py-3 rounded-xl font-medium hover:opacity-90"
          >
            Ver cumpleaños
          </Link>
        </div>
      </div>
    </main>
  );
}
