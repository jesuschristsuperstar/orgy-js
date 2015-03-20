var gulp = require('gulp');
var gutil = require('gulp-util');
var sourcemaps = require('gulp-sourcemaps');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var del = require('del');
var runSequence = require('run-sequence');
var uglify = require('gulp-uglify');
var streamify = require('gulp-streamify');
var rename = require('gulp-rename');
var buffer = require('vinyl-buffer');
var jsdoc = require("gulp-jsdoc");

gulp.task('clean', function(cb) {
  del(['dist/*'], cb);
});

var b = browserify({
  entries: ['./src/js/main.js'],
  standalone: 'Orgy',
  debug: true,
})
//['http','fs','vm','process','lodash']
.ignore('http')
.ignore('fs')
.ignore('process')
.ignore('vm');

var b = browserify({
  entries: ['./src/js/main.js'],
  standalone: 'Orgy',
  debug: true
});

gulp.task('js-devel', function() {
  return b.bundle()
        .pipe(source('orgy.devel.js'))
        .pipe(buffer()) //because streaming not supported by sourcemaps
        .pipe(sourcemaps.init({loadMaps: true}))
        // do some other stuff like uglify whatever
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./dist'));
})

gulp.task('js-prod', function() {
  return b.bundle()
        .pipe(source('orgy.min.js'))
        .pipe(buffer())
        .pipe(uglify())
        .pipe(gulp.dest('./dist'));
})

gulp.task('publish', function(cb) {
  runSequence('clean','js-devel', 'js-prod', cb);
});

gulp.task('jsdoc', function(){
  gulp.src(["./src/js/*.js", "README.md"])
    .pipe(jsdoc.parser())
    .pipe(jsdoc.generator('./docs'))
});

gulp.task('default', ['publish']);
