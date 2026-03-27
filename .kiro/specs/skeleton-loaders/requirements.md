# Requirements Document

## Introduction

The token dashboard and detail page currently display no content while data is loading, relying on a centered spinner. This feature introduces skeleton loaders — animated placeholder elements that mirror the approximate layout of real content — to improve perceived performance and reduce layout shift when data arrives.

The implementation consists of three parts: a generic `Skeleton` primitive component, a `TokenCardSkeleton` composite that matches the `TokenCard` layout, and integration of `TokenCardSkeleton` into the dashboard while `useTokens` is in a loading state.

## Glossary

- **Skeleton**: A pulsing gray placeholder element that approximates the shape of real content while data is loading.
- **TokenCard**: The card component that displays a single token's name, symbol, and summary data on the dashboard.
- **TokenCardSkeleton**: A composite skeleton component that mirrors the layout of `TokenCard` using `Skeleton` primitives.
- **Dashboard**: The main page that lists all tokens fetched via the `useTokens` hook.
- **useTokens**: The React hook responsible for fetching the list of tokens; exposes an `isLoading` boolean.
- **Pulse_Animation**: A CSS `@keyframes` animation that cycles the opacity of skeleton elements to signal loading state.

---

## Requirements

### Requirement 1: Skeleton Primitive Component

**User Story:** As a developer, I want a reusable `Skeleton` primitive, so that I can compose skeleton layouts for any content shape without duplicating animation logic.

#### Acceptance Criteria

1. THE `Skeleton` component SHALL accept a `variant` prop with values `text`, `rect`, and `circle`.
2. THE `Skeleton` component SHALL accept `width`, `height`, and `className` props to allow callers to control dimensions.
3. WHEN `variant` is `circle`, THE `Skeleton` component SHALL render with equal width and height and `border-radius: 50%`.
4. WHEN `variant` is `text`, THE `Skeleton` component SHALL render with a height appropriate for a single line of text and fully rounded corners.
5. WHEN `variant` is `rect`, THE `Skeleton` component SHALL render as a rectangular block with no border-radius override.
6. THE `Skeleton` component SHALL apply a CSS `animate-pulse` class (Tailwind utility backed by a `@keyframes` animation) to produce the pulsing effect without JavaScript timers.
7. THE `Skeleton` component SHALL render with `aria-hidden="true"` so screen readers ignore placeholder content.
8. THE `Skeleton` component SHALL render a `<div>` with a gray background (`bg-gray-200` or equivalent) as its root element.

---

### Requirement 2: TokenCardSkeleton Composite Component

**User Story:** As a developer, I want a `TokenCardSkeleton` component, so that the dashboard can display a layout-accurate placeholder while token data is being fetched.

#### Acceptance Criteria

1. THE `TokenCardSkeleton` component SHALL compose `Skeleton` primitives to approximate the visual layout of `TokenCard` (title row, symbol row, and at least one data row).
2. THE `TokenCardSkeleton` component SHALL use the same outer card container dimensions and spacing as `TokenCard` so no layout shift occurs when real content replaces the skeleton.
3. THE `TokenCardSkeleton` component SHALL accept a `className` prop and forward it to its root element.
4. THE `TokenCardSkeleton` component SHALL render all internal `Skeleton` elements with `aria-hidden="true"` (inherited from the `Skeleton` primitive).

---

### Requirement 3: Dashboard Loading Integration

**User Story:** As a user, I want to see skeleton placeholders while the token list is loading, so that I perceive the page as responsive rather than blank.

#### Acceptance Criteria

1. WHEN `useTokens` returns `isLoading: true`, THE Dashboard SHALL render a grid of `TokenCardSkeleton` components in place of real `TokenCard` components.
2. WHEN `useTokens` returns `isLoading: false` and data is available, THE Dashboard SHALL replace all `TokenCardSkeleton` components with the corresponding `TokenCard` components.
3. THE Dashboard SHALL render a fixed count of `TokenCardSkeleton` placeholders (default: 6) during loading so the grid layout is visually stable.
4. IF `useTokens` returns an error, THEN THE Dashboard SHALL display an error message and SHALL NOT render skeleton placeholders.

---

### Requirement 4: Animation Quality

**User Story:** As a user, I want the skeleton animation to feel smooth and unobtrusive, so that the loading state does not feel jarring or distracting.

#### Acceptance Criteria

1. THE Pulse_Animation SHALL be implemented exclusively with CSS `@keyframes` and SHALL NOT use JavaScript `setInterval` or `setTimeout` to drive the animation.
2. THE Pulse_Animation SHALL complete one full cycle within 2 seconds.
3. WHERE the user has enabled the `prefers-reduced-motion` media query, THE Skeleton component SHALL suppress the pulse animation to respect accessibility preferences.

---

### Requirement 5: Accessibility

**User Story:** As a screen reader user, I want skeleton elements to be invisible to assistive technology, so that I am not presented with meaningless placeholder content.

#### Acceptance Criteria

1. THE `Skeleton` component SHALL render with `aria-hidden="true"` on its root element.
2. WHEN the Dashboard is in a loading state, THE Dashboard SHALL expose an `aria-label` or `aria-live` region that announces "Loading tokens" to assistive technology.
3. WHEN loading completes, THE Dashboard SHALL update the `aria-live` region to reflect that content is available.
