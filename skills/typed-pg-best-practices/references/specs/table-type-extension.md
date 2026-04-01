# Table Type Extension Specification

This reference defines how consumers extend table typing in `typed-pg`.

## Extension Mechanism

`typed-pg` uses declaration merging on the exported `Tables` interface.

```ts
declare module 'typed-pg' {
  interface Tables {
    users: {
      id: number
      name: string
      metadata: {
        age: number
      }
    }
  }
}
```

## Derived Helper Types

- `TableName` -> string union of known table names
- `TableType<'users'>` -> row shape for that table
- `ColumnName<'users'>` -> string union of column names for that table
- `ColumnValue<'users', 'name'>` -> value type for that column

## Fallback Behavior

1. Unknown or untyped tables fall back to permissive string or `any` behavior.
2. Known tables should produce narrow inference through the merged `Tables` interface.
3. Library changes should preserve this extension model unless a deliberate breaking change is
   introduced.

## JSON and JSONB Guidance

- Represent JSON-like columns with concrete object types whenever possible.
- Optional nested properties should reflect real runtime optionality.
- Avoid `any` unless the stored document shape is intentionally unconstrained.
