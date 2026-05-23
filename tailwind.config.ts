import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
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
        background: "rgb(var(--background) / <alpha-value>)",
        "on-background": "rgb(var(--on-background) / <alpha-value>)",
        foreground: "rgb(var(--text-primary) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--on-primary) / <alpha-value>)",
          container: "rgb(var(--primary-container) / <alpha-value>)",
          "on-container": "rgb(var(--on-primary-container) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          foreground: "rgb(var(--on-surface-variant) / <alpha-value>)",
          container: "rgb(var(--secondary-container) / <alpha-value>)",
        },
        tertiary: {
          DEFAULT: "rgb(var(--tertiary) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--surface-container-high) / <alpha-value>)",
          foreground: "rgb(var(--text-secondary) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--text-primary) / <alpha-value>)",
        },
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          container: {
            DEFAULT: "rgb(var(--surface-container) / <alpha-value>)",
            low: "rgb(var(--surface-container-low) / <alpha-value>)",
            high: "rgb(var(--surface-container-high) / <alpha-value>)",
            highest: "rgb(var(--surface-container-highest) / <alpha-value>)",
            lowest: "rgb(var(--surface-container-lowest) / <alpha-value>)",
          },
          bright: "rgb(var(--surface-bright) / <alpha-value>)",
        },
        "text-success": "rgb(var(--text-success) / <alpha-value>)",
        "on-primary-container": "rgb(var(--on-primary-container) / <alpha-value>)",
        "on-surface": "rgb(var(--text-primary) / <alpha-value>)",
        error: "rgb(var(--text-error) / <alpha-value>)",
        warning: "rgb(var(--text-warning) / <alpha-value>)",
        info: "rgb(var(--text-info) / <alpha-value>)",
        toast: {
          success: "rgb(var(--text-success) / <alpha-value>)",
          error: "rgb(var(--text-error) / <alpha-value>)",
          info: "rgb(var(--text-info) / <alpha-value>)",
        },
        success: {
          DEFAULT: "rgb(var(--text-success) / <alpha-value>)",
        },
        outline: {
          DEFAULT: "var(--outline)",
          variant: "var(--outline-variant)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        card: {
          DEFAULT: "rgb(var(--surface-container-low) / <alpha-value>)",
          foreground: "rgb(var(--text-primary) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
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
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".5" },
        },
        float: {
          "0%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
          "100%": { transform: "translateY(0px)" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-slow": "pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
