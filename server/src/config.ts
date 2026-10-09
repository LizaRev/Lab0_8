import { z } from "zod";

const serverConfigSchema = z.object({
  PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(3000),

  HOST: z.string().default("127.0.0.1"),

  LOG_DIR: z.string().default("./server/logs"),

  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    ),

  MAX_CONNECTIONS_PER_IP: z.coerce
    .number()
    .int()
    .min(1)
    .default(16),

  MAX_ROOMS: z.coerce
    .number()
    .int()
    .min(1)
    .default(50),

  MAX_PLAYERS_PER_ROOM: z.coerce
    .number()
    .int()
    .min(1)
    .default(16),

  LOG_LEVEL: z
    .enum([
      "fatal",
      "error",
      "warn",
      "info",
      "debug",
      "trace",
      "silent",
    ])
    .default("info"),
});

export type ServerConfig =
  z.infer<typeof serverConfigSchema>;

const config =
  serverConfigSchema.parse({
    PORT: process.env.PORT,
    HOST: process.env.HOST,
    LOG_DIR: process.env.LOG_DIR,
    ALLOWED_ORIGINS:
      process.env.ALLOWED_ORIGINS,
    MAX_CONNECTIONS_PER_IP:
      process.env.MAX_CONNECTIONS_PER_IP,
    MAX_ROOMS:
      process.env.MAX_ROOMS,
    MAX_PLAYERS_PER_ROOM:
      process.env.MAX_PLAYERS_PER_ROOM,
    LOG_LEVEL:
      process.env.LOG_LEVEL,
  });

const {
  PORT,
  HOST,
  LOG_DIR,
  ALLOWED_ORIGINS,
  MAX_CONNECTIONS_PER_IP,
  MAX_ROOMS,
  MAX_PLAYERS_PER_ROOM,
  LOG_LEVEL,
} = config;

export {
  PORT,
  HOST,
  LOG_DIR,
  ALLOWED_ORIGINS,
  MAX_CONNECTIONS_PER_IP,
  MAX_ROOMS,
  MAX_PLAYERS_PER_ROOM,
  LOG_LEVEL,
};