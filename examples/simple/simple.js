'use strict';

class Database {
  constructor(connectionString) {
    console.log('Built database class with %s', connectionString);
    this.connectionStringValue = connectionString;
  }
};

const container = require('somersault').createContainer();

container.register('database', Database);
container.register('connectionString', 'someConnectionString');

const result = container.resolve('database');

// Result now contains a built-up database, with an injected connection string
