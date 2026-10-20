---
'@iota/iota-sdk': minor
---

Add `CoinFormat.TruncatedDecimals` to `formatBalance`, which truncates balances to two decimals without compact suffixes.

`showSign` now derives the sign from the numeric value, so negative values whose formatted output loses the minus sign still display as negative, while values that truncate to zero display as `+0`.
