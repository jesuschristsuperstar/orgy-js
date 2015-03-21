//Code that runs in browser
var fn = function(MochaTestRunnerDeferred){

  console.log("Testing orgy.queue...");

  var Orgy = require("orgy");

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

  q.then(function(r,deferred){
    tests.then1(r);
    return def;
  });

  console.log("Creating a deferred that will hold up the callback chain...");
  var def = Orgy.deferred();

  setTimeout(function(){
    console.log("Resolving the example deferred to resume the chain...");
    def.resolve(1000);
  },'1000');

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

      it('should be an array with a length of 2', function(){
        expect(r).to.have.length(2);
      })

      it('r1 should have value property that equals 1', function(){
        expect(r[1]).to.have.property('value');
        r[1].value.should.equal(1);
      })

      it('last should equal 1000', function(){
        last.should.equal(1000);
      })

      it('should be executing at least 1 second after previous then statement', function(){
        var diff = new Date().getTime() - output.then1;
        expect(diff).to.be.above(1000);
        console.log("!"+diff);
      })

      output.then2 = true;
    },
    done : function(r,last){

      it('should be an array with a length of 4', function(){
        expect(r).to.have.length(4);
      })

      it('r0 should have value property that equals 1', function(){
        expect(r[0]).to.have.property('value');
        r[0].value.should.equal(1);
      })

      it('r1 should have value property that equals 2', function(){
        expect(r[1]).to.have.property('value');
        r[1].value.should.equal(2);
      })

      it('r2 should have value property that equals 3', function(){
        expect(r[2]).to.have.property('value');
        r[2].value.should.equal(3);
      })

      it('last should equal abcdefg', function(){
        last.should.equal('abcdefg');
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
