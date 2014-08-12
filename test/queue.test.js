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

var chai = require('chai');
var expect = chai.expect;
var assert = require("assert");

//import orgy
Orgy = require("../dist/orgy.devel.js");

var dependencies = [
    {
        type : "timer"
        ,timeout : 2000
    }
    ,{
        url : "demos/data/data1.json"
        ,type : "json"
    }
    ,{
        url : "demos/data/data2.json"
        ,type : "json"
    }
    ,{
        url : "demos/data/data3.json"
        ,type : "json"
    }
    ,{
        url : "demos/data/sample.css"
        ,type : "css"
    }
];

var q = Orgy.queue(dependencies,{
    id : "q1"
});

function check_types(dependencies,result_set){
    
    for (var i in dependencies){

        switch(dependencies[i].type){

            case("json"):

                var t = 0;
                if(typeof result_set[i] === 'object'){
                    t = 1;
                }
                expect(t).to.equal(1);
                break;

            case("css"):

                var t = 0;
                if(typeof result_set[i] === 'string'
                && result_set[i].length > 1){
                    t = 1;
                }
                expect(t).to.equal(1);               
                break;

            case("timer"): 

                var t = 0;

                //check time elapsed is greater than timeout
                if(dependencies[i].timeout <= result_set[i].elapsed){
                    t = 1; 
                }
                else{
                    console.error("Did not wait for timer?!")
                    console.log("Elapsed "+ result_set[i].elapsed+" ms");
                    console.log("Required: "+dependencies[i].timeout+" ms");
                    console.log(result_set[i]);
                }

                expect(t).to.equal(1);
                break;
                
            default:
        }
    }
}

describe('then function suite 0', function(){
 
    var result_set = null;

    //async test: wait for queue to be done before running tests.
    before(function(done){

       //FIRES WHEN RESOLVED
        q.then(function(r){
            result_set = r;
            done();
        });

    });
        
    it('check returns result array', function() {
        var t = 0;
        if(result_set instanceof Array){
            t = 1;
        }
        expect(t).to.equal(1);
    });
    
    it('check dependency results', function() {
        check_types(dependencies,result_set);

    });
    
});

describe('done function suite', function(){
    
    var result_set = null;
    var end_time = null;
    
    //async test: wait for queue to be done before running tests.
    before(function(done){
 
       q.done(function(r){           
           result_set = r;
           done();
       });

    });
     
    it('check returns result array', function() {
        var t = 0;
        if(result_set instanceof Array){
            t = 1;
        }
        expect(t).to.equal(1);
    });

    it('check dependency results', function() {

        check_types(dependencies,result_set);

    });
    
});