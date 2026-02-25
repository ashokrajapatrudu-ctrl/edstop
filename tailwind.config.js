/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
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
        border: "var(--color-border)",
        input: "var(--color-input)",
        ring: "var(--color-ring)",
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          foreground: "var(--color-secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--color-destructive)",
          foreground: "var(--color-destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--color-muted)",
          foreground: "var(--color-muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--color-popover)",
          foreground: "var(--color-popover-foreground)",
        },
        card: {
          DEFAULT: "var(--color-card)",
          foreground: "var(--color-card-foreground)",
        },
        success: {
          DEFAULT: "var(--color-success)",
          foreground: "var(--color-success-foreground)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          foreground: "var(--color-warning-foreground)",
        },
        error: {
          DEFAULT: "var(--color-error)",
          foreground: "var(--color-error-foreground)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          foreground: "var(--color-surface-foreground)",
        },
        'text-primary': "var(--color-text-primary)",
        'text-secondary': "var(--color-text-secondary)",
      },
      borderRadius: {
        lg: "16px",
        md: "12px",
        sm: "8px",
        xs: "4px",
      },
      fontFamily: {
        heading: ['Space Grotesk', 'Inter', 'sans-serif'],
        body: ['Space Grotesk', 'Inter', 'sans-serif'],
        caption: ['Space Grotesk', 'Inter', 'sans-serif'],
        data: ['Space Grotesk', 'Inter', 'sans-serif'],
        code: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      boxShadow: {
        'geometric-sm': '0 2px 4px rgba(0, 0, 0, 0.3)',
        'geometric': '0 4px 8px rgba(0, 0, 0, 0.3)',
        'geometric-md': '0 8px 16px rgba(0, 0, 0, 0.4)',
        'geometric-lg': '0 16px 24px rgba(0, 0, 0, 0.5)',
        'geometric-xl': '0 24px 48px rgba(0, 0, 0, 0.6)',
        'glow-purple': '0 0 20px rgba(124, 58, 237, 0.5)',
        'glow-pink': '0 0 20px rgba(236, 72, 153, 0.5)',
        'glow-blue': '0 0 20px rgba(79, 70, 229, 0.5)',
      },
      transitionDuration: {
        '250': '250ms',
        '400': '400ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      ringWidth: {
        '3': '3px',
      },
      zIndex: {
        '100': '100',
        '200': '200',
        '300': '300',
        '400': '400',
      },
      keyframes: {
        "pulse-geometric": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-15px) rotate(5deg)" },
        },
        "float-card": {
          "0%, 100%": { transform: "translateY(0px) scale(1)" },
          "50%": { transform: "translateY(-6px) scale(1.01)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(124, 58, 237, 0.4)" },
          "50%": { boxShadow: "0 0 40px rgba(124, 58, 237, 0.8), 0 0 60px rgba(124, 58, 237, 0.4)" },
        },
        "glow-pulse-pink": {
          "0%, 100%": { boxShadow: "0 0 15px rgba(236, 72, 153, 0.3)" },
          "50%": { boxShadow: "0 0 35px rgba(236, 72, 153, 0.7), 0 0 55px rgba(236, 72, 153, 0.3)" },
        },
        "glow-pulse-green": {
          "0%, 100%": { boxShadow: "0 0 15px rgba(16, 185, 129, 0.3)" },
          "50%": { boxShadow: "0 0 35px rgba(16, 185, 129, 0.7), 0 0 55px rgba(16, 185, 129, 0.3)" },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up-sm": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "bounce-in": {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "60%": { transform: "scale(1.05)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "spin-slow": {
          "from": { transform: "rotate(0deg)" },
          "to": { transform: "rotate(360deg)" },
        },
        "ping-slow": {
          "0%": { transform: "scale(1)", opacity: "0.8" },
          "100%": { transform: "scale(2)", opacity: "0" },
        },
        "count-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "border-dance": {
          "0%, 100%": { borderColor: "rgba(124, 58, 237, 0.4)" },
          "33%": { borderColor: "rgba(236, 72, 153, 0.4)" },
          "66%": { borderColor: "rgba(79, 70, 229, 0.4)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        "orb-float": {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -30px) scale(1.05)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.95)" },
        },
      },
      animation: {
        "pulse-geometric": "pulse-geometric 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 3s ease-in-out infinite",
        "float-slow": "float-slow 6s ease-in-out infinite",
        "float-card": "float-card 4s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "glow-pulse-pink": "glow-pulse-pink 2.5s ease-in-out infinite",
        "glow-pulse-green": "glow-pulse-green 2.5s ease-in-out infinite",
        "gradient-shift": "gradient-shift 4s ease infinite",
        "gradient-x": "gradient-x 3s ease infinite",
        "slide-up": "slide-up 0.5s ease-out forwards",
        "slide-up-sm": "slide-up-sm 0.3s ease-out forwards",
        "slide-in-right": "slide-in-right 0.4s ease-out forwards",
        "slide-in-left": "slide-in-left 0.4s ease-out forwards",
        "fade-in": "fade-in 0.4s ease-out forwards",
        "bounce-in": "bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "shimmer": "shimmer 2s linear infinite",
        "spin-slow": "spin-slow 8s linear infinite",
        "ping-slow": "ping-slow 2s ease-out infinite",
        "count-up": "count-up 0.6s ease-out forwards",
        "border-dance": "border-dance 3s ease-in-out infinite",
        "scale-in": "scale-in 0.3s ease-out forwards",
        "wiggle": "wiggle 0.5s ease-in-out",
        "orb-float": "orb-float 8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}