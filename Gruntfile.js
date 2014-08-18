/**
 * To debug gruntfile: 
 * node-debug $(which grunt) task
 */

module.exports = function(grunt) {
    
    var _src = [
        'src/js/main.js'
        ,'src/js/deferred.js'
        ,'src/js/queue.js'
        ,'src/js/cast.js'
        ,'src/js/build.js'
    ];
    
    // Project configuration.
    grunt.initConfig({
        
        pkg: grunt.file.readJSON('package.json'),
        
        uglify: {
            all: {
                options: {
                    banner: '/** \n<%= pkg.name %>: A queue and deferred library that is so very hot right now. \nVersion: <%= pkg.version %> \nBuilt: <%= grunt.template.today("yyyy-mm-dd") %> \nAuthor: tecfu.com  \n*/\n'
                    ,mangle : true
                    ,compress : true
                    ,drop_debugger : false
                }
                ,files: {
                    'dist/<%= pkg.name %>.min.js': _src
                }
            }
            ,devel: {
                options: {
                    banner: '/** \n<%= pkg.name %>: A queue and deferred library that is so very hot right now. \nVersion: <%= pkg.version %> \nBuilt: <%= grunt.template.today("yyyy-mm-dd") %> \nAuthor: tecfu.com  \n*/\n'
                    ,sourceMap : true
                    ,sourceMapIncludeSources : true
                    /*MANGLED VARIABLES WILL NOT MAP CORRECTLY TO SOURCE MAP*/
                    ,mangle : false
                    ,compress : false
                    ,beautify: true
                    ,drop_debugger : false
                },
                files: {
                    'dist/<%= pkg.name %>.devel.js': _src
                }
            }
        },
        
        karma: {
            dsk: {
                configFile: 'karma.conf.js',
                singleRun: true,
                browsers: ['Chrome',"Firefox","Opera"]
            }
            ,travis: {
                configFile: 'karma.conf.js',
                singleRun: true,
                browsers: ['PhantomJS']
            }
        },
        
        mochaTest: {
            test: {
              options: {
                reporter: 'spec',
              },
              src: ['test/mocha/*.js']
            }
        }
    });

    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.registerTask('test-dsk', ['mochaTest:test','karma:dsk']);
    grunt.registerTask('test-travis', ['mochaTest:test','karma:travis']);

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.registerTask('default', ['uglify','test-dsk']);

};