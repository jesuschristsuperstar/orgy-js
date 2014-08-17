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
global.chai = require('chai');
global.expect = chai.expect;
global.assert = require("assert");

//DEFINE TESTS
//DEFINE TESTS
var Test = require('../test.types.js');

var deps = require("../../demos/node.queue.js").dependencies;
var q = Orgy.queue(deps,{
    id : "some-que-id"
});

describe('then function', function(){
    
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


describe('done function', function(){
        
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