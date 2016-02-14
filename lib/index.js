'use strict';

const Container = require('./container');

module.exports = {
  /**
   * Create a container
   * @param {Container} parent      - Parent container, optional.
   */
  createContainer: function createContainer(parent) {
    return new Container(parent);
  },
};
