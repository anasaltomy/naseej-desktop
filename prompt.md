## MANDATORY FIRST STEP — READ ALL SKILL FILES AND DOCS BEFORE WRITING A SINGLE LINE OF CODE

You must read the following files in order and internalize their rules completely.
Do not skip, skim, or partially read any of them. Only begin implementation after
you have read every file listed below.

1. `skills/ui-ux-pro-max/SKILL.md`
2. `skills/react-best-practices/SKILL.md`
3. `skills/electron-skills/electron/SKILL.md`

After reading, confirm your understanding by listing (in a code comment at the top of
your first generated file) the three most important rules you extracted from each skill
file. This comment block is required — do not omit it.

---

## SCOPE — FRONTEND / UI ONLY · DUMMY DATA

No backend, no GraphQL, no API calls. All data is local mock data.
All async operations use a `simulateAsync<T>(data, ms = 800)` helper.
The goal is a pixel-perfect, fully interactive UI ready to be wired to real
API calls in a future task.

---

## CONTEXT

Naseej is a multi-tenant POS platform. Categories are hierarchical:

- A **Category** can be a root category (no parent) or a **Subcategory** (has a parent)
- Both are the same data model — the distinction is only whether `parentId` is set
- A category can optionally define **Standard Sizes** — a predefined list of sizes
  that will be pre-selected by default whenever a product is created under this category
- `standardSizes` is an array of Size IDs; it is only meaningful when
  `hasStandardSizes = true`

Relevant types (define these in `category.types.ts`):

```typescript
interface Category {
  id: string;
  name: string;
  slug: string; // auto-derived from name, editable
  parentId: string | null;
  hasStandardSizes: boolean;
  standardSizes: Size[];
  createdAt: string;
}

interface Size {
  id: string;
  name: string; // e.g. "XS", "S", "M", "L", "XL", "XXL", "28", "30", "32", "One Size"
}
```

---

## MOCK DATA

Create `src/features/categories/__mocks__/categoryMocks.ts` exporting:

```typescript
export const mockSizes: Size[]; // at least 12 varied sizes
export const mockCategories: Category[]; // at least 8 categories, some with parentId set,
// some with hasStandardSizes true and sizes assigned
export const simulateAsync; // re-export from shared helper or define inline
```

---

## FEATURE: CREATE CATEGORY FORM

### Entry Point

Reachable from the POS sidebar: "Products > Categories > Add Category"
Also reachable inline from the Category list screen via an "Add Subcategory" button
on any existing category row — in that case the form opens with `parentId` pre-filled
and the parent selector locked to that value.

---

### FORM LAYOUT

The form lives on its own page (not a modal). Use a clean single-column layout with
clear visual grouping. The page has a sticky header with the title and a sticky footer
with the action buttons.

#### Field 1 — Category Name

- Text input, required
- On change: auto-populate the Slug field (lowercase, hyphens, strip special chars)
- Show character count (max 60)

#### Field 2 — Slug

- Text input, auto-populated from name but fully editable
- Show a small inline preview: "URL: /categories/{slug}"
- Validate: lowercase letters, numbers, hyphens only; no spaces

#### Field 3 — Parent Category (optional)

- A searchable combobox/select populated from `mockCategories`
- Only root categories are shown as options (parentId === null) —
  subcategories cannot be parents (max 2 levels deep)
- Shows a placeholder: "None — this will be a root category"
- If pre-filled from the "Add Subcategory" entry point, show the parent name
  and lock/disable the field with a small "Inherited" badge
- Selecting a parent visually updates the page title from "New Category"
  to "New Subcategory under [Parent Name]"

#### Field 4 — Standard Sizes Toggle (THE KEY INTERACTION)

This is the most important UX element on this form. Build it with care.

**The toggle:**

- A styled toggle switch (NOT a native checkbox) labeled "Standard Sizes"
- Default state: OFF
- To the right of the label: a subtle info tooltip icon (ⓘ) — on hover it shows:
  "When enabled, these sizes will be pre-selected every time a product is added
  to this category. You can still change them per product."
- The toggle state is stored in `hasStandardSizes`

**When the toggle is OFF:**

- Below the toggle: a muted, italicized hint text:
  "No standard sizes — sizes will be selected manually per product."
- The sizes selector is hidden (not just disabled — fully removed from DOM via
  conditional rendering to avoid tabbing into hidden fields)

**When the toggle is ON:**

- The hint text is replaced by an animated reveal of the **Sizes Selector**
  (animate: height from 0 to auto + fade in, duration ~250ms, easing ease-out)
