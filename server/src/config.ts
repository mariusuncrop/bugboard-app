const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: toInt(process.env.PORT, 4000),
  authSecret: process.env.AUTH_SECRET ?? 'dev-only-secret-change-me',
  /** Guards POST /api/test/reset. Off unless explicitly enabled. */
  testEndpointsEnabled: (process.env.ENABLE_TEST_ENDPOINTS ?? 'true') === 'true',
  /** Artificial latency on GET /api/stats so the UI has a loading state to test. */
  statsDelayMs: toInt(process.env.STATS_DELAY_MS, 1200),
  maxUploadBytes: toInt(process.env.MAX_UPLOAD_BYTES, 2 * 1024 * 1024),
  tokenTtlSeconds: toInt(process.env.TOKEN_TTL_SECONDS, 60 * 60 * 8),
};
