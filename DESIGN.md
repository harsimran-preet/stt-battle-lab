# STT Battle Lab - Design System Documentation

Reference guide for maintaining visual consistency across the application.

---

## Theme Architecture

Tailwind v4 with CSS custom properties in `src/index.css`. Dark mode via `.dark` class on `<html>` (`@custom-variant dark (&:is(.dark *))`). Colors use OKLCH color space.

### Semantic Color Tokens

| Token | Purpose | Light | Dark |
|---|---|---|---|
| `primary` | Brand/CTA (orange) | `oklch(0.6083 0.2090 27.03)` | same |
| `primary-foreground` | Text on primary | white | white |
| `secondary` | Accent (blue-purple) | `oklch(0.5645 0.1633 253.27)` | same |
| `muted` | Subtle backgrounds | `oklch(0.9702 0 0)` | `oklch(0.2520 0 0)` |
| `muted-foreground` | Secondary text | `oklch(0.5624 0 0)` | `oklch(0.7572 0 0)` |
| `accent` | Highlight | `oklch(0.8848 0.0546 243.39)` | `oklch(0.4217 0.1569 259.91)` |
| `destructive` | Error/danger | `oklch(0.5680 0.2002 26.41)` | `oklch(0.6539 0.1926 25.14)` |
| `card` | Card surfaces | white | black |
| `border` | Default borders | `oklch(0.9067 0 0)` | `oklch(0.3102 0.0014 17.23)` |
| `input` | Input backgrounds | white | black |
| `ring` | Focus rings | same as primary | same as primary |
| `background` | Page background | `oklch(0.9791 0 0)` | black |
| `foreground` | Primary text | `oklch(0.2178 0 0)` | `oklch(0.9791 0 0)` |

**Usage**: Always prefer semantic tokens (`bg-primary`, `text-muted-foreground`, `border-border`) over raw colors for theme-aware elements.

### Categorical Colors (Raw Tailwind)

Used for service branding and data categories. Always pair light + dark variants:

| Category | Light | Dark | Used For |
|---|---|---|---|
| **Blue** | `bg-blue-100 text-blue-600` | `dark:bg-blue-900/40 dark:text-blue-400` | Deepgram, info, Slot A |
| **Purple** | `bg-purple-100 text-purple-600` | `dark:bg-purple-900/40 dark:text-purple-400` | Soniox, secondary |
| **Amber** | `bg-amber-100 text-amber-600` | `dark:bg-amber-900/40 dark:text-amber-400` | OriSTT, warnings |
| **Emerald** | `bg-emerald-100 text-emerald-600` | `dark:bg-emerald-900/30 dark:text-emerald-400` | Gemini, success, good scores |
| **Orange** | `bg-orange-100 text-orange-600` | `dark:bg-orange-900/30 dark:text-orange-400` | Slot B |
| **Red** | `bg-red-100 text-red-600` | `dark:bg-red-900/40 dark:text-red-400` | Error, poor scores |

**Dark mode pattern**: Use `/30` or `/40` opacity on `*-900` backgrounds. Use `*-300` or `*-400` for dark text. Example:
```
bg-blue-100 text-blue-700 border-blue-300
dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700
```

### Service Color Assignments

| Service | Color | Badge Code | Badge Class |
|---|---|---|---|
| Deepgram | Blue | `DG` | `bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400` |
| Soniox | Purple | `SX` | `bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400` |
| OriSTT | Amber | `OR` | `bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400` |
| Gemini | Emerald | `GM` | `bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400` |

### Score Color Scale

```tsx
function scoreColor(score: number) {
  if (score >= 8) return 'text-emerald-600 dark:text-emerald-400';  // Excellent
  if (score >= 6) return 'text-blue-600 dark:text-blue-400';        // Good
  if (score >= 4) return 'text-amber-600 dark:text-amber-400';      // Fair
  return 'text-red-600 dark:text-red-400';                           // Poor
}
```

---

## Typography

### Font Stack

