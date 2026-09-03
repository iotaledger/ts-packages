---
'@iota/graphql-transport': patch
'@iota/iota-sdk': patch
---

Update the GraphQL schema and open-rpc types: add the `AFFECTED` transaction relationship, `TransactionBlockFilter.affectedAddress`, `Checkpoint.bcs` and `Query.transactionsByDigests`, and deprecate `Query.transactionBlocksByDigests` and the `scanLimit` argument.

Update the GraphQL schema and open-rpc types for the transaction deny rules system transactions: add `TransactionDenyRulesUpdateTransaction` to the `TransactionBlockKind` union and `TransactionDenyRulesCreateTransaction` to the `EndOfEpochTransactionKind` union, with the matching `TransactionDenyRulesUpdate` and `TransactionDenyRulesCreate` transaction kinds in the JSON-RPC types.
