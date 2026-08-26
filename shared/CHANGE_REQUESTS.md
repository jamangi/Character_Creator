# Change-request register

This register tracks intentional changes to accepted behavior or product scope. Unlike defects, these requests may alter a working implementation. Statuses are `PROPOSED`, `APPROVAL PENDING`, `ACCEPTED`, `IN PROGRESS`, `READY FOR REVIEW`, and `DELIVERED`.

| ID | Area | Requested behavior | Architecture layers | Status | Builder task | Validation checkpoint |
|---|---|---|---|---|---|---|
| CHANGE-001 | Portrait output | Keep the full recipe unchanged, but omit bottom and shoe fragments from portrait previews and exported portrait PNGs. | Render-profile projection policy; resolver draw-list selection; Studio export | READY FOR REVIEW | TASK-014 | Side-by-side portrait/full-body proof; exported recipe remains byte-identical |
| CHANGE-002 | Sprite output | Keep the equipped mouth in the recipe, but omit mouth fragments from sprite previews and exported sprite frames. | Render-profile projection policy; resolver draw-list selection; Studio/animation output | READY FOR REVIEW | TASK-014 | Side-by-side sprite/full-body proof; no missing-coverage error and no recipe mutation |
| CHANGE-003 | Release animation scope | For the first starter-rig release, advertise only front-facing `idle`, `walk`, and `run`; defer back, left, right, and `sit` while keeping the general engine extensible. | Product scope; starter rig; selector coverage; validation; docs and Pages claims | DELIVERED | TASK-010 | Selector and artifact audits match APPROVAL-001 Option 1 |
| CHANGE-004 | Expression intent | Positive expressions use upward mouth corners at varied intensity; thoughtful, concerned, and annoyed use neutral-to-downward corners appropriate to their intent. | Starter-pack expression mapping and generated art | READY FOR REVIEW | TASK-015 | Labeled three-hero expression sheets pass explicit visual review |

## Change discipline

- An accepted request may be implemented without another product decision unless its task discovers a materially broader contract consequence.
- Presentation-only requests must not silently mutate portable recipes.
- Product-scope changes that invalidate prior public claims require an owner decision in `root/APPROVALS.md` before implementation.
- Mark a request `DELIVERED` only after its technical checks and named human checkpoint pass.
