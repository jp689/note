import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "../../integration/contracts/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#fff8f6",
        surface: "#fff8f6",
        "surface-bright": "#fff8f6",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#fff1eb",
        "surface-container": "#ffeae1",
        "surface-container-high": "#fee2d7",
        "surface-container-highest": "#f9ddd1",
        "surface-dim": "#f0d4c9",
        "surface-variant": "#f9ddd1",
        "on-background": "#271811",
        "on-surface": "#271811",
        "on-surface-variant": "#56423d",
        "inverse-surface": "#3d2d25",
        "inverse-on-surface": "#ffede6",
        outline: "#89726b",
        "outline-variant": "#ddc0b9",
        primary: "#9c3e21",
        "primary-container": "#bc5637",
        "primary-fixed": "#ffdbd1",
        "primary-fixed-dim": "#ffb59f",
        "on-primary": "#ffffff",
        "on-primary-container": "#fffbff",
        secondary: "#855229",
        "secondary-container": "#febb88",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#794920",
        tertiary: "#8c4a32",
        "tertiary-container": "#a96248",
        "tertiary-fixed-dim": "#ffb59c",
        "on-tertiary": "#ffffff",
        error: "#ba1a1a",
        "error-container": "#ffdad6",
        warning: "#9a6c00",
        "warning-container": "#ffdea3",
        ink: "#102134",
        paper: "#f5efe4",
        saffron: "#d87233",
        teal: "#1f6b6c",
        moss: "#7c8d48",
        mist: "#d9e5e2"
      },
      boxShadow: {
        panel: "0 24px 60px rgba(86, 66, 61, 0.12)",
        soft: "0 18px 50px rgba(156, 62, 33, 0.12)",
        lift: "0 14px 30px rgba(61, 45, 37, 0.10)"
      },
      fontFamily: {
        sans: ["Inter", "Aptos", "Segoe UI", "PingFang SC", "Microsoft YaHei", "sans-serif"]
      },
      spacing: {
        sidebar: "280px"
      }
    }
  },
  plugins: []
};

export default config;
