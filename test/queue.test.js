/**
 * To debug this file (from document root): 
 * 
 * $ node-inspector 
 * $ mocha --debug-brk 
 * 
 */

require('source-map-support').install({
  handleUncaughtExceptions: false
});
require("mocha-as-promised")();
var chai = require('chai');
var expect = chai.expect;
var assert = require("assert");

//DEFINE TESTS
var Test = {};

Test.types = function(dependencies,values){
    
    for (var i in dependencies){

        switch(dependencies[i].type){

            case("json"):

                var t = 0;
                if(typeof values[i] === 'object'){
                    t = 1;
                }
                expect(t).to.equal(1);
                break;

            case("css"):

                var t = 0;
                if(typeof values[i] === 'string'
                && values[i].length > 1){
                    t = 1;
                }
                expect(t).to.equal(1);               
                break;

            case("timer"): 

                var t = 0;

                //check time elapsed is greater than timeout
                if(dependencies[i].timeout <= values[i].elapsed){
                    t = 1; 
                }
                else{
                    console.error("Did not wait for timer?!")
                    console.log("Elapsed "+ values[i].elapsed+" ms");
                    console.log("Required: "+dependencies[i].timeout+" ms");
                    console.log(values[i]);
                }

                expect(t).to.equal(1);
                break;
                
            default:
        }
    }
}


var deps = require("../demos/node.queue.js").dependencies;
var q = Orgy.queue(deps,{
    id : "some-que-id"
});

describe('then function', function(done){
    
    before(function(done){

       //FIRES WHEN RESOLVED
        q.then(function(r){
            done();
        });

    });
        
    it('check returns result array', function() {

        var t = 0;
        if(q.value instanceof Array){
            t = 1;
        }
        expect(t).to.equal(1);

    });

    it('check dependency results', function() {
        Test.types(deps,q.value);
    });
    
});


describe('done function', function(done){
        
    before(function(done){

       //FIRES WHEN RESOLVED
        q.done(function(r){
            done();
        });

    });
    
    it('check returns result array', function() {

        var t = 0;
        if(q.value instanceof Array){
            t = 1;
        }
        expect(t).to.equal(1);

    });

    it('check dependency results', function() {
        Test.types(deps,q.value);
    });
    
});