# Vanilla JavaScript integration example

This isolated host imports only the public `@character-creator/schema`, `core`, `renderer-canvas`, and `creator-ui` package entry points. It uses a configurable relative asset base URL and contains no repository-internal imports or absolute developer paths.

The example proves both supported integration modes: render a saved recipe without an editor, or mount an editor that returns an explicit `destroy()` cleanup handle. See `docs/INTEGRATION.md` for compatibility, CSP, URL, and error-handling guidance.
