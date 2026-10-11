// Eyes Opener: Core system module providing logic and utilities for env.
/* Scripts do not read .env.local on their own; Next.js does. Import this first. */
try { process.loadEnvFile(".env.local"); } catch { /* no file: the default address is used */ }
export {};
