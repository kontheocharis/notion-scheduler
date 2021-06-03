import { Client } from "@notionhq/client";
import { IsBoolean, IsEnum, IsString } from "class-validator";
import { log, LogLevel, initLogger } from "./log";
import { taskEither as TE } from "fp-ts";
import { readConfig } from "./config";
import { pipe } from "fp-ts/lib/function";

class Settings {
  @IsString()
  configPath!: string;

  @IsEnum(LogLevel)
  logLevel: LogLevel = LogLevel.Warn;

  @IsBoolean()
  dryRun: boolean = false;

  @IsBoolean()
  deleteRescheduled: boolean = false;

  @IsBoolean()
  append: boolean = false;
}

const main = () => {
  initLogger();
  const configPath = process.argv.slice(2)[0]!;
  pipe(
    readConfig(configPath),
    TE.map((config) => {
      console.log(config);
    }),
    TE.mapLeft((err) => {
      log.error(err);
    }),
  )();
};

main();
