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

function functionWithContainerDep($container) {
  expect($container).to.not.equal(null);
  return $container;
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
    describe('.createContainer() on library', () => {
      it('Should fail when parent is not a container (and is not null)', () => {
        expect(() => lib.createContainer({ foo: 'bar' })).to.throw(Error);
      });
      it('Should accept a parameter for the parent container', () => {
        const parent = lib.createContainer();
        const child = lib.createContainer(parent);
        expect(child.parent).to.equal(parent);
      });
    });
    describe('require(somersault)()', () => {
      it('Should succeed when invoking via require constructor function', () => {
        const container = lib();
        expect(typeof container.resolve).to.equal('function');
      });
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

    describe('createChild() (Deprecated)', () => {
      it('Should create a child container that is not a self reference', () => {
        const child = container.createChild();
        expect(child).to.not.equal(container);
      });
    });
    describe('createContainer()', () => {
      it('Should create a child container that is not a self reference', () => {
        const child = container.createContainer();
        expect(child).to.not.equal(container);
      });
    });

    describe('register(tags, value{, constructorTags})', () => {
      describe('Parameter validation', () => {
        it('Should error with no tags specified', () => {
          expect(() => container.register(null, ClassNoDependencies)).to.throw(Error);
        });
        it('Should error with no generator/value specified', () => {
          expect(() => container.register('someTag', null)).to.throw(Error);
        });
        it('Should allow tag registration with string', () => {
          container.register('someTag', ClassNoDependencies);
        });
        it('Should allow tag registration with array of strings', () => {
          container.register(['someTag', 'anotherTag'], ClassNoDependencies);
          expect(container.resolve('someTag')).to.not.equal(null);
          return expect(container.resolve('anotherTag')).to.exist;
        });
        it('Should allow override of argument names', () => {
          container.register(['someTag'], functionWithDependencies, ['alternateName']);
          container.register(['alternateName'], arrowNoDependencies);
          expect(container.resolve('someTag')).to.equal(5);
        });
        it('Should require constructorTags to be an array', () => {
          expect(() => {
            container.register(['someTag'], functionWithDependencies, 1234);
          }).to.throw(Error);
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
        it('Should fail with non-array constructorTags', () => {
          container.register('noDepsArrow', arrowNoDependencies);
          expect(() => container.build(functionWithDependencies, 1234)).to.throw(Error);
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

      describe('Overloads', () => {
        it('Should allow remapping of dependency names with extra argument', () => {
          function myGenerator(someInstance, someFunc) {
            return someInstance.value + someFunc.value;
          }
          container.register('alternateClass', ClassNoDependencies);    // Returns 2
          container.register('alternateFunc', functionNoDependencies);  // Returns 3
          const instance = container.build(myGenerator,
            ['alternateClass', 'alternateFunc']);
          expect(instance).to.equal(5);
        });
      });
    });

    describe('resolve(tag)', () => {
      describe('Simple resolver tests', () => {
        it('Should throw an exception when tag is null', () => {
          expect(() => container.resolve()).to.throw(Error);
        });

        it('Should throw an exception when tag is unknown', () => {
          expect(() => container.resolve('no_such_tag')).to.throw(Error);
        });

        it('Should resolve simple constant value', () => {
          const instance = {
            foo: 'bar',
            deep: {
              propName: 'propValue',
            },
          };
          container.register('directObject', instance);
          const result = container.resolve('directObject').deep.propName;
          expect(result).to.equal('propValue');
        });

        it('Should resolve properties named $container to a container instance', () => {
          container.register('needsContainer', functionWithContainerDep);
          const result = container.resolve('needsContainer');
          expect(result).to.equal(container);
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

        it('Should resolve value from parent context', () => {
          const childContainer = container.createContainer();
          container.register('depsFunction', functionWithDependencies);
          childContainer.register('noDepsArrow', arrowNoDependencies);

          // This test checks that we are also passing the initial 'resolver' as a root
          // resolver context around. In other words: we can complete parents with
          // values only set at a child level.
          const result = childContainer.resolve('depsFunction');
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

    describe('resolveAll(tag)', () => {
      it('Should throw when no tag specified', () => {
        expect(() => {
          container.resolveAll(null);
        }).to.throw(Error);
      });

      it('Should throw when no tag registrations matched', () => {
        expect(() => {
          container.resolveAll('invalidTag');
        }).to.throw(Error);
      });

      it('Should resolve multiple implementations', () => {
        container.register('tagName', () => 3);

        // Create a child
        const child = container.createContainer();
        child.register('tagName', () => 1);

        // Put another in the parent
        container.register('tagName', () => 2);

        // Child resolve
        const childResolved = child.resolveAll('tagName');
        expect(childResolved).to.deep.equal([1, 2, 3]);

        // Parent resolve
        const parentResolved = container.resolveAll('tagName');
        expect(parentResolved).to.deep.equal([2, 3]);
      });
    }); // resolveAll

    describe('filterOut', () => {
      describe('Input validation', () => {
        it('Should throw when no tag specified', () => {
          expect(() => {
            container.filterOut(null);
          }).to.throw(Error);
        });
      });
      describe('behaviours', () => {
        it('Should exclude expected items (string)', () => {
          // Register a tag, then overload it
          container.register(['someTag'], 1);
          container.register(['someTag', 'excludeMe'], -1);

          // Initial result is -1
          expect(container.resolve('someTag')).to.equal(-1);

          // Resolve from filtered child
          const filteredChild = container.filterOut('excludeMe');
          expect(filteredChild.resolve('someTag')).to.equal(1);
        });

        it('Should exclude expected items (array)', () => {
          // Register a tag, then overload it
          container.register(['someTag'], 1);
          container.register(['someTag', 'excludeMe'], -2);
          container.register(['someTag', 'alsoMe'], -1);

          // Initial result is -1
          expect(container.resolve('someTag')).to.equal(-1);

          // Resolve from filtered child
          const filteredChild = container.filterOut(['excludeMe', 'alsoMe']);
          expect(filteredChild.resolve('someTag')).to.equal(1);
        });
      });
    }); // filterOut

    describe('filterAll', () => {
      describe('Input validation', () => {
        it('Should throw when no tag specified', () => {
          expect(() => {
            container.filterAll(null);
          }).to.throw(Error);
        });
      });
      describe('behaviours', () => {
        it('Should only include expected items (string)', () => {
          // Register a tag, then overload it
          container.register(['someTag', 'requireMe'], 1);
          container.register(['someTag'], -1);

          // Initial result is -1
          expect(container.resolve('someTag')).to.equal(-1);

          // Resolve from filtered child
          const filteredChild = container.filterAll('requireMe');
          expect(filteredChild.resolve('someTag')).to.equal(1);
        });

        it('Should include expected items (array)', () => {
          // Register a tag, then overload it
          container.register(['someTag'], -1);
          container.register(['someTag', 'requireMe'], -2);
          container.register(['someTag', 'andMe'], -3);
          container.register(['someTag', 'requireMe', 'andMe'], 1);
          container.register(['someTag', 'requireMe'], -4);
          container.register(['someTag', 'andMe'], -5);
          container.register(['someTag'], -6);

          // Initial result is -1
          expect(container.resolve('someTag')).to.equal(-6);

          // Resolve from filtered child
          const filteredChild = container.filterAll(['requireMe', 'andMe']);
          expect(filteredChild.resolve('someTag')).to.equal(1);
        });
      });
    }); // filterAll

    describe('filterAny', () => {
      describe('Input validation', () => {
        it('Should throw when no tag specified', () => {
          expect(() => {
            container.filterAny(null);
          }).to.throw(Error);
        });
      });

      describe('behaviours', () => {
        it('Should filter to expected items (string)', () => {
          // Register a tag, then overload it
          container.register(['someTag', 'mustHave'], 1);
          container.register(['someTag'], -1);

          // Initial result is -1
          expect(container.resolve('someTag')).to.equal(-1);

          // Resolve from filtered child
          const filteredChild = container.filterAny('mustHave');
          expect(filteredChild.resolve('someTag')).to.equal(1);
        });

        it('Should filter to expected items (array)', () => {
          // Register a tag, then overload it
          container.register(['someTag', 'optionA'], 1);
          container.register(['someTag', 'optionB'], 2);
          container.register(['someTag', 'optionC'], -1);

          // Initial result is -1
          expect(container.resolve('someTag')).to.equal(-1);

          // Resolve from filtered child
          const filteredChild = container.filterAny(['optionA', 'optionB']);
          expect(filteredChild.resolve('someTag')).to.equal(2);

          // resolveAll should return 2, 1
          const array = filteredChild.resolveAll('someTag');
          expect(array).to.deep.equal([2, 1]);
        });
      });
    }); // filterOut
  });
});
