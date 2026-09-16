import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neutral palette (not tied to Luca's personal brand)
        brand: {
          DEFAULT: "#C8102E", // brand red
          dark: "#7A0C1E",
          ink: "#1B1F2A",
        },
      },
    },
  },
  plugins: [],
};

export default config;
