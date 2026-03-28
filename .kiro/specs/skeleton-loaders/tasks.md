# Implementation Plan: Skeleton Loaders

## Overview

Implement skeleton loading placeholders for the StellarForge dashboard using a `Skeleton` primitive, a `TokenCardSkeleton` composite, and a `useTokens` hook, then integrate them into the dashboard's loading state.

## Tasks

- [ ] 1. Create the `Skeleton` primitive component
  - Create `frontend/src/components/UI/Skeleton.tsx`
  - Implement `SkeletonProps` interface with `variant`, `width`, `height`, and `className` props
  - Apply `bg-gray-200 animate-pulse motion-reduce:animate-none` base classes
  - Derive shape classes from `variant`: `text` → `rounded-full` + `h-[1em]`, `circle` → `rounded-full` + equal dimensions, `rect` → no border-radius override
  - Set `aria-hidden="true"` on the root `<div>`
  - Convert numeric `width`/`height` to `px` via inline `style`; pass strings through directly
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 4.1, 4.3, 5.1_

  - [ ]* 1.1 Write unit tests for `Skeleton`
    - Test `animate-pulse` class is present
    - Test `variant="text"` renders `rounded-full`
    - Test `variant="rect"` has no rounded class
    - Test root element is `<div>` with `bg-gray-200`
    - Test `aria-hidden="true"` is always set
    - Test `motion-reduce:animate-none` class is present (mock `prefers-reduced-motion`)
    - _Requirements: 1.6, 1.7, 1.8, 4.3_

  - [ ]* 1.2 Write property test for `Skeleton` — Property 1: aria-hidden invariant
    - **Property 1: Skeleton always hides from assistive technology**
    - **Validates: Requirements 1.7, 5.1**
    - Use `fc.record({ variant: fc.constantFrom('text','rect','circle'), width: fc.option(fc.nat()), height: fc.option(fc.nat()), className: fc.option(fc.string()) })`
    - Assert `aria-hidden="true"` on root element for every generated input
    - Tag: `// Feature: skeleton-loaders, Property 1: Skeleton always hides from assistive technology`

  - [ ]* 1.3 Write property test for `Skeleton` — Property 2: className/dimension forwarding
    - **Property 2: Skeleton forwards dimensions and className**
    - **Validates: Requirements 1.2**
    - Use `fc.string({ minLength: 1 })` for className and `fc.nat()` for width/height
    - Assert className appears on root element and dimensions are reflected in style
    - Tag: `// Feature: skeleton-loaders, Property 2: Skeleton forwards dimensions and className`

  - [ ]* 1.4 Write property test for `Skeleton` — Property 3: circle equal dimensions
    - **Property 3: Circle variant enforces equal dimensions**
    - **Validates: Requirements 1.3**
    - Use `fc.nat({ min: 10, max: 500 })` for size; render with `variant="circle"` and equal width/height
    - Assert `rounded-full` class and equal computed width/height in style
    - Tag: `// Feature: skeleton-loaders, Property 3: Circle variant enforces equal dimensions`

- [ ] 2. Create the `TokenCardSkeleton` composite component
  - Create `frontend/src/components/UI/TokenCardSkeleton.tsx`
  - Implement `TokenCardSkeletonProps` with `className` prop
  - Use same outer container classes as `TokenCard` (`bg-white shadow rounded-lg`)
  - Compose `Skeleton` primitives: title row (`rect`, ~60% width, `h-5`), symbol row (`text`, ~30% width), data row (`rect`, ~80% width, `h-4`)
  - Forward `className` to root element
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 2.1 Write unit tests for `TokenCardSkeleton`
    - Test renders at least 3 `Skeleton` children
    - Test root element has same container classes as `TokenCard`
    - Test `className` prop is forwarded to root
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 2.2 Write property test for `TokenCardSkeleton` — Property 4: className forwarding
    - **Property 4: TokenCardSkeleton forwards className to root**
    - **Validates: Requirements 2.3**
    - Use `fc.string({ minLength: 1 })` for className
    - Assert root element contains the provided className for every generated input
    - Tag: `// Feature: skeleton-loaders, Property 4: TokenCardSkeleton forwards className to root`

- [ ] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Create the `useTokens` hook
  - Create `frontend/src/hooks/useTokens.ts`
  - Implement `UseTokensResult` interface: `{ data: TokenInfo[] | null, isLoading: boolean, error: string | null }`
  - Fetch token list from the Stellar service; set `isLoading` during fetch, populate `data` on success, set `error` on failure
  - _Requirements: 3.1, 3.2, 3.4_

- [ ] 5. Integrate skeleton loaders into the Dashboard
  - Modify `frontend/src/App.tsx` (or extract a `Dashboard` component) to call `useTokens()`
  - Add an `aria-live="polite"` region that announces "Loading tokens" when `isLoading` is true and updates when loading completes
  - When `isLoading=true` and no error: render `Array(6).fill(null).map((_, i) => <TokenCardSkeleton key={i} />)` in the token grid
  - When `isLoading=false` and `data` is available: render `TokenCard` components
  - When `error` is set: render an error message and no skeletons
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.2, 5.3_

  - [ ]* 5.1 Write unit tests for Dashboard loading integration
    - Test renders exactly 6 skeletons when `isLoading=true`
    - Test renders `aria-live` region with "Loading tokens" when `isLoading=true`
    - Test replaces skeletons with `TokenCard` components when `isLoading=false` and data present
    - Test renders error message and zero skeletons when error is set
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.2_

  - [ ]* 5.2 Write property test for Dashboard — Property 5: skeletons iff loading
    - **Property 5: Dashboard renders skeletons iff loading**
    - **Validates: Requirements 3.1, 3.2**
    - Use `fc.boolean()` combined with mock data arrays to generate `useTokens` states
    - Assert `TokenCardSkeleton` elements present iff `isLoading=true` and `error=null`
    - Tag: `// Feature: skeleton-loaders, Property 5: Dashboard renders skeletons iff loading`

  - [ ]* 5.3 Write property test for Dashboard — Property 6: error suppresses skeletons
    - **Property 6: Error state suppresses skeletons**
    - **Validates: Requirements 3.4**
    - Use `fc.string({ minLength: 1 })` for error strings
    - Assert zero `TokenCardSkeleton` elements and at least one error message element
    - Tag: `// Feature: skeleton-loaders, Property 6: Error state suppresses skeletons`

  - [ ]* 5.4 Write property test for Dashboard — Property 7: aria-live updates on load completion
    - **Property 7: aria-live region updates on load completion**
    - **Validates: Requirements 5.3**
    - Use `fc.array(fc.record({ name: fc.string(), symbol: fc.string() }))` for data payloads
    - Simulate `isLoading=true` → `isLoading=false` transition; assert `aria-live` region text changes
    - Tag: `// Feature: skeleton-loaders, Property 7: aria-live region updates on load completion`

- [ ] 6. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` (already installed) and run in Vitest with jsdom
- Each property test must run a minimum of 100 iterations (fast-check default)
- Test files: `Skeleton.test.tsx`, `TokenCardSkeleton.test.tsx`, `Dashboard.test.tsx` (or `App.test.tsx`)
