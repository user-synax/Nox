# Patch — Design System
> A serious debugging tool, not a marketing site — dark canvas, one blue accent used sparingly, code and test results as the visual focus.

**Theme:** dark (single theme — no light-mode variant)

Patch's canvas is near-black (#080B0F) throughout, with two levels of dark surface elevation for cards and panels. A single mid-saturation blue (#4BA9E1) marks anything interactive or "in progress" — CTAs, active tabs, focus rings, links — and appears nowhere else. Borders are plain 1px hairlines, never shadows or glass effects: this is a technical tool, not a showcase. Typography is Geist for interface text and Geist Mono for code, metrics, and anything numeric, so the two register as distinct without changing color. The whole system should read as "quiet until you touch it" — correctness and test output carry the visual weight, not decoration.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Background | `#080B0F` | `--color-background` | Page canvas — the base for every screen |
| Surface | `#11161C` | `--color-surface` | Card, panel, and table-row backgrounds |
| Surface Elevated | `#171D24` | `--color-surface-elevated` | Modals, dropdowns, code blocks, popovers — one level above Surface |
| Primary | `#4BA9E1` | `--color-primary` | The only saturated accent — primary CTA fills, active nav/tab state, links, focus rings |
| Primary Hover | `#3D99D0` | `--color-primary-hover` | Hover/active state for primary-filled elements |
| Text Primary | `#F5F7FA` | `--color-text-primary` | Headings and primary body copy |
| Text Secondary | `#98A2B3` | `--color-text-secondary` | Muted labels, timestamps, placeholder text, secondary metadata |
| Border | `#222A33` | `--color-border` | All hairline borders — cards, inputs, dividers, table rules |
| Border Hover | `#31404D` | `--color-border-hover` | Border color on hover for interactive bordered elements |
| Success | `#36D399` | `--color-success` | Passed tests, accepted submissions, positive rating/XP deltas |
| Warning | `#F5C451` | `--color-warning` | Partial pass, approaching resource limits, pending review states |
| Danger | `#F45D6F` | `--color-danger` | Failed tests, runtime errors, negative rating deltas, destructive actions |
| Disabled | `#4A5560` | `--color-disabled` | Disabled button/input text and icon fills |

## Tokens — Typography

### Geist — UI text, headings, nav, labels, marketing copy. Tight negative tracking at display sizes keeps headlines dense rather than airy. · `--font-geist`
- **Substitute:** Inter, DM Sans
- **Weights:** 400, 500, 600, 700
- **Sizes:** 12px, 13px, 14px, 16px, 18px, 24px, 32px, 48px
- **Line height:** 1.2 at display/heading sizes, 1.5 at body sizes
- **Letter spacing:** -0.02em at 32px+, normal below that
- **Role:** UI text, headings, nav, labels, marketing copy.

### Geist Mono — Code editor chrome, test output, execution metrics (ms, MB), scores, XP/rating numbers, timestamps, usernames in tables. Numeric tabular alignment matters here — scores and metrics must line up in columns. · `--font-geist-mono`
- **Substitute:** JetBrains Mono, Fira Code
- **Weights:** 400, 500, 600
- **Sizes:** 12px, 13px, 14px, 16px
- **Line height:** 1.5
- **Letter spacing:** normal
- **OpenType features:** `"tnum" for numeric alignment in tables/metrics`
- **Role:** Code editor chrome, test output, execution metrics, scores, XP/rating numbers, tabular data.

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|------|------|-------------|----------------|-------|
| caption | 12px | 1.4 | — | `--text-caption` |
| body-sm | 13px | 1.5 | — | `--text-body-sm` |
| body | 14px | 1.5 | — | `--text-body` |
| body-lg | 16px | 1.5 | — | `--text-body-lg` |
| heading-sm | 18px | 1.3 | — | `--text-heading-sm` |
| heading | 24px | 1.25 | -0.01em | `--text-heading` |
| heading-lg | 32px | 1.2 | -0.02em | `--text-heading-lg` |
| display | 48px | 1.15 | -0.02em | `--text-display` |

## Tokens — Spacing & Shapes

**Base unit:** 4px

**Density:** compact — this is a dense developer tool, not a spacious marketing page.

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 4 | 4px | `--spacing-4` |
| 8 | 8px | `--spacing-8` |
| 12 | 12px | `--spacing-12` |
| 16 | 16px | `--spacing-16` |
| 20 | 20px | `--spacing-20` |
| 24 | 24px | `--spacing-24` |
| 32 | 32px | `--spacing-32` |
| 40 | 40px | `--spacing-40` |
| 48 | 48px | `--spacing-48` |
| 64 | 64px | `--spacing-64` |
| 80 | 80px | `--spacing-80` |

