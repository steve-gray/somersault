'use strict';

const Container = require('./container');

module.exports = {
  /**
   * Create a container
   * @param {Container} parent      - Parent container, optional.
   * @param {object}    options     - Container options
   */
  createContainer: function createContainer(parent, options) {
    return new Container(parent, options);
  },
};
