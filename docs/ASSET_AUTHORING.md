# Starter asset author guide

1. Choose the exact target rig family and use only its declared slots, planes, regions, anchors, selectors, and dimensions.
2. Author transparent PNG fragments at the profile canvas size. Use the declared palette default color exactly for pixels that role may recolor; preserve intentional outline/highlight colors as different source values.
3. Declare every equip slot, dependency, conflict, capability, fragment tag, coverage region, and suppression effect. Replacement anatomy must cover the region it suppresses in portrait, full body, and every advertised animation frame.
4. Give each asset a stable namespaced ID, semantic version, author, license, source, and integrity value. References must be safe forward-slash relative paths.
5. Run the validator against the pack root. Fix all schema, files, compatibility, coverage, geometry, and distribution errors before visual review.
6. Review generated contact sheets at native sprite scale and normal portrait/full-body scale. Check seams, occlusion, ground contact, expression intent, and extreme palette values.

For the starter vocabulary, body/clothing roles are `skin.base`, `hair.base`, `garment.top`, `garment.bottom`, `garment.outfit`, `garment.outerwear`, `garment.shoes`, `body.arm.left`, and `body.arm.right`. Accessory roles are stable semantic addresses: `accessory.hat`, `accessory.face`, `accessory.ear`, `accessory.neck`, `accessory.handheld`, `accessory.back`, `accessory.waist`, and `accessory.charm`.

The starter animation contract is intentionally front-only `idle`, `walk`, and `run`. Do not publish selectors for art that has not been authored and reviewed.
