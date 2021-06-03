import {
  IsOptional,
  IsString,
  validate,
  ValidationError,
} from "class-validator";
import { taskEither as TE, either as E } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import yaml from "yaml";
import fs from "fs/promises";
import { plainToClass } from "class-transformer";
import { assert } from "./utils";

const stringifyConfigValidationErrors = (errors: ValidationError[]): string => {
  assert(errors.length !== 0);
  const message = "Could not validate config file.";
  const details = errors
    .map((err) => stringifyValidationError(err, 1))
    .join("\n");
  return [message, details].join("\n");
};

const stringifyValidationError = (
  error: ValidationError,
  indent: number = 0,
): string => {
  const basic = Object.values(error.constraints || {})
    .map((err) => ["  ".repeat(indent), "- ", err].join(""))
    .join("\n");
  if (error.children && error.children.length !== 0) {
    const children = error.children
      .map((child) => stringifyValidationError(child, indent + 1))
      .join("\n");
    return [basic, children].join("\n");
  } else {
    return basic;
  }
};

export const readConfig = (configPath: string): TE.TaskEither<string, Config> =>
  pipe(
    TE.tryCatch(
      () => fs.readFile(configPath),
      () => "Could not read config file.",
    ),
    TE.chain((contents) =>
      TE.fromEither(
        E.tryCatch(
          () =>
            plainToClass(Config, yaml.parse(contents.toString("utf8"))) ||
            new Config(),
          () => "Could not parse config file",
        ),
      ),
    ),
    TE.chainFirst((config) =>
      pipe(
        TE.fromTask<string, ValidationError[]>(() =>
          validate(config, {
            whitelist: true,
            forbidNonWhitelisted: true,
            forbidUnknownValues: true,
          }),
        ),
        TE.chain((errors) => {
          if (errors.length === 0) {
            return TE.right({});
          } else {
            return TE.left(stringifyConfigValidationErrors(errors));
          }
        }),
      ),
    ),
  );

export class Config {
  @IsString()
  tasksDatabaseId!: string;

  @IsString()
  scheduledDatabaseId!: string;

  @IsString()
  token!: string;

  @IsString({ each: true })
  extraPropertiesToSync!: string[];

  @IsString()
  tagsProperty!: string;

  @IsString()
  scheduledTag!: string;

  @IsString()
  rescheduledTag!: string;

  @IsString()
  @IsOptional()
  statusProperty?: string;

  @IsString()
  @IsOptional()
  statusBeforeToday?: string;

  @IsString()
  @IsOptional()
  statusAfterToday?: string;

  @IsString()
  titleProperty: string = "Name";

  @IsString()
  startDateProperty: string = "Start date";

  @IsString()
  recurrenceProperty: string = "Recurrence";

  @IsString()
  notOnProperty: string = "Not on";

  @IsString()
  includeTimeProperty: string = "Include time";

  @IsString()
  durationProperty: string = "Duration";

  @IsString()
  reminderProperty: string = "Reminder";

  @IsString()
  dateFieldProperty: string = "Date field";
}
