import { LogLevel, initLogger } from './log';
import { z } from 'zod';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readConfig } from './config';

export const Settings = z.object({
  configPath: z.string(),
  logLevel: LogLevel.default('warn'),
  dryRun: z.boolean().default(false),
  deleteRescheduled: z.boolean().default(false),
  append: z.boolean().default(false),
});

export type Settings = z.infer<typeof Settings>;

const main = async () => {
  initLogger();

  const settingsRaw = yargs(hideBin(process.argv)).options({
    configPath: { type: 'string', required: true },
    logLevel: { type: 'string' },
    dryRun: { type: 'string' },
    deleteRescheduled: { type: 'boolean' },
    append: { type: 'boolean' },
  }).argv;

  const settings = await Settings.parseAsync(settingsRaw);
  const config = await readConfig(settings.configPath);

  console.log(config);

  // console.log(settings);
};

void main();
