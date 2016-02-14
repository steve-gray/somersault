'use strict';

const debug = require('debug');
const util = require('util');
const uuid = require('uuid');

/**
 * The Container class represents a context for building objects. It can be nested
 * hierarchically if required.
 */
class Container {

  /**
   * Initialize a new instance of the Container type, with an optional parent
   * container context.
   * @param {Container}   parentContainer     - Parent container, optional
   */
  constructor(parentContainer) {
    this._id = uuid.v4();
    this._debug = debug(util.format('somersault:Container:%s', this._id.toString()));

    // Validate inputs
    if (parentContainer && !(parentContainer instanceof Container)) {
      throw new Error('The parentContainer must either be null or a Container subtype.');
    }

    // Build instance
    this._parent = parentContainer;
    this._tagMap = {};
    this._generators = new Set();
  }

  /**
   * Container Id
   * @returns {String}      - Container ID
   */
  get containerId() {
    return this._id.toString();
  }

  /**
   * Register a type with the specified tags.
   * @param {Object} tags       - Registration tags
   * @param {Object} generator  - Generator (or object instance)
   */
  register(tags, generator) {
    if (!tags) {
      throw new Error('Cannot register: tags not specified');
    } else if (!generator) {
      throw new Error('Cannot register: generator or object not specified');
    }

    // Are we registering multiple?
    this._debug('Starting register()');
    if (Array.isArray(tags)) {
      // Register multiple tags in tags array
      this._debug('Detected tag array. Processing multiple registration aliases.');
      for (const tag of tags) {
        this.registerTag(tag, generator);
      }
    } else {
      // Register single tag
      this._debug('Detected single tag value [%s]', tags);
      this.registerTag(tags, generator);
    }
    this._debug('Completed register()');
  }

  /**
   * Register a single tagged generator with the container.
   * @param {string} tag        - Registration tag
   * @param {Object} generator  - Generator (or object instance)
   */
  registerTag(tag, generator) {
    // Validate inputs
    if (!tag) {
      throw new Error('Cannot registerTag: tag not specified');
    } else if (!generator) {
      throw new Error('Cannot registerTag: generator or object not specified');
    } else if (typeof tag !== 'string') {
      throw new Error('Cannot registerTag: tag is not a string!');
    }

    this._debug('Registering tag [%s]', tag);

    // Register in the generators map if not present.
    if (!this._generators.has(generator)) {
      this._debug('Generator has not been seen before, first time registration.');
      this._generators.add(generator);
    } else {
      this._debug('Generator has been seen before, updating tags only');
    }

    // Add tag to tag-map if not present.
    if (!this._tagMap[tag]) {
      this._debug('Tag [%s] has not been seen before, first time registration.', tag);
      this._tagMap[tag] = [];
    }

    // Does the item not exist in the tag-map?
    if (this._tagMap[tag].filter((item) => item === generator).length > 0) {
      this._debug('Generator is already present for tag [%s], skipping registration.', tag);
    } else {
      this._tagMap[tag].push(generator);
    }

    this._debug('Registration completed.');
  }

  /**
   * Build up a new instance of an object or function from the specified
   * generator.
   * @param {Object}    generator   - Generator function or class
   * @returns {Object}              - Result of generator.
   */
  build(generator) {
    // Validate arguments
    if (typeof generator !== 'function') {
      throw new Error('Cannot build: generator input was not a function');
    }

    // ES6 class?
    const stringRepresentation = generator.toString().trim();
    if (stringRepresentation[0] === '(') {
      this._debug('Build has detected an ES6 arrow function');
      return this._buildArrow(generator);
    } else if (stringRepresentation.indexOf('class') === 0) {
      this._debug('Build has detected an ES6 class/constructor');
      return this._buildClass(generator);
    }

    this._debug('Build assuming type is non-constructor function');
    return this._buildFunction(generator);
  }

  /**
   * Build arguments for a function or constructor
   */
  _buildArgs(inputs, args) {
    if (args[0] && args[0].length > 0) {
      this._debug('Arguments to resolve: %s', args);
      for (const arg of args) {
        this._debug('Resolving argument [%s]', arg.toString());
        inputs.push(this.resolve(arg));
      }
    }
  }

  /**
   * Build an ES6 arrow function.
   */
  _buildArrow(arrowDef) {
    if (typeof arrowDef !== 'function') {
      throw new Error('Cannot build: classDef input was not a function');
    }

    this._debug('Building arrow function.');
    const args = arrowDef.toString()
      .replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s))/mg, '')
      .match(/[^\(]*\(\s*([^\)]*)\)/m)[1]
      .split(/,/);

    // Resolve arguments
    const inputs = [];
    this._buildArgs(inputs, args);

    // Call function
    this._debug('Calling constructor for type.');
    return (arrowDef.apply(arrowDef, inputs));
  }

  /**
   * Build an ES6 class.
   */
  _buildClass(classDef) {
    if (typeof classDef !== 'function') {
      throw new Error('Cannot build: classDef input was not a function');
    } else if (typeof classDef.constructor !== 'function') {
      throw new Error('Cannot build: classDef.constructor was not a function');
    }

    this._debug('Building class: %s', classDef.name);
    const args = classDef.toString()
      .replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s))/mg, '')
      .match(/constructor\s*[^\(]*\(\s*([^\)]*)\)/m)[1]
      .split(/,/);

    // Resolve arguments
    const inputs = [];
    this._debug('Arguments to resolve: %s', args);
    inputs.push(null); // Push a null 'this'
    this._buildArgs(inputs, args);

    // Call function
    this._debug('Calling constructor for type.');
    return new (Function.prototype.bind.apply(classDef, inputs));
  }

  /**
   * Execute a function to build a return value.
   * @param {function}  functionDef     - Function definition
   * @returns                           - Result of executing function.
   * @private
   */
  _buildFunction(functionDef) {
    // Validate arguments
    this._debug('Building function: %s', functionDef);
    if (typeof functionDef !== 'function') {
      throw new Error('Cannot build: functionDef input was not a function');
    }

    // Parse the arguments out of the function
    const args =
      (functionDef.toString())
        .replace(/\s+/g, '')
        .replace(/[/][*][^/*]*[*][/]/g, '')         // strip simple comments
        .split('){', 1)[0].replace(/^[^(]*[(]/, '') // extract the parameters
        .replace(/=[^,]+/g, '')                     // strip any ES6 defaults
        .split(',')
        .filter(Boolean);                           // split & filter [""]

    // Resolve arguments
    this._debug('Arguments to resolve: %s', args);
    const inputs = [];
    this._buildArgs(inputs, args);

    // Call function
    return functionDef.apply(null, inputs);
  }

  /**
   * Return an instance of an object implementing the specified tag.
   * @param {string} tag    - Tag to resolve (or array of tags)
   */
  resolve(tag) {
    this._debug('Resolving [%s]', tag);
    if (!tag) {
      throw new Error('Cannot resolve, no tag specified');
    } else if (!this._tagMap[tag]) {
      throw new Error(util.format('Cannot resolve [%s]: the tag is not registered', tag));
    }

    const tagMap = this._tagMap[tag];
    const lastItem = tagMap[tagMap.length - 1];
    if (typeof lastItem === 'function') {
      this._debug('Recursively building [%s]', tag);
      return this.build(lastItem);
    }
    return lastItem();
  }
}

module.exports = Container;
