---
'@iota/iota-sdk': minor
---

Add `getRpcUrl` and deprecate `getFullnodeUrl`. The network `url` is the JSON-RPC endpoint, so the new name better reflects its meaning. `getFullnodeUrl` still works as an alias.
