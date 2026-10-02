---
'@iota/iota-sdk': patch
---

Forward `additionalArgs` in `devInspectTransactionBlock`, previously ignored, which caused `skipChecks`, `gasBudget`, `gasObjects` and `gasSponsor` to have no effect
