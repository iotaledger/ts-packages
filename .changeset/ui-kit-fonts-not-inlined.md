---
'@iota/apps-ui-kit': minor
---

Stop inlining fonts as base64 into `style.css`, which shrinks it from about 2 MB to about 125 KB.

Fonts are now separate entry points: import `@iota/apps-ui-kit/fonts/inter.css` and, for the names theme, `@iota/apps-ui-kit/fonts/roboto-flex.css` alongside `@iota/apps-ui-kit/styles`.
