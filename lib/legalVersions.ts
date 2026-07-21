// Single source of truth for each legal document's current version. Must
// match the `lastUpdated` prop passed to LegalPageLayout on that document's
// page — bump both together whenever a policy's substance actually changes,
// so a stored acceptance version always maps back to real page text.
export const LEGAL_VERSIONS = {
  privacy: '2026-07-12',
  terms: '2026-07-12',
  cookies: '2026-07-21',
} as const
