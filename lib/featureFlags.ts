// Simple boolean flags for temporarily hiding a feature from the UI without
// deleting its code or touching any data — flip back to true when ready.
// Nothing more elaborate (no remote config, no per-user targeting) needed
// at this project's size; add one only if that changes.
export const FEATURE_FLAGS = {
  // Hides the Bonds sub-tab (and its add-form) on the Assets page while the
  // team figures out what to do with it. Any existing Bonds holdings stay
  // in the database and still count toward totals/net worth as normal —
  // this only hides the entry point for adding new ones.
  bondsTab: false,
}
