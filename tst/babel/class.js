/* eslint-disable */
"use strict";

/* This is an example of how babel exports a class */
Object.defineProperty(exports, "__esModule", {
  value: true
});

let SomeClass = class SomeClass {
  constructor() {
    this.count = 0;
  }
  getCounter() {
    this.count++;
    return this.count;
  }
};
exports.default = SomeClass;
