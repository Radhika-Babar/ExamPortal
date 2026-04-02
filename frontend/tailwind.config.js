/** @type {import('tailwindcss').Config} */
export default {
  // Tell Tailwind which files to scan for class names
  // It only includes CSS for classes it actually finds — keeps bundle small
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      // Custom colors that match our brand
      colors: {
        primary: {
          50:  '#E6F1FB',
          100: '#B5D4F4',
          500: '#185FA5',
          600: '#0C447C',
          700: '#042C53',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}