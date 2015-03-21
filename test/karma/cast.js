//Code that runs in browser
var fn = function(MochaTestRunnerDeferred){

  console.log("Testing orgy.cast...");
  
  var Orgy = require("orgy");

  //Show backtraces when instances rejected
  Orgy.config({
    debug_mode : 0
  });

  // Example: Cast $.ajax to Orgy
  var c1 = Orgy.cast($.ajax({
    url : "data/data1.json"
    ,dataType : "json"
    ,error : function(){
      console.error("Request failed.");
    }
  }));

  //Then and done don't need to be entered in correct order
  c1.done(function(r){
    console.log("c1 done");
    tests.done(r)
    //Makes the mocha test runner hold up execution.
    if(typeof MochaTestRunnerDeferred !== 'undefined') MochaTestRunnerDeferred();
  },function(){
    console.log("c1 done rejected");
    tests.done(r)
    //Makes the mocha test runner hold up execution.
    if(typeof MochaTestRunnerDeferred !== 'undefined') MochaTestRunnerDeferred();
  });

  c1.then(function(r){
    console.log("c1 then");
    tests.then1(r);
  },function(r){
    console.log("c1 then rejected");
    tests.then1(r);
  });
}

//Test Runner Code
if(typeof describe !== 'undefined'){
  //Create a property with a true value after each chain segment,
  //to keep track of execution order.
  var output = {};
  var tests = {
    then1 : function(r){

      it('should have value property that equals 1', function(){
        expect(r).to.have.property('value');
        r.value.should.equal(1);
      })

      it('should not have run before done', function(){
        should.not.exist(output.done);
      })

      output.then1 = true;
    },
    done : function(r){

      it('should have value property that equals 1', function(){
        expect(r).to.have.property('value');
        r.value.should.equal(1);
      })

      it('should have run after then', function(){
        output.then1.should.equal(1);
      })

      output.then1 = true;
    }
  };

  describe('cast', function(){
    it('should run then before done and return the correct result',
    function(MochaTestRunnerDeferred){
      fn(MochaTestRunnerDeferred);
    })
  })
}
else{
  tests = {
    then1 : function(){}
    ,done  : function(){}
  }
  fn();
}
