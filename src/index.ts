import { LogLevel, initLogger, log, setLogLevel } from './log';
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
  Date as NotionDate,
  InputPropertyValue,
  Page,
  PropertyValue,
  RichText,
} from '@notionhq/client/build/src/api-types';
import { rrulestr } from 'rrule';
import * as dateFns from 'date-fns';
import { inspect } from 'util';
import { expr } from './utils';

export const Settings = z.object({
  configPath: z.string(),
  logLevel: LogLevel.default('warn'),
  dryRun: z.boolean().default(false),
});

export type Settings = z.infer<typeof Settings>;

interface ScheduleEntry {
  title: RichText[];
  recurrence: string;
  reminder: string;
  time: NotionDate | null;
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

const outputPropToInputProp = (
  propName: string,
  prop: PropertyValue,
): InputPropertyValue => {
  const unsupported = () => {
      throw new Error(
        `Property type '${prop.type}' not supported for extra property '${propName}' in schedule database.`,
      );
  };

  switch (prop.type) {
    case 'number': {
      return { type: 'number', number: prop.number };
    }
    case 'date': {
      return { type: 'date', date: prop.date };
    }
    case 'rich_text': {
      return { type: 'rich_text', rich_text: prop.rich_text };
    }
    case 'select': {
      return {
        type: 'select',
        select: expr(() => {
          if (prop.select === null) {
            return null;
          }
          if (typeof prop.select.name === 'undefined') {
            // @@Unnecessary: Will this ever happen?
            throw new Error(
              `Did not receive an option name for the select input '${propName}'.`,
            );
          }
          return { name: prop.select.name };
        }),
      };
    }
    case 'multi_select': {
      return {
        type: 'multi_select',
        multi_select: prop.multi_select.map((entry) => {
          if (typeof entry.name === 'undefined') {
            // @@Unnecessary: Will this ever happen?
            throw new Error(
              `Did not receive an option name for the multi-select input '${propName}'.`,
            );
          }
          return { name: entry.name };
        }),
      };
    }
    case 'formula': {
      return {
        type: 'formula',
        formula: prop.formula,
      };
    }
    case 'rollup': {
      return {
        type: 'rollup',
        rollup: prop.rollup,
      };
    }
    case 'relation': {
      return {
        type: 'relation',
        relation: prop.relation,
      } as unknown as InputPropertyValue;
    }
    case 'people': {
      return {
        type: 'people',
        people: prop.people.map((person) => ({
          id: person.id,
          object: 'user',
        })),
      };
    }
    case 'files': {
      return {
        type: 'files',
        files: prop.files.map((file) => {
          switch (file.type) {
            case 'file': {
              throw new Error(
                `Cannot use non-external file for file property '${propName}'.`,
              );
            }
            case 'external': {
              return file;
            }
          }
        }),
      };
    }
    case 'checkbox': {
      return { type: 'checkbox', checkbox: prop.checkbox };
    }
    case 'url': {
      return { type: 'url', url: prop.url };
    }
    case 'email': {
      return { type: 'email', email: prop.email };
    }
    case 'phone_number': {
      return { type: 'phone_number', phone_number: prop.phone_number };
    }
    case 'title': {
      // We don't support titles because they have special handling.
      return unsupported();
    }
    case 'created_time': {
      return unsupported();
    }
    case 'created_by': {
      return unsupported();
    }
    case 'last_edited_time': {
      return unsupported();
    }
    case 'last_edited_by': {
      return unsupported();
    }
  }
};

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
  const time = parseScheduleEntryProp(
    page.properties,
    config.timeProperty,
    'date',
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
    config.extraPropertiesToSync.map(
      (propName): [string, InputPropertyValue] => {
        const prop = page.properties[propName];
        if (typeof prop === 'undefined') {
          throw new Error(
            `Could not find extra property '${propName}' in schedule database.`,
          );
        }
        return [propName, outputPropToInputProp(propName, prop)];
      },
    ),
  );

  return {
    title: title.title,
    recurrence: richToPlain(recurrence.rich_text),
    time: time.date,
    reminder: richToPlain(reminder.rich_text),
    dateField: richToPlain(dateField.rich_text),
    extraProperties,
  };
};

const combineDateAndTime = (date: Date, time: Date): Date => {
  return dateFns.set(date, {
    hours: dateFns.getHours(time),
    minutes: dateFns.getMinutes(time),
    seconds: dateFns.getSeconds(time),
    milliseconds: dateFns.getMilliseconds(time),
  });
};

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

    return recurrences.map((recurrence): InputPropertyValueMap => {
      let start = recurrence;
      let end: Date | null = null;

      if (entry.time !== null) {
        start = combineDateAndTime(recurrence, new Date(entry.time.start));
        if (typeof entry.time.end !== 'undefined') {
          end = combineDateAndTime(recurrence, new Date(entry.time.end));
        }
      }

      return {
        [config.titleOutputProperty]: { type: 'title', title: entry.title },
        [entry.dateField]: {
          type: 'date',
          date: {
            start: start.toISOString(),
            end: end?.toISOString(),
          },
        },
        ...entry.extraProperties,
      };
    });
  });

  log.debug(inspect(taskData, { depth: null }));

  log.info(
    `Will create ${taskData.length} tasks from ${scheduleEntries.length} schedule entries.`,
  );

  if (!settings.dryRun) {
    const taskRequests = taskData.map((task) => {
      return notion.pages.create({
        parent: { database_id: config.tasksDatabaseId },
        properties: task,
      });
    });
    await Promise.all(taskRequests);
  }

  log.info('Tasks created.');
};

void main();
