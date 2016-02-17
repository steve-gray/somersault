'use strict';

/* global describe, it, before, after, beforeEach, afterEach */
const chai = require('chai');
const expect = chai.expect;
const RegistrationRecord = require('../lib/registration-record');

describe('Internals', () => {
  describe('RegistrationRecord', () => {
    describe('Construction', () => {
      let exampleInput = null;

      beforeEach(() => {
        exampleInput = {
          generator: () => true,
          argList: ['x', 'y', 'z'],
          tags: ['tag1', 'tag2'],
        };
      });

      it('Should set properties as expected', () => {
        const record = new RegistrationRecord(exampleInput);
        expect(record.generator).to.equal(exampleInput.generator);
        expect(record.argList).to.equal(exampleInput.argList);
        expect(record.tags).to.equal(exampleInput.tags);
      });

      it('Should require an input object', () => {
        expect(() => new RegistrationRecord(null)).to.throw(Error);
      });

      it('Should require a generator property on input', () => {
        delete exampleInput.generator;
        expect(() => new RegistrationRecord(exampleInput)).to.throw(Error);
      });

      it('Should require a tags property on input', () => {
        delete exampleInput.tags;
        expect(() => new RegistrationRecord(exampleInput)).to.throw(Error);
      });

      it('Should default argList property on input', () => {
        delete exampleInput.argList;
        expect(() => new RegistrationRecord(exampleInput)).to.not.throw(Error);
      });
    });
  });
});
