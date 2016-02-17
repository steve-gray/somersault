'use strict';

const debug = require('debug');
const parserHelpers = require('./parser-helpers');
const RegistrationRecord = require('./registration-record');
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
    this._registrations = [];
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
   * @param {Object} value      - Generator (or object instance)
   */
  register(tags, value) {
    if (!tags) {
      throw new Error('Cannot register: tags not specified');
    } else if (!value) {
      throw new Error('Cannot register: generator or object not specified');
    }

    this._debug('Starting register() of %s', tags);
    const registryTags = Array.isArray(tags) ? tags : [tags];
    let generatorDef = null;
    let argList = [];

    // If the value is a function, replace the simple instance-value generator
    // with a more useful proxy for instanciation.
    if (typeof value === 'function') {
      this._debug('Input value is a generator');

      const parsed = parserHelpers.parseObject(value);
      if (parserHelpers.isArrowFunction(parsed) || parserHelpers.isFunction(parsed)) {
        this._debug('Detected arrow function or plain function');
        // Generator for arrow function
        generatorDef = (container, depth, context) => {
          const spacer = Array(depth * 4).join(' ');
          const args = [];
          this._debug('%sBuilding function instance', spacer);
          for (const arg of parserHelpers.getParameters(parsed)) {
            this._debug('%s Resolving argument %s', spacer, arg);
            args.push(container._resolveInternal(arg, depth + 1, context));
          }
          return value.apply(null, args);
        };
      } else if (parserHelpers.isClass(parsed)) {
        this._debug('Detected ES6 class');
        // Generator for class
        generatorDef = (container, depth, context) => {
          const spacer = Array(depth * 4).join(' ');
          const args = [null];
          this._debug('%sBuilding ES6 class instance', spacer);
          for (const arg of parserHelpers.getParameters(parsed)) {
            this._debug('%s Resolving argument %s', spacer, arg);
            args.push(container._resolveInternal(arg, depth + 1, context));
          }
          return new (Function.prototype.bind.apply(value, args));
        };
      } else {
        this._debug('Detected unknown function type, did not match arrow, class or function');
        /* istanbul ignore next */
        throw new Error('Invalid function type: was not an arrow, class or plain function!');
      }

      argList = parserHelpers.getParameters(parsed);
    }

    const record = new RegistrationRecord({
      argList,
      generator: generatorDef,
      tags: registryTags,
    });
    this._registrations.push(record);
  }

  /**
   * Build up a new instance of an object or function from the specified
   * generator.
   * @param {Object}    generator   - Generator function or class
   * @returns {Object}              - Result of generator.
   */
  build(generator) {
    this._debug('Starting build()');

    // Validate arguments
    if (typeof generator !== 'function') {
      throw new Error('Cannot build: generator input was not a function');
    }

    this._debug('Parsing object definition');
    const parsed = parserHelpers.parseObject(generator);

    // Load arguments
    const argList = parserHelpers.getParameters(parsed);
    const args = [];
    for (const argName of argList) {
      args.push(this.resolve(argName));
    }
    this._debug('Arglist: %s', JSON.stringify(argList));

    if (parserHelpers.isArrowFunction(parsed) || parserHelpers.isFunction(parsed)) {
      this._debug('Building arrow function / function');
      return generator.apply(null, args);
    } else if (parserHelpers.isClass(parsed)) {
      this._debug('Building class with new()');
      // Push a null into the array :D
      args.unshift(null);
      return new (Function.prototype.bind.apply(generator, args));
    }

    this._debug('Build assuming type is non-constructor function');
    throw new Error('Object is not an arrow function, function or class. Cannot process');
  }

  /**
   * Return an instance of an object implementing the specified tag.
   * @param {string} tag    - Tag to resolve (or array of tags)
   */
  resolve(tag) {
    this._debug('Resolving [%s]', tag);
    if (!tag) {
      throw new Error('Cannot resolve, no tag specified');
    }

    return this._resolveInternal(tag, 0, {});
  }

  /**
   * Internal resolver implementation
   */
  _resolveInternal(tag, depth, built) {
    const spacer = Array(depth * 4).join(' ');
    this._debug('%sResolving tag %s', spacer, tag);
    const registrations = this._registrations.slice(0).reverse();
    if (built[tag]) {
      this._debug('%sTag [%s] is already available in this context', spacer, tag);
      return built[tag];
    }
    for (const registration of registrations) {
      if (registration.tags.indexOf(tag) > -1) {
        this._debug('%sFound tag: calling generator()', spacer);
        const value = registration.generator(this, depth + 1, built);
        built[tag] = value; // eslint-disable-line no-param-reassign
        this._debug('%sBuilt value: %s', spacer, value);
        return value;
      }
    }

    this._debug('%sCould not find tag [%s] in the container', spacer, tag);
    throw new Error(util.format('Could not find tag: %s', tag));
  }
}

module.exports = Container;
