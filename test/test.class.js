(function(r){
    
    if(typeof process === 'object' && process + '' === '[object process]'){
        
        // is node
        module.exports = r;
    }
    else{
        
        //not node
        Test = r;
    }
    
}(function(){
    
    var r = {};
    
    r.deps = (function(){
        
        var deps = [
            {
                type : "timer"
                ,timeout : 1000
            }
            ,{
                url : "*/data/data1.json"
                ,type : "json"
            }
            ,{
                url : "*/data/data2.json"
                ,type : "json"
            }
            ,{
                url : "*/data/data3.json"
                ,type : "json"
            }
            ,{
                url : "*/data/sample.css"
                ,type : "css"
            }
            ,{
                type : "script"
                ,url : "*/data/test-module.js"
            }
        ];
        
        return deps;
    }());
    
    r.describe = function(q,deps){
        
        var scope = this;
        
        describe('then chain', function(){
    
                before(function(td){
                    
                    //EXTEND TEST TIMEOUT TO 5 SECONDS
                    this.timeout(5000);

                    q.then(function(r){
                        
                        //test deferred
                        td();
                        
                        //Return a deferred to prevent queue
                        //resolver chain from completing here,
                        //because we need to check q.done() 
                        //separately.
                        var def = Orgy.deferred({
                            id : 'test-throttler'
                        });
                        
                        setTimeout(function(){
                            def.resolve(1);
                        },50);
                        
                        return def;
                    });

                });

                it('check returns result array', function() {

                    var t = 0;
                    if(q.value instanceof Array){
                        t = 1;
                    }
                    expect(t).to.equal(1);

                });

                it('validate dependency types', function() {
                    scope.validate_values(deps,q.value);
                });

                it('make sure execution chain was stalled for unresolved thenables', function() {
                    
                });
        });


        describe('done function', function(){

            before(function(td){

               //FIRES WHEN RESOLVED
            q.done(function(r){
                td();
            });

            });

            it('check returns result array', function() {

                var t = 0;
                if(q.value instanceof Array){
                    t = 1;
                }
                expect(t).to.equal(1);

            });

            it('validate dependency types', function() {
                scope.validate_values(deps,q.value);
            });

        });
    };
    
    r.validate_values = function(dependencies,values){
        
        for (var i in dependencies){

            switch(dependencies[i].type){

                case("json"):
                    expect(typeof values[i]).to.equal('object',values[i]); 
                    break;

                case("css"):
                    expect(typeof values[i]).to.equal('object',values[i]);
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
    };
    
    return r;
}()));