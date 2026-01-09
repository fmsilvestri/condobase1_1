# CONDOBASE1 Design Guidelines

## Design Approach: Material Design System
**Rationale:** This is a data-intensive management application requiring clarity, efficiency, and familiar patterns for both administrators and residents. Material Design provides excellent components for dashboards, data visualization, and form-heavy interfaces.

**Key Principles:**
- Information clarity over decoration
- Predictable interaction patterns
- Mobile-first responsive design
- Clear visual hierarchy for dual user roles (Admin vs Resident)

---

## Typography

**Font Family:** Inter (primary), Roboto (fallback) via Google Fonts
- **Headings:** Inter Bold - Page titles (text-3xl), Section headers (text-2xl), Card titles (text-lg)
- **Body:** Inter Regular (text-base) for content, Inter Medium (text-sm) for labels
- **Data/Numbers:** Inter SemiBold for metrics and statistics
- **Captions:** Inter Regular (text-xs) for timestamps, metadata

---

## Layout System

**Spacing Scale:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 20 consistently
- Card padding: p-6
- Section spacing: space-y-6 to space-y-8
- Component gaps: gap-4
- Dashboard grid gaps: gap-6

**Container Strategy:**
- Max width: max-w-7xl for main content
- Dashboard grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
- Two-column layouts for forms: grid-cols-1 lg:grid-cols-2

---

## Component Library

### Dashboard Cards
- Elevated cards with subtle shadow (shadow-md)
- Header with icon + title + status indicator
- Metric display area with large numbers
- Mini chart/graph area where applicable
- Quick action button in footer
- Status badges (OK/Atenção/Alerta) in top-right corner

### Module Layout Pattern
**Standard Module Structure:**
1. Module header: breadcrumb navigation, title, primary action button
2. Filter/search bar (if applicable)
3. Stats overview: 3-4 metric cards in a row
4. Main content area: table, grid, or detail view
5. Action buttons: floating action button for primary actions

### Data Tables
- Sticky header row
- Alternating row backgrounds for readability
- Action icons column (edit, delete, view details)
- Sort indicators on column headers
- Pagination controls at bottom
- Mobile: Cards instead of tables

### Forms
- Two-column layout on desktop, single column on mobile
- Label above input fields
- Input groups with icons (left-aligned)
- File upload with drag-drop zone
- Photo preview thumbnails in grid
- Form section dividers with headings
- Action buttons: right-aligned, primary + secondary

### Status Indicators
- Visual badges: rounded-full px-3 py-1 text-sm
- Icon + text combinations
- Progress bars for percentages (pool readings, gas levels)
- Traffic light indicators (green/yellow/red) for alerts

### Charts & Visualizations
- Line charts for historical data (pool readings, water levels)
- Gauge charts for current levels (gas, water reserves)
- Bar charts for comparisons (consumption by unit)
- Donut charts for occupancy statistics
- Use Recharts or Chart.js libraries

### Navigation
**Desktop Sidebar:**
- Fixed left sidebar (w-64)
- Logo at top
- Module icons + labels
- Collapsible to icon-only mode
- User profile section at bottom

**Mobile:**
- Bottom navigation bar with 5 primary modules
- Hamburger menu for overflow items
- Top app bar with title + actions

### Action Buttons
- Primary actions: rounded-lg px-6 py-3
- Secondary actions: outlined style
- Icon buttons: rounded-full p-2
- Floating Action Button (FAB) for "New" actions
- WhatsApp integration buttons with WhatsApp green accent

### Modal Dialogs
- Centered overlay with backdrop
- Header with title + close button
- Scrollable content area
- Footer with action buttons (right-aligned)
- Max width: max-w-2xl for forms, max-w-4xl for image galleries

### Image Galleries
- Grid layout: grid-cols-2 md:grid-cols-3 lg:grid-cols-4
- Square aspect ratio thumbnails
- Lightbox on click with navigation
- Upload button as first item in grid

### Notifications
- Toast notifications: fixed top-right
- Slide-in animation
- Auto-dismiss after 5 seconds
- Icon + message + close button
- Types: success, warning, error, info

---

## Key Screens Structure

### Dashboard (Landing)
- Welcome header with user name + role badge
- Critical alerts section (if any)
- Module cards grid (3-4 columns)
- Recent activity feed sidebar
- Quick stats bar at top

### Maintenance Module
- Equipment catalog: card grid with photos
- "New Maintenance Request" FAB
- Active requests table with status
- Filter by equipment type, status, date
- Detail view: timeline of updates + photo gallery

### Pool Quality Module
- Current readings dashboard with gauges
- Photo capture interface
- Historical chart (7-day, 30-day views)
- Status indicators for each parameter

### Documents Module
- Document cards with icons by type
- Expiration date badges
- Upload area prominent
- Preview on hover/click

---

## Responsive Behavior
- Desktop (lg+): Full sidebar + multi-column layouts
- Tablet (md): Collapsible sidebar + 2-column grids
- Mobile: Bottom nav + single column + cards for tables

---

## Micro-interactions
- Card hover: subtle lift (translate-y-1)
- Button press: scale-95
- Loading states: skeleton screens
- Form validation: inline error messages
- Success actions: checkmark animation

---

## Images
No hero image - this is a utility application. Images used for:
- Equipment photos in maintenance cards
- Pool reading verification photos
- Gas meter photos
- Document thumbnails
- User avatars
- Empty state illustrations for modules with no data