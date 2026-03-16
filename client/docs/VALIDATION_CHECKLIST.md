# Validation Checklist

Use this checklist after each route extraction batch.

## Commands

Run these from `prototype/client`:

```bash
npm run lint
npm run build
npm run validate:routes
npm run validate:data
```

## Route Smoke Tests

1. Open `/dashboard`, `/aging`, `/clients`, `/review`, and `/audit` directly in the browser.
2. Confirm each route highlights the correct sidebar nav item.
3. Confirm root `/` redirects to `/dashboard`.
4. If `/preview` is still enabled, confirm it is accessible by URL and not present in sidebar nav.

## UI Smoke Tests

1. Check desktop layout for page header, section spacing, and right detail rail rendering.
2. Check mobile width (around 375px) for shell stacking, table horizontal scroll, and no broken overflows.
3. Verify table actions and badges render correctly on all extracted pages.

## Data/Copy Checks

1. Confirm no route-level placeholder copy appears on Clients, Review Inbox, or Audit Log.
2. Confirm page copy is sourced from `src/pages/data/pageCopy.json`.
3. Confirm sample data is sourced from route-specific JSON files in `src/pages/data/`.
4. Confirm `npm run validate:data` passes for all sample contract files.
