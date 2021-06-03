"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.logLevel = exports.setLogLevel = exports.initLogger = exports.LogLevel = void 0;
var utils_1 = require("./utils");
var winston_1 = __importDefault(require("winston"));
var LogLevel;
(function (LogLevel) {
    LogLevel["Info"] = "info";
    LogLevel["Warn"] = "warn";
    LogLevel["Error"] = "error";
    LogLevel["Debug"] = "debug";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
var initLogger = function () {
    winston_1.default.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.simple(),
    }));
};
exports.initLogger = initLogger;
var setLogLevel = function (level) {
    switch (level) {
        case LogLevel.Info:
            winston_1.default.configure({ level: "info" });
            break;
        case LogLevel.Warn:
            winston_1.default.configure({ level: "warn" });
            break;
        case LogLevel.Error:
            winston_1.default.configure({ level: "error" });
            break;
        case LogLevel.Debug:
            winston_1.default.configure({ level: "debug" });
            break;
        default:
            return utils_1.unreachableCase(level);
    }
};
exports.setLogLevel = setLogLevel;
var logLevel = function () {
    switch (winston_1.default.level) {
        case "info":
            return LogLevel.Info;
        case "warn":
            return LogLevel.Warn;
        case "error":
            return LogLevel.Error;
        case "debug":
            return LogLevel.Debug;
        default:
            return utils_1.unexpectedCase(winston_1.default.level);
    }
};
exports.logLevel = logLevel;
exports.log = {
    error: function (message) {
        winston_1.default.error(message);
    },
    debug: function (message) {
        winston_1.default.debug(message);
    },
    info: function (message) {
        winston_1.default.info(message);
    },
    warn: function (message) {
        winston_1.default.warn(message);
    },
};
