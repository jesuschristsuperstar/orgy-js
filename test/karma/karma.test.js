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
var Test = {};

Test.types = function(dependencies,values){
    
    for (var i in dependencies){

        switch(dependencies[i].type){

            case("json"):
                expect(typeof values[i]).to.equal('object',values[i]); 
                break;

            case("css"):
                expect(typeof values[i]).to.equal('string',values[i]);
                expect(values[i].length).to.be.greater.than(0);               
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