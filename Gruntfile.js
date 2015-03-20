/**
 * To debug gruntfile:
 * node-debug $(which grunt) task
 */

var brfs = require('brfs'),
    babelify = require('babelify');

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json')

        ,options : {
          timestamp : (function(){
            //A FORMATTED TIMESTAMP STRING FOR BACKUP NAMING
            var d = new Date(),dstr = '';
            dstr = ('0' + d.getHours()).slice(-2)
            + ':' + ('0' + d.getMinutes()).slice(-2)
            + ':' + ('0' + d.getSeconds()).slice(-2);

            return dstr;

          }())
        },

        browserify: {
          prod: {
            src: [ './src/js/main.js' ],
            dest: './dist/<%= pkg.name %>.js',
            options: {
              transform: ['brfs',["babelify", { "experimental": true }]],
              exclude: ['http','fs','vm','process','lodash'],
              browserifyOptions : {
                standalone : 'Orgy'
              },
            }
          }
          ,devel: {
            src: [ './src/js/main.js' ],
            dest: './dist/<%= pkg.name %>.devel.js',
            options: {
              transform: ['brfs',["babelify", { "experimental": true }]],
              browserifyOptions : {
                debug : true,
                standalone : "Orgy"
              },
              exclude: ['http','fs','vm','process','lodash']
            }
          }
        },

        uglify: {
            dist: {
                options: {
                    banner: '/** \n<%= pkg.name %>: <%= pkg.description %> \nVersion: <%= pkg.version %> \nBuilt: <%= grunt.template.today("yyyy-mm-dd") %> <%= options.timestamp %>\nAuthor: <%= pkg.author %>  \n*/\n'
                    ,mangle : true
                    ,compress : true
                    ,drop_debugger : false
                    ,wrap : true
                }
                ,files: {
                    'dist/<%= pkg.name %>.min.js': 'dist/<%= pkg.name %>.js'
                }
            }
        },
        
        jsdoc : {
          dist : {
            src: ['./src/js/*.js','./README.md'],
            options: {
              destination: 'docs',
              template : "node_modules/grunt-jsdoc/node_modules/ink-docstrap/template",
              configure : "./jsdoc.conf.json"
            }
          }
        },
        

        karma: {
            dsk: {
                configFile: 'karma.conf.js',
                singleRun: true,
                browsers: ['Chrome',"Firefox","Opera"],
                //browsers: ["PhantomJS"]
                //urlRoot: '/base/demos',
                proxies: {
                  '/data' : "http://192.168.56.101/orgy-js/demos/data"
                }
            }
            ,travis: {
                configFile: 'karma.conf.js',
                singleRun: true,
                browsers: ["Firefox"]
                //,urlRoot: '/base/demos'
                /**/
                ,proxies: {
                  '/data' : "http://localhost:9876/base/demos/data"
                }

                //browsers: ["PhantomJS"]
            }
        },

        mochaTest: {
            test: {
              options: {
                reporter: 'spec',
              },
              src: ['test/mocha/*.js']
            }
        },

        watch: {
            src: {
                files: ['src/js/*.js'],
                tasks: ['browserify'],
                options: {
                  //spawn: false,
                  interrupt: true,
                  debounceDelay: 500,
                  livereload : true,
                  livereloadOnError : false
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-jsdoc');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.registerTask('test-dsk', ['mochaTest:test','karma:dsk']);
    grunt.registerTask('test-travis', ['mochaTest:test','karma:travis']);

    grunt.registerTask('t', ['browserify','test-dsk']);
    grunt.registerTask('k', ['browserify','karma:dsk']);
    grunt.registerTask('m', ['browserify','mochaTest:test']);
    //grunt.registerTask('default', ['browserify','uglify','t']);
    grunt.registerTask('default', ['browserify','uglify','jsdoc']);
};
