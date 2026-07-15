module.exports = {
  content: ["./index.html"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#004521",
        "app-bg": "#f5f9f6",
        "on-secondary-fixed-variant": "#00522c",
        "primary-fixed-dim": "#92d6a2",
        "on-error": "#ffffff",
        "secondary-fixed-dim": "#88d7a1",
        "primary-container": "#1b5e35",
        "surface-container-lowest": "#ffffff",
        "error-container": "#ffdad6",
        "success-green": "#166534",
        "surface": "#ebffec",
        "surface-bright": "#ebffec",
        "surface-container-high": "#daeddb",
        "on-tertiary-fixed": "#002110",
        "on-surface": "#0f1f14",
        "surface-container": "#dff3e1",
        "surface-dim": "#ccdfcd",
        "primary-fixed": "#adf2bc",
        "surface-variant": "#d4e8d6",
        "surface-container-highest": "#d4e8d6",
        "on-primary-fixed-variant": "#09522a",
        "outline-variant": "#c0c9be",
        "tertiary-fixed-dim": "#7ada9e",
        "error-red": "#991b1b",
        "surface-tint": "#296a40",
        "brand-deep": "#0d3d1e",
        "on-tertiary": "#ffffff",
        "on-surface-variant": "#404941",
        "on-secondary": "#ffffff",
        "on-primary": "#ffffff",
        "on-primary-container": "#92d5a1",
        "inverse-surface": "#243428",
        "border-muted": "#cce5d6",
        "error": "#ba1a1a",
        "on-secondary-container": "#1f7044",
        "on-secondary-fixed": "#00210f",
        "surface-container-low": "#e5f9e6",
        "inverse-primary": "#92d6a2",
        "background": "#ebffec",
        "inverse-on-surface": "#e2f6e3",
        "warning-gold": "#fbbf24",
        "secondary": "#196c40",
        "on-background": "#0f1f14",
        "secondary-fixed": "#a4f4bc",
        "outline": "#707970",
        "secondary-container": "#a1f1b9",
        "on-tertiary-fixed-variant": "#00522e",
        "on-tertiary-container": "#79d99e",
        "tertiary-container": "#005f37",
        "surface-soft": "#f0f7f2",
        "on-error-container": "#93000a",
        "tertiary": "#004526",
        "on-primary-fixed": "#00210d",
        "tertiary-fixed": "#96f7b9"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "full": "9999px"
      },
      spacing: {
        "unit": "4px",
        "md": "16px",
        "lg": "24px",
        "xs": "4px",
        "xl": "32px",
        "gutter": "16px",
        "sm": "8px",
        "margin-edge": "20px"
      },
      fontFamily: {
        "sans": ["Plus Jakarta Sans", "sans-serif"]
      },
      animation: {
        "pulse-fast": "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "progress": "progress 2s ease-in-out infinite",
        "spin-slow": "spin 8s linear infinite",
        "bounce-slow": "bounce 3s infinite"
      },
      keyframes: {
        progress: {
          "0%": { width: "0%", marginLeft: "0%" },
          "50%": { width: "50%", marginLeft: "25%" },
          "100%": { width: "0%", marginLeft: "100%" }
        }
      }
    }
  },
  plugins: [],
}
