'use strict';

const config = require('config');
const eslint = require('gulp-eslint');
const gulp = require('gulp');

module.exports = function runLinting() {
  return gulp.src(config.get('build.linting.testPaths'))
  .pipe(eslint({
    extends: 'airbnb',
    rules: {
      strict: [0, 'global'],
    },
    parserOptions: {
      sourceType: 'module',
    },
    ecmaFeatures: {
      modules: true,
    },
    env: {
      es6: true,
      mocha: true,
      node: true,
    },
  }))
  .pipe(eslint.format(config.get('build.linting.formatter')))
  .pipe(eslint.failAfterError());
};
