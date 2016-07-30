# somersault
### Acrobatic yet-simple IoC Dependency Injection for Node.js Applications
[![Build Status](http://drone.eventualconsistency.net/api/badges/steve-gray/somersault/status.svg)](http://drone.eventualconsistency.net/steve-gray/somersault)
[![Prod Dependencies](https://david-dm.org/steve-gray/somersault/status.svg)](https://david-dm.org/steve-gray/somersault)
[![Dev Dependencies](https://david-dm.org/steve-gray/somersault/dev-status.svg)](https://david-dm.org/steve-gray/somersault#info=devDependencies)
[![Code Coverage](https://coveralls.io/repos/github/steve-gray/somersault/badge.svg?branch=master)](https://coveralls.io/github/steve-gray/somersault)
[![npm version](https://badge.fury.io/js/somersault.svg)](https://badge.fury.io/js/somersault)

[![Stats](https://nodei.co/npm/somersault.png?downloads=true&downloadRank=true&stars=true)](https://npmjs.com/package/somersault)
[![Downloads](https://nodei.co/npm-dl/somersault.png?height=2)](https://npmjs.com/package/somersault)

## Summary
somersault is a simple and flexible IoC solution for NodeJS (4.x+) projects that allows you to
simplify your application and create beautiful code. As Node.js is untyped we have to rely on the
declared names of your variables in order to determine what to inject.

The `somersault` library supports injection/building of:

  - Functions
  - ES6+ Arrow functions
  - ES6+ Classes

Depdencies are registered by a declared name (known as a 'Tag' in somersault), or by
multiple such-tags. You can then either `resolve` a tag (i.e. build a tag and it's
dependencies from scratch) or `build` a generator function - essentially fill in the
blanks for parameters and constructors.

## Installation
To install somersault into your node application:

    npm install somersault --save

## Usage
### Container Creation
To create an IoC Container:

    const somersault = require('somersault');
    const myContainer = somersault.createContainer();

### Registering Dependencies (.register(tags, value))
You can register a class, arrow function or function with:

    myContainer.register('someAlias', myFuncOrClass);

You can also register the same object with multiple tags via:

    myContainer.register(['someAlias', 'anotherAlias'], myFuncOrClass);

### Resolving by Tag
To generate a complete object or graph of object from a tag, use .resolve(), such as:

    const myInstance = myContainer.resolve('someAlias')

This will look up the most recently registered object with the tag 'someAlias'.

### Building from a Template
To generate a complete value from a function, arrow function or class, pass it as the
parameter to the `.build()` operation, such as:

    const myResult = myContainer.build(MyClassName);

This will create a new instance of MyClassName, populating any constructor parameters
that are known from other dependencies.

### Worked Example
In this example we create a new `somersault` container, register a 'database' class
and a constant-value of 'someConnectionString'. This allows us to inject the connection
string into our database object at runtime.

    const container = require('somersault').createContainer();

    container.register('database', class Database {
      constructor(connectionString) {
        console.log('Built database class with %s', connectionString);
        this.connectionStringValue = connectionString;
      }
    });
    container.register('connectionString', 'someConnectionString');

    const result = container.resolve('database');

The .resolve() operation looks up a defined 'tag' within the container, and builds
an instance. In the example we are also registering the `connectionString` tag, which
allows the parameter `connectionString` on our database class to be satisifeid.

__somersault__ allows the inputs for registration to be:

  - Constant values
  - Generator values, such as:
      - Functions (parameters are resolved by tag/name)
      - Arrow Functions (parameters as per functions)
      - ES6+ classes (Constructor parameters are resolved by tag/name).

## Container Methods and Properties
### .createContainer()
Create a child container/context that uses the specified container as a fallback/parent.

    const childContainer = myContainer.createChild();

### .build(funcArrowOrClass)
Creates an instance of a class, or if a function/arrow-function, will execute the function and return
it's value. The required parameters of the class constructor or function declaration are filled in using
the container registrations.

    const myObject = myContainer.build(SomeClass);

#### Overload .build(funcArrowOrClass, constructorTags)
Creates an instance of a class or executes a function/arrow, but remaps the detected names of the 
parameters to use alternate tags when resolving. This allows for consumption of types that do not
have suitable IoC focused names that match pre-existing registrations:

      function myGenerator(someInstance, someFunc) {
        return someInstance.value + someFunc.value;
      }    
      const instance = container.build(myGenerator,
        ['alternateClass', 'alternateFunc']);

In this example the arguments someInstance and someFunc are resolved as if they'd been written with
the overridden names.

### .filterAll(tag|tags)
Creates a child container that will only include any registrations that match the nominated tag (or ALL
of a list of nominated tags). This allows filtering down to a subset where registrations have multiple
tags that combine to provide grouping:

    // Register connection settings for environments
    container.register(['connectionString', 'QA', 'serverA'], 'foo=bar1');
    container.register(['connectionString', 'QA', 'serverB'], 'foo=bar2');
    container.register(['connectionString', 'UAT', 'serverA'], 'foo=waa1');
    container.register(['connectionString', 'UAT', 'serverB'], 'foo=waa2');

    // Filter
    const filteredChild = container.filterAll(['QA', 'serverB']);
    // filteredChild will now only resolve connectionString = foo=bar2

This filter applies to the current container and all upstream registrations in the hierarchy, but does
not modify results returned from references to the original container. Filter operations can be chained
to create composed behaviours.

### .filterAny(tag|tags)
Creates a child container that will only include any registrations that match the nominated tag (or any
of a list of nominated tags). This allows filtering down to a subset where registrations have multiple
tags that group them:

    // Register connection settings for environments
    container.register(['connectionString', 'QA'], 'foo=bar');
    container.register(['connectionString', 'UAT'], 'foo=waa');

    // Filter
    const filteredChild = container.filterAny('QA');
    // filteredChild will now only resolve registrations that include a QA tag.

This filter applies to the current container and all upstream registrations in the hierarchy, but does
not modify results returned from references to the original container. Filter operations can be chained
to create composed behaviours.

### .filterOut(tag|tags)
Creates a child container that will exclude any dependencies that have the nominated tag or tags array
assigned to them. This allows hiding of certain groups of dependencies in child containers.

    // Register a tag, then overload it
    container.register(['someTag'], 1);
    container.register(['someTag', 'excludeMe'], -1);

    // Initial result is -1
    const firstResult = container.resolve('someTag');

    // Resolve from filtered child
    const filteredChild = container.filterOut('excludeMe');
    // Will now be 1 (because excludeMe is hidden)

This filter hides all dependencies with the nominated tag/tags, no matter
where they are in the parent container hierarchy. Filter operations can be chained
to create composed behaviours.

### .parent
Returns the parent container of a container context.

    const myParent = myContainer.parent;

### .register(tag|tags, value)
Register a value with the container. Value can be any of:
  - Arrow Function
  - Class
  - Function
  - Any other value (assumed to be a singleton/constant-value).

Classes are generated as new instances of the class *on-demand*, however arrows and functions
are simply evaluated during resolution/build and returned. If you need to use prototypes or
functions, register a 'generator' function to avoid problems around usage of `this`.

    myContainer.register('someTag', MyClassHere);
    myContainer.register(['can','have','many','tags'], function (foo) { ... });
    myContainer.register('generator', (x, y, z) => new PrototypeNameHere(x, y, z));
    myContainer.register('config', { someKey: 'value' });

#### Overload: .register(tag|tags, value, constructorTags)
It is possible to override the detection of parameter names on a function, arrow and class by passing
a third parameter to register() - an array of alternate parameter/tag names.

    myContainer.register(['can','have','many','tags'], function (foo, bar) { ... }, ['hello', 'world']);

In this example, any attempt to .resolve('tag') will now act as if function was function (hello, world)
and resolve _those_ parameter names instead.

### .resolve(tag)
Produces the most recently registered tag value (and completes dependencies, if required). The tag value
must match a tag used during registration.

    const myInstance = myContainer.resolve('someTag');
    myInstance.doSomething();

### .resolveAll(tag)
Produces an instance of all instances of the specified tag registration in the container hierarchy all the
way to the root.

    const myWidgets = myContainer.resolveAll('widget');
    for (const widget of myWidgets) {
      widget.frob();
    }

Registrations are returned in most-recent registration order _ascending_ through the hierarchy,
so more recent registrations from parents appear after oldest child registrations.

## Advanced Usage
### Nested Dependencies
The `somersault` package will resolve dependencies, and then dependencies of those
dependencies as required until all elements are populated and built. This allows
complex object graphs to be satisfied easily.

### Repeated Dependencies
Each specific dependency is only built __once__ per resolve/build operation. It assumed
that the same instance/value can be passed to each object in a graph requiring a specific
dependency to be resolved.

## Licencing
This repository is MIT licensed. That means you can use it freely without restriction or attribution. 
If this helped you get started, give the repo a star on GitHub and help spread the word.

## Contribution & Development Guide
The library is built using the following tools and techniques:

- Code Coverage Analysis (Package: [istanbul](https://github.com/gotwarlost/istanbul) / [gulp-istanbul](https://github.com/SBoudrias/gulp-istanbul))
- Documentation Generation (Package: [esdoc](https://github.com/esdoc/esdoc)/[gulp-esdoc](https://github.com/nanopx/gulp-esdoc))
- Standards Enforcement (Package: [eslint](https://github.com/eslint/eslint)/[gulp-eslint](https://github.com/adametry/gulp-eslint)
    - Special nod to [Airbnb](https://github.com/airbnb/javascript/) for their coding standards ruleset.
- Unit Testing with:
    - [Chai](https://github.com/chaijs/chai) (BDD Style Assertions)
    - [Mocha](https://github.com/mochajs/mocha) (Test Runner)

These are all validated and working on NodeJS 4.x and above, we test for multiple
variations of node which can be seen in our .travis.yml

### Getting Started on Development
To get started for your contributions, please do the following:

* Create a fork of our repository into your own workspace or organisation 
    (this way you can track improvements and updates as we make them).
* If you aren't using VSCode, then you can also drop the .vscode directory, 
which defines some IDE options to make sure the standards for tabs and spacing
are used.

Then it's as simple as:

        npm install
        gulp

Please note __all contributions require test coverage__ to be accepted.

### Other Commands
The following gulp tasks are defined:

* gulp *docs* - Regenerate esdoc documentation.
* gulp *lint* - Run ESLint validation of code standards. 
    - You can also lint-lib or lint-tests to look at specific areas.
* gulp *test* - Run unit tests.
