---
name: Lumina AI
colors:
  surface: '#fff8f6'
  surface-dim: '#f0d4c9'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1eb'
  surface-container: '#ffeae1'
  surface-container-high: '#fee2d7'
  surface-container-highest: '#f9ddd1'
  on-surface: '#271811'
  on-surface-variant: '#56423d'
  inverse-surface: '#3d2d25'
  inverse-on-surface: '#ffede6'
  outline: '#89726b'
  outline-variant: '#ddc0b9'
  surface-tint: '#9f4123'
  primary: '#9c3e21'
  on-primary: '#ffffff'
  primary-container: '#bc5637'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb59f'
  secondary: '#855229'
  on-secondary: '#ffffff'
  secondary-container: '#febb88'
  on-secondary-container: '#794920'
  tertiary: '#8c4a32'
  on-tertiary: '#ffffff'
  tertiary-container: '#a96248'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd1'
  primary-fixed-dim: '#ffb59f'
  on-primary-fixed: '#3a0a00'
  on-primary-fixed-variant: '#802a0e'
  secondary-fixed: '#ffdcc4'
  secondary-fixed-dim: '#fbb886'
  on-secondary-fixed: '#2f1400'
  on-secondary-fixed-variant: '#693c13'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#ffb59c'
  on-tertiary-fixed: '#380c00'
  on-tertiary-fixed-variant: '#72351f'
  background: '#fff8f6'
  on-background: '#271811'
  surface-variant: '#f9ddd1'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style

This design system is built to humanize artificial intelligence through a "Warm Professional" aesthetic. It departs from the industry-standard "cold tech" look (electric blues and neon purples) in favor of an inviting, editorial, and tactile atmosphere. The brand personality is that of a knowledgeable, calm mentor—sophisticated yet deeply approachable.

The style leverages **Minimalism** with a **Tactile** twist. We use generous whitespace and clean Inter typography to maintain professional clarity, but soften the experience through organic color palettes and soft-edged geometry. The goal is to evoke the feeling of a sun-drenched architectural studio: structured, creative, and comfortable.

## Colors

The palette is rooted in earth tones to create a sense of stability and warmth.

- **Primary (Terracotta):** Used for primary actions, key brand moments, and active states. It provides a vibrant, "sunset" energy without being aggressive.
- **Secondary (Soft Sand):** Used for accents, subtle highlights, and secondary interactive elements.
- **Surface (Cream):** The foundation of the UI. Avoid pure #FFFFFF; use a soft off-white to reduce eye strain and enhance the "cozy" feel.
- **Typography (Dark Chocolate):** Used instead of black for all body text and headings. This provides high contrast while maintaining the warm color temperature of the design system.
- **Functional Colors:** Success, Warning, and Error states should be slightly desaturated to align with the earthy palette (e.g., a sage green instead of a neon green).

## Typography

This design system relies exclusively on **Inter** to bridge the gap between technical precision and modern readability.

- **Scale:** Headings use a tight tracking (letter-spacing) to appear more intentional and "editorial."
- **Weight:** Use SemiBold (600) for UI headers and Bold (700) for large display text. Regular (400) is reserved for body copy to ensure maximum legibility against the cream backgrounds.
- **Hierarchy:** Maintain clear vertical rhythm by using the defined line heights. For long-form reading, prefer `body-lg` to lean into the "comfortable" brand pillar.

## Layout & Spacing

The layout is based on a **Fluid Grid** with a strict 8px spacing rhythm, aligning with the "Round Eight" philosophy.

- **Desktop:** 12-column grid with 24px gutters. Use large outer margins (48px+) to create a centered, focused feel that mimics a printed page.
- **Mobile:** 4-column grid with 16px margins.
- **Philosophy:** Spacing should be generous. Elements are grouped using proximity, but sections are separated by large "breathing rooms" (64px or 80px) to prevent the professional UI from feeling cluttered or overwhelming.

## Elevation & Depth

To maintain a soft and inviting feel, we avoid harsh shadows. Depth is communicated through **Tonal Layers** and **Ambient Shadows**.

- **Layers:** Most surfaces sit on a base Cream level. Secondary containers use a slightly darker "Almond" tint to sit "below" the main surface, or a pure white to sit "above."
- **Shadows:** When elevation is required (e.g., for modals or floating buttons), use extra-diffused shadows with a hint of the Primary Terracotta color in the shadow mix (e.g., a dark brown-tinted shadow rather than grey). This keeps the "warmth" consistent even in the shadows.
- **Borders:** Use thin (1px) borders in a muted earthy tone (#E5DED4) for cards to provide structure without the heaviness of a shadow.

## Shapes

The shape language is defined by the "Round Eight" principle. A consistent 8px (0.5rem) radius is the standard for almost all UI components.

- **Standard (8px):** Buttons, input fields, and small cards.
- **Large (16px):** Main content containers and large imagery.
- **Extra Large (24px):** Hero sections or prominent "callout" cards.
- **Circular:** Reserved exclusively for user avatars or icon backgrounds.

Avoid sharp corners entirely; every edge should feel smooth and safe to the touch, reinforcing the "comfortable" brand promise.

## Components

- **Buttons:** Primary buttons use the Terracotta background with white text. They should feel substantial—standard height is 48px to allow for a large tap target and clear label.
- **Input Fields:** Use a subtle cream-white background with a 1px "Dark Chocolate" border at 10% opacity. On focus, the border transitions to the Primary Terracotta.
- **Cards:** Use a "Paper" style—soft off-white backgrounds, 8px corner radius, and a very subtle 1px border. Do not use heavy shadows unless the card is interactive/draggable.
- **Chips:** Small, rounded labels using a desaturated version of the primary color (a "dusty rose") with dark chocolate text for a sophisticated, low-contrast look.
- **Lists:** Use generous vertical padding (16px+) between list items. Dividers should be soft and not span the full width of the container to keep the layout feeling open.
- **AI Specifics:** Any AI-generated content or "Lumina" insights should be housed in a container with a very subtle sunset-orange-to-cream gradient border to distinguish it from standard user data.