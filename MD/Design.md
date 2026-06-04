---
name: Vibrant Velocity
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#454555'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#767587'
  outline-variant: '#c6c4d8'
  surface-tint: '#4547e1'
  primary: '#4244df'
  on-primary: '#ffffff'
  primary-container: '#5d61f9'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#4454bb'
  on-secondary: '#ffffff'
  secondary-container: '#8393fe'
  on-secondary-container: '#0f238e'
  tertiary: '#5d548d'
  on-tertiary: '#ffffff'
  tertiary-container: '#766da8'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#05006c'
  on-primary-fixed-variant: '#2928ca'
  secondary-fixed: '#dfe0ff'
  secondary-fixed-dim: '#bbc3ff'
  on-secondary-fixed: '#000e5f'
  on-secondary-fixed-variant: '#2a3ba2'
  tertiary-fixed: '#e6deff'
  tertiary-fixed-dim: '#c9beff'
  on-tertiary-fixed: '#1c1148'
  on-tertiary-fixed-variant: '#483f77'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 42px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style
The design system is engineered to evoke a sense of effortless intelligence and high-tech energy. It caters to a tech-savvy audience that values efficiency and modern aesthetics. 

The style blends **Modern Corporate** precision with a **Glassmorphic** edge. It utilizes a sophisticated hierarchy of translucent surfaces and vibrant color accents to create an interface that feels both "fast" and "approachable." The visual narrative focuses on smoothness, with subtle motion cues and high-quality typography ensuring the AI-driven experience feels premium and responsive.

## Colors
This design system utilizes a high-energy palette centered around **Vibrant Indigo**. 

- **Primary (#6367FF):** Used for core actions, active states, and brand-defining elements.
- **Secondary (#8494FF):** Softens the interface, used for secondary buttons and supportive iconography.
- **Tertiary (#C9BEFF):** Employed for decorative elements, subtle backgrounds, and grouping containers.
- **Surface/Highlight (#FFDBFD):** A soft pink-lavender used sparingly for "magic" moments, AI insights, and soft background glows to break up monochromatic sections.
- **Neutral:** A deep navy-tinted slate is used for text to maintain a high-tech feel without the harshness of pure black.

## Typography
**Geist** is the sole typeface, chosen for its technical precision and readability in data-rich environments. 

Headlines utilize tighter letter spacing and heavier weights to anchor the page. Body text maintains generous line heights to ensure the "Lazy" philosophy of effortless reading is upheld. Labels use medium to semi-bold weights to ensure functional clarity at smaller sizes.

## Layout & Spacing
The layout follows a **Fluid Grid** model with high-margin breathing room. 

- **Desktop:** 12-column grid with a 24px gutter. Maximum content width of 1280px.
- **Tablet:** 8-column grid with a 24px gutter.
- **Mobile:** 4-column grid with a 16px gutter.

Spacing follows an 8px base unit. Vertical rhythm should be generous, specifically between major sections (using `xl` or `lg` units) to maintain the clean, tech-forward aesthetic.

## Elevation & Depth
Depth is achieved through **Tonal Layers** combined with **Glassmorphism**. 

- **Level 0 (Base):** Solid neutral-light gray or white background.
- **Level 1 (Cards/Containers):** White background with a 1px border in Tertiary (#C9BEFF) at 30% opacity.
- **Level 2 (Modals/Overlays):** Background blur (20px) with a semi-transparent white fill (80%) and a soft, wide-spread shadow tinted with Primary (#6367FF) at 5% opacity.
- **Floating Elements:** Use a distinct shadow with 15% opacity and a 32px blur to signify priority and interaction.

## Shapes
A consistent **Rounded (8px)** radius is applied to all interactive elements to balance technical precision with approachability.

- **Standard Buttons/Inputs:** 8px (base).
- **Cards/Large Modules:** 16px (rounded-lg).
- **Feature Highlights/Sections:** 24px (rounded-xl).
- **Badges/Chips:** Full pill-shape.

## Components

- **Buttons:** 
  - *Primary:* Solid #6367FF with white text. Subtle scale-down effect on press (98%).
  - *Ghost:* Transparent with #6367FF border and text.
- **Input Fields:** 
  - Background: #F8FAFF. 
  - Border: 1px solid #C9BEFF. 
  - Focus State: 2px solid #6367FF with a soft lavender outer glow.
- **Chips:**
  - Soft background using 10% opacity of the Tertiary color with high-contrast Indigo text.
- **Cards:**
  - Minimalist style. No heavy shadows; use thin, colored borders (#C9BEFF at 20%) to define boundaries.
- **AI Indicator:**
  - A subtle gradient sweep across the top of components or text inputs using a Primary-to-Surface (#6367FF to #FFDBFD) transition to indicate active AI processing.