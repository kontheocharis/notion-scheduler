import { PropertyValueMap } from '@notionhq/client/build/src/api-endpoints';
import {
  InputPropertyValue,
  PropertyValue,
  RichText,
} from '@notionhq/client/build/src/api-types';
import { expr } from './utils';

export const parseScheduleEntryProp = <T extends PropertyValue['type']>(
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

export const richToPlain = (p: RichText[]): string =>
  p.map((t) => t.plain_text).join(' ');

export const outputPropToInputProp = (
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