| Type | Font | CSS Variable | Fallback |
|---|---|---|---|
| Sans | Albert Sans | `--font-sans` | ui-sans-serif, sans-serif, system-ui |
| Serif | Roboto Slab | `--font-serif` | serif |
| Mono | Fira Code | `--font-mono` | ui-monospace, monospace |

### Text Scale

| Class | Size | Usage |
|---|---|---|
| `text-[9px]` | 9px | Badge initials (DG, SX, OR) |
| `text-[10px]` | 10px | Meta labels ("Active:", "Best") |
| `text-[11px]` | 11px | Helper text, pills, config pills |
| `text-xs` | 12px | Labels, badges, status text |
| `text-sm` | 14px | Body text, form inputs, transcripts |
| `text-base` | 16px | Primary content |
| `text-lg` | 18px | Card titles, winner names |
| `text-xl` | 20px | Page titles |
| `text-6xl` | 60px | Large score displays |

### Font Weights

| Weight | Usage |
|---|---|
| `font-medium` | Labels, buttons, navigation |
| `font-semibold` | Section headings, uppercase labels |
| `font-bold` | Page titles, badges, card titles |
| `font-black` | Score numbers (`tabular-nums`) |

### Letter Spacing

Base tracking is `0.02em` (set via `--tracking-normal-val`). Use `uppercase tracking-wide` for section labels.

---

## Spacing

### Base Unit

`--spacing: 0.25rem` (4px). All spacing uses this 4px grid.

### Common Patterns

| Pattern | Classes |
|---|---|
| Icon + text | `flex items-center gap-1.5` (6px) or `gap-2` (8px) |
| Section stacking | `space-y-3` or `space-y-4` |
| Card content | `p-4` or `px-6 py-4` |
| Config panel | `p-4 space-y-4` |
| Page sections | `space-y-6` |
| Inline pills | `px-2 py-0.5` |
| Buttons | `px-3 py-2` (default), `px-4 py-2` (lg) |

---

## Border & Radius

### Radius Scale

`--radius: 0.25rem` (4px base). Computed in `@theme`:

| Token | Value | Usage |
|---|---|---|
| `rounded-sm` | `calc(0.25rem - 4px)` | Tiny badges |
| `rounded-md` | `calc(0.25rem - 2px)` | Inputs, selects, small cards |
| `rounded-lg` | `0.25rem` | Panels, result areas |
| `rounded-xl` | `calc(0.25rem + 4px)` | Cards (shadcn default) |
| `rounded-full` | 50% | Pills, avatars, toggle switches |

### Border Patterns

- Default: `border border-border`
- Inputs: `border border-input`
- Active/selected: `border-primary`
- Error: `border-destructive/50`
- Category highlight: `border-blue-300 dark:border-blue-700`
- Dashed: `border-2 border-dashed` (file upload zone)

---

## Shadows

Light mode uses neutral dark shadows. Dark mode uses blue-tinted colored shadows (`hsl(209.84 78.72% 46.08%)`).

| Class | Usage |
|---|---|
| `shadow-sm` | Most common - inputs, selects, cards |
| `shadow-md` | Elevated hover states |
| `shadow-lg` | Prominent cards |
| `dark:shadow-primary/20` | Colored shadow tint in dark mode |

---

## Component Patterns

### Buttons (CVA via `src/components/ui/button.tsx`)

**Variants**: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
**Sizes**: `default` (h-9), `sm` (h-8), `lg` (h-10), `icon` (size-9)

```tsx
// Primary action
<Button size="lg" className="gap-2">
  <Icon className="h-4 w-4" /> Label
</Button>

// Secondary action
<Button variant="outline" size="sm" className="gap-2">
  <Icon className="h-3.5 w-3.5" /> Label
</Button>
```

### Select Fields (Shadcn Select)

Used for model/service dropdowns with small option lists (2-10 items):

