import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-raised": "var(--color-surface-raised)",
        border: "var(--color-border)",
        "border-input": "var(--color-border-input)",
        text: "var(--color-text)",
        muted: "var(--color-text-muted)",
        accent: "var(--color-accent)",
        "on-accent": "var(--color-on-accent)",
        danger: "var(--color-danger)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        focus: "var(--color-focus)",
      },
      fontFamily: { sans: ["var(--font-sans)"], mono: ["var(--font-mono)"] },
      fontSize: {
        xs: ["var(--text-xs)", "var(--line-xs)"],
        sm: ["var(--text-sm)", "var(--line-sm)"],
        base: ["var(--text-base)", "var(--line-base)"],
        lg: ["var(--text-lg)", "var(--line-lg)"],
        xl: ["var(--text-xl)", "var(--line-xl)"],
        display: ["var(--text-display)", "var(--line-display)"],
      },
      spacing: {
        0: "var(--space-0)", 1: "var(--space-1)", 2: "var(--space-2)",
        3: "var(--space-3)", 4: "var(--space-4)", 6: "var(--space-6)",
        8: "var(--space-8)", 12: "var(--space-12)", 16: "var(--space-16)",
      },
      borderRadius: {
        sm: "var(--radius-sm)", md: "var(--radius-md)",
        lg: "var(--radius-lg)", full: "var(--radius-pill)",
      },
      boxShadow: { card: "var(--shadow-card)", pop: "var(--shadow-pop)" },
      transitionDuration: { fast: "var(--motion-fast)", base: "var(--motion-base)" },
      transitionTimingFunction: { standard: "var(--motion-ease)" },
      maxWidth: { content: "var(--layout-content-max)" },
    },
  },
  plugins: [],
} satisfies Config;
