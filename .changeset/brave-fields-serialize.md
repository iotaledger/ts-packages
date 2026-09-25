---
'@iota/graphql-transport': patch
---

Fix `getDynamicFieldObject` for struct-typed dynamic field names: `0x2::object::ID`, `0x1::string::String` and `0x1::ascii::String` names can be passed as plain strings, and other struct names no longer throw `Unknown layout`.
