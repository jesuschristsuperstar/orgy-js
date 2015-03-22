(function(){

//Code that runs in browser
var fn = function(MochaTestRunnerDeferred){

  console.info("Testing file: orgy.cast...");

  //Show backtraces when instances rejected
  Orgy.config({
    debug_mode : 0
  });

  // Example: Cast $.ajax to Orgy
  var options = {
    url : "data/data1.json"
    ,dataType : "json"
    ,error : function(){
      console.error("Casted XHR request errored.");
    }
  };
  var a = $.ajax(options);
  a.id = options.url; //id must be set
  var c1 = Orgy.cast(a);

  //Then and done don't need to be entered in correct order
  c1.done(function(r){
    console.log("c1 done");
    tests.done(r)
    //Makes the mocha test runner hold up execution.
    if(typeof MochaTestRunnerDeferred !== 'undefined') MochaTestRunnerDeferred();
  },function(){
    console.log("c1 done rejected");
  });

  c1.then(function(r){
    console.log("c1 then");
    tests.then1(r);
  },function(r){
    console.log("c1 then rejected");
  });
}

//Test Runner Code
if(typeof describe !== 'undefined'){
  //Create a property with a true value after each chain segment,
  //to keep track of execution order.
  var output = {};
  var tests = {
    then1 : function(r){
      expect(r).to.have.property('valueZ');
      r.value.should.equal(1);
      should.not.exist(output.done);
      output.then1 = new Date().getTime();
    },
    done : function(r){
      expect(r).to.have.property('value');
      r.value.should.equal(1);
      should.exist(output.then1);
      output.done = new Date().getTime();
    }
  };
  describe('cast.js tests',function(){
    it('',function(done){
      fn(done);
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
})()
