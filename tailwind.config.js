/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
    // src/lib también: colorAvatar() en formato.js devuelve nombres de clase.
    // Sin esta línea Tailwind no los ve y esos avatares salen transparentes.
    "./src/lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta SFIDA
        ink: {
          DEFAULT: "#22201C",
          soft: "#3A362F",
          mute: "#6B6459",
          faint: "#9A9184",
        },
        brass: {
          DEFAULT: "#B8925A",   // decorativo; 2.88:1 sobre blanco, no usar como relleno de dato
          dark: "#9A7943",      // 4.05:1 — barras de gráfico
          deep: "#8A6A38",      // 5.00:1 — fondo con texto blanco encima
          soft: "#E8DCC6",
        },
        wine: {
          DEFAULT: "#8C3B44",
          dark: "#6F2C34",
          soft: "#F0DCDE",
        },
        cream: "#F4EFE4",
        arena: "#F3F1EC",
        borde: "#E3DED2",
        exito: { DEFAULT: "#2F6B4F", soft: "#DDEDE3" },
        alerta: { DEFAULT: "#8A6314", soft: "#F7ECD2" },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI",
          "Roboto", "Helvetica Neue", "Arial", "sans-serif",
        ],
      },
      boxShadow: {
        carta: "0 1px 2px rgba(34,32,28,.04), 0 4px 16px rgba(34,32,28,.06)",
        alta: "0 12px 40px rgba(34,32,28,.16)",
      },
      borderRadius: {
        xl2: "14px",
      },
      keyframes: {
        aparecer: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        entrarPanel: {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        brillo: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        aparecer: "aparecer .18s ease-out",
        entrarPanel: "entrarPanel .22s cubic-bezier(.22,.8,.3,1)",
      },
    },
  },
  plugins: [],
}
