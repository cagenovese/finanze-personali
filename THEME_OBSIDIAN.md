# Obsidian — Design Theme

Personal finance app theme. Dark-first, data-forward, terminal-inspired.

---

## Philosophy

Every number should feel like it's glowing. Inspired by trading terminals and code editors: deep dark surfaces, luminous text, minimal chrome. The UI disappears — only the data remains.

Reduce financial anxiety through contrast and calm: nothing blinks, nothing pulses. Information is always readable at a glance.

---

## Color Palette

### Backgrounds (layered depth)

| Token         | Hex       | Usage                                      |
|---------------|-----------|--------------------------------------------|
| `bg-base`     | `#0E0F13` | App background, bottom layer               |
| `bg-surface`  | `#14151A` | Cards, panels, bottom sheets               |
| `bg-elevated` | `#1E2130` | Modals, dropdowns, hover states            |
| `bg-overlay`  | `#252840` | Tooltips, popovers                         |

### Accent — Blue-Violet

| Token            | Hex       | Usage                                    |
|------------------|-----------|------------------------------------------|
| `accent-dim`     | `#3A3F68` | Inactive tabs, disabled states           |
| `accent-mid`     | `#5B62A8` | Borders, dividers, secondary actions     |
| `accent-base`    | `#7C85D0` | Primary CTAs, selected states, links     |
| `accent-bright`  | `#A8B0E8` | Hover on accent elements                 |

### Semantic Colors

| Token             | Hex       | Usage                          |
|-------------------|-----------|--------------------------------|
| `positive`        | `#4ADE80` | Gains, positive delta, success |
| `negative`        | `#F87171` | Losses, overspending, errors   |
| `warning`         | `#FBBF24` | Budget alerts, cautions        |
| `neutral`         | `#5A5F70` | Labels, metadata, placeholders |

### Text

| Token            | Hex       | Usage                                        |
|------------------|-----------|----------------------------------------------|
| `text-primary`   | `#F0F0F2` | Main values, headings, active labels         |
| `text-secondary` | `#A0A5B8` | Subtitles, supporting info                   |
| `text-muted`     | `#5A5F70` | Timestamps, metadata, disabled text          |
| `text-accent`    | `#7C85D0` | Interactive text, links                      |

---

## Typography

### Font Stack

```
Numbers / amounts:  "JetBrains Mono", "Fira Code", monospace
UI labels:          "Inter", system-ui, sans-serif
```

Monospace for all numeric values is non-negotiable — it gives figures a terminal quality and ensures digit alignment in tables and lists.

### Scale

| Role              | Font             | Size  | Weight | Letter-spacing |
|-------------------|------------------|-------|--------|----------------|
| Large amount      | JetBrains Mono   | 32px  | 500    | -0.02em        |
| Medium amount     | JetBrains Mono   | 22px  | 500    | -0.01em        |
| Small amount      | JetBrains Mono   | 15px  | 400    | 0              |
| Section heading   | Inter            | 13px  | 500    | 0.08em (caps)  |
| Body / label      | Inter            | 14px  | 400    | 0              |
| Caption / meta    | Inter            | 12px  | 400    | 0              |

Section headings are always **uppercase + spaced** (`letter-spacing: 0.08em`). This creates clear hierarchy without using large font sizes.

---

## Spacing & Layout

```
Base unit: 4px
Component padding: 16px (mobile), 20px (desktop)
Card gap: 12px
Section gap: 24px
Border radius — cards: 12px
Border radius — buttons/pills: 8px
Border radius — small chips: 6px
```

Layout is always **single-column on mobile**, two-column max on tablet. No sidebars. Navigation lives at the bottom (mobile) or left rail (desktop).

---

## Components

### Amount Display

Large monetary values always show currency symbol in `text-muted`, the integer in `text-primary`, and cents in `text-secondary`. Delta below in `positive` or `negative`.

```
€ 24.830 ,00
↑ +3,2% questo mese
```

### Cards

```
background:    bg-surface (#14151A)
border:        1px solid #1E2130
border-radius: 12px
padding:       16px
```

No drop shadows. Depth is achieved through background layering only.

### Progress / Budget Bars

```
Track:  bg-elevated (#1E2130), height 4px, radius 2px
Fill:   gradient from accent-mid to accent-base
        — turns to `negative` if over budget
```

### Tags / Chips

```
background:    bg-elevated (#1E2130)
color:         text-secondary
border:        1px solid accent-dim (#3A3F68)
font:          Inter 12px, uppercase, spaced
border-radius: 6px
padding:       3px 8px
```

### Buttons

Primary:
```
background:    accent-base (#7C85D0)
color:         #0E0F13
border-radius: 8px
font:          Inter 14px, weight 500
```

Secondary / Ghost:
```
background:    transparent
border:        1px solid accent-mid (#5B62A8)
color:         accent-base (#7C85D0)
```

Destructive:
```
background:    transparent
border:        1px solid #F87171
color:         #F87171
```

### Charts & Graphs

- Background: always `bg-base` or transparent
- Grid lines: `#1E2130` (barely visible)
- Axis labels: `text-muted`, 11px, Inter
- Bar/line color: `accent-base` with 20% opacity fill under line charts
- Positive area: `positive` (#4ADE80) at 15% opacity
- Negative area: `negative` (#F87171) at 15% opacity
- No chart titles inside the chart — labels live outside in the UI

### Navigation (bottom bar, mobile)

```
background:    bg-surface (#14151A)
border-top:    1px solid #1E2130
icon inactive: text-muted (#5A5F70)
icon active:   accent-base (#7C85D0)
label:         Inter 10px, uppercase, spaced
```

---

## Motion & Interaction

- **Transitions**: `150ms ease-out` for hover/focus state changes
- **Number updates**: count-up animation on mount (300ms, ease-out)
- **Card press**: `scale(0.98)` on tap, 100ms
- **Page transitions**: fade + 4px vertical slide (200ms)
- No looping animations. No skeleton loaders with pulse — use a static shimmer (single pass, 600ms) instead.

---

## Light Mode (adaptive)

When the system is in light mode, switch to a **warm off-white** base — do not go pure white.

| Token         | Light mode value |
|---------------|-----------------|
| `bg-base`     | `#F5F2EC`       |
| `bg-surface`  | `#FFFFFF`       |
| `bg-elevated` | `#EDEAE3`       |
| `text-primary`| `#1A1A18`       |
| `text-muted`  | `#8C8070`       |
| `accent-base` | `#5B62A8`       |

All other semantic colors (positive, negative, warning) remain the same. The personality of the theme stays consistent — only the surface temperature shifts.

---

## Do / Don't

| Do | Don't |
|----|-------|
| Use monospace for all currency and number values | Use sans-serif for amounts |
| Layer backgrounds for depth (0E → 14 → 1E → 25) | Use drop shadows |
| Use uppercase + letter-spacing for section labels | Use large font sizes for hierarchy |
| Keep accents blue-violet only | Introduce random hues for categories |
| Show delta (↑↓) in green/red next to every key figure | Hide whether a number is positive or negative |
| Align numbers to the right in lists | Left-align numbers in a column |
