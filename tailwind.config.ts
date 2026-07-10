import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // BNI-inspired neutral palette (not tied to Luca's personal brand)
        brand: {
          DEFAULT: "#C8102E", // BNI red
          dark: "#7A0C1E",
          ink: "#1B1F2A",
        },
      },
    },
  },
  plugins: [],
};

export default config;
