(function(){

//Code that runs in browser
var fn = function(MochaTestRunnerDeferred){

  console.info("Testing file: _btrc...");

  var btrc1 = "_btrc.js:8";
  var btrc2 = "_btrc.js:9";
  var def = Orgy.deferred()._btrc(btrc1);
  var queue = Orgy.queue([])._btrc(btrc2);

  tests.def(def,btrc1);
  tests.queue(queue,btrc2);
  if(typeof MochaTestRunnerDeferred !== 'undefined') MochaTestRunnerDeferred();
};

//Test Runner Code
if(typeof describe !== 'undefined'){
  //Create a property with a true value after each chain segment,
  //to keep track of execution order.
  var output = {};
  var tests = {
    def : function(r,value){
      expect(r).to.have.property('backtrace');
      r.backtrace.should.equal(value);
    },
    queue : function(r,value){
      expect(r).to.have.property('backtrace');
      r.backtrace.should.equal(value);
    }
  };
  describe('_btrc.js tests',function(){
    it('',function(done){
      fn(done);
    })
  })
}
else{
  tests = {
    def : function(){}
    ,queue  : function(){}
  }
  fn();
}
})()
