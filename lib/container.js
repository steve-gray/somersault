'use strict';

const assert = require('assert');
const debug = require('debug');
const parserHelpers = require('./parser-helpers');
const RegistrationRecord = require('./registration-record');
const util = require('util');
const uuid = require('uuid');

/**
 * Validate a single tag name internal
 * @param {string}  tag     - Tag to validate.
 * @return {string}        - Cleaned up tag value.
 */
function _validateSingleTagInternal(tag) {
  if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
    throw new Error('Tag cannot be non-string, empty or whitespace');
  }

  return tag.trim();
}

/**
 * Validate an array of tags, or single tag, returning the cleaned
 * array to use for procesing.
 * @param {Array}  tags    - Array of tags, or single tag to validate.
 * @return {string}              - Cleaned up tag value.
 */
function _validateTagArrayInternal(tags) {
  // Single array item case.
  if (!Array.isArray(tags)) {
    const singleTag = _validateSingleTagInternal(tags);
    return [singleTag];
  }

  const result = [];
  for (const tag of tags) {
    result.push(_validateSingleTagInternal(tag));
  }
  return result;
}

/**
 * The Container class represents a context for building objects. It can be nested
 * hierarchically if required.
 */
class Container {

  /**
   * Initialize a new instance of the Container type, with an optional parent
   * container context.
   * @param {Container}   parentContainer     - Parent container, optional
   * @param {object}      options             - Container options
   */
  constructor(parentContainer, options) {
    this._id = uuid.v4();
    this._debug = debug(util.format('somersault:Container:%s', this._id.toString()));
    this._options = options || {};

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
   * @return {String}      - Container ID
   */
  get containerId() {
    return this._id.toString();
  }

  /**
   * Register a type with the specified tags.
   * @param {Object} tags             - Registration tags
   * @param {Object} value            - Generator (or object instance)
   * @param {Array}  constructorTags  - Constructor tags to override constructor variable names.
   */
  register(tags, value, constructorTags) {
    this._debug('Starting register() of %s', tags);
    const registryTags = _validateTagArrayInternal(tags);
    if (!value) {
      throw new Error('Cannot register - require a value (arrow, function, class or constant)');
    } else if (constructorTags && !Array.isArray(constructorTags)) {
      throw new Error('Cannot register - constructorTags must be an array of tags or null');
    }
    let generatorDef = null;
    let argList = [];

    // If the value is a function, replace the simple instance-value generator
    // with a more useful proxy for instanciation.
    if (typeof value === 'function') {
      this._debug('Input value is a generator');

      const parsed = parserHelpers.parseObject(value);
      if (constructorTags) {
        argList = _validateTagArrayInternal(constructorTags);
      } else {
        argList = parserHelpers.getParameters(parsed);
      }

      /* istanbul ignore else - SG: Futureproofing / see 'else' comments */
      if (parserHelpers.isArrowFunction(parsed) || parserHelpers.isFunction(parsed)) {
        this._debug('Detected arrow function or plain function');
        // Generator for arrow function
        generatorDef = (container, depth, context, resolveRoot) => {
          const spacer = Array(depth * 4).join(' ');
          const args = [];
          this._debug('%sBuilding function instance', spacer);
          for (const arg of argList) {
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
          for (const arg of argList) {
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
   * @param {Object}    generator       - Generator function or class
   * @param {Array}     constructorTags - Optional arguments list for overriding generator args
   * @return {Object}                  - Result of generator.
   */
  build(generator, constructorTags) {
    this._debug('Starting build()');

    // Validate arguments
    if (typeof generator !== 'function') {
      throw new Error('Cannot build: generator input was not a function');
    } else if (constructorTags && !Array.isArray(constructorTags)) {
      throw new Error('Cannot build - constructorTags must be an array of tags or null');
    }

    this._debug('Parsing object definition');
    const parsed = parserHelpers.parseObject(generator);

    // Load arguments
    const argList = constructorTags || parserHelpers.getParameters(parsed);
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
   * @return {Container}           - New child container.
   * @deprecated since 1.0.0 - Please use .createContainer()
   */
  createChild() {
    return this.createContainer();
  }

  /**
   * Create a child container of the current container.
   * @param {object} options        - Options for the container.
   * @return {Container}           - New child container.
   */
  createContainer(options) {
    return new Container(this, options);
  }

  /**
   * Filter the specified container to only include dependencies
   * that match any of the nominated tags.
   * @param {Array}     tags    - Array of tags (or single string tag)
   * @return                   - Container that is filtering to specified tags
   */
  filterAny(tags) {
    this._debug('filterAny(%s)', tags);
    const filterSet = _validateTagArrayInternal(tags);

    // Create the filter set.
    return new Container(this, {
      filterAnyOf: filterSet,
    });
  }

  /**
   * Filter the specified container to only include dependencies
   * that match ALL of the nominated tags.
   * @param {Array}     tags    - Array of tags (or single string tag)
   * @return                   - Container that is filtering to specified tags
   */
  filterAll(tags) {
    this._debug('filterAll(%s)', tags);
    const filterSet = _validateTagArrayInternal(tags);

    // Create the filter set.
    return new Container(this, {
      filterAllOf: filterSet,
    });
  }

  /**
   * Filter out specific tag/tags from the collection
   * @param {Array}     tags    - Array of tags (or single string tag)
   * @return                   - Container that is filtering out specified tags
   */
  filterOut(tags) {
    this._debug('filterOut(%s)', tags);
    const filterSet = _validateTagArrayInternal(tags);

    // Create the filter set.
    return new Container(this, {
      filterNoneOf: filterSet,
    });
  }

  /**
   * Parent container context
   * @return {Container}           - This containers parent, or null.
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
    const cleanedTag = _validateSingleTagInternal(tag);

    return this._resolveInternal(cleanedTag, 0, {});
  }

  /**
   * Return instances of all object implementing the specified tag.
   * @param {string} tag    - Tag to resolve
   * @return {Array}       - Instances of tag, or empty array.
   */
  resolveAll(tag) {
    this._debug('resolveAll [%s]', tag);
    const cleanedTag = _validateSingleTagInternal(tag);

    const output = [];
    const built = {};
    for (const registration of this._getResolveCandidatesInternal(cleanedTag)) {
      this._debug('    Found tag: calling generator() of match');
      const value = registration.generator(this, 1, built, this);
      built[cleanedTag] = value; // eslint-disable-line no-param-reassign
      this._debug('    Built value: %s', value);
      output.push(value);
    }

    // Fail if no matches for the specified tag.
    if (output.length === 0) {
      throw new Error(util.format('Could not resolveAll - no instances of [%s]', cleanedTag));
    }

    return output;
  }

  /**
   * Get a collection of resolution candidates for the specified tag(s)
   * @param {string}        tag      - TaTaggs to search for.
   * @return {Array}                - Array of RegistrationRecords
   */
  _getResolveCandidatesInternal(tag) {
    const cleanedTag = _validateSingleTagInternal(tag);

    // Get registrations for ourselves first
    const localRegistrations = this._registrations.slice(0).reverse();
    const parentRegistrations = this.parent ?
      this.parent._getResolveCandidatesInternal(cleanedTag) : [];

    // Initial registrations
    let registrations = localRegistrations.concat(parentRegistrations);

    // filterNoneOf - Exclude items matching any of these
    if (this._options.filterNoneOf) {
      registrations = registrations.filter((registration) => {
        for (const tagToExclude of this._options.filterNoneOf) {
          if (registration.tags.indexOf(tagToExclude) > -1) {
            return false;
          }
        }
        return true;
      });
    }
    // filterAllOf - Exclude items NOT matching any of these
    if (this._options.filterAllOf) {
      registrations = registrations.filter((registration) => {
        for (const tagToFind of this._options.filterAllOf) {
          if (registration.tags.indexOf(tagToFind) === -1) {
            return false;
          }
        }
        return true;
      });
    }

    // filterAnyOf - Must match at least one.
    if (this._options.filterAnyOf) {
      registrations = registrations.filter((registration) => {
        for (const tagToCheck of this._options.filterAnyOf) {
          if (registration.tags.indexOf(tagToCheck) > -1) {
            return true;
          }
        }
        return false;
      });
    }

    // Filter dependencies that do not have at least one of
    // Filter to arrays containing our tag
    return registrations.filter((registration) => registration.tags.indexOf(cleanedTag) > -1);
  }

  /**
   * Internal resolver implementation
   */
  _resolveInternal(tag, depth, built, resolverContext) {
    const resolveRoot = resolverContext || this;
    const cleanedTag = _validateSingleTagInternal(tag);
    assert(depth >= 0, 'Depth should never be less than 0?');
    assert(built, 'The build context/built map was not specified!');

    const spacer = Array(depth * 4).join(' ');
    this._debug('%sResolving tag %s', spacer, cleanedTag);
    if (cleanedTag === '$container') {
      this._debug('%s   The tag reference is for the current container context', spacer);
      return this;
    }

    // Use cached tag
    if (built[cleanedTag]) {
      this._debug('%sTag [%s] is already available in this context', spacer, cleanedTag);
      return built[cleanedTag];
    }

    // Iterate through reverse ordered registrations
    const registrations = this._getResolveCandidatesInternal(cleanedTag);
    if (registrations.length > 0) {
      const registration = registrations[0];
      this._debug('%sFound tag: calling generator() of first match', spacer);
      const value = registration.generator(this, depth + 1, built, resolveRoot);
      built[cleanedTag] = value; // eslint-disable-line no-param-reassign
      this._debug('%sBuilt value: %s', spacer, value);
      return value;
    }

    this._debug('%sCould not find tag [%s] in the container', spacer, cleanedTag);
    throw new Error(util.format('Could not find tag: %s', cleanedTag));
  }
}

module.exports = Container;
