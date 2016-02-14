'use strict';

const documentation = require('./bld/documentation');
const instrument = require('./bld/instrument-coverage');
const lint = require('./bld/lint');
const lintTests = require('./bld/lint-tests');
const test = require('./bld/test.js');
const gulp = require('gulp');

gulp.task('docs', documentation);
gulp.task('lint-lib', lint);
gulp.task('lint-tests', lintTests);
gulp.task('lint', ['lint-lib', 'lint-tests']);
gulp.task('instrument-coverage', instrument);
gulp.task('test', ['instrument-coverage'], test);
gulp.task('default', ['docs', 'lint', 'test']);
