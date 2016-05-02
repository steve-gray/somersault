'use strict';

const Container = require('./container');

const creationExpression = (parent, options) =>
  new Container(parent, options);

const rootFunction = (options) =>
  new Container(null, options);

/**
 * Create a container (Compatability shim)
 * @param {Container} parent      - Parent container, optional.
 * @param {object}    options     - Container options
 */
rootFunction.createContainer = creationExpression;

module.exports = rootFunction;
