# Versioning and compatibility

- Package versions follow semantic versioning.
- Rig families include a major identity, such as `starter-humanoid@1`; incompatible geometry or selector vocabulary requires a new rig major.
- Recipes carry schema and engine versions and are migrated deterministically on import. Deprecated keys remain readable for the documented support window.
- Asset IDs are stable. A compatible visual correction increments the asset version; removal requires an alias or migration plus a deprecation notice.
- The 0.1 palette compatibility projection retains legacy `garment.primary`, `garment.secondary`, `accent.base`, and `crystal.base` keys while deriving the newer slot-scoped roles when those roles are absent.

Before 1.0, minor releases may add schema fields or APIs, but existing 0.1 recipes and public entry points remain supported unless a release note names a migration path.
