import { unexpectedCase, unreachableCase } from "./utils";
import winston from "winston";

export enum LogLevel {
  Info = "info",
  Warn = "warn",
  Error = "error",
  Debug = "debug",
}

export const initLogger = (): void => {
  winston.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );
};

export const setLogLevel = (level: LogLevel): void => {
  switch (level) {
    case LogLevel.Info:
      winston.configure({ level: "info" });
      break;
    case LogLevel.Warn:
      winston.configure({ level: "warn" });
      break;
    case LogLevel.Error:
      winston.configure({ level: "error" });
      break;
    case LogLevel.Debug:
      winston.configure({ level: "debug" });
      break;
    default:
      return unreachableCase(level);
  }
};

export const logLevel = () => {
  switch (winston.level) {
    case "info":
      return LogLevel.Info;
    case "warn":
      return LogLevel.Warn;
    case "error":
      return LogLevel.Error;
    case "debug":
      return LogLevel.Debug;
    default:
      return unexpectedCase(winston.level);
  }
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
