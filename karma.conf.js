// Karma configuration
// Generated on Sat Aug 16 2014 14:18:19 GMT-0400 (EDT)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    //The base url, where Karma runs.
    urlRoot: '/base/test',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha','chai','sinon'],


    // list of files / patterns to load in the browser
    files: [
      'js/jquery-1.11.1.min.js',
      'dist/orgy.devel.js',
      //'dist/orgy.bundle.devel.map.js',
      {pattern: 'test/data/*', included: false},
      {pattern: 'test/mocha.conf.js', included: false, served: false},
      {pattern: 'test/*.js', included: true},
    ],



    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      //'test/karma/*.js': ['coverage']
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    // coverage reporter generates the coverage
    //reporters: ['progress', 'coverage'],
    reporters: ['progress'],

    coverageReporter: {
      type : 'html',
      dir : 'coverage/'
    },

    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_DEBUG,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false
  });
};
