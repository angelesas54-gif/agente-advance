/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        inmoBlue: '#001f3f', // Tu azul marino InmoClik
      },
    },
  },
  plugins: [],
}

