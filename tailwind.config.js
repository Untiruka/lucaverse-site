/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}", // ← App Router構成の全ページを対象に
    "./public/**/*.html",         // もし直接HTMLもあるなら
  ],
  theme: {
    extend: {
      fontFamily: {
        yusei: ['var(--font-yusei)', 'sans-serif'],
        hepta: ['var(--font-hepta)', 'serif'],
        geist: ['var(--font-geist-sans)', 'sans-serif'],
        geistmono: ['var(--font-geist-mono)', 'monospace'],
                conti: ['var(--font-conti)', 'monospace'],

      },
    },
  },
  plugins: [],
}