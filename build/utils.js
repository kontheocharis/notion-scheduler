"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.todo = exports.unreachable = exports.unexpectedCase = exports.unreachableCase = exports.assert = void 0;
var assert_1 = require("assert");
var assert = function (condition, message) {
    assert_1.strict(condition, message);
};
exports.assert = assert;
var unreachableCase = function (value, message) {
    assert_1.strict.fail(message || "Unreachable case reached with value: " + value);
};
exports.unreachableCase = unreachableCase;
var unexpectedCase = function (value, message) {
    assert_1.strict.fail(message || "Unexpected case reached with value: " + value);
};
exports.unexpectedCase = unexpectedCase;
var unreachable = function (message) {
    assert_1.strict.fail(message || "Unreachable point reached");
};
exports.unreachable = unreachable;
var todo = function (message) {
    assert_1.strict.fail(message || "Unimplemented point reached");
};
exports.todo = todo;
