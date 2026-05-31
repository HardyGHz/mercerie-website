---
name: Novu Research OS
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363941'
  surface-container-lowest: '#0b0e15'
  surface-container-low: '#191b23'
  surface-container: '#1d2027'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e1e2ec'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#e1e2ec'
  inverse-on-surface: '#2e3038'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#c0c1ff'
  on-tertiary: '#1000a9'
  tertiary-container: '#8083ff'
  on-tertiary-container: '#0d0096'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#10131a'
  on-background: '#e1e2ec'
  surface-variant: '#32353c'
typography:
  display:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  data-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  data-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  bento-gap: 12px
---

## Brand & Style
The design system is engineered for high-performance scientific discovery, blending **Scientific Minimalism** with a **Cyberpunk-Industrial** edge. It is a tool for professional researchers and biohackers who require high data density without cognitive overload. 

The aesthetic is inspired by laboratory instrumentation and terminal interfaces: cold, precise, and utilitarian. It prioritizes information hierarchy through strict grid alignment, monospaced data visualization, and functional color coding. The emotional response should be one of total control, technical clarity, and "deep work" immersion.

## Colors
The palette is rooted in a deep "Zinc" spectrum to minimize eye strain during long research sessions. The background uses a near-black `#09090b` to provide infinite depth, while surfaces utilize a semi-transparent `#18181b` to allow for layered complexity.

**Functional Accents:**
- **Electric Blue (#3b82f6):** Literature, papers, and citation graphs.
- **Emerald (#10b981):** Genomics, sequences, and biological markers.
- **Indigo (#6366f1):** Protein structures and molecular modeling.
- **Amber (#f59e0b):** Clinical trials, warnings, and critical data points.

Interaction states should use the primary blue for focus, while system status uses standard semantic red (#ef4444) only for terminal errors.

## Typography
The system uses a dual-font strategy. **Geist** handles the primary UI—navigation, headers, and descriptive text—offering a modern, sterile feel. **JetBrains Mono** is reserved for all scientific data, coordinates, terminal outputs, and metadata labels. 

- Use `label-caps` for all table headers and small metadata tags.
- All numerical values must use `data-md` or `data-lg` to ensure tabular alignment and technical legibility.
- Strict uppercase is preferred for secondary UI triggers to reinforce the industrial aesthetic.

## Layout & Spacing
This design system employs a **Bento Grid** layout model, emphasizing modularity and high data density. 

**Structure:**
- **Desktop:** 12-column grid with 32px outer margins. Components should snap to a 4px base unit.
- **Bento Modules:** Use a consistent 12px gap between cards. Modules can span 3, 4, 6, or 12 columns.
- **Density:** Padding inside cards should be tight (16px) to maximize the "instrument panel" feel.

**Responsive Behavior:**
On mobile, the 12-column grid collapses to 4 columns. Bento modules reflow vertically, but critical data visualizations (like protein viewers) should maintain a minimum aspect ratio of 1:1.

## Elevation & Depth
In alignment with the Cyberpunk-Industrial style, depth is created through **Tonal Layers** and **Subtle Glows** rather than realistic shadows.

- **Level 0 (Background):** `#09090b` – The foundational workspace.
- **Level 1 (Card/Surface):** `#18181b` – Used for bento modules. Borders are mandatory (`#27272a`).
- **Level 2 (Popovers/Modals):** `#1c1c1f` – Higher contrast background with a `1px` solid border and a 0.15 opacity glow matching the primary accent color.
- **Interactions:** Hovering over a module should trigger a subtle increase in border brightness (to `#3f3f46`) and a very faint inner glow (2px blur) of the category's accent color.

## Shapes
The shape language is strictly **Sharp (0px)**. 

Every element—from buttons and input fields to the bento cards themselves—must have 90-degree corners. This reinforces the "instrumental" and "scientific hardware" narrative. Circular elements are only permitted for status indicators or specific molecular diagrams where geometry requires it.

## Components
- **Buttons:** Sharp edges, 1px border. Primary buttons use a solid fill of the accent color with black text. Secondary buttons use a transparent background with a 1px border.
- **Data Cards:** Every card must feature a `label-caps` header in the top-left, often accompanied by a coordinate (e.g., "SEC-04 // GENOMICS").
- **Input Fields:** Minimalist under-lines or full 1px borders. Use monospaced font for all user input.
- **Chips/Tags:** Monospaced text, sharp corners, low-opacity background fill of the respective category color (10% opacity) with a solid 1px border.
- **The "Bento" Module:** These should feel like independent modules of a larger machine. Include "crosshair" icons in the corners or small "status: active" pips to enhance the industrial vibe.
- **Scrollbars:** Custom slim, non-rounded scrollbars using the `#27272a` border color for the track and `#3f3f46` for the thumb.