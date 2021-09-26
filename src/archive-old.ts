import { Client as NotionClient } from '@notionhq/client';
import { Settings } from '.';
import { Config } from './config';
import { log } from './log';
import { queryAll } from './querying';

export const archiveOldTaskEntries = async (
  notion: NotionClient,
  config: Config,
  settings: Settings,
): Promise<void> => {
  const oldTaskEntries = await queryAll((cursor) =>
    notion.databases.query({
      database_id: config.tasksDatabaseId,
      start_cursor: cursor,
      filter: {
        property: config.recurrenceInfoProperty,
        text: {
          starts_with: 'ID ',
        },
      },
    }),
  );

  if (oldTaskEntries.length === 0) {
    log.info('No old tasks to delete.');
    return;
  }

  log.info(`Will delete ${oldTaskEntries.length} old tasks.`);

  if (!settings.dryRun) {
    const archiveOps = oldTaskEntries.map((entry) =>
      notion.pages.update({
        page_id: entry.id,
        archived: true,
        properties: {},
      }),
    );

    await Promise.all(archiveOps);
  }

  log.info('Old tasks deleted.');
};
