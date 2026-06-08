import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Stitch Custom Theme Colors
        "tertiary-fixed": "#ffdbcd",
        "on-secondary-container": "#54647a",
        "surface": "#f7f9fb",
        "surface-bright": "#f7f9fb",
        "stitch-primary": "#004ac6", // Renamed to avoid clashing with shadcn primary
        "tertiary-container": "#bc4800",
        "outline": "#737686",
        "outline-variant": "#c3c6d7",
        "secondary-fixed": "#d3e4fe",
        "primary-container": "#2563eb",
        "tertiary": "#943700",
        "on-tertiary-container": "#ffede6",
        "secondary-fixed-dim": "#b7c8e1",
        "on-primary-fixed-variant": "#003ea8",
        "surface-dim": "#d8dadc",
        "on-tertiary-fixed-variant": "#7d2d00",
        "inverse-on-surface": "#eff1f3",
        "on-surface": "#191c1e",
        "surface-container-lowest": "#ffffff",
        "surface-variant": "#e0e3e5",
        "on-error": "#ffffff",
        "on-primary": "#ffffff",
        "primary-fixed": "#dbe1ff",
        "stitch-secondary": "#505f76", // Renamed to avoid clashing with shadcn secondary
        "on-background": "#191c1e",
        "on-surface-variant": "#434655",
        "surface-container-highest": "#e0e3e5",
        "on-secondary": "#ffffff",
        "error": "#ba1a1a",
        "on-primary-container": "#eeefff",
        "primary-fixed-dim": "#b4c5ff",
        "surface-container-low": "#f2f4f6",
        "on-tertiary": "#ffffff",
        "inverse-primary": "#b4c5ff",
        "on-primary-fixed": "#00174b",
        "stitch-background": "#f7f9fb", // Renamed to avoid clashing with shadcn background
        "on-secondary-fixed-variant": "#38485d",
        "inverse-surface": "#2d3133",
        "error-container": "#ffdad6",
        "on-secondary-fixed": "#0b1c30",
        "surface-tint": "#0053db",
        "secondary-container": "#d0e1fb",
        "surface-container-high": "#e6e8ea",
        "on-error-container": "#93000a",
        "surface-container": "#eceef0",
        "tertiary-fixed-dim": "#ffb596",
        "on-tertiary-fixed": "#360f00"
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      spacing: {
        "sm": "0.5rem",
        "base": "4px",
        "container-max": "1280px",
        "xs": "0.25rem",
        "lg": "1.5rem",
        "md": "1rem",
        "xl": "2.5rem",
        "gutter": "24px"
      },
      fontFamily: {
        "body-sm": ["Hanken Grotesk"],
        "headline-md": ["Hanken Grotesk"],
        "body-lg": ["Hanken Grotesk"],
        "headline-xl": ["Hanken Grotesk"],
        "label-md": ["Hanken Grotesk"],
        "label-sm": ["Hanken Grotesk"],
        "body-md": ["Hanken Grotesk"],
        "headline-lg": ["Hanken Grotesk"]
      },
      fontSize: {
        "body-sm": ["14px", {"lineHeight": "20px", "fontWeight": "400"}],
        "headline-md": ["20px", {"lineHeight": "28px", "fontWeight": "600"}],
        "body-lg": ["18px", {"lineHeight": "28px", "fontWeight": "400"}],
        "headline-xl": ["36px", {"lineHeight": "44px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
        "label-md": ["14px", {"lineHeight": "20px", "letterSpacing": "0.05em", "fontWeight": "600"}],
        "label-sm": ["12px", {"lineHeight": "16px", "fontWeight": "500"}],
        "body-md": ["16px", {"lineHeight": "24px", "fontWeight": "400"}],
        "headline-lg": ["28px", {"lineHeight": "36px", "letterSpacing": "-0.01em", "fontWeight": "600"}]
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
