# Change-request register

This register tracks intentional changes to accepted behavior or product scope. Unlike defects, these requests may alter a working implementation. Statuses are `PROPOSED`, `APPROVAL PENDING`, `ACCEPTED`, `IN PROGRESS`, `READY FOR REVIEW`, and `DELIVERED`.

| ID | Area | Requested behavior | Architecture layers | Status | Builder task | Validation checkpoint |
|---|---|---|---|---|---|---|
| CHANGE-001 | Portrait output | Keep the full recipe unchanged, but omit bottom and shoe fragments from portrait previews and exported portrait PNGs. | Render-profile projection policy; resolver draw-list selection; Studio export | DELIVERED | TASK-014 | Accepted 2026-08-26: side-by-side portrait/full-body proof; exported recipe remains byte-identical |
| CHANGE-002 | Sprite output | Keep the equipped mouth in the recipe, but omit mouth fragments from sprite previews and exported sprite frames. | Render-profile projection policy; resolver draw-list selection; Studio/animation output | DELIVERED | TASK-014 | Accepted 2026-08-26: side-by-side sprite/full-body proof; no missing-coverage error and no recipe mutation |
| CHANGE-003 | Release animation scope | For the first starter-rig release, advertise only front-facing `idle`, `walk`, and `run`; defer back, left, right, and `sit` while keeping the general engine extensible. | Product scope; starter rig; selector coverage; validation; docs and Pages claims | DELIVERED | TASK-010 | Selector and artifact audits match APPROVAL-001 Option 1 |
| CHANGE-004 | Expression intent | Positive expressions use upward mouth corners at varied intensity; thoughtful, concerned, and annoyed use neutral-to-downward corners appropriate to their intent. | Starter-pack expression mapping and generated art | DELIVERED | TASK-015 | Accepted 2026-08-26 on all three labeled hero expression sheets |
| CHANGE-005 | Selected mouth dominance | The equipped mouth defines the neutral portrait/full-body mouth; named non-neutral expressions may continue to use expression-authored mouth curves. | Face-channel content mapping; starter generation; resolver/render regression; Studio preview/export | IN PROGRESS | TASK-017 | Four-mouth neutral portrait/full-body comparison plus representative expression row |
| CHANGE-006 | Bilateral arm modules | Expose independently removable Left arm and Right arm replacement assets, using mirrored variants of the current arm designs with complete retained-frame coverage. | Rig slots and anatomy coverage; base-fragment suppression; starter assets; validator; Studio catalog | ACCEPTED | TASK-018 | Base/left/right/both comparison plus retained walk/run strips and equip/remove checks |
| CHANGE-007 | Slot-scoped body and clothing palettes | Give skin, hair, top, bottom, outfit, outerwear, shoes, left arm, and right arm independent palette controls. | Palette vocabulary; manifests and role masks; recipe compatibility; Studio controls; renderer regressions | ACCEPTED | TASK-019 | Simultaneous contrasting-color proof and one-role isolation grid |
| CHANGE-008 | Accessory-scoped palettes | Replace the single shared accent color with stable independently colorable accessory controls; unused accessory colors remain harmless no-ops. | Accessory palette identity; manifests/recipes; Studio labeling; renderer/import/export regressions | ACCEPTED | TASK-020 | Contrasting hat/earrings and multi-accessory proof plus equip/remove identity stability |

## Change discipline

- An accepted request may be implemented without another product decision unless its task discovers a materially broader contract consequence.
- Presentation-only requests must not silently mutate portable recipes.
- Product-scope changes that invalidate prior public claims require an owner decision in `root/APPROVALS.md` before implementation.
- Mark a request `DELIVERED` only after its technical checks and named human checkpoint pass.
