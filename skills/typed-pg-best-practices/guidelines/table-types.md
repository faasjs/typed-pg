# Table Types Guide

When implementing or reviewing `typed-pg` table typing, default to declaration merging on
`Tables`.

## Use This Guide When

- defining application tables for `typed-pg`
- adding columns or JSONB shapes
- changing exported type helpers such as `TableType`, `ColumnName`, or `ColumnValue`
- reviewing query inference regressions

## Default Workflow

1. Extend `Tables` in app code with `declare module 'typed-pg'`.
2. Model each table as its runtime row shape.
3. Let `client.query`, `TableType`, `ColumnName`, and `ColumnValue` infer from that source.
4. Add or update `expectTypeOf` coverage when library type behavior changes.

## Minimal Example

```ts
declare module 'typed-pg' {
  interface Tables {
    users: {
      id: number
      name: string
      metadata: {
        age: number
        timezone?: string
      }
    }
  }
}
```

## Rules

### 1. Treat `Tables` as the source of truth

- `Tables` drives table-name inference and column-level type inference.
- When table shape changes, update the merged interface before adjusting query code.

### 2. Keep row shapes concrete

- Model row fields with their actual runtime names and value shapes.
- Prefer exact object types for JSON or JSONB columns instead of `any`.
- Include optional properties only when the stored JSON shape is genuinely optional.

### 3. Preserve the consumer extension pattern

- Library changes MUST keep module augmentation on `Tables` working.
- Do not replace declaration merging with an app-specific registry or runtime-only typing.
- When changing public types, keep the fallback behavior for untyped tables deliberate and
  documented.

### 4. Keep helper types aligned

- `TableType<T>` should represent the row shape for a known table.
- `ColumnName<T>` should stay aligned with actual keys of the table type.
- `ColumnValue<T, C>` should resolve to the value type for that column.

### 5. Update public type tests when the surface changes

- Add or update `expectTypeOf` assertions for changes to declaration merging or query inference.
- If a new query-builder feature affects result shape, test both runtime output and inferred types.

## Review Checklist

- `Tables` contains the new or changed table shape
- JSON and JSONB columns use concrete object types
- declaration merging still works from consumer code
- helper types stay aligned with the merged table definition
- public type changes include `expectTypeOf` coverage

## Read Next

- [Table Type Extension Specification](../references/specs/table-type-extension.md)
- [Query Builder Guide](./query-builder.md)
- [Testing Guide](./testing.md)
