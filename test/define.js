(function(){

//Code that runs in browser
var fn = function(MochaTestRunnerDeferred){

  console.info("Testing file: orgy.define...");

  var btrc = "define.js:8";
  var d1 = Orgy.define("somed-example",35)._btrc(btrc);
  tests.btrc(d1,btrc);

  d1.then(function(r){
    console.log("then1",r);
    tests.then1(r,this.id);
    return 36;
  });

  d1.then(function(r,def,last){
    console.log("then2",r,last);
    tests.then2(r,last);
  },function(){
    console.error("then2 rejected");
    tests.then2();
  });

  d1.done(function(r){
    console.log("done",r);
    tests.done(r);
    //Makes the mocha test runner hold up execution.
    if(typeof MochaTestRunnerDeferred !== 'undefined') MochaTestRunnerDeferred();
  },function(){
    console.error("done rejected");
    tests.done();
    //Makes the mocha test runner hold up execution.
    if(typeof MochaTestRunnerDeferred !== 'undefined') MochaTestRunnerDeferred();
  });
};

//Test Runner Code
if(typeof describe !== 'undefined'){
  //Create a property with a true value after each chain segment,
  //to keep track of execution order.
  var output = {};
  var tests = {
    btrc : function(r,value){
      expect(r).to.have.property('backtrace');
      r.backtrace.should.equal(value);
    },
    then1 : function(r){
      r.should.equal(35);
      should.not.exist(output.done);
      should.not.exist(output.then2);
      output.then1 = new Date().getTime();
    },
    then2 : function(r,last){
      r.should.equal(35);
      last.should.equal(36);
      output.then2 = new Date().getTime();
    },
    done : function(r){
      r.should.equal(35);
      expect(output.then2).to.be.least(output.then1);
      output.done = new Date().getTime();
    }
  };
  describe('define.js tests',function(){
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
