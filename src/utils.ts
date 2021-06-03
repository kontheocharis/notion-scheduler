import { strict } from "assert";

export const assert = (condition: boolean, message?: string): void => {
    strict(condition, message);
};

export const unreachableCase = (value: never, message?: string): never => {
    strict.fail(message || `Unreachable case reached with value: ${value}`);
};

export const unexpectedCase = (value: any, message?: string): never => {
    strict.fail(message || `Unexpected case reached with value: ${value}`);
};

export const unreachable = (message?: string): never => {
    strict.fail(message || "Unreachable point reached");
};

export const todo = (message?: string): never => {
    strict.fail(message || "Unimplemented point reached");
};
