'use strict';

const somersault = require('./lib');

const container = somersault.createContainer();
const generator = () => {
  console.log('Called generator');
  return {
    resolved: true
  };
};

container.register(['database', 'othertag'], generator);
container.register(['haterbase', 'othertag'], generator);

const result = container.resolve('database');
console.log(result);