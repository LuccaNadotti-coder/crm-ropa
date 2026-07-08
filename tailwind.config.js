/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#22201C",
        brass: "#B8925A",
        wine: "#8C3B44",
        cream: "#F4EFE4"
      }
    },
  },
  plugins: [],
}
