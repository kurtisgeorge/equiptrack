// Vercel serverless entry point. Every request under /api/* is rewritten to
// this one function (see vercel.json), which delegates to the same Express
// app used for local dev — `ready` gates the handler so a request is never
// served before the database schema/migrations (and, in production, the
// first-boot demo seed) have finished.
import { app, ready } from "../backend/src/server"

export default async function handler(req: any, res: any) {
  await ready
  return (app as unknown as (req: any, res: any) => void)(req, res)
}
