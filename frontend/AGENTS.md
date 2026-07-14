# Frontend Contributor Guide

## Scope

This file applies to all work under `frontend/`. Follow the root `AGENTS.md` first, then these frontend-specific rules.

## Frontend Capabilities

Use the frontend to build responsive travel booking screens, reusable UI components, API-backed catalog flows, checkout/account interactions, and clear user feedback states. The app is React 19 + Vite, JavaScript/JSX only, with regular CSS currently active and Tailwind available but not required.

## Before Building UI

Before creating or changing a screen, identify the main user, task, primary action, data shown first, reusable components, required states, form validation, keyboard flow, and mobile/tablet/desktop behavior.

## Structure Rules

- Keep route-level screens in `src/pages/` when the app grows beyond `App.jsx`.
- Keep reusable presentation components in `src/components/`.
- Keep API calls in `src/services/`; avoid scattering `fetch` calls through unrelated JSX.
- Keep formatting, mapping, and small pure helpers in `src/utils/`.
- Keep constants and option lists in `src/constants/`.
- Use `VITE_API_URL` or the existing `/api` fallback for backend calls.

## UI Quality Rules

Build screens around the user task first: primary action, required data, and next step should be obvious. Use visual hierarchy: title, context, primary action, main content, secondary actions, then metadata.

Every data-driven section should handle loading, empty, error, and success states. Prefer skeletons when the final layout is predictable. Errors should include a helpful message and retry action when recovery is possible.

Interactive controls should cover default, hover, focus-visible, active, disabled, loading, selected, error, and success states where relevant. Use motion only for feedback and clarity, keep transitions short, and respect `prefers-reduced-motion`.

## Design System And Styling

Prefer existing CSS variables and classes before adding new visual rules. Keep colors, spacing, radius, typography, and shadows consistent. Do not mix styling approaches inside a small feature without a reason.

When expanding styles, centralize repeated values as tokens: background, surface, text, muted text, border, primary, danger, warning, success, info, spacing scale, radius scale, shadow scale, and typography scale.

Component variants should be explicit. Buttons should support variants such as `primary`, `secondary`, `ghost`, and `danger` when needed. Inputs should have label, helper text, error text, focus, disabled, readonly, and required states.

## Forms And Data UX

Do not use placeholder text as the only label. Validate obvious rules client-side, handle server validation errors, preserve user input after failure, and prevent double submit with loading or disabled submit states. Long forms should focus or scroll to the first important error.

Search fields should support clear actions and debounce API calls. Uploads should show type/size limits, progress, preview when useful, remove, and retry states.

## Accessibility And Responsive Rules

Use semantic HTML: `button` for actions, `a` for navigation, real labels for inputs, and visible focus states. Icon-only buttons need `aria-label`. Async status updates should use `role="status"` or `aria-live` when useful. Do not rely on color alone for status or validation.

Check mobile around `360px` and `390px`, tablet around `768px`, and desktop at `1024px+`. Avoid horizontal overflow, keep tap targets around 40px or larger, and use readable line lengths. Dense tables or lists need a mobile plan: cards, controlled horizontal scroll, or simplified columns.

## Performance Rules

Performance is part of UX. Avoid blank screens during data fetches. Debounce API-backed search, avoid duplicate requests, use stable list keys, optimize image dimensions, and lazy-load heavy routes or sections when the app grows. Large lists should use pagination or virtualization.

## Figma Or Design References

When a Figma file, screenshot, or mockup exists, treat it as the visual source of truth unless the user asks for redesign. Preserve layout, color, typography, spacing, radius, shadow, icons, imagery, and brand feel. Add the states static designs often miss: hover, focus, active, disabled, loading, empty, error, success, responsive behavior, validation, and accessibility.

## Testing And Verification

Frontend has no dedicated unit test setup yet, so verification is lint and build:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

For integration-affecting UI, also verify backend tests or root `npm run check` when practical.

## Done Checklist

- Primary action and visual hierarchy are clear.
- Layout works on mobile, tablet, and desktop.
- Loading, empty, error, success, and disabled states are visible where relevant.
- Controls are keyboard-friendly and accessible.
- Forms have labels, validation, errors, loading, and double-submit protection where relevant.
- Motion is purposeful and reduced-motion friendly.
- Repeated visual values use existing tokens or reusable classes.
- API logic is in `services/` when reused.
- Images and lists are reasonable for performance.
- Lint and build pass when dependencies are installed.
