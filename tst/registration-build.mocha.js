'use strict';

/* global describe, it, before, after, beforeEach, afterEach */
const chai = require('chai');
const expect = chai.expect;
const lib = require('../lib');


const arrowNoDependencies = () => 1;

class ClassNoDependencies {
  constructor() {
    this.value = 2;
  }
}

function functionNoDependencies() {
  return 3;
}

const arrowWithDependencies = (noDepsFunction) => {
  if (!noDepsFunction) {
    throw new Error('Did not recieve noDepsFunction');
  }
  expect(noDepsFunction).to.equal(3);
  return noDepsFunction + 6;
};

class ClassWithDependencies {
  constructor(noDepsClass, noDepsFunction) {
    if (!noDepsClass) {
      throw new Error('Did not recieve noDepsFunction');
    } else if (!noDepsFunction) {
      throw new Error('Did not recieve noDepsFunction');
    }
    expect(noDepsClass.value).to.equal(2);
    expect(noDepsFunction).to.equal(3);
    this.value = noDepsClass.value + noDepsFunction + 2; // 7
  }
}

function functionWithDependencies(noDepsArrow) {
  if (!noDepsArrow) {
    throw new Error('Did not recieve noDepsArrow');
  }
  expect(noDepsArrow).to.equal(1);
  return noDepsArrow + 4;
}

class RootClass {
  constructor(depsClass, depsArrow, depsFunction) {
    if (!depsClass) {
      throw new Error('Did not recieve depsClass');
    } else if (!depsArrow) {
      throw new Error('Did not recieve depsArrow');
    } else if (!depsFunction) {
      throw new Error('Did not recieve depsFunction');
    }
    this.depsClass = depsClass;
    expect(depsClass.value).to.equal(7);
    this.depsArrow = depsArrow;
    expect(depsArrow).to.equal(9);
    this.depsFunction = depsFunction;
    expect(depsFunction).to.equal(5);
    this.value = depsClass.value + depsArrow + depsFunction;
    expect(this.value).to.equal(21);
  }
}

describe('Build Tests', () => {
  let container = null;

  beforeEach(() => {
    container = lib.createContainer();
  });

  describe('Simple registration tests', () => {
    it('Should resolve simple/argless class', () => {
      container.register('noDepsClass', ClassNoDependencies);
      const result = container.resolve('noDepsClass').value;
      expect(result).to.equal(2);
    });

    it('Should resolve simple/argless arrow', () => {
      container.register('noDepsArrow', arrowNoDependencies);
      const result = container.resolve('noDepsArrow');
      expect(result).to.equal(1);
    });

    it('Should resolve simple/argless function', () => {
      container.register('noDepsFunction', functionNoDependencies);
      const result = container.resolve('noDepsFunction');
      expect(result).to.equal(3);
    });

    it('Should resolve class with arguments', () => {
      container.register('depsClass', ClassWithDependencies);
      container.register('noDepsFunction', functionNoDependencies);
      container.register('noDepsClass', ClassNoDependencies);
      const result = container.resolve('depsClass').value;
      expect(result).to.equal(7);
    });

    it('Should resolve function with arguments', () => {
      container.register('depsFunction', functionWithDependencies);
      container.register('noDepsArrow', arrowNoDependencies);
      const result = container.resolve('depsFunction');
      expect(result).to.equal(5);
    });
  });

  describe('Nightmare Scenario', () => {
    it('Should correctly add up', () => {
      container.register('rootClass', RootClass);                     // Complex class
      container.register('depsClass', ClassWithDependencies);         // Class with mixed params
      container.register('noDepsClass', ClassNoDependencies);         // Class, No params
      container.register('depsFunction', functionWithDependencies);   // Func with params
      container.register('noDepsFunction', functionNoDependencies);   // Func, no params
      container.register('depsArrow', arrowWithDependencies);         // Arrow with args
      container.register('noDepsArrow', arrowNoDependencies);         // Arrow without args

      const result = container.resolve('rootClass').value;
      expect(result).to.equal(21);
    });
  });
});
