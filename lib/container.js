'use strict';

const assert = require('assert');
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
      /* istanbul ignore else - SG: Futureproofing / see 'else' comments */
      if (parserHelpers.isArrowFunction(parsed) || parserHelpers.isFunction(parsed)) {
        this._debug('Detected arrow function or plain function');
        // Generator for arrow function
        generatorDef = (container, depth, context, resolveRoot) => {
          const spacer = Array(depth * 4).join(' ');
          const args = [];
          this._debug('%sBuilding function instance', spacer);
          for (const arg of parserHelpers.getParameters(parsed)) {
            this._debug('%s Resolving argument %s', spacer, arg);
            args.push(resolveRoot._resolveInternal(arg, depth + 1, context));
          }
          return value.apply(null, args);
        };
      } else if (parserHelpers.isClass(parsed)) {
        this._debug('Detected ES6 class');
        // Generator for class
        generatorDef = (container, depth, context, resolveRoot) => {
          const spacer = Array(depth * 4).join(' ');
          const args = [null];
          this._debug('%sBuilding ES6 class instance', spacer);
          for (const arg of parserHelpers.getParameters(parsed)) {
            this._debug('%s Resolving argument %s', spacer, arg);
            args.push(resolveRoot._resolveInternal(arg, depth + 1, context));
          }
          return new (Function.prototype.bind.apply(value, args));
        };
      } else {
        // Belts and braces in case another 'function' variant is passed here that we don't
        // know about.
        this._debug('Detected unknown function type, did not match arrow, class or function');
        throw new Error('Invalid function type: was not an arrow, class or plain function!');
      }

      argList = parserHelpers.getParameters(parsed);
    } else {
      this._debug('Assuming object is a direct value storage. Typeof = "%s"', typeof value);
      generatorDef = () => value;
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

    // Deal with the potential problem of unsupported function variants that are
    // not parsed as arrow/func or a class.
    /* istanbul ignore next - Belts and braces */
    this._debug('Build assuming type is non-constructor function');
    /* istanbul ignore next */
    throw new Error('Object is not an arrow function, function or class. Cannot process');
  }

  /**
   * Create a child container of the current container.
   * @returns {Container}           - New child container.
   */
  createChild() {
    return new Container(this);
  }

  /**
   * Parent container context
   * @returns {Container}           - This containers parent, or null.
   */
  get parent() {
    return this._parent;
  }

  /**
   * Return an instance of an object implementing the specified tag.
   * @param {string} tag    - Tag to resolve
   */
  resolve(tag) {
    this._debug('resolve [%s]', tag);
    if (!tag) {
      throw new Error('Cannot resolve, no tag specified');
    }

    return this._resolveInternal(tag, 0, {});
  }

  /**
   * Return instances of all object implementing the specified tag.
   * @param {string} tag    - Tag to resolve
   * @returns {Array}       - Instances of tag, or empty array.
   */
  resolveAll(tag) {
    this._debug('resolveAll [%s]', tag);
    if (!tag) {
      throw new Error('Cannot resolve, no tag specified');
    }

    const output = [];
    const built = {};
    for (const registration of this._getResolveCandidatesInternal(tag)) {
      this._debug('    Found tag: calling generator() of match');
      const value = registration.generator(this, 1, built, this);
      built[tag] = value; // eslint-disable-line no-param-reassign
      this._debug('    Built value: %s', value);
      output.push(value);
    }

    // Fail if no matches for the specified tag.
    if (output.length === 0) {
      throw new Error(util.format('Could not resolveAll - no instances of [%s]', tag));
    }

    return output;
  }

  /**
   * Get a collection of resolution candidates for the specified tag(s)
   * @param {string}        tag      - TaTaggs to search for.
   * @returns {Array}                - Array of RegistrationRecords
   */
  _getResolveCandidatesInternal(tag) {
    // Get registrations for ourselves first
    const localRegistrations = this._registrations.slice(0).reverse();
    const parentRegistrations = this.parent ?
      this.parent._getResolveCandidatesInternal(tag) : [];
    const registrations = localRegistrations.concat(parentRegistrations);

    // Filter to arrays containing our tag
    return registrations.filter((registration) => registration.tags.indexOf(tag) > -1);
  }

  /**
   * Internal resolver implementation
   */
  _resolveInternal(tag, depth, built, resolverContext) {
    const resolveRoot = resolverContext || this;
    assert(tag, 'Tag should always be validated before arriving here, but was null.');
    assert(depth >= 0, 'Depth should never be less than 0?');
    assert(built, 'The build context/built map was not specified!');

    const spacer = Array(depth * 4).join(' ');
    this._debug('%sResolving tag %s', spacer, tag);
    if (tag === '$container') {
      this._debug('%s   The tag reference is for the current container context', spacer);
      return this;
    }

    // Use cached tag
    if (built[tag]) {
      this._debug('%sTag [%s] is already available in this context', spacer, tag);
      return built[tag];
    }

    // Iterate through reverse ordered registrations
    const registrations = this._getResolveCandidatesInternal(tag);
    if (registrations.length > 0) {
      const registration = registrations[0];
      this._debug('%sFound tag: calling generator() of first match', spacer);
      const value = registration.generator(this, depth + 1, built, resolveRoot);
      built[tag] = value; // eslint-disable-line no-param-reassign
      this._debug('%sBuilt value: %s', spacer, value);
      return value;
    }

    this._debug('%sCould not find tag [%s] in the container', spacer, tag);
    throw new Error(util.format('Could not find tag: %s', tag));
  }
}

module.exports = Container;