### Border Radius

| Element | Value |
|---------|-------|
| buttons | 6px |
| inputs | 6px |
| cards | 10px |
| modals | 10px |
| codeBlocks | 6px |
| badges/pills | 9999px |

### Elevation

Elevation comes from surface-level changes (Background → Surface → Surface Elevated) and borders, not shadows. The one exception is floating overlays that sit above content (dropdowns, tooltips, modals), which get a single minimal shadow for depth cueing only:

| Name | Value | Token |
|------|-------|-------|
| floating | `rgba(0, 0, 0, 0.35) 0px 8px 24px -4px` | `--shadow-floating` |

No other shadow tiers exist. No glow, no glass, no gradient washes.

### Layout

- **App max-width:** 1280px (dashboard/catalog), full-width for the challenge-solving screen
- **Section gap:** 48-64px (marketing/landing only)
- **Card padding:** 16-20px
- **Element gap:** 8-12px

## Components

### Primary Button
**Role:** Main CTA — "Start Patching," "Run Tests," "Submit"

Background `#4BA9E1`, text `#080B0F` (dark text on the light accent for contrast), 6px radius, Geist weight 600 at 14px, 8px vertical / 16px horizontal padding. No border. Hover: background `#3D99D0`.

### Secondary/Outlined Button
**Role:** Secondary actions — "Reset to starter code," "Explore Challenges"

Background transparent, text `#F5F7FA`, 1px solid `#222A33` border, 6px radius, same padding as primary. Hover: border becomes `#31404D`.

### Ghost Nav Item
**Role:** Top nav links, sidebar items, icon-only controls

Background transparent, text `#98A2B3`, no border. Active/hover: text `#F5F7FA`, optional 2px bottom border in `#4BA9E1` for active tab state.

### Difficulty Badge
**Role:** Easy/Medium/Hard/Expert tag on challenge cards and challenge pages

9999px radius pill, 4px vertical / 10px horizontal padding, Geist Mono weight 500 at 12px uppercase. Color-coded: Easy `#36D399`, Medium `#F5C451`, Hard `#F45D6F`, Expert text `#F5F7FA` on `#4BA9E1` background. Background is the semantic color at 15% opacity with full-opacity text in that same color (except Expert, which is solid-filled to read as the top tier).

### Rank Badge
**Role:** Bronze through Grandmaster on profile and leaderboard

Flat filled pill, 9999px radius, Geist weight 600 at 13px, white or `#080B0F` text depending on fill lightness. No gradients or metallic effects — flat color per rank tier, kept visually calm so it doesn't compete with the rating number next to it.

### Challenge Card
**Role:** Catalog grid item

Background `#11161C`, 10px radius, 1px solid `#222A33` border, 16-20px padding. Title in Geist 16px weight 600, difficulty badge top-right, category/tags in `#98A2B3` at 13px, solve count and success rate in Geist Mono at 12px along the bottom edge.

### Code Editor Panel
**Role:** Monaco container chrome (file tabs, editor frame)