```tsx
<Select value={value} onValueChange={onChange} disabled={disabled}>
  <SelectTrigger className="w-full">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {options.map((m) => (
      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Language Combobox (Searchable)

Shared `LanguageCombobox` component (`@/components/LanguageCombobox`) for language dropdowns with many options (45-55 items). Uses Shadcn Popover + Command (cmdk) for search/filter:

```tsx
<LanguageCombobox
  value={config.language}
  onChange={(v) => onChange({ ...config, language: v })}
  disabled={disabled}
  options={DEEPGRAM_LANGUAGES}
  placeholder="Search languages…"
/>
```

### Toggle Switches

Custom implementation (not shadcn):

```tsx
<button
  role="switch"
  aria-checked={checked}
  className={cn(
    'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    checked ? 'bg-primary' : 'bg-muted-foreground/30 dark:bg-muted-foreground/40',
  )}
>
  <span className={cn(
    'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
    checked ? 'translate-x-4' : 'translate-x-0',
  )} />
</button>
```

### Cards (`src/components/ui/card.tsx`)

```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-base">
      <Icon className="h-4 w-4 text-amber-500" />
      Title
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* content */}
  </CardContent>
</Card>
```

### Config Panels

```tsx
<div className="rounded-lg border bg-muted/30 p-4 space-y-4">
  {/* Header with icon + label + reset button */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Settings2 className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Section Title
      </span>
    </div>
  </div>
  {/* Fields */}
</div>
```

### Active Config Pills

```tsx
<div className="flex flex-wrap gap-1.5 pt-1 border-t">
  <span className="text-[10px] text-muted-foreground self-center">Active:</span>
  <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
    {value}
  </span>
</div>
```

### Service Badge Initials

```tsx
<span className={cn(
  'inline-flex h-4 w-4 items-center justify-center rounded-sm text-[9px] font-bold leading-none',
  'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
)}>
  DG
</span>
```

### Field Labels

```tsx
<Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
  <Globe className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
  STT Language
</Label>
```

In Battle page (simpler):
```tsx
<Label className="text-xs font-medium text-muted-foreground">Language</Label>
```

### Result Panels (Battle)

Conditional border/background by status:
```tsx
<div className={cn(
  'rounded-lg border min-h-[280px] flex flex-col',
  status === 'error'   && 'border-destructive/50 bg-destructive/5',
  status === 'done'    && 'bg-card',
  status === 'idle'    && 'bg-muted/30',
  status === 'running' && 'bg-muted/30',
)}>
```

---

## Icons (lucide-react)

### Sizing

| Class | Size | Usage |
|---|---|---|
| `h-3 w-3` | 12px | Inside badges, tight spaces |
| `h-3.5 w-3.5` | 14px | Label icons, small buttons |
| `h-4 w-4` | 16px | Default inline, buttons |
| `h-5 w-5` | 20px | Page title icons, standalone |
| `h-6 w-6` | 24px | Hero icons |
| `h-16 w-16` | 64px | Empty state illustrations |

### Common Icons by Purpose

- **Navigation**: `Mic2`, `Swords`, `BookOpen`
- **Actions**: `Upload`, `Download`, `RotateCcw`, `Settings2`
- **Media**: `Play`, `Pause`, `Volume2`, `VolumeX`
- **Status**: `Loader2` (with `animate-spin`), `Check`, `AlertCircle`, `AlertTriangle`
- **Data**: `Clock`, `Users`, `FileText`, `Star`, `Trophy`, `BarChart2`
- **Language**: `Globe`, `Languages`
- **Theme**: `Moon`, `Sun`

---

## Animations & Transitions

### CSS Transitions

```
transition-colors duration-200       // Color changes (hover, active)
transition-all duration-200          // Multi-property transitions
transition-transform duration-200    // Toggle switches
transition-all duration-700          // Progress bars (slow fill)
```

### Animations

| Class | Effect | Usage |
|---|---|---|
| `animate-spin` | Continuous rotation | Loading spinners (`Loader2`) |
| `animate-pulse` | Opacity pulse | Typing cursor, ellipsis |
| `animate-shake` | Horizontal shake (0.45s) | Auth error feedback |

### Typing Cursor

```tsx
<span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle" />
```

---

## Layout Patterns

### Page Structure

```tsx
<div className="space-y-6">
  {/* Page header */}
  <div>
    <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
      <Icon className="h-5 w-5 text-primary" />
      Page Title
    </h1>
    <p className="text-sm text-muted-foreground mt-0.5">Description</p>
  </div>

  {/* Content sections */}
  <Card>...</Card>
</div>
```

### Responsive Grids

```tsx
// Two columns on sm+
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

// Three columns on sm+
<div className="grid grid-cols-3 gap-2">

// Stat cards
<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
```

### Flex Row with Actions

```tsx
<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
  <div className="flex items-center gap-3 flex-1">
    {/* Left side controls */}
  </div>
  <div className="flex gap-2">
    {/* Right side buttons */}
  </div>
</div>
```

---

## Speaker Colors (`src/lib/utils.ts`)

Cycle through 6 speaker colors for diarization:

```tsx
const SPEAKER_COLORS = [
  { bg: 'bg-blue-100 dark:bg-blue-900/30',     text: 'text-blue-700 dark:text-blue-300',     border: 'border-blue-300 dark:border-blue-700',     dot: 'bg-blue-500' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700', dot: 'bg-emerald-500' },
  { bg: 'bg-purple-100 dark:bg-purple-900/30',  text: 'text-purple-700 dark:text-purple-300',  border: 'border-purple-300 dark:border-purple-700',  dot: 'bg-purple-500' },
  { bg: 'bg-orange-100 dark:bg-orange-900/30',  text: 'text-orange-700 dark:text-orange-300',  border: 'border-orange-300 dark:border-orange-700',  dot: 'bg-orange-500' },
  { bg: 'bg-rose-100 dark:bg-rose-900/30',      text: 'text-rose-700 dark:text-rose-300',      border: 'border-rose-300 dark:border-rose-700',      dot: 'bg-rose-500' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/30',      text: 'text-cyan-700 dark:text-cyan-300',      border: 'border-cyan-300 dark:border-cyan-700',      dot: 'bg-cyan-500' },
];
```

---

## UI Primitives (`src/components/ui/`)

| Component | File | Based On |
|---|---|---|
| Button | `button.tsx` | CVA variants |
| Card | `card.tsx` | div slots |
| Badge | `badge.tsx` | CVA variants |
| Tabs | `tabs.tsx` | Radix UI |
| Label | `label.tsx` | Radix UI |
| Textarea | `textarea.tsx` | native |
| ScrollArea | `scroll-area.tsx` | Radix UI |
| Separator | `separator.tsx` | Radix UI |
| Progress | `progress.tsx` | Radix UI |
| Select | `select.tsx` | Radix UI |
| Popover | `popover.tsx` | Radix UI |
| Command | `command.tsx` | cmdk |
| Dialog | `dialog.tsx` | Radix UI |

### Utility: `cn()` (`src/lib/utils.ts`)

Merges Tailwind classes with conflict resolution via `clsx` + `tailwind-merge`:

```tsx
import { cn } from '@/lib/utils';

className={cn(
  'base-classes',
  condition && 'conditional-classes',
  variant === 'active' ? 'active-classes' : 'inactive-classes',
)}
```

---

## Key Rules

1. **Always use semantic tokens** (`bg-primary`, `text-foreground`, `border-border`) for theme-aware elements
2. **Raw Tailwind colors** only for categorical branding (service colors, scores, speakers)
3. **Dark mode**: every raw color needs a `dark:` counterpart with `/30`-`/40` opacity on backgrounds
4. **Icons**: default `h-4 w-4`, pair with `gap-1.5` or `gap-2`
5. **Text**: body `text-sm`, labels `text-xs`, helpers `text-[11px]`
6. **Focus states**: `focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1` for inputs; `focus-visible:ring-ring/50 focus-visible:ring-[3px]` for buttons
7. **Disabled**: `disabled:cursor-not-allowed disabled:opacity-50`
8. **No hardcoded colors** in component styles - always use CSS variables or Tailwind classes
9. **Transitions**: `transition-colors duration-200` for interactive elements
10. **Use `cn()`** for all conditional class merging
