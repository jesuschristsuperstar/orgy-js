describe("A test suite", function() {
    beforeEach(function() {
    });
    afterEach(function() {
    });
    it('should pass', function() {
        expect(true).to.be.true;
    });
    /*
    it('should fail', function() {
        expect(true).to.be.false;
    });
    */
});


//DEFINE TESTS
var Test = require('../test.types.js');

var deps = [
    {
        url : "/var/www/orgy/demos/data/data1.json"
        ,type : "json"
    }
    ,{
        url : "/var/www/orgy/demos/data/data2.json"
        ,type : "json"
    }
    ,{
        url : "/var/www/orgy/demos/data/data3.json"
        ,type : "json"
    }
    ,{
        url : "/var/www/orgy/demos/data/sample.css"
        ,type : "css"
    }
];

var q = Orgy.queue(deps,{
   id : "q1" //GLOBAL ACCESSOR
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