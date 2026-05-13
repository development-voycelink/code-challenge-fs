export const config = {
  port: parseInt(process.env.PORT ?? "3002", 10),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
} as const;
