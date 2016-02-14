'use strict';

/* global describe, it, before, after, beforeEach, afterEach */
const chai = require('chai');
const expect = chai.expect;
const lib = require('../lib');

describe('Build Tests', () => {
  describe('Nightmare Scenario', () => {
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

    it('Should correctly add up', () => {
      const container = lib.createContainer();
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
