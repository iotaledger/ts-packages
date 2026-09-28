# GraphQL schema versions

GraphQL schema versions. The last one references the schema currently in `latest`, the others are
frozen. When the iota submodule schema changes, `pnpm update-graphql-schemas` freezes the current
`latest` under its version, regenerates every frozen version, generates a new `latest` and
references it here.

-   2025.2
