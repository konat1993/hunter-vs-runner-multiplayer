# Backend (game server)

This package runs the **Colyseus** WebSocket game server and small **HTTP** routes (`/health`, `/session/active-game`), bootstrapped with **NestJS** for dependency injection (e.g. Supabase).

**Setup, environment variables, and run commands** are documented in the [repository root README](../README.md#first-time-setup).

Key entry point: `src/main.ts`.
