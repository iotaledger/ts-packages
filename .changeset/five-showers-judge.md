---
'@iota/iota-sdk': patch
---

Fetch more coin pages when resolving the gas payment if the first page cannot pay for the transaction, using at most 255 of the highest-balance coins, and throw a clear error when the 255 highest-balance coins cannot pay for the transaction
