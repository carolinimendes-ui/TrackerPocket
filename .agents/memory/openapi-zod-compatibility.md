---
name: OpenAPI and Zod compatibility
description: Compatibility note for generated validation schemas in this workspace.
---

When the workspace's generated Zod package resolves to Zod 3, OpenAPI integer schemas can generate unsupported `z.int()` calls. Use numeric schemas for generated API contracts and keep integer validation at the database/input boundary when necessary.

**Why:** The installed generator emits Zod 4-style integer validators while the shared runtime currently exposes Zod 3 APIs, causing library typechecks to fail after otherwise valid code generation.

**How to apply:** If a new API contract needs whole-number values, prefer `type: number` in OpenAPI until the workspace Zod/generator versions are upgraded together; retain minimum bounds and coerce numeric query/path values.