Background `#171D24` (Surface Elevated), 1px solid `#222A33` border, 6px radius on outer container only (Monaco's internal rendering stays edge-to-edge). File tabs: active tab text `#F5F7FA` with 2px bottom border in `#4BA9E1`; inactive tabs text `#98A2B3`.

### Test Result Row
**Role:** Individual test pass/fail line in the tests panel

Background transparent, Geist Mono 13px. Passed: `#36D399` checkmark + text. Failed: `#F45D6F` cross + text. 8px vertical padding, 1px bottom border in `#222A33` between rows.

### Submission Result Panel
**Role:** Post-submit summary (score, tests, XP, rating delta)

Background `#11161C`, 10px radius, 1px border `#222A33`, 20px padding. Score and test count in Geist Mono 24px weight 600. XP/rating deltas in Geist Mono 14px, `#36D399` if positive, `#F45D6F` if negative. Status line ("Accepted" / "Failed") in Geist 16px weight 600, colored by outcome.

### Leaderboard Row
**Role:** Global/weekly leaderboard table row

Background `#11161C` alternating with `#080B0F` (zebra striping) or flat `#11161C` with `#222A33` row dividers — pick one, don't mix. Rank number and rating in Geist Mono, username in Geist weight 500, rank badge inline.

### Profile Stat Block
**Role:** Rating/XP/streak/solved-count summary on public profile

Label in Geist 13px `#98A2B3` uppercase, value in Geist Mono 24px weight 600 `#F5F7FA`. Stacked or in a horizontal row of 4-5 stat blocks with 32px gaps.

### Form Input
**Role:** Auth forms (email, password, username)

Background `#171D24`, 6px radius, 1px solid `#222A33` border, 8px vertical / 12px horizontal padding. Placeholder `#98A2B3`. Focus: border becomes `#4BA9E1` with a 2px `rgba(75,169,225,0.2)` focus ring.

### OAuth Button
**Role:** "Continue with Google" on auth pages

Background `#171D24`, 1px solid `#222A33` border, 6px radius, full-width, 10px vertical padding, Geist weight 500 14px `#F5F7FA`, provider icon left-aligned. Hover: border `#31404D`.

### Notification Item
**Role:** In-app notification list entry

Background transparent, unread indicated by a `#4BA9E1` dot (not a background tint — avoid full-row color washes). Text `#F5F7FA` for the message, `#98A2B3` for the timestamp, Geist 14px.

### Admin Table Row
**Role:** User/challenge/report tables in the admin dashboard

Background `#11161C`, 1px bottom border `#222A33`, Geist 14px, Geist Mono for any ID/numeric column. Row hover: background `#171D24`.

## Do's and Don'ts

### Do
- Use `#4BA9E1` only for primary actions, active states, links, and focus rings — never as a large fill or background wash.
- Use Geist Mono for anything numeric or code-adjacent: scores, XP, rating, timestamps, execution metrics, table IDs.
- Keep all borders at 1px solid `#222A33` — this is the only border treatment in the system.
- Reserve Success/Warning/Danger strictly for test/submission outcomes and system status — never as decorative color.
- Let the three background levels (`#080B0F` → `#11161C` → `#171D24`) carry all depth/hierarchy; don't add shadows to communicate elevation except on floating overlays.
- Keep difficulty and rank badges flat-filled or low-opacity tinted — no gradients, no metallic/glossy effects.

### Don't
- Don't introduce gradients, glow effects, or backdrop-blur/glassmorphism anywhere — this system has none, unlike typical SaaS marketing sites.
- Don't use a light theme or light surfaces anywhere in the authenticated app.
- Don't apply Geist Mono to headings or marketing copy — it's reserved for code and numeric data.
- Don't stack multiple shadow layers on cards; cards use a border, not a shadow, for definition.
- Don't let XP/rating/streak gamification elements use bright or playful colors — keep them in the same restrained palette as the rest of the UI so the "serious tool" feel holds.
- Don't use rounded pill shapes (9999px) on anything except badges and tags — buttons, inputs, and cards stay at 6-10px.

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Background | `#080B0F` | Page canvas |
| 1 | Surface | `#11161C` | Cards, panels, table rows |
| 2 | Surface Elevated | `#171D24` | Modals, dropdowns, code blocks, popovers |

## Layout

**Marketing/landing page:** single-column sections stacked vertically on the `#080B0F` canvas, 48-64px section gaps, max-width 1200px, hero → supporting sections → CTA (per PRD Section 32). No illustration, no split light/dark banding — everything dark.

**Authenticated app:** fixed top nav (logo left, nav center, profile/notifications right) over a max-width 1280px content area for dashboard, catalog, and profile pages. The challenge-solving screen breaks max-width and goes full viewport width in a three-pane layout: file list (left, ~200px) / Monaco editor (center, flexible) / tests panel (right, ~320px), with the submission result panel docked below spanning full width — matching the PRD's Section 9 layout diagram.

## Agent Prompt Guide

**Quick Color Reference**
- text (primary): `#F5F7FA`
- text (secondary): `#98A2B3`
- background (page): `#080B0F`
- background (card): `#11161C`
- background (elevated/code): `#171D24`
- border: `#222A33`
- primary action: `#4BA9E1`
- success: `#36D399` · warning: `#F5C451` · danger: `#F45D6F`

**Example Component Prompts**

1. **Challenge card:** Background `#11161C`, 10px radius, 1px solid `#222A33` border, 16-20px padding. Title Geist 16px weight 600 `#F5F7FA`. Difficulty badge top-right (pill, semantic color). Tags row in `#98A2B3` 13px. Bottom row: solve count + success rate in Geist Mono 12px `#98A2B3`.

2. **Primary button:** Background `#4BA9E1`, text `#080B0F`, Geist weight 600 14px, 6px radius, 8px/16px padding, no border. Hover background `#3D99D0`.

3. **Test result panel:** Background `#11161C`, 10px radius, 1px `#222A33` border. Each test row: Geist Mono 13px, checkmark + `#36D399` for pass, cross + `#F45D6F` for fail, 8px vertical padding, `#222A33` row divider.

4. **Editor chrome:** Outer container `#171D24` background, 1px `#222A33` border, 6px radius. File tabs: active `#F5F7FA` text with 2px bottom border `#4BA9E1`; inactive `#98A2B3`.

5. **Auth form input:** Background `#171D24`, 6px radius, 1px `#222A33` border, 8px/12px padding, placeholder `#98A2B3`, focus border `#4BA9E1` with `rgba(75,169,225,0.2)` focus ring.

## Similar Products

- **Linear** — dark, dense, single-accent developer tool; closest structural reference for restraint and hierarchy-via-surface-level rather than shadow
- **Vercel Dashboard** — same near-black canvas, single accent, Geist typography family
- **GitHub (dark theme)** — same pattern of semantic color reserved strictly for status (checks passing/failing) rather than decoration

## Quick Start

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-background: #080B0F;
  --color-surface: #11161C;
  --color-surface-elevated: #171D24;
  --color-primary: #4BA9E1;
  --color-primary-hover: #3D99D0;
  --color-text-primary: #F5F7FA;
  --color-text-secondary: #98A2B3;
  --color-border: #222A33;
  --color-border-hover: #31404D;
  --color-success: #36D399;
  --color-warning: #F5C451;
  --color-danger: #F45D6F;
  --color-disabled: #4A5560;

  /* Typography — Font Families */
  --font-geist: 'Geist', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-geist-mono: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  /* Typography — Scale */
  --text-caption: 12px;
  --leading-caption: 1.4;
  --text-body-sm: 13px;
  --leading-body-sm: 1.5;
  --text-body: 14px;
  --leading-body: 1.5;
  --text-body-lg: 16px;
  --leading-body-lg: 1.5;
  --text-heading-sm: 18px;
  --leading-heading-sm: 1.3;
  --text-heading: 24px;
  --leading-heading: 1.25;
  --tracking-heading: -0.01em;
  --text-heading-lg: 32px;
  --leading-heading-lg: 1.2;
  --tracking-heading-lg: -0.02em;
  --text-display: 48px;
  --leading-display: 1.15;
  --tracking-display: -0.02em;

  /* Typography — Weights */
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Spacing */
  --spacing-unit: 4px;
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-64: 64px;
  --spacing-80: 80px;

  /* Layout */
  --app-max-width: 1280px;
  --section-gap: 64px;
  --element-gap: 8px;

  /* Border Radius */
  --radius-buttons: 6px;
  --radius-inputs: 6px;
  --radius-cards: 10px;
  --radius-modals: 10px;
  --radius-codeblocks: 6px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-floating: rgba(0, 0, 0, 0.35) 0px 8px 24px -4px;

  /* Surfaces */
  --surface-background: #080B0F;
  --surface-card: #11161C;
  --surface-elevated: #171D24;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-background: #080B0F;
  --color-surface: #11161C;
  --color-surface-elevated: #171D24;
  --color-primary: #4BA9E1;
  --color-primary-hover: #3D99D0;
  --color-text-primary: #F5F7FA;
  --color-text-secondary: #98A2B3;
  --color-border: #222A33;
  --color-border-hover: #31404D;
  --color-success: #36D399;
  --color-warning: #F5C451;
  --color-danger: #F45D6F;
  --color-disabled: #4A5560;

  /* Typography */
  --font-geist: 'Geist', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-geist-mono: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  /* Typography — Scale */
  --text-caption: 12px;
  --text-body-sm: 13px;
  --text-body: 14px;
  --text-body-lg: 16px;
  --text-heading-sm: 18px;
  --text-heading: 24px;
  --text-heading-lg: 32px;
  --text-display: 48px;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-64: 64px;
  --spacing-80: 80px;

  /* Border Radius */
  --radius-md: 6px;
  --radius-lg: 10px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-floating: rgba(0, 0, 0, 0.35) 0px 8px 24px -4px;
}
```