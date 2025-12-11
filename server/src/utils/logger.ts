/**
 * Простой logger для замены fastify.log
 */
export const logger = {
  info: (message: string, ...args: any[]): void => {
    console.log(`[INFO] ${message}`, ...args);
  },
  error: (
    error: Error | string | unknown,
    message?: string,
    ...args: any[]
  ): void => {
    if (error instanceof Error) {
      console.error(`[ERROR] ${message || error.message}`, error, ...args);
    } else if (typeof error === "string") {
      console.error(`[ERROR] ${error}`, ...args);
    } else {
      console.error(`[ERROR] ${message || String(error)}`, error, ...args);
    }
  },
  warn: (message: string, ...args: any[]): void => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]): void => {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
};
