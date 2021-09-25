import winston from 'winston';
import { z } from 'zod';
import { unexpectedCase } from './utils';

export const LogLevel = z.enum(['info', 'warn', 'error', 'debug']);
export type LogLevel = z.infer<typeof LogLevel>;

export const initLogger = (): void => {
  winston.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );
};

export const setLogLevel = (level: LogLevel): void => {
  winston.level = level;
};

export const logLevel = () => {
  const parsedLevel = LogLevel.safeParse(winston.level);
  if (!parsedLevel.success) {
    return unexpectedCase(winston.level);
  }
  return parsedLevel.data;
};

export const log = {
  error: (message: string) => {
    winston.error(message);
  },
  debug: (message: string) => {
    winston.debug(message);
  },
  info: (message: string) => {
    winston.info(message);
  },
  warn: (message: string) => {
    winston.warn(message);
  },
} as const;
