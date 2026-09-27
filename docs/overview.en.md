# Layered Motion 0.1

This is an independent study of floating panels and a left-side assistant page, derived from recordings dated 2026-09-27. The Chinese [specification](specification.md) is normative for version 0.1.

The central idea is coordinated variation: semantic units remain coherent while different layers arrive and settle at different times. Small residual motion softens the stop. Background depth hands attention to foreground content. Entry and exit serve different purposes.

## Core requirements

- Group motion by meaning; keep text, glyph and card surfaces coherent unless a specific state transition requires separation.
- Design onset, main travel and settling separately. Staggering a single curve is not sufficient for the measured reference.
- Separate an item's center motion from its own scale when spacing and item size evolve differently.
- Specify both entry and exit. Review them independently.
- Retarget visible motion without resetting current position or velocity; invalidate stale delays.
- Drive animation with elapsed time. Freeze all channels when frame inspection is paused.
- Honor reduced-motion preferences and provide equivalent button / keyboard access.

## Evidence and limits

The archive contains three valid recordings (2,409 frames), two empty source files, and 147 consecutive frames covering four detailed transitions. Actual presentation timestamps are retained. Independent landmark tracking supports a five-layer assistant entry and different scale/spacing behavior during control-center exit.

Spring values are empirical fits in a 1182 × 836 reference coordinate system, not recovered native internals. Touch input was not recorded. The interactive lab reconstructs motion using DOM and SVG; it simplifies content and some visual assets. Motion tests do not establish complete production accessibility or device-wide frame-rate guarantees.

Run `npm ci && npm start` with Node.js 22+. For tests, install Chromium with `npx playwright install chromium`, then run `npm test`. Original videos are downloadable as a release archive; the [archive guide](archive.md) documents restoration and checksums.

Original code and authored documentation are MIT licensed. Recorded third-party artwork and trademarks remain subject to their own rights; see [media notice](../MEDIA_NOTICE.md).
