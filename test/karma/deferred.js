(function(){

//Code that runs in browser
var fn = function(MochaTestRunnerDeferred){

  console.log("Testing orgy.deferred...");

  var Orgy = require("orgy");

  var d1 = Orgy.deferred({
    //timeout : 100
  });

  setTimeout(function(){
    d1.resolve(100.125);
  },500);

  d1.then(function(r){
    console.log("then1",r);
    tests.then1(r,this.id);
    return 102.33;
  })

  d1.then(function(r,def,last){
    console.log("then2",r,last);
    tests.then2(r,last);
  },function(){
    console.error("then2 rejected");
    tests.then2();
  })

  d1.done(function(r){
    console.log("done",r);
    tests.done(r)
    //Makes the mocha test runner hold up execution.
    if(typeof MochaTestRunnerDeferred !== 'undefined') MochaTestRunnerDeferred();
  },function(){
    console.error("done rejected");
    tests.done()
    //Makes the mocha test runner hold up execution.
    if(typeof MochaTestRunnerDeferred !== 'undefined') MochaTestRunnerDeferred();
  })
}

//Test Runner Code
if(typeof describe !== 'undefined'){
  //Create a property with a true value after each chain segment,
  //to keep track of execution order.
  var output = {};
  var tests = {
    then1 : function(r){

      it('should equal 100.125', function(){
        r.should.equal(100.125);
      })

      it('should not have run before then2', function(){
        should.not.exist(output.done);
      })

      it('should not have run before done', function(){
        should.not.exist(output.done);
      })

      output.then1 = true;
    },
    then2 : function(r,last){
      it('should equal 100.125', function(){
        r.should.equal(100.125);
      })

      it('should equal -102.33', function(){
        last.should.equal(-102.33);
      })

      output.then2 = true;
    },
    done : function(r){

      it('should equal 100.125', function(){
        r.should.equal(100.125);
      })

      it('should have run after then1', function(){
        output.then1.should.equal(1);
      })

      it('should have run after then2', function(){
        output.then1.should.equal(1);
      })

      output.done = true;
    }
  };

  describe('deferred', function(){
    it('should run then chain in correct order, updating return values',
    function(MochaTestRunnerDeferred){
      fn(MochaTestRunnerDeferred);
    })
  })
}
else{
  tests = {
    then1 : function(){}
    ,then2 : function(){}
    ,done  : function(){}
  }
  fn();
}
})()
