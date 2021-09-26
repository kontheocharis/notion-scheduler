import {
  APISingularObject,
  PaginatedList,
} from '@notionhq/client/build/src/api-types';
import { fallbackNull } from './utils';

export const queryAll = async <T extends APISingularObject>(
  task: (cursor: string | undefined) => Promise<PaginatedList<T>>,
): Promise<T[]> => {
  const entries = [];
  let cursor: string | null = null;

  for (;;) {
    const response: PaginatedList<T> = await task(
      fallbackNull(cursor, undefined),
    );
    entries.push(...response.results);
    if (response.has_more) {
      cursor = response.next_cursor;
    } else {
      break;
    }
  }

  return entries;
};
