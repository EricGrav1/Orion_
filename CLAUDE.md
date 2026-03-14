# Orion - Project Guidelines

## Design System: Space Theme

Every page in Orion MUST use the consistent space/cosmos theme. No page should use plain gray/white backgrounds or generic Tailwind utility styling for layout. All pages share the same visual language.

### Core Visual Elements (required on every page)

1. **Animated star field** - 180 stars with twinkle animation, positioned randomly with CSS custom properties (`--x`, `--y`, `--size`, `--duration`, `--delay`)
2. **Nebula background** - Multi-layered radial gradients (crimson, blue, cyan, purple) with slow drift animation
3. **Sun element** - Visible only in light mode, with radial glow and rotating conic-gradient rays
4. **Dark/light theme toggle** - Every page supports both themes via a CSS class on the root element (`dark` default, `light` variant)
5. **Mount animations** - Content fades in and slides up on page load using a `mounted` state

### Fonts

- **Display font**: `'Cormorant Garamond', Georgia, serif` - Used for headings, titles, logo text
- **Body font**: `'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif` - Used for body text, buttons, inputs
- Import: `https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,400;1,500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap`

### CSS Custom Properties

#### Dark theme (default)
```css
--bg-primary: #0B0D1A;
--bg-secondary: rgba(15, 18, 35, 0.85);
--bg-card: rgba(20, 24, 45, 0.75);
--border-color: rgba(255, 255, 255, 0.08);
--border-active: rgba(255, 255, 255, 0.25);
--text-primary: #FAFAFA;
--text-secondary: rgba(255, 255, 255, 0.6);
--text-muted: rgba(255, 255, 255, 0.4);
--accent: #D4A84B;
--accent-hover: #C49A3D;
--star-blue: #B4D4FF;
```

#### Light theme
```css
--bg-primary: #E8F0F8;
--bg-secondary: rgba(255, 255, 255, 0.9);
--bg-card: rgba(255, 255, 255, 0.85);
--border-color: rgba(0, 0, 0, 0.08);
--border-active: rgba(0, 0, 0, 0.2);
--text-primary: #1A1A2E;
--text-secondary: rgba(26, 26, 46, 0.7);
--text-muted: rgba(26, 26, 46, 0.5);
--accent: #B8942F;
--accent-hover: #A8841F;
background: linear-gradient(180deg, #D4E5F7 0%, #E8F0F8 30%, #F5F8FC 100%);
```

### Navigation

Fixed top nav with three sections:
- **Left**: ORION logo (constellation SVG of Orion's stars + "ORION" text in display font with letter-spacing 0.25em)
- **Center**: Page links (About, Pricing, Login/Dashboard) - hidden on mobile
- **Right**: Theme toggle button (sun/moon icon) + current time display - time hidden on mobile

### Card Style

Cards use glassmorphism: `backdrop-filter: blur(20px)` with semi-transparent backgrounds (`var(--bg-card)`), subtle borders (`var(--border-color)`), and rounded corners (12-20px).

### Accent Color

Gold: `#D4A84B` (dark) / `#B8942F` (light). Used for the logo icon, active states, CTA buttons, links, and decorative elements.

### Styling Approach

Each page uses inline `<style>` tags with scoped CSS classes (e.g., `.auth-page`, `.about-page`, `.pricing-page`). CSS custom properties are defined on the page root element. This is the established pattern - follow it for new pages.

## Tech Stack

- React + TypeScript + Vite
- Supabase (auth + database)
- React Router (BrowserRouter)
- Tailwind CSS (available but the space theme uses custom CSS via inline `<style>` tags)
- lucide-react for icons

## Authentication

- Supabase Auth with email/password and Google OAuth
- Google OAuth callback URL: `https://czhrljzmlnbeefxpxcje.supabase.co/auth/v1/callback`
- Protected routes redirect to `/auth` when not authenticated
- Auth route redirects to `/` (dashboard) when already authenticated
