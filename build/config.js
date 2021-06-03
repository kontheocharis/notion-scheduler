"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = exports.readConfig = void 0;
var class_validator_1 = require("class-validator");
var fp_ts_1 = require("fp-ts");
var function_1 = require("fp-ts/lib/function");
var yaml_1 = __importDefault(require("yaml"));
var promises_1 = __importDefault(require("fs/promises"));
var class_transformer_1 = require("class-transformer");
var utils_1 = require("./utils");
var stringifyConfigValidationErrors = function (errors) {
    utils_1.assert(errors.length !== 0);
    var message = "Could not validate config file.";
    var details = errors
        .map(function (err) { return stringifyValidationError(err, 1); })
        .join("\n");
    return [message, details].join("\n");
};
var stringifyValidationError = function (error, indent) {
    if (indent === void 0) { indent = 0; }
    var basic = Object.values(error.constraints || {})
        .map(function (err) { return ["  ".repeat(indent), "- ", err].join(""); })
        .join("\n");
    if (error.children && error.children.length !== 0) {
        var children = error.children
            .map(function (child) { return stringifyValidationError(child, indent + 1); })
            .join("\n");
        return [basic, children].join("\n");
    }
    else {
        return basic;
    }
};
var readConfig = function (configPath) {
    return function_1.pipe(fp_ts_1.taskEither.tryCatch(function () { return promises_1.default.readFile(configPath); }, function () { return "Could not read config file."; }), fp_ts_1.taskEither.chain(function (contents) {
        return fp_ts_1.taskEither.fromEither(fp_ts_1.either.tryCatch(function () {
            return class_transformer_1.plainToClass(Config, yaml_1.default.parse(contents.toString("utf8"))) ||
                new Config();
        }, function () { return "Could not parse config file"; }));
    }), fp_ts_1.taskEither.chainFirst(function (config) {
        return function_1.pipe(fp_ts_1.taskEither.fromTask(function () {
            return class_validator_1.validate(config, {
                whitelist: true,
                forbidNonWhitelisted: true,
                forbidUnknownValues: true,
            });
        }), fp_ts_1.taskEither.chain(function (errors) {
            if (errors.length === 0) {
                return fp_ts_1.taskEither.right({});
            }
            else {
                return fp_ts_1.taskEither.left(stringifyConfigValidationErrors(errors));
            }
        }));
    }));
};
exports.readConfig = readConfig;
var Config = /** @class */ (function () {
    function Config() {
        this.titleProperty = "Name";
        this.startDateProperty = "Start date";
        this.recurrenceProperty = "Recurrence";
        this.notOnProperty = "Not on";
        this.includeTimeProperty = "Include time";
        this.durationProperty = "Duration";
        this.reminderProperty = "Reminder";
        this.dateFieldProperty = "Date field";
    }
    __decorate([
        class_validator_1.IsString(),
        __metadata("design:type", String)
    ], Config.prototype, "tasksDatabaseId", void 0);
    __decorate([
        class_validator_1.IsString(),
        __metadata("design:type", String)
    ], Config.prototype, "scheduledDatabaseId", void 0);
    __decorate([
        class_validator_1.IsString(),
        __metadata("design:type", String)
    ], Config.prototype, "token", void 0);
    __decorate([
        class_validator_1.IsString({ each: true }),
        __metadata("design:type", Array)
    ], Config.prototype, "extraPropertiesToSync", void 0);
    __decorate([
        class_validator_1.IsString(),
        __metadata("design:type", String)
    ], Config.prototype, "tagsProperty", void 0);
    __decorate([
        class_validator_1.IsString(),
        __metadata("design:type", String)
    ], Config.prototype, "scheduledTag", void 0);
    __decorate([
        class_validator_1.IsString(),
        __metadata("design:type", String)
    ], Config.prototype, "rescheduledTag", void 0);
    __decorate([
        class_validator_1.IsString(),
        class_validator_1.IsOptional(),
        __metadata("design:type", String)
    ], Config.prototype, "statusProperty", void 0);
    __decorate([
        class_validator_1.IsString(),
        class_validator_1.IsOptional(),
        __metadata("design:type", String)
    ], Config.prototype, "statusBeforeToday", void 0);
    __decorate([
        class_validator_1.IsString(),
        class_validator_1.IsOptional(),
        __metadata("design:type", String)
    ], Config.prototype, "statusAfterToday", void 0);
    __decorate([
        class_validator_1.IsString(),
        __metadata("design:type", String)
    ], Config.prototype, "titleProperty", void 0);
    __decorate([
        class_validator_1.IsString(),
        __metadata("design:type", String)
    ], Config.prototype, "startDateProperty", void 0);
    __decorate([
        class_validator_1.IsString(),
        __metadata("design:type", String)
    ], Config.prototype, "recurrenceProperty", void 0);
    __decorate([
        class_validator_1.IsString(),
        __metadata("design:type", String)
    ], Config.prototype, "notOnProperty", void 0);
    __decorate([
        class_validator_1.IsString(),
        __metadata("design:type", String)
    ], Config.prototype, "includeTimeProperty", void 0);
    __decorate([
        class_validator_1.IsString(),
        __metadata("design:type", String)
    ], Config.prototype, "durationProperty", void 0);
    __decorate([
        class_validator_1.IsString(),
        __metadata("design:type", String)
    ], Config.prototype, "reminderProperty", void 0);
    __decorate([
        class_validator_1.IsString(),
        __metadata("design:type", String)
    ], Config.prototype, "dateFieldProperty", void 0);
    return Config;
}());
exports.Config = Config;
