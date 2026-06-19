# Serverless And Proxy Notes

## Read this when

- deploying Drizzle on edge or serverless runtimes
- wiring D1, Neon HTTP, Turso/libSQL, or mobile SQLite surfaces
- using proxy-oriented access patterns

## Durable guidance

- Favor the provider-specific guide when the runtime is constrained or non-Node.
- Keep runtime code and migration code separate if they need different clients or capabilities.
- Use the serverless performance docs when adding cache, replica, or latency-sensitive patterns to a remote DB flow.

## Helpful official surfaces

- `Query performance`
- `Drizzle Serverless performance`
- tutorials for Netlify Edge, Vercel Edge, and Supabase Edge
- `Drizzle HTTP proxy`

## Source map

- `https://orm.drizzle.team/docs/perf-queries`
- `https://orm.drizzle.team/docs/perf-serverless`
- `https://orm.drizzle.team/docs/connect-drizzle-proxy`
- `https://orm.drizzle.team/docs/tutorials/drizzle-with-netlify-edge-functions-neon`
- `https://orm.drizzle.team/docs/tutorials/drizzle-with-vercel-edge-functions`
- `https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase-edge-functions`
