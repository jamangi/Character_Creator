# DEFECT-001 — animation fragments remain static

## Observation

During Task 006 human review, the base body and shoes changed between walk/run frames while hair, top, bottom, outerwear, glasses, and other non-critical slots remained aligned to their static sprite art. In the run cycle, the base also bobs vertically without the clothing and glasses following it.

This is not merely a timing preference: it breaks the visual relationship between equipped layers and the anatomy they cover. The current automated critical-art check only requires exact motion fragments for base bodies, body modules, and shoes, so it does not detect the visible failure in other body-coupled slots.

## Preserved evidence

| Clip | Frames |
|---|---|
| Walk | [`walk-frame-01.png`](walk-frame-01.png), [`walk-frame-02.png`](walk-frame-02.png) |
| Run | [`run-frame-01.png`](run-frame-01.png), [`run-frame-02.png`](run-frame-02.png), [`run-frame-03.png`](run-frame-03.png), [`run-frame-04.png`](run-frame-04.png) |

The cyan contact marker and gold ground line belong to the review overlay. Compare the leg stride and vertical body position against the stationary trouser silhouette, torso layers, hair, and glasses.

## Expected result

For every advertised motion request:

- body-coupled garments follow the corresponding torso/leg pose;
- head-coupled hair and accessories follow vertical body motion;
- handheld, back, and outerwear fragments either supply suitable motion art or use an explicitly legal rig-driven transform;
- static fallback remains available only where its visual result is intentionally stationary;
- the validator fails visibly stuck body-coupled coverage before human review.

## Ownership

Tracked in [`../../DEFECTS.md`](../../DEFECTS.md) and implemented by [`../../tasks/TASK-011-HIGH-animation-fragment-motion.md`](../../tasks/TASK-011-HIGH-animation-fragment-motion.md) after the release selector set is settled by Task 010.
