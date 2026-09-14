# Annotation Help Top Padding Design

## Goal

Adjust the 3D annotation help dialog so its top inner padding is `0`, while
the right, bottom, and left inner padding remain `24px`.

## Approach

Use an explicit four-value CSS declaration on `.annotation-help`:
`padding: 0 24px 24px 24px`. This is the smallest scoped change and makes the
directional intent clear. The backdrop, dialog width, border radius, paragraph
spacing, and all unrelated annotation styles remain unchanged.

## Verification

Add a regression test that opens the help dialog and checks its computed
padding values. Run the focused toolbar test, then the complete frontend unit
test suite and lint if the focused test passes.
