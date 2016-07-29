'use strict';

const Container = require('./container');

const creationExpression = (parent, options) =>
  new Container(parent, options);

const rootFunction = (options) =>
  new Container(null, options);

const singleton = (generator) => {
  let instance = null;
  return ($container) => {
    if (!instance) {
      instance = $container.build(generator);
    }
    return instance;
  };
};
/**
 * Create a container (Compatability shim)
 * @param {Container} parent      - Parent container, optional.
 * @param {object}    options     - Container options
 */
rootFunction.createContainer = creationExpression;

module.exports = rootFunction;
