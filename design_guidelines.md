# Design Guidelines: Retail Inventory & Supply Chain Management Tool

## Design Approach

**System Selection:** Modern SaaS Dashboard Pattern (inspired by Linear, Notion, Airtable)
- Reason: Information-dense productivity tool requiring clarity, efficiency, and data visualization
- Focus: Clean layouts, strong typography hierarchy, scannable data presentation

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, and 8 (p-2, m-4, gap-6, h-8, etc.)
- Tight spacing (2-4): Within components, form fields, table cells
- Medium spacing (6-8): Between sections, card padding, list items
- Consistent application across all interfaces

**Dashboard Structure:**
- Persistent sidebar navigation (240px width) with collapsible menu
- Top header bar (64px height) with search, notifications, user profile
- Main content area with max-width constraint (max-w-7xl) for optimal readability
- Grid-based dashboard with 12-column layout for widget placement

## Typography Hierarchy

**Font Selection:** 
- Primary: Inter or similar modern sans-serif via Google Fonts
- Monospace: JetBrains Mono for SKUs, codes, numerical data

**Scale:**
- H1 (Dashboard titles): text-3xl, font-bold
- H2 (Section headers): text-2xl, font-semibold  
- H3 (Card titles, widget headers): text-lg, font-semibold
- Body (Tables, descriptions): text-base, font-normal
- Small (Labels, metadata): text-sm, font-medium
- Tiny (Timestamps, helper text): text-xs

## Core Components

**Navigation:**
- Fixed sidebar with icon + label navigation items
- Active state with subtle background treatment
- Grouped sections (Inventory, Orders, Suppliers, Reports, Settings)

**Dashboard Widgets:**
- Drag-and-drop cards with header, content area, optional footer
- Metric cards: Large number display with trend indicators (↑↓)
- Chart widgets: Bar, line, pie charts using Chart.js or Recharts
- Table previews: 5-row snippets with "View all" action
- Customization controls in widget headers (settings icon)

**Data Tables:**
- Sticky header rows with sortable columns
- Alternating row treatment for scannability
- Action buttons (edit, delete) on row hover
- Pagination controls at bottom
- Bulk selection checkboxes
- Filters and search in table toolbar

**Forms & Inputs:**
- Floating labels for text inputs
- Grouped form sections with clear headings
- Inline validation messaging
- Primary/secondary button hierarchy
- Multi-step forms with progress indicator for complex operations

**Alerts & Notifications:**
- Toast notifications (top-right) for actions
- Low stock alerts with badge indicators
- Status pills for order/inventory states (In Stock, Low Stock, Out of Stock, Pending, Delivered)

**Modals & Overlays:**
- Centered modal dialogs (max-width: 600px) with backdrop blur
- Slide-out panels (360px) for quick actions and filters
- Confirmation dialogs for destructive actions

## Data Visualization

**Charts Integration:**
- Use Recharts or Chart.js for consistency
- Responsive containers that adapt to widget sizes
- Interactive tooltips on hover
- Legend positioning below charts
- Grid lines for readability

**Chart Types:**
- Line charts: Inventory trends over time
- Bar charts: Stock levels by category
- Pie/Donut charts: Supplier distribution
- Stacked bar: Order fulfillment status

## Responsive Behavior

**Desktop (lg+):** Full dashboard layout with sidebar
**Tablet (md):** Collapsible sidebar, 2-column grid for widgets
**Mobile:** Single column, hamburger menu (dashboard should be optimized for tablet+)

## Images

No hero images required. Use icons throughout for navigation and status indicators via Heroicons (outline style for navigation, solid for status badges).

## Critical UX Patterns

- Keyboard shortcuts for power users (display shortcut hints on hover)
- Breadcrumb navigation for deep pages
- Recent activity feed in sidebar footer
- Global search (⌘K) with command palette
- Export options (CSV, PDF) on reports and tables
- Auto-save indicators for dashboard customizations