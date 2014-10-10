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
    
    r.describe = function(q,deps){
      
      describe('then chain', function(){

        //make test wait for q.then() to fire
        before(function(test_deferred){

          //wait up to 5 seconds before failing before()
          this.timeout(5000);

          q.then(function(r,deferred,last){

              //resume before()
              test_deferred();

              return "example";
          });

          q.then(function(r,deferred,last){

              return "poor";
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
          r.validate_values(q,deps);
        });

        it('make sure execution chain was stalled for unresolved thenables', function() {

        });
      });

      describe('done function', function(){

        //make test wait for q.done() to fire
        before(function(test_deferred){

          q.done(function(r,deferred,last){

              //resume done()
              test_deferred();
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
            r.validate_values(q,deps);
        });

      });
      
    };
    
    r.validate_values = function(q,dependencies){

      for(var i in dependencies){

        switch(dependencies[i].type){

          case("json"):
            expect(typeof q.value[i]).to.equal('object',q.value[i]); 
            break;

          case("css"):
            expect(typeof q.value[i]).to.equal('object',q.value[i]);
            break;

          case("timer"): 
            var t = 0;

            //check time elapsed is greater than timeout
            if(dependencies[i].timeout <= q.value[i].elapsed){
                t = 1; 
            }
            else{
                console.error("Did not wait for timer?!")
                console.log("Elapsed "+ q.value[i].elapsed+" ms");
                console.log("Required: "+dependencies[i].timeout+" ms");
                console.log(q.value[i]);
            }

            expect(t).to.equal(1);
            break;

          default:
        }

      }
    };
    
    return r;
}()));