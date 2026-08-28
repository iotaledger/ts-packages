---
'@iota/graphql-transport': patch
'@iota/iota-sdk': patch
---

Update the GraphQL schema and open-rpc types: add the `AFFECTED` transaction relationship, `TransactionBlockFilter.affectedAddress`, `Checkpoint.bcs` and `Query.transactionsByDigests`, and deprecate `Query.transactionBlocksByDigests` and the `scanLimit` argument.
