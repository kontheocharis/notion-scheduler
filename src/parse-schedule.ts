import { InputPropertyValueMap } from '@notionhq/client/build/src/api-endpoints';
import {
  Date as NotionDate,
  InputPropertyValue,
  Page,
  RichText,
} from '@notionhq/client/build/src/api-types';
import { Config } from './config';
import {
  parseScheduleEntryProp,
  outputPropToInputProp,
  richToPlain,
} from './prop-utils';

export interface ScheduleEntry {
  title: RichText[];
  id: string;
  recurrence: string;
  notOn: string;
  reminder: string;
  time: NotionDate | null;
  dateField: string;
  extraProperties: InputPropertyValueMap;
}

export const parseScheduleEntry = (
  page: Page,
  config: Config,
): ScheduleEntry => {
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
  const notOn = parseScheduleEntryProp(
    page.properties,
    config.notOnProperty,
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
    id: page.id,
    title: title.title,
    recurrence: richToPlain(recurrence.rich_text),
    notOn: richToPlain(notOn.rich_text),
    time: time.date,
    reminder: richToPlain(reminder.rich_text),
    dateField: richToPlain(dateField.rich_text),
    extraProperties,
  };
};
