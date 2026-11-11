---
'@iota/iota-sdk': minor
'@iota/graphql-transport': minor
---

Subscriptions are only served through GraphQL. `IotaHTTPTransport.subscribe` now fails with an error that points to `IotaClientGraphQLTransport`, and its `WebSocketConstructor` and `websocket` options are deprecated and ignored. `IotaClientGraphQLTransport` no longer falls back to JSON-RPC for `subscribeEvent` and `subscribeTransaction`; a filter that GraphQL cannot express is refused.
