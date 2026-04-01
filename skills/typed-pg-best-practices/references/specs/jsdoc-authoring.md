# JSDoc Authoring Specification

## Background

`typed-pg` now generates API Markdown from source JSDoc with `TypeDoc` and
`typedoc-plugin-markdown`.

`build-docs.ts` generates Markdown from package entrypoints and
`sync-skill-references.ts` mirrors the generated files into this skill's package references.

This specification defines the authoring baseline for public API docs in `typed-pg`.

## Goals

- keep public API docs close to the exported TypeScript source
- make generated Markdown predictable across `typed-pg` packages
- make examples clear enough for both users and AI coding agents

## Non-goals

- replacing README or tutorial-style documentation
- documenting private helpers or test-only code
- standardizing prose outside source JSDoc and generated API Markdown

## Normative Rules

### 1. Source of truth and scope

1. Public API documentation MUST be authored in JSDoc next to exported declarations in
   `packages/*/src`.
2. Generated Markdown under `tmp/api-docs/` and mirrored skill references under
   `skills/typed-pg-best-practices/references/packages/` MUST be treated as derived output and
   MUST NOT be hand-edited.
3. Every exported class, function, interface, type alias, and public variable intended for package
   consumption SHOULD have a JSDoc block.
4. Package entrypoints SHOULD include a package overview comment in `src/index.ts`.

### 2. Language and prose

1. Public JSDoc MUST be written in English.
2. The first sentence SHOULD summarize what the symbol is or does.
3. Additional text SHOULD explain observable behavior, constraints, or caveats instead of
   duplicating the TypeScript signature.
4. When touching public docs, keep the prose aligned with actual runtime and type behavior.

### 3. Tag conventions

1. `@param` SHOULD use `{Type} name - description` style.
2. `@returns` SHOULD be used when the returned value is not obvious from the summary.
3. `@example` SHOULD be provided for public APIs whose usage is non-trivial.
4. `@throws` SHOULD document user-visible errors that callers may need to handle.
5. `@property` SHOULD be used for exported object-shaped types when inline member docs are not
   enough.
6. `{@link Symbol}` SHOULD be preferred for cross references to nearby API symbols.

### 4. Generation and maintenance

1. When exported APIs or public JSDoc change, contributors SHOULD run `npm run doc`.
2. Generated output SHOULD be reviewed to confirm headings, links, and examples render correctly.
3. Touched comments SHOULD move toward this style even if nearby legacy comments are older.

## Example

````ts
/**
 * Creates a testing `postgres.js` client configured for `typed-pg` suites.
 *
 * @param {CreateTestingPostgresOptions<T>} [options] - Optional connection and `postgres.js`
 * overrides.
 * @returns Configured `postgres.js` client instance.
 * @example
 * ```ts
 * const sql = createTestingPostgres()
 * const client = createClient(sql)
 * ```
 */
export function createTestingPostgres<
  T extends Record<string, PostgresType> = Record<string, never>,
>(options: CreateTestingPostgresOptions<T> = {} as CreateTestingPostgresOptions<T>) {
  // ...
}
````
