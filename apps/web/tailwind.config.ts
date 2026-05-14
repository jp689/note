import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "../../packages/contracts/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#102134",
        paper: "#f5efe4",
        saffron: "#d87233",
        teal: "#1f6b6c",
        moss: "#7c8d48",
        mist: "#d9e5e2"
      },
      boxShadow: {
        panel: "0 24px 60px rgba(16, 33, 52, 0.14)"
      }
    }
  },
  plugins: []
};

export default config;

