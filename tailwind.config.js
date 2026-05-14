/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#05060a",
          900: "#0b0d14",
          800: "#111425",
        },
        neon: {
          cyan: "#22d3ee",
          violet: "#a78bfa",
          pink: "#f472b6",
        },
      },
      boxShadow: {
        glass: "0 10px 40px rgba(0,0,0,0.35)",
      },
      backdropBlur: {
        glass: "18px",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
