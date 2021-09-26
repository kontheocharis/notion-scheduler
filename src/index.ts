import { Client as NotionClient } from '@notionhq/client';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { z } from 'zod';
import { archiveOldTaskEntries } from './archive-old';
import { readConfig } from './config';
import { createNewTaskEntries } from './create-new';
import { initLogger, LogLevel, setLogLevel } from './log';

export const Settings = z.object({
  configPath: z.string(),
  logLevel: LogLevel.default('warn'),
  dryRun: z.boolean().default(false),
});

export type Settings = z.infer<typeof Settings>;

const main = async () => {
  initLogger();

  const settingsRaw = yargs(hideBin(process.argv)).options({
    configPath: { type: 'string', required: true },
    logLevel: { type: 'string' },
    dryRun: { type: 'boolean' },
  }).argv;

  const settings = await Settings.parseAsync(settingsRaw);
  setLogLevel(settings.logLevel);

  const config = await readConfig(settings.configPath);
  const notion = new NotionClient({ auth: config.token });

  await archiveOldTaskEntries(notion, config, settings);
  await createNewTaskEntries(notion, config, settings);
};

void main();
