'use strict';

const esprima = require('esprima');
const deepProp = require('deep-property');

/**
 * Parse an object with the esprima parser.
 * @param {object}    object      - Object to parse.
 * @return                       - ESprima parse tree.
 */
function parseObject(object) {
  return esprima.parse(object);
}

/**
 * Get the first body of the specified parsed block
 */
function getFirstBody(parsed) {
  if (deepProp.has(parsed, 'body.0')) {
    return parsed.body[0];
  }
  return null;
}

/**
 * Is the specified parsed entity an arrow function?
 * @param {object}    parsed        - esprima parsed declaration.
 * @return                         - True if parsed is an arrow function.
 */
function isArrowFunction(parsed) {
  const body = getFirstBody(parsed);
  if (!body) {
    return false;
  }

  // Require the overall statement to be an ExpressionStatement containing
  // an ArrowFunctionExpression
  return body.type === 'ExpressionStatement' &&
    body.expression.type === 'ArrowFunctionExpression';
}

/**
 * Is the specified parsed entity a class declaration?
 * @param {object}    parsed        - esprima parsed declaration.
 * @return                         - True if parsed is an class.
 */
function isClass(parsed) {
  const body = getFirstBody(parsed);
  if (!body) {
    return false;
  }

  // Require the overall statement to be an ExpressionStatement containing
  // an ArrowFunctionExpression
  return body.type === 'ClassDeclaration';
}

/**
 * Is the specified parsed entity a function declaration?
 * @param {object}    parsed        - esprima parsed declaration.
 * @return                         - True if parsed is an class.
 */
function isFunction(parsed) {
  const body = getFirstBody(parsed);
  if (!body) {
    return false;
  }

  // Require the overall statement to be an ExpressionStatement containing
  // an ArrowFunctionExpression
  return body.type === 'FunctionDeclaration';
}

/**
 * Get the parameters of the parsed entity from it's declaration.
 * @param {object}    parsed        - esprima parsed declaration.
 * @return                          - Array of parameters in declaration order.
 */
function getParameters(parsed) {
  const body = getFirstBody(parsed);
  if (!body) {
    return [];
  }

  // Simple cases for ES6 arrows and standard function expressions.
  if (isArrowFunction(parsed) && body.expression && body.expression.params) {
    return body.expression.params.map((x) => x.name);
  } else if (isFunction(parsed) && body.params) {
    return body.params.map((x) => x.name);
  } else if (isClass(parsed) && deepProp.has(body, 'body.body')) {
    const constructors = body.body.body.filter((x) => x.key.name === 'constructor');
    if (deepProp.has(constructors, '0.value.params')) {
      return constructors[0].value.params.map((x) => x.name);
    }
  }

  // Default to empty set.
  /* istanbul ignore next - Should only occur if esprima parse tree is malformed */
  return [];
}

module.exports = {
  isArrowFunction,
  isClass,
  isFunction,
  getParameters,
  parseObject,
};
