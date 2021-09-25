import { LogLevel, initLogger, log } from './log';
import { z } from 'zod';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Config, readConfig } from './config';
import { Client } from '@notionhq/client';
import {
  InputPropertyValueMap,
  PropertyValueMap,
} from '@notionhq/client/build/src/api-endpoints';
import {
  Page,
  PropertyValue,
  RichText,
} from '@notionhq/client/build/src/api-types';
import { rrulestr } from 'rrule';
import parseDuration from 'parse-duration';

export const Settings = z.object({
  configPath: z.string(),
  logLevel: LogLevel.default('warn'),
  dryRun: z.boolean().default(false),
  deleteRescheduled: z.boolean().default(false),
  append: z.boolean().default(false),
});

export type Settings = z.infer<typeof Settings>;

interface ScheduleEntry {
  title: RichText[];
  recurrence: string;
  reminder: string;
  duration: string;
  dateField: string;
  extraProperties: InputPropertyValueMap;
}

const parseScheduleEntryProp = <T extends PropertyValue['type']>(
  props: PropertyValueMap,
  propName: string,
  propType: T,
): PropertyValue & { type: T } => {
  const prop = props[propName];
  if (typeof prop === 'undefined') {
    throw new Error(
      `Could not find property '${propName}' in schedule database.`,
    );
  }
  if (prop.type !== propType) {
    throw new Error(
      `Invalid type for property '${propName}'. Expected '${propType}' but got '${prop.type}'.`,
    );
  }
  return prop as PropertyValue & { type: T };
};

const richToPlain = (p: RichText[]): string =>
  p.map((t) => t.plain_text).join(' ');

const parseScheduleEntry = (page: Page, config: Config): ScheduleEntry => {
  const title = parseScheduleEntryProp(
    page.properties,
    config.titleInputProperty,
    'title',
  );
  const recurrence = parseScheduleEntryProp(
    page.properties,
    config.recurrenceProperty,
    'rich_text',
  );
  const duration = parseScheduleEntryProp(
    page.properties,
    config.durationProperty,
    'rich_text',
  );
  const reminder = parseScheduleEntryProp(
    page.properties,
    config.reminderProperty,
    'rich_text',
  );
  const dateField = parseScheduleEntryProp(
    page.properties,
    config.dateFieldProperty,
    'rich_text',
  );

  const extraProperties = Object.fromEntries(
    config.extraPropertiesToSync.map((propName) => {
      const prop = page.properties[propName];
      if (typeof prop === 'undefined') {
        throw new Error(
          `Could not find extra property '${propName}' in schedule database.`,
        );
      }
      if (
        prop.type === 'relation' ||
        prop.type === 'title' ||
        prop.type === 'files'
      ) {
        throw new Error(
          `Property type '${prop.type}' not supported for extra property '${propName}' in schedule database.`,
        );
      }
      return [propName, prop];
    }),
  );

  return {
    title: title.title,
    recurrence: richToPlain(recurrence.rich_text),
    duration: richToPlain(duration.rich_text),
    reminder: richToPlain(reminder.rich_text),
    dateField: richToPlain(dateField.rich_text),
    extraProperties,
  };
};

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

  const notion = new Client({ auth: config.token });

  const scheduleData = await notion.databases.query({
    database_id: config.scheduleDatabaseId,
  });
  const scheduleEntries = scheduleData.results.map((page) =>
    parseScheduleEntry(page, config),
  );

  const taskData = scheduleEntries.flatMap((entry) => {
    const recurrences = rrulestr(entry.recurrence).all();
    if (recurrences.length === 0) {
      throw new Error(
        `Got invalid recurrence for entry '${richToPlain(entry.title)}'`,
      );
    }

    const includeEndTime = entry.duration.trim().length === 0;
    const durationMs = includeEndTime ? parseDuration(entry.duration) : 0;
    if (durationMs === null) {
      throw new Error(
        `Got invalid duration for entry '${richToPlain(entry.title)}'`,
      );
    }

    return recurrences.map(
      (recurrence): InputPropertyValueMap => ({
        [config.titleOutputProperty]: { type: 'title', title: entry.title },
        [entry.dateField]: {
          type: 'date',
          date: {
            start: recurrence.toISOString(),
            end: includeEndTime
              ? new Date(recurrence.getTime() + durationMs).toISOString()
              : undefined,
          },
        },
        ...entry.extraProperties,
      }),
    );
  });

  log.info(
    `Will create ${taskData.length} tasks from ${scheduleEntries.length} schedule entries.`,
  );

  const taskRequests = taskData.map((task) => {
    return notion.pages.create({
      parent: { database_id: config.tasksDatabaseId },
      properties: task,
    });
  });

  await Promise.all(taskRequests);

  log.info('Tasks created.');
};

void main();
