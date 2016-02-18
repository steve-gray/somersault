# somersault
### Acrobatic yet-simple IoC Dependency Injection for Node.js Applications
[![Travis-CI Build](https://travis-ci.org/steve-gray/somersault.svg?branch=master)](https://travis-ci.org/steve-gray/somersault)
[![Prod Dependencies](https://david-dm.org/steve-gray/somersault/status.svg)](https://david-dm.org/steve-gray/somersault)
[![Dev Dependencies](https://david-dm.org/steve-gray/somersault/dev-status.svg)](https://david-dm.org/steve-gray/somersault#info=devDependencies)
[![Code Coverage](https://coveralls.io/repos/github/steve-gray/somersault/badge.svg?branch=master)](https://coveralls.io/github/steve-gray/somersault)
[![npm version](https://badge.fury.io/js/somersault.svg)](https://badge.fury.io/js/somersault)

![Stats]( https://nodei.co/npm/somersault.png?downloads=true&downloadRank=true&stars=true)
![Downloads](https://nodei.co/npm-dl/somersault.png?height=2)

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
### .createChild()
Create a child container/context that uses the specified container as a fallback/parent.

    const childContainer = myContainer.createChild();

### .build(funcArrowOrClass)
Creates an instance of a class, or if a function/arrow-function, will execute the function and return
it's value. The required parameters of the class constructor or function declaration are filled in using
the container registrations.

    const myObject = myContainer.build(SomeClass);

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

A filter hides all dependencies with the nominated tag/tags, no matter
where they are in the parent container hierarchy.

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

# Feature Roadmap
The following features are high priorities for future releases:

  - Ability to create filtered sub-containers (i.e. container.filter('someTag'))
      - This allows registration of multiple conflicting names, but still resolving specific names later.
  - Ability to enumerate all instances of a tag (i.e. .resolverAll('tag'))
  - ES3/5 Transpile via Babel
