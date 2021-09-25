import fs from 'fs/promises';
import { z } from 'zod';
import yaml from 'yaml';

export const readConfig = async (configPath: string): Promise<Config> => {
  const contents = await fs.readFile(configPath).catch((err: unknown) => {
    throw new Error(`Cannot read config file: ${String(err)}`);
  });

  const contentsParsed = yaml.parse(contents.toString('utf8')) as unknown;

  const config = await Config.parseAsync(contentsParsed).catch(
    (err: unknown) => {
      throw new Error(`Cannot parse config file: ${String(err)}`);
    },
  );
  return config;
};

export const Config = z.object({
  tasksDatabaseId: z.string(),
  scheduledDatabaseId: z.string(),
  token: z.string(),

  extraPropertiesToSync: z.string().array().default([]),
  titleProperty: z.string().default('Name'),
  recurrenceProperty: z.string().default('Recurrence'),
  reminderProperty: z.string().default('Reminder'),
  dateFieldProperty: z.string().default('Date field'),
});

export type Config = z.infer<typeof Config>;
