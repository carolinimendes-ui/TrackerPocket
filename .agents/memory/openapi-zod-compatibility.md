---
name: OpenAPI and Zod compatibility
description: Compatibility note for generated validation schemas in this workspace.
---

When the workspace's generated Zod package resolves to Zod 3, OpenAPI integer schemas can generate unsupported `z.int()` calls. Use numeric schemas for generated API contracts and keep integer validation at the database/input boundary when necessary.

**Why:** The installed generator emits Zod 4-style integer validators while the shared runtime currently exposes Zod 3 APIs, causing library typechecks to fail after otherwise valid code generation.

**How to apply:** If a new API contract needs whole-number values, prefer `type: number` in OpenAPI until the workspace Zod/generator versions are upgraded together; retain minimum bounds and coerce numeric query/path values.

Date-only fields validated with generated `zod.coerce.date()` are serialized by Express as full ISO timestamps, even when the API contract says `format: date`.

**Why:** The progress endpoint returned values such as `2026-08-05T00:00:00.000Z`; treating them as date-only strings and appending another time caused invalid browser dates.

**How to apply:** Normalize date-only API values to their first 10 characters before composing local date strings or assigning them to HTML date inputs.