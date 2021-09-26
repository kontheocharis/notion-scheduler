import { Client as NotionClient } from '@notionhq/client';
import { InputPropertyValueMap } from '@notionhq/client/build/src/api-endpoints';
import { rrulestr } from 'rrule';
import { inspect } from 'util';
import { Settings } from '.';
import { Config } from './config';
import { log } from './log';
import { parseScheduleEntry } from './parse-schedule';
import { richToPlain } from './prop-utils';
import { queryAll } from './querying';
import { combineDateAndTime, expr } from './utils';
import * as dateFns from 'date-fns';

export const createNewTaskEntries = async (
  notion: NotionClient,
  config: Config,
  settings: Settings,
): Promise<void> => {
  const scheduleData = await queryAll((cursor) =>
    notion.databases.query({
      start_cursor: cursor,
      database_id: config.scheduleDatabaseId,
    }),
  );

  const scheduleEntries = scheduleData.map((page) =>
    parseScheduleEntry(page, config),
  );

  const taskData = scheduleEntries.flatMap((entry) => {
    const recurrences = rrulestr(entry.recurrence).all();
    if (recurrences.length === 0) {
      throw new Error(
        `Got invalid recurrence for entry '${richToPlain(entry.title)}'`,
      );
    }
    const notOn = expr(() => {
      if (entry.notOn.trim() === '') {
        return [];
      }
      return rrulestr(entry.notOn).all();
    });

    return recurrences
      .filter((recurrence) => {
        // Filter out dates that are specified in notOn.
        for (const notOnDate of notOn) {
          if (
            dateFns.isEqual(
              // Zero out the times, we just care about dates.
              combineDateAndTime(recurrence, new Date(0)),
              combineDateAndTime(notOnDate, new Date(0)),
            )
          ) {
            return false;
          }
        }
        return true;
      })
      .map((recurrence): InputPropertyValueMap => {
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
          [config.recurrenceInfoProperty]: {
            type: 'rich_text',
            rich_text: [{ type: 'text', text: { content: `ID ${entry.id}` } }],
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
