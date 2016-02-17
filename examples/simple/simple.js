'use strict';

const somersault = require('../../lib');

const container = somersault.createContainer();

container.register('database', class Database {
  constructor(connectionString) {
    console.log('Built database class with %s', connectionString);
    this.connectionStringValue = connectionString;
  }
});
container.register('connectionString', 'someConnectionString');

const result = container.resolve('database');

// Result now contains a built-up database, with an injected connection string
