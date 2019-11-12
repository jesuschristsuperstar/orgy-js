(function(){

//Code that runs in browser
var fn = function(MochaTestRunnerDeferred){

  console.info("Testing file: orgy.queue...");

  var q = Orgy.queue([
    {
      type : "json"
      ,url : "data/data1.json"
    },
    {
      type : "json"
      ,url : "data/data2.json"
    }
  ]);

  //Done can be called out of order.
  q.done(function(r,deferred,last){
    tests.done(r,deferred,last);
    console.log(r,deferred,last);  
    //Makes the mocha test runner hold up execution.
    if(typeof MochaTestRunnerDeferred !== 'undefined') MochaTestRunnerDeferred();
  },function(){
    console.error(this.id + " done rejected.");
  });


  /**
   * If a then function returns a value, that value is passed down to any
   * subsequent then() or done() functions.
  */
  q.then(function(r,deferred,last){
    tests.then1(r,deferred,last);
    return 1;
  },function(){
    console.error(this.id + " then 1 rejected.");
  });

  q.then(function(r,deferred,last){
    tests.then2(r,deferred,last);
    return last+1;
  },function(){
    console.error(this.id + " then 2 rejected.");
  });}

//Test Runner Code
if(typeof describe !== 'undefined'){
  //Track execution
  var order = [];

  var tests = {
    then1 : function(r,deferred,last){
      //r
      expect(r).to.have.length(2);
      expect(r[0]).to.have.property('value');
      r[0].value.should.equal(1);
      expect(r[1]).to.have.property('value');
      r[1].value.should.equal(2);
  
      //deferred
      expect(deferred).to.have.property('resolve');  

      //last
      //For the first call to then, last is the dependency array
      expect(last).to.equal(r);

      //track/compare execution order
      order.push('then1');

      expect(order.length).to.equal(1);
    },
    then2 : function(r,deferred,last){
      expect(r).to.have.length(2);
      expect(deferred).to.have.property('resolve');  
      last.should.equal(1);
      
      order.push('then2');
      expect(order.length).to.equal(2);
      expect(order.indexOf("then1")).to.equal(0);
    },
    done : function(r,deferred,last){
      expect(r).to.have.length(2);
      expect(last).to.equal(2);  
      
      order.push('done');
      expect(order.length).to.equal(3);
      expect(order.indexOf("then1")).to.equal(0);
      expect(order.indexOf("then2")).to.equal(1);
    }
  };
  describe('queue.js tests',function(){
    it('',function(done){
      fn(done);
    })
  })
}
else{
  tests = {
    resolver : function(){}  
    ,then1 : function(){}
    ,then2 : function(){}
    ,done  : function(){}
  }
  fn();
}
})()
