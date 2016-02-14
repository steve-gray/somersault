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
      throw new Error('Cannot register: generator or object not specified')
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
      throw new Error('Cannot registerTag: generator or object not specified')
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
    return lastItem();
  }
}

module.exports = Container;
