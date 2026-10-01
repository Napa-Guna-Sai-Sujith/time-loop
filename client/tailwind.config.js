/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        temporal: {
          bg: "#060913",
          bgLight: "#f8fafc",
          card: "#0d1322",
          cardLightMode: "#ffffff",
          cardLight: "#141d33",
          border: "#1e2942",
          borderLight: "#e2e8f0",
          cyan: "#00f0ff",
          purple: "#9d4edd",
          red: "#ff2a5f",
          amber: "#ffb703",
          green: "#06d6a0"
        }
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace", "ui-monospace"],
        sans: ["'Space Grotesk'", "system-ui", "-apple-system", "sans-serif"]
      },
      animation: {
        "pulse-fast": "pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glitch": "glitch 0.4s ease-in-out infinite alternate",
        "warp": "warp 1.5s ease-out infinite",
        "spin-slow": "spin 8s linear infinite"
      },
      keyframes: {
        glitch: {
          "0%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 2px)" },
          "40%": { transform: "translate(-2px, -2px)" },
          "60%": { transform: "translate(2px, 2px)" },
          "80%": { transform: "translate(2px, -2px)" },
          "100%": { transform: "translate(0)" },
        },
        warp: {
          "0%": { opacity: "0.2", transform: "scale(0.95)" },
          "50%": { opacity: "0.8", transform: "scale(1.02)" },
          "100%": { opacity: "0.2", transform: "scale(0.95)" }
        }
      }
    },
  },
  plugins: [],
}
