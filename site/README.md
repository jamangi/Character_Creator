# GitHub Pages human-validation hub

This directory is the deployable GitHub Pages root. It exists so project owners and artists can review real outputs without cloning the repository or running development tools.

Production URL: <https://jamangi.github.io/Character_Creator/>

## Publishing contract

A task marked `Human validation: Required` must:

1. Publish its browser-viewable output beneath `site/validation/<task-id>/`. Keep historical task paths stable.
2. Add or update one entry in `site/validation/index.json`.
3. Link the artifact from the landing page registry; `site/app.js` renders registry entries automatically.
4. State what changed, what the reviewer should inspect, known limitations, and the source commit.
5. Avoid claiming approval in the task merely because deployment succeeded. Technical validation and human acceptance are separate.

When the interactive Studio is ready, it may replace the landing page's preview panel or become the main route. The review registry and historical artifacts must remain reachable.

## Registry shape

```json
{
  "updated": "YYYY-MM-DD",
  "entries": [
    {
      "task": "TASK-002",
      "title": "Composition vertical slice",
      "status": "ready-for-review",
      "summary": "What this artifact proves.",
      "href": "validation/task-002/",
      "review": ["Specific thing to inspect"],
      "commit": "full-or-short-sha"
    }
  ]
}
```

Allowed status vocabulary is `planned`, `in-progress`, `ready-for-review`, `changes-requested`, and `accepted`.

## Local check

Serve `site/` through any static HTTP server. Verify that the page loads without console errors, the registry renders, keyboard focus is visible, and internal artifact links resolve. Opening `index.html` directly from disk is not supported because the registry is fetched as JSON.
