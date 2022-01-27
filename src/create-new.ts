import { Client as NotionClient } from '@notionhq/client';
import { PagesCreateParameters } from '@notionhq/client/build/src/api-endpoints';
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
import { format } from 'date-fns-tz';

const ISO_FMT = "yyyy-MM-dd'T'HH:mmXXX";
const ISO_FMT_DATE_ONLY = 'yyyy-MM-dd';

export const createNewTaskEntries = async (
  notion: NotionClient,
  config: Config,
  settings: Settings,
): Promise<void> => {
  const scheduleData = await queryAll((cursor) =>
    notion.databases.query({
      start_cursor: cursor,
      database_id: config.scheduleDatabaseId,
      filter: {
        property: config.activeInputProperty,
        checkbox: { equals: true },
      },
    }),
  );

  const scheduleEntries = await Promise.all(
    scheduleData.map(async (page) => {
      const scheduleEntry = parseScheduleEntry(page, config);

      // Fetch children of page
      const children = await queryAll((cursor) =>
        notion.blocks.children.list({
          start_cursor: cursor,
          block_id: page.id,
        }),
      );
      return { children, ...scheduleEntry };
    }),
  );

  // Get today's date without the time.
  const startOfToday = combineDateAndTime(new Date(), new Date(0));

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
      .flatMap(
        (
          recurrence,
        ): Pick<PagesCreateParameters, 'properties' | 'children'>[] => {
          let start = recurrence;
          let end: Date | null = null;

          if (entry.time !== null) {
            start = combineDateAndTime(recurrence, new Date(entry.time.start));
            if (typeof entry.time.end !== 'undefined') {
              end = combineDateAndTime(recurrence, new Date(entry.time.end));
            }
          }

          // Skip this entry if both dates are before start of today.
          if (start < startOfToday && (end === null || end < startOfToday)) {
            return [];
          }

          const dateFmt = entry.time === null ? ISO_FMT_DATE_ONLY : ISO_FMT;

          return [
            {
              properties: {
                [config.titleOutputProperty]: {
                  type: 'title',
                  title: entry.title,
                },
                [entry.dateField]: {
                  type: 'date',
                  date: {
                    start: format(start, dateFmt, {
                      timeZone: config.timeZone,
                    }),
                    end:
                      end === null
                        ? undefined
                        : format(end, dateFmt, { timeZone: config.timeZone }),
                  },
                },
                [config.recurrenceInfoProperty]: {
                  type: 'rich_text',
                  rich_text: [
                    { type: 'text', text: { content: `ID ${entry.id}` } },
                  ],
                },
                [config.doneOutputProperty]: {
                  type: 'checkbox',
                  checkbox: expr(() => {
                    if (end !== null) {
                      return dateFns.isBefore(end, new Date());
                    }
                    return dateFns.isBefore(start, new Date());
                  }),
                },
                ...entry.extraProperties,
              },
              children: entry.children,
            },
          ];
        },
      );
  });

  log.debug(inspect(taskData, { depth: null }));

  log.info(
    `Will create ${taskData.length} tasks from ${scheduleEntries.length} schedule entries.`,
  );

  if (!settings.dryRun) {
    const taskRequests = taskData.map((task) => {
      return notion.pages.create({
        parent: { database_id: config.tasksDatabaseId },
        ...task,
      });
    });
    await Promise.all(taskRequests);
  }

  log.info('Tasks created.');
};
