const { createGlobPatternsForDependencies } = require('@nx/react/tailwind');
const { join } = require('path');
const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    join(
      __dirname,
      '{src,pages,components,app}/**/*!(*.stories|*.spec).{ts,tsx,html}',
    ),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    transitionTimingFunction: {
      'expand-out': 'cubic-bezier(0.35, 0, 0.25, 1)',
    },
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      width: {
        '4.5': '1.125rem'
      },
      height: {
        '4.5': '1.125rem',
      },
      transitionDuration: {
        1500: '1500ms',
      },
      colors: {
        // KVC Palette
        'ocean-drive-pink': '#FF69B4',
        'venice-violet': '#7000FF',
        'electric-azure': '#00F2FF',
        'midnight-ink': '#333333',
        'pure-canvas': '#FFFFFF',

        // Original theme colors - to be reviewed and potentially replaced or mapped to KVC palette
        // It's often good to keep these as CSS variables and update the variables themselves
        // For now, we'll define KVC colors and then update CSS variables in globals.css
        'light-blue': 'hsl(var(--light-blue))', // Example: map to electric-azure if appropriate
        warning: {
          DEFAULT: 'hsl(var(--warning))', // Example: map to a KVC accent or keep as is
          100: 'hsl(var(--warning-100))',
          300: 'hsl(var(--warning-300))',
        },
        border: {
          DEFAULT: 'hsl(var(--border))', // Example: map to midnight-ink or a lighter KVC shade
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))', // Example: map to midnight-ink
          foreground: 'hsl(var(--sidebar-foreground))', // Example: map to pure-canvas or electric-azure
          primary: 'hsl(var(--sidebar-primary))', // Example: map to venice-violet
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))', // Example: map to pure-canvas
          accent: 'hsl(var(--sidebar-accent))', // Example: map to ocean-drive-pink
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))', // Example: map to electric-azure
        background: 'hsl(var(--background))', // Example: map to a KVC dark shade or pure-canvas for light theme
        foreground: 'hsl(var(--foreground))', // Example: map to pure-canvas or midnight-ink
        primary: { // This is a key one to map to KVC brand
          DEFAULT: 'hsl(var(--primary))', // Will be mapped to venice-violet or ocean-drive-pink in globals.css
          foreground: 'hsl(var(--primary-foreground))', // Will be mapped to pure-canvas in globals.css
          100: 'hsl(var(--primary-100))',
          300: 'hsl(var(--primary-300))',
        },
        success: { // Consider KVC shades for these states
          DEFAULT: 'hsl(var(--success))',
          100: 'hsl(var(--success-100))',
          300: 'hsl(var(--success-300))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))', // Example: map to another KVC accent
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: { // Consider KVC shades for these states
          DEFAULT: 'hsl(var(--destructive))',
          100: 'hsl(var(--destructive-100))',
          300: 'hsl(var(--destructive-300))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: { // This could map to a KVC accent like Ocean Drive Pink or Electric Azure
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: 'calc(var(--radius) - 4px)',
        xs: 'calc(var(--radius) - 8px)',
        xss: 'calc(var(--radius) - 10px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
      },
      fontSize: {
        'xss': '0.65rem',
        '3xl': '1.75rem',
        '4xl': '2rem',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        fade: {
          '0%': {
            opacity: 0,
          },
          '100%': {
            opacity: 1,
          },
        },
        typing: {
          "0%": {
            width: "0%",
            visibility: "hidden",
          },
          "100%": {
            width: "100%",
          }
        },
        'ask-ai-background':{
         '0%': {
          backgroundPosition: '0%'
          },
          '50%': {
            backgroundPosition: '100%'
          },
          '100%': {
            backgroundPosition: '0%'
          }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        fade: 'fade 0.2s ease-out',
        typing: 'typing 0.7s steps(7) alternate',
        'typing-sm': 'typing 0.5s steps(5) alternate',
        'ask-ai-background' : 'ask-ai-background 4s ease-in-out infinite'
      },
      boxShadow: {
        'step-container': '0px 0px 22px hsl(var(--border) / 0.4)',
        'add-button': 'var(--add-button-shadow)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
