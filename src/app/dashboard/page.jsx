import { redirect } from "next/navigation";

// La pantalla de cumpleaños vivía en /dashboard. Se movió a /cumpleanos, que
// dice lo que es; este redirect mantiene vivos los enlaces ya guardados.
export default function DashboardRedirect() {
  redirect("/cumpleanos");
}
