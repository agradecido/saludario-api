import pino, { type Logger } from "pino";

export function createLogger(level: string): Logger {
  return pino({
    level,
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      }
    }
  });
}

export function withRequestId(logger: Logger, requestId: string): Logger {
  return logger.child({ request_id: requestId });
}
