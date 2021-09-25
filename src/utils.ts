import { strict } from 'assert';
import { inspect } from 'util';

export function assert(
  condition: boolean,
  message?: string,
): asserts condition {
  strict(condition, message);
}

export const unreachableCase = (value: never, message?: string): never => {
  strict.fail(
    isEmptyNullOrUndefined(message)
      ? `Unreachable case reached with value: ${inspect(value)}`
      : message,
  );
};

export const unexpectedCase = (value: unknown, message?: string): never => {
  strict.fail(
    isEmptyNullOrUndefined(message)
      ? `Unexpected case reached with value: ${inspect(value)}`
      : message,
  );
};

export const unreachable = (message?: string): never => {
  strict.fail(
    isEmptyNullOrUndefined(message) ? 'Unreachable point reached' : message,
  );
};

export const todo = (..._args: readonly unknown[]): never => {
  strict.fail('Unimplemented point reached');
};

export const fatal = (message: string): never => strict.fail(message);

export const isEmptyNullOrUndefined = (
  x: unknown,
): x is null | undefined | '' =>
  typeof x === 'undefined' ||
  x === null ||
  (typeof x === 'string' && x.length === 0);

export const fallbackNull = <T>(x: T | null, fallback: T): T => {
  if (x === null) {
    return fallback;
  }
  return x;
};

export const fallbackUndefined = <T>(x: T | undefined, fallback: T): T => {
  if (typeof x === 'undefined') {
    return fallback;
  }
  return x;
};
