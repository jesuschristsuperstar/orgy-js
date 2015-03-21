/**
 * To debug gruntfile:
 * node-debug $(which grunt) task
 */

var brfs = require('brfs'),
    babelify = require('babelify'),
    _ignore = '--ignore=http --ignore=fs --ignore=vm --ignore=process --ignore=lodash';

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

        shell: {
          "browserify-prod-standalone": {
            command: function () {
              var cmd = 'browserify --debug --standalone=Orgy '+_ignore+' -r ./src/main.js > ./dist/<%= pkg.name %>.js';
              return cmd;
            }
          },
          "browserify-devel-standalone": {
            command: function () {
              var cmd = 'browserify --debug --standalone=Orgy '+_ignore+' -r ./src/main.js > ./dist/<%= pkg.name %>.devel.js';
              return cmd;
            }
          },
          "browserify-prod-bundle": {
            command: function () {
              var cmd = 'browserify '+_ignore+' -r ./src/main.js:<%= pkg.name %> > ./dist/<%= pkg.name %>.bundle.js';
              return cmd;
            }
          },
          "browserify-devel-bundle": {
            command: function () {
              var cmd = 'browserify --debug '+_ignore+' -r ./src/main.js:<%= pkg.name %> > ./dist/<%= pkg.name %>.bundle.devel.js';
              return cmd;
            }
          },
          "cleanup" : {
            command: function(){
              return "rm ./dist/orgy.js ./dist/orgy.bundle.js";
            }
          }
        },

        uglify: {
            "min": {
                options: {
                    banner: '/** \n<%= pkg.name %>: <%= pkg.description %> \nVersion: <%= pkg.version %> \nBuilt: <%= grunt.template.today("yyyy-mm-dd") %> <%= options.timestamp %>\nAuthor: <%= pkg.author %>  \n*/\n'
                    ,mangle : true
                    ,compress : true
                    ,drop_debugger : false
                    ,wrap : true
                }
                ,files: {
                    'dist/<%= pkg.name %>.min.js': 'dist/<%= pkg.name %>.js',
                }
            },
            "bundle-min": {
                options: {
                    banner: '/** \n<%= pkg.name %>: <%= pkg.description %> \nVersion: <%= pkg.version %> \nBuilt: <%= grunt.template.today("yyyy-mm-dd") %> <%= options.timestamp %>\nAuthor: <%= pkg.author %>  \n*/\n'
                    ,mangle : true
                    ,compress : true
                    ,drop_debugger : false
                    ,wrap : true
                }
                ,files: {
                    'dist/<%= pkg.name %>.bundle.min.js': 'dist/<%= pkg.name %>.bundle.js',
                }
            }
        },

        jsdoc : {
          dist : {
            src: ['./src/*.js','./README.md'],
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
                //browsers: ['Chrome',"Firefox","Opera"],
                browsers: ["Firefox"],
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
                files: ['src/*.js'],
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

    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-jsdoc');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.registerTask('test-dsk', ['mochaTest:test','karma:dsk']);
    grunt.registerTask('test-travis', ['mochaTest:test','karma:travis']);

    grunt.registerTask('t', ['test-dsk']);
    grunt.registerTask('k', ['karma:dsk']);
    grunt.registerTask('m', ['mochaTest:test']);

    grunt.registerTask('default', [
      'shell:browserify-prod-standalone',
      'shell:browserify-devel-standalone',
      'shell:browserify-prod-bundle',
      'shell:browserify-prod-bundle',
      'uglify',
      'shell:cleanup',
      'jsdoc'
    ]);
};
