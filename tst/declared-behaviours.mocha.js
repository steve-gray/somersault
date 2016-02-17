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
  return {
    value: 3,
  };
}

const arrowWithDependencies = (noDepsFunction) => {
  if (!noDepsFunction) {
    throw new Error('Did not recieve noDepsFunction');
  }
  expect(noDepsFunction.value).to.equal(3);
  return noDepsFunction.value + 6;
};

class ClassWithDependencies {
  constructor(noDepsClass, noDepsFunction) {
    if (!noDepsClass) {
      throw new Error('Did not recieve noDepsFunction');
    } else if (!noDepsFunction) {
      throw new Error('Did not recieve noDepsFunction');
    }
    expect(noDepsClass.value).to.equal(2);
    expect(noDepsFunction.value).to.equal(3);
    this.value = noDepsClass.value + noDepsFunction.value + 2; // 7
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

describe('Container', () => {
  describe('Construction', () => {
    it('Should fail when parent is not a container or null', () => {
      expect(() => lib.createContainer({ foo: 'bar' })).to.throw(Error);
    });
  });

  describe('Instance Tests', () => {
    let container = null;

    beforeEach(() => {
      container = lib.createContainer();
    });

    describe('Properties', () => {
      it('Should have an ID property set', () =>
        expect(container.containerId).to.exist
      );
    });

    describe('register(tags, value)', () => {
      describe('Parameter validation', () => {
        it('Should error with no tags specified', () => {
          expect(() => container.register(null, ClassNoDependencies)).to.throw(Error);
        });
        it('Should error with no generator/value specified', () => {
          expect(() => container.register('someTag', null)).to.throw(Error);
        });
        it('Should error with non-class/func/arrow generator specified', () => {
          expect(() => container.register('someTag', true)).to.throw(Error);
        });
        it('Should allow tag registration with string', () => {
          container.register('someTag', ClassNoDependencies);
        });
        it('Should allow tag registration with array of strings', () => {
          container.register(['someTag', 'anotherTag'], ClassNoDependencies);
          expect(container.resolve('someTag')).to.not.equal(null);
          return expect(container.resolve('anotherTag')).to.exist;
        });
      });
    });

    describe('build(generator)', () => {
      describe('Parameter validation', () => {
        it('Should fail with a null generator', () => {
          expect(() => container.build(null)).to.throw(Error);
        });
        it('Should fail with a non-(func/class/arrow) generator', () => {
          expect(() => container.build({ foo: 'bar' })).to.throw(Error);
        });
      });

      describe('arrow functions', () => {
        it('from template (no arguments)', () => {
          const instance = container.build(arrowNoDependencies);
          expect(instance).to.equal(1);
        });

        it('from template (arguments)', () => {
          container.register('noDepsFunction', functionNoDependencies);
          const instance = container.build(arrowWithDependencies);
          expect(instance).to.equal(9);
        });
      });
      describe('regular functions', () => {
        it('from template (no arguments)', () => {
          const instance = container.build(functionNoDependencies);
          expect(instance.value).to.equal(3);
        });

        it('from template (arguments)', () => {
          container.register('noDepsArrow', arrowNoDependencies);
          const instance = container.build(functionWithDependencies);
          expect(instance).to.equal(5);
        });
      });
      describe('ES6+ classes', () => {
        it('from template (no arguments)', () => {
          const instance = container.build(ClassNoDependencies);
          expect(instance.value).to.equal(2);
        });

        it('from template (arguments)', () => {
          container.register('noDepsClass', ClassNoDependencies);
          container.register('noDepsFunction', functionNoDependencies);
          const instance = container.build(ClassWithDependencies);
          expect(instance.value).to.equal(7);
        });
      });
    });

    describe('resolve(tag)', () => {
      describe('Simple resolver tests', () => {
        it('Should throw an exception when tag is unknown', () => {
          expect(() => container.resolve('no_such_tag')).to.throw(Error);
        });

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
          expect(result.value).to.equal(3);
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
  });
});
