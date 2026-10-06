---
"@iota/apps-ui-kit": minor
---

Clickable `TableRow`s ignore clicks coming from interactive elements inside them (links, buttons, inputs, `role="button"`…) or that end a text selection, and accept an `onAuxClick` handler. While one of those elements is hovered the row is not highlighted and the hovered link is highlighted instead. Links spread with `ROW_LINK_PROPS`, which go where the row goes, keep the row hover and are not highlighted. Adds `INTERACTIVE_ELEMENT_SELECTOR`, `ROW_LINK_ATTRIBUTE`, `ROW_LINK_PROPS` and the `row-hover`, `inner-link` and `inner-link-hover` Tailwind variants.
