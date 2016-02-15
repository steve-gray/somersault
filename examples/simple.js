'use strict';

const somersault = require('../lib');

const container = somersault.createContainer();

container.register('database', class Database {
  constructor(connectionString) {
    this.connectionStringValue = connectionString;
  }
});
container.register('connectionString', 'someConnectionString');

const result = container.resolve('database');
console.log(result.connectionStringValue);
