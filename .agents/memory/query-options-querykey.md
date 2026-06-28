---
name: Orval-generated hooks require explicit queryKey
description: When passing custom query options to Orval-generated React Query hooks in this project, queryKey must always be included.
---

## Rule
Always include `queryKey` when passing `{ query: { ... } }` options to Orval-generated hooks.

```typescript
// WRONG – TypeScript error: Property 'queryKey' is missing
useGetExam(id, { query: { enabled: !!id } });

// CORRECT
import { useGetExam, getGetExamQueryKey } from "@workspace/api-client-react";
useGetExam(id, { query: { enabled: !!id, queryKey: getGetExamQueryKey(id) } });
```

**Why:** The generated `UseQueryOptions` type is NOT `Partial<UseQueryOptions>` — it's the full type, which requires `queryKey`. Every query hook has a matching `get<HookName>QueryKey(...)` export.

**How to apply:** Any time a hook call passes `{ query: { ... } }`, add the matching `queryKey` from the exported `get*QueryKey` function.
