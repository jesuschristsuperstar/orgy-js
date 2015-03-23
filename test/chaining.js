(function(){

//Code that runs in browser
var fn = function(MochaTestRunnerDeferred){

  console.info("Test file: chaining.js...");

  var dependencies = [
    {
      comment : "Document ready."
      ,id : "DOMContentLoaded"
      ,type : "event"
    },{
      url : "data/data1.json"
      ,type : "json"
    }
  ];
  var q = Orgy.queue(dependencies);

  console.log("Creating a deferred that will hold up the callback chain...");
  var def = Orgy.deferred();
  setTimeout(function(){
    console.log("Resolving the example deferred to resume the chain...");
    def.resolve(555);
  },'1000');

  q.then(function(r,deferred){
    tests.then1(r);
    return def;
  });

  //Should fire only after def.resolve(1000)
  q.then(function(r,deferred,last){
     //last is the deferred "def". to get its value, use .value
    console.log("Continuing callback chain...",last.value);
    tests.then2(r,last.value);
    return last.value;
  });

  q.done(function(r,deferred,last){
    console.log("Done",r,last);
    tests.done(r,last);
    //Makes the mocha test runner hold up execution.
    if(typeof MochaTestRunnerDeferred !== 'undefined') MochaTestRunnerDeferred();
  });

}

//Test Runner Code
if(typeof describe !== 'undefined'){
  //Create a property with a true value after each chain segment,
  //to keep track of execution order.
  var output = {};
  var tests = {
    then1 : function(r,last){
      output.then1 = new Date().getTime();
    },
    then2 : function(r,last){
      expect(r).to.have.length(2);

    },
    done : function(r,last){
      expect(r).to.have.length(2);
    }
  };
  describe('chaining.js tests',function(){
    it('',function(done){
      fn(done);
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
