---
'@iota/iota-sdk': minor
---

Add an optional `faucetWebsite` field to `NetworkConfiguration` and a `getFaucetWebsiteUrl` helper for networks whose faucet is a website instead of an API endpoint. `getFaucetHost` now throws a clearer error when the network exposes a `faucetWebsite` rather than a programmatic `faucet`.
