'use strict';

/* global describe, it, before, after, beforeEach, afterEach */
const chai = require('chai');
const expect = chai.expect;
const lib = require('../lib');


class BottomClass {
  constructor() {
    this.value = 5;
  }
}

function returnsValue() {
  return 3;
}

class MiddleClass {
  constructor(bottomClass, someFunction) {
    this.value = bottomClass.value + someFunction;
    expect(this.value).to.equal(8);
  }
}

const arrowNoArgs = () => 3;

function returnsChild(arglessArrow) {
  expect(arglessArrow).to.equal(3);
  return arglessArrow + 1;
}

const arrowArgs = (paramFunc) => paramFunc;

class RootClass {
  constructor(middleClass, someArrow, paramFunc) {
    this.middleClass = middleClass;
    expect(middleClass.value).to.equal(8);
    this.someArrow = someArrow;
    expect(someArrow).to.equal(4);
    this.paramFunc = paramFunc;
    expect(paramFunc).to.equal(4);
    this.value = middleClass.value + someArrow + paramFunc;
    expect(this.value).to.equal(16);
  }
}

describe('Build Tests', () => {
  let container = null;

  beforeEach(() => {
    container = lib.createContainer();
  });

  describe('Simple registration tests', () => {
    it('Should resolve simple/argless class', () => {
      container.register('bottomClass', BottomClass);
      const result = container.resolve('bottomClass').value;
      expect(result).to.equal(5);
    });

    it('Should resolve simple/argless arrow', () => {
      container.register('arglessArrow', arrowNoArgs);
      const result = container.resolve('arglessArrow');
      expect(result).to.equal(3);
    });

    it('Should resolve simple/argless function', () => {
      container.register('someFunction', returnsValue);
      const result = container.resolve('someFunction');
      expect(result).to.equal(3);
    });

    it('Should resolve class with arguments', () => {
      container.register('middleClass', MiddleClass);
      container.register('someFunction', returnsValue);
      container.register('bottomClass', BottomClass);
      const result = container.resolve('middleClass').value;
      expect(result).to.equal(8);
    });

    it('Should resolve function with arguments', () => {
      container.register('paramFunc', returnsChild);
      container.register('arglessArrow', arrowNoArgs);
      const result = container.resolve('paramFunc');
      expect(result).to.equal(4);
    });
  });

  describe('Nightmare Scenario', () => {
    it('Should correctly add up', () => {
      container.register('rootClass', RootClass);         // Complex class
      container.register('middleClass', MiddleClass);     // Class with mixed params
      container.register('bottomClass', BottomClass);     // Class, No params
      container.register('paramFunc', returnsChild);      // Func with params
      container.register('someFunction', returnsValue);   // Func, no params
      container.register('someArrow', arrowArgs);         // Arrow with args
      container.register('arglessArrow', arrowNoArgs);    // Arrow without args

      const result = container.resolve('rootClass').value;
      expect(result).to.equal(16);
    });
  });
});
