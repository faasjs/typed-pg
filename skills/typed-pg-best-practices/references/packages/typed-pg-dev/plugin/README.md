# typed-pg-dev / plugin

The `plugin` entrypoint exports `TypedPgVitestPlugin`, which starts a temporary
database for Vitest, provisions one temporary database per Vitest worker when
file parallelism is enabled, runs migrations from `./migrations`, injects the
resulting connection string into `process.env.DATABASE_URL` by default, and
truncates table data before each test.
