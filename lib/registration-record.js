'use strict';

/**
 * Registration record for a dependency
 */
class RegistrationRecord {
  /**
   * Initialize a new registration record
   * @param {object}      details         - Registration details
   */
  constructor(details) {
    if (!details) {
      throw new Error('Cannot initialize RegistrationRecord: no details passed');
    } else if (!(details.generator)) {
      throw new Error('Cannot initialize RegistrationRecord: no generator function');
    } else if (!(details.argList)) {
      throw new Error('Cannot initialize RegistrationRecord: no argList');
    }

    this.generator = details.generator;
    this.argList = details.argList;
    this.tags = details.tags || [];
  }
}

module.exports = RegistrationRecord;
