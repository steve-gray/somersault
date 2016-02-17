'use strict';

/* global describe, it, before, after, beforeEach, afterEach */
const chai = require('chai');
const expect = chai.expect;
const ParserHelpers = require('../lib/parser-helpers');

describe('Internals', () => {
  describe('Parser Helpers', () => {
    describe('isArrowFunction', () => {
      it('Should return false on mismatching parse tree', () => {
        expect(ParserHelpers.isArrowFunction({ foo: 'bar' })).to.equal(false);
      });
    });
    describe('isClass', () => {
      it('Should return false on mismatching parse tree', () => {
        expect(ParserHelpers.isClass({ foo: 'bar' })).to.equal(false);
      });
    });
    describe('isFunction', () => {
      it('Should return false on mismatching parse tree', () => {
        expect(ParserHelpers.isFunction({ foo: 'bar' })).to.equal(false);
      });
    });
    describe('getParameters', () => {
      it('Should return empty array on mismatching parse tree', () => {
        expect(ParserHelpers.getParameters({ foo: 'bar' })).to.deep.equal([]);
      });
    });
  });
});
