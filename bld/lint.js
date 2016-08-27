'use strict';

const config = require('config');
const eslint = require('gulp-eslint');
const gulp = require('gulp');

module.exports = function runLinting() {
  return gulp.src(config.get('build.linting.paths'))
  .pipe(eslint({
    extends: 'airbnb',
    ecmaFeatures: {
      modules: true,
    },
    parserOptions: {
      sourceType: 'module',
    },
    rules: {
      strict: [0, 'global'],
    },
    env: {
      es6: true,
      node: true,
    },
  }))
  .pipe(eslint.format(config.get('build.linting.formatter')))
  .pipe(eslint.failAfterError());
};