- The Sizes Selector is a multi-select tag/chip interface:
  - Displays all `mockSizes` as selectable chips in a wrap layout
  - Unselected chips: outlined style
  - Selected chips: filled/solid style with a ✓ icon or × to deselect
  - Clicking a chip toggles its selection
  - A "Select All" and "Clear All" button sits above the chip grid
  - Show a counter below: "X sizes selected"
  - At least one size must be selected if the toggle is ON (validate on submit)
- The transition between OFF and ON must be smooth — no layout jump

---

### STICKY FOOTER — ACTION BUTTONS

Two buttons, right-aligned:

1. **"Save Category"** — PRIMARY
   - Runs Zod validation on the full form
   - If invalid: scroll to first error, show inline error messages — no alerts
   - If valid: simulate 800ms async save, show spinner on button, then on success:
     show a success toast ("Category saved") and navigate to the Categories list screen

2. **"Cancel"** — GHOST button
   - If the form is pristine (untouched): navigate directly to Categories list
   - If the form has been touched: show an inline confirmation bar that slides up
     from the footer: "You have unsaved changes. Leave anyway?" with "Leave" and
     "Keep Editing" buttons — do NOT use a browser `confirm()` dialog

---

## CODE ARCHITECTURE

Follow `skills/react-best-practices/SKILL.md` strictly.

**File structure:**
src/
features/
categories/
mocks/
categoryMocks.ts ← all dummy data
create/
CreateCategoryPage.tsx ← page shell, sticky header + footer
CategoryInfoFields.tsx ← Name + Slug + Parent fields
StandardSizesToggle.tsx ← toggle switch + animated reveal wrapper
SizesChipSelector.tsx ← the multi-select chip grid
UnsavedChangesBar.tsx ← inline confirmation bar on Cancel
useCreateCategoryForm.ts ← ALL form logic lives here
createCategory.schema.ts ← Zod schema
category.types.ts ← TypeScript interfaces

**Hook — `useCreateCategoryForm`:**
Must own and expose:

- All field values and change handlers
- `isDirty` boolean (true if any field has been changed from initial state)
- `hasStandardSizes` toggle state + `toggleStandardSizes()` handler
- `selectedSizes` Set<string> + `toggleSize(id)`, `selectAll()`, `clearAll()` handlers
- `errors` object (keyed by field name, values are string error messages)
- `isSubmitting` boolean
- `handleSubmit()` — validates, simulates save, handles navigation
- `slug` auto-derivation logic (derived from name, overridable)
- `isParentLocked` boolean (true when entered from "Add Subcategory" with pre-filled parent)

Zero business logic in any JSX component. Components only call hook handlers and
render values.

---

## UX QUALITY REQUIREMENTS

Follow `skills/ui-ux-pro-max/SKILL.md` strictly. Non-negotiable:

- The Standard Sizes reveal animation must be smooth — no jump, no flicker
- The toggle must be a custom-styled component, not a native checkbox —
  it should feel like a modern iOS/Android toggle
- Chip selection must feel instant (optimistic UI — no delay on toggle)
- The slug auto-derivation must be invisible to the user when they are only typing
  the name — it should feel automatic, not distracting
- The "New Subcategory under [Parent Name]" title update must animate (crossfade)
- Parent selector must show a subtle hierarchy indent when displaying category names
  (even though only root categories are selectable, the list may show context)
- The unsaved-changes bar must slide up from the footer smoothly (~200ms)
- Focus management: when the toggle turns ON, focus should move to the first chip
  in the sizes selector automatically
- All interactive elements must have visible focus rings
- Empty chip selector state (no sizes in mock data) must have a friendly empty state message

---

## CONSTRAINTS

- TypeScript strict mode — no `any`, no `// @ts-ignore`
- All props interfaces must have JSDoc comments
- Do NOT use any third-party modal or toast library — build the success toast and
  unsaved-changes bar as lightweight local components
- The toggle switch must be built as a reusable component at
  `src/components/ui/ToggleSwitch.tsx` — not a one-off inline element —
  since it will be reused across the POS app
- The SizesChipSelector must also be extracted as a reusable component at
  `src/components/ui/ChipMultiSelect.tsx` with generic props so it can be
  reused for Colors, Tags, and other multi-select chip needs across the app
- No inline styles except for dynamic values (e.g. color hex from mock data)
- React.memo on SizesChipSelector and each individual Chip to prevent re-renders
  when unrelated state changes
