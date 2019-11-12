/**
 * To debug gruntfile:
 * node-debug $(which grunt) task
 */

var _ignore = '--ignore=path --ignore=request --ignore=http --ignore=fs --ignore=vm --ignore=process --ignore=lodash';

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        options : {
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

        execute : {
          "mocha-before": {
            call : function(){
              global.original_working_directory = process.cwd();
            }
          },
          "mocha-after" : {
            call : function(){
              process.chdir(global.original_working_directory);
              console.log("Changed cwd back to " + process.cwd());
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
                browsers: ["Chrome"],
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
                ui : 'bdd',
                reporter: 'spec',
              },
              //We require all our tests in the conf file, so we
              //can do some pre-test functions before they are run.
              src: ['./test/mocha.conf.js']
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
    grunt.loadNpmTasks('grunt-execute');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-jsdoc');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.registerTask('test-dsk', [
      'execute:mocha-before',
      'mochaTest:test',
      'execute:mocha-after'
    ]);
    grunt.registerTask('test-travis', [
      'execute:mocha-before',
      'mochaTest:test',
      'execute:mocha-after',
      'karma:travis'
    ]);
  
    //grunt.registerTask('karma-dsk', [
    //  'karma:dsk'
    //]);

  
    grunt.registerTask('t', ['test-dsk']);
    //grunt.registerTask('k', ['karma-dsk']);
    grunt.registerTask('m', ['mochaTest:test']);

    grunt.registerTask('default', [
      'shell:browserify-prod-standalone',
      'shell:browserify-devel-standalone',
      'shell:browserify-prod-bundle',
      'shell:browserify-devel-bundle',
      'uglify',
      'shell:cleanup',
      'jsdoc'
    ]);
};
