# Kiosk Page Overrides

> **PROJECT:** UniQueue
> **Generated:** 2026-05-04 20:24:13
> **Page Type:** General

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1400px or full-width
- **Grid:** 12-column grid for data flexibility
- **Sections:** 1. Hero headline, 2. Short description, 3. Benefit bullets (3 max), 4. CTA, 5. Footer

### Spacing Overrides

- **Content Density:** High — optimize for information display

### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- **Strategy:** Minimalist: Brand + white #FFFFFF + accent. Buttons: High contrast 7:1+. Text: Black/Dark grey

### Component Overrides

- Avoid: Use arbitrary large z-index values
- Avoid: No feedback during loading
- Avoid: Override system gestures

---

## Page-Specific Components

- No unique components for this page

---

## Recommendations

- Effects: display: grid, grid-template-columns: repeat(12 1fr), gap: 1rem, mathematical ratios, clear hierarchy
- Layout: Define z-index scale system (10 20 30 50)
- Feedback: Show spinner/skeleton for operations > 300ms
- Touch: Avoid horizontal swipe on main content
- CTA Placement: Center, large CTA button
