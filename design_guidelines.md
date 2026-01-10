# CONDOBASE1 Design Guidelines v2.0

## Design Approach: Material Design with Futuristic Treatment
**Rationale:** Data-intensive management application requiring clarity and efficiency, elevated with modern glassmorphism and tech-forward aesthetics for a professional yet cutting-edge experience.

**Key Principles:**
- Information clarity with visual sophistication
- Glassmorphism for depth and hierarchy
- Dark mode default with neon accent highlights
- Predictable patterns with delightful micro-interactions

---

## Color System

**Primary Gradient:** Cobalt to Indigo (#1E40AF → #4F46E5)
- Apply to primary buttons, header bars, key metrics
- Use as 45deg linear gradient

**Accent Colors:**
- Cyan: #06B6D4 (primary actions, links, active states)
- Mint: #10B981 (success, positive metrics)
- Neon highlights: Cyan with 40% opacity for borders and glows

**Dark Mode Palette:**
- Background: #0A0E27 (deep navy-black)
- Surface: #1A1F3A (elevated panels)
- Glass panels: rgba(255, 255, 255, 0.05) with backdrop-blur
- Text primary: #F8FAFC
- Text secondary: #94A3B8
- Borders: rgba(6, 182, 212, 0.2) (subtle cyan glow)

**Status Indicators:**
- Success/OK: #10B981 (mint green)
- Warning/Atenção: #F59E0B (amber)
- Error/Alerta: #EF4444 (red)
- Info: #06B6D4 (cyan)

---

## Typography

**Font Family:** Inter (all weights) via Google Fonts

**Hierarchy:**
- Page Titles: Inter Bold, text-3xl, gradient text effect
- Section Headers: Inter SemiBold, text-2xl
- Card Titles: Inter SemiBold, text-lg
- Body Text: Inter Regular, text-base
- Labels/Metadata: Inter Medium, text-sm
- Metrics/Data: Inter SemiBold, text-4xl for large numbers
- Captions: Inter Regular, text-xs, text-slate-400

---

## Layout System

**Spacing Scale:** Tailwind units: 2, 4, 6, 8, 12, 16, 20

**Container Strategy:**
- Max width: max-w-7xl
- Dashboard grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
- Card padding: p-6
- Section spacing: space-y-8
- Component gaps: gap-6

---

## Glassmorphism Effects

**Glass Card Treatment:**
- Background: rgba(255, 255, 255, 0.05)
- Backdrop blur: backdrop-blur-xl
- Border: 1px solid rgba(6, 182, 212, 0.2)
- Shadow: Subtle glow with cyan tint
- Hover state: Increase background opacity to 0.08

**Glass Panels (Modals, Sidebars):**
- Background: rgba(26, 31, 58, 0.8)
- Backdrop blur: backdrop-blur-2xl
- Border: 1px solid rgba(6, 182, 212, 0.3)
- Neon edge highlight on top border

**Layering:**
- Dashboard cards: Glass level 1
- Modal overlays: Glass level 2 (darker, more opaque)
- Tooltips/Dropdowns: Glass level 1 with stronger border

---

## Component Library

### Dashboard Metric Cards
- Glass card with gradient border on hover
- Icon with cyan glow background circle
- Large metric number with gradient text
- Trend indicator (arrow + percentage) in mint or red
- Mini sparkline chart at bottom
- Subtle scale lift on hover (scale-105)

### Data Tables
- Glass container with sticky header
- Row hover: subtle cyan glow border
- Alternating row opacity for readability
- Action icons with cyan accent on hover
- Mobile: Transform to glass cards

### Navigation Sidebar
- Fixed glass panel (w-64)
- Logo with cyan glow effect
- Module icons with active state: cyan background glow
- Hover: Subtle cyan border-left highlight
- User profile at bottom with glass divider
- Collapsible to icon-only (w-20)

### Buttons
**Primary:** Gradient background (cobalt-indigo), white text, rounded-lg, px-6 py-3, subtle glow on hover
**Secondary:** Glass background, cyan border, cyan text, same padding
**Icon Buttons:** Glass circle, p-3, cyan glow on hover
**FAB:** Gradient background, fixed bottom-right, cyan shadow glow

### Forms
- Input fields: Glass background, cyan border on focus
- Labels above inputs in cyan accent color
- File upload: Dashed cyan border glass zone
- Photo preview: Grid with glass overlay on hover
- Two-column desktop, single-column mobile
- Inline validation with animated icons

### Modal Dialogs
- Dark glass overlay backdrop
- Centered glass panel with neon top border
- Header with gradient text
- Scrollable content area
- Footer actions right-aligned
- Slide-up animation on open

### Charts & Visualizations
- Use Recharts library
- Line charts: Gradient fills (cobalt to transparent)
- Bars: Gradient from cobalt to indigo
- Grid lines: Subtle cyan at 20% opacity
- Tooltips: Glass panels
- Gauges: Neon cyan arcs for current values

### Status Badges
- Glass background with colored border
- Rounded-full, px-3 py-1, text-sm
- Subtle glow matching status color

### Notifications/Toasts
- Fixed top-right positioning
- Glass panel with colored left border
- Slide-in-right animation
- Icon with matching color glow
- Auto-dismiss after 5 seconds

---

## Micro-Interactions & Animations

**Card Interactions:**
- Hover: Translate-y-2, increase glass opacity, enhance cyan border glow
- Click: Scale-95 momentarily

**Button Interactions:**
- Hover: Increase gradient brightness, expand glow
- Active: Scale-95

**Loading States:**
- Skeleton screens with shimmer effect (cyan to transparent)
- Spinner with rotating gradient

**Success Actions:**
- Checkmark with expanding cyan ring animation
- Toast notification slide-in

**Focus States:**
- Cyan glow ring around focused elements
- Pulsing animation on required field labels

---

## Key Screen Structures

### Dashboard
- Top stats bar: 4 glass metric cards with gradients
- Module grid: 3-4 columns of glass cards with icons
- Recent activity: Glass sidebar panel
- Critical alerts: Neon-bordered glass banner

### Module Pages
- Glass breadcrumb navigation
- Primary action FAB with gradient
- Filter bar: Glass panel with icon buttons
- Stats overview: 3-4 metric cards
- Content area: Glass table or grid
- Empty states: Cyan illustration with glass container

### Maintenance Module
- Equipment grid: Glass cards with photo overlays
- Detail modal: Large glass panel with photo gallery
- Timeline: Vertical glass cards with connecting cyan lines

### Pool Quality Module
- Gauge dashboard: Large glass gauges with neon arcs
- Photo capture: Glass camera interface
- Historical chart: Glass container with gradient area chart

---

## Responsive Behavior
- Desktop (lg+): Full sidebar, multi-column grids
- Tablet (md): Collapsible sidebar, 2-column grids
- Mobile: Bottom nav with glass background, single column, card-based tables

---

## Images
No hero images - utility application. Images used for:
- Equipment thumbnails in glass cards
- Pool verification photos with glass overlay
- Gas meter photos
- Document icons/previews
- User avatars with cyan border rings
- Empty state illustrations (line art with cyan accent)