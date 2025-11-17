# AI MagicBox Platform - Design Preservation Guidelines

## Design Approach
**Constraint**: Preserve all existing frontend layout and UI design from Google AI Studio export without modifications. These guidelines document the expected design system to maintain consistency during backend integration.

## Design System Foundation
**Selected System**: ShadCN UI component library (Tailwind CSS-based)
**Rationale**: Project uses ShadCN components with Tailwind CSS - maintain existing component structure and styling

## Core Design Elements

### A. Color Palette
**Dark Mode Primary** (preserve existing):
- Background: 222 47% 11%
- Card/Surface: 217 33% 17%
- Border: 217 33% 27%
- Text Primary: 210 40% 98%
- Text Secondary: 215 20% 65%
- Accent: Match existing brand color from export

**Light Mode** (if implemented):
- Background: 0 0% 100%
- Card/Surface: 0 0% 98%
- Border: 214 32% 91%

### B. Typography
**Font Stack**: Default ShadCN system fonts
- Headings: font-semibold to font-bold
- Body: font-normal (text-sm to text-base)
- Labels: text-sm font-medium
- Metrics/Stats: text-2xl to text-4xl font-bold

### C. Layout System
**Spacing Primitives**: Tailwind units 2, 4, 6, 8, 12, 16
- Component padding: p-4 to p-6
- Section spacing: space-y-6 to space-y-8
- Card gaps: gap-4
- Page margins: Standard ShadCN container patterns

**Grid Systems**:
- Dashboard: 3-column grid (lg:grid-cols-3) for project cards
- Project tools: 2-column split for controls and preview
- Settings: Single column max-w-4xl

### D. Component Library

**Navigation**:
- Sidebar navigation with active state indicators
- Breadcrumb navigation for deep pages
- Top bar with user profile and notifications

**Dashboard Cards**:
- Elevated cards with hover states
- Project thumbnails with overlay actions
- Quick stats with icons from Lucide

**Project Workspace**:
- Split-panel layout: controls left, preview right
- Tabbed interface for different generation modes
- Action buttons with icon + label

**Forms & Inputs**:
- ShadCN Input, Select, Textarea components
- Form sections with clear labels
- Inline validation states

**Data Display**:
- Recharts integration for usage metrics
- Table views for project history
- Gallery grid for generated visuals

**Modals & Overlays**:
- ShadCN Dialog for settings
- Toast notifications for API responses
- Loading states with skeleton screens

### E. Page-Specific Patterns

**Dashboard**:
- Welcome header with user stats
- Grid of recent projects (3 columns)
- Quick action buttons (New Project, View Templates)
- Usage summary cards

**Project Page**:
- Tool selector sidebar
- Large canvas/preview area
- Generation controls panel
- Export and save options

**Fusion Visual Generator**:
- Upload zone for product photos
- Background style selector
- Real-time preview
- Download generated fusion visual

**Settings**:
- Tabbed sections (API, Account, Preferences)
- API key input with masked display
- Usage metrics visualization
- Save confirmation feedback

**Subscription**:
- Plan comparison cards
- Payment form integration (credit card)
- SuperRate API integration mention
- Current plan status display

## Critical Constraints

1. **No Layout Modifications**: Maintain exact component positioning from export
2. **Preserve Navigation Flow**: Dashboard → Project Page → Customize → My Projects
3. **Keep Existing Components**: Do not replace ShadCN components
4. **Maintain Animations**: Preserve Framer Motion interactions if present
5. **Consistent Icon Set**: Use only Lucide icons throughout

## Images & Visual Assets

**Hero/Featured Images**: NOT APPLICABLE (utility-focused creative tool)

**Product Images**:
- User-uploaded product photos in Fusion Generator
- Generated visual outputs in gallery grid
- Project thumbnails on Dashboard

**Background Patterns**: Maintain any existing subtle patterns or gradients in cards/sections

## Functionality-First Design
This is a utility tool - prioritize:
- Clear workflow progression
- Responsive preview areas
- Accessible form controls
- Fast feedback on AI generation status