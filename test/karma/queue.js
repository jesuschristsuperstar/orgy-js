//Code that runs in browser
var fn = function(MochaTestRunnerDeferred){

  console.log("Testing orgy.queue...");

  var Orgy = require("orgy");

  var q = Orgy.queue([
      {
          type : "json"
          ,url : "data/data1.json"
      },
      {
          type : "json"
          ,url : "data/data2.json"
      },
      {
          type : "css"
          ,url : "data/sample.css"
      },
      {
          type : "timer"
          ,timeout : 1000
       }
  ],{
    //timeout : 200  //optional. defaults to Orgy.config().timeout [5000]
  });

  //Done can be called async and out of order.
  setTimeout(function(){
    q.done(function(r,deferred,last){
      console.log("done",last);
      tests.done(r,last);
      //Makes the mocha test runner hold up execution.
      if(typeof MochaTestRunnerDeferred !== 'undefined') MochaTestRunnerDeferred();
    },function(){
      console.error(this.id + " done rejected.");
    });
  },1000)


  /**
   * If a then function returns a value, that value is passed down to any
   * subsequent then() or done() functions.
  */
  q.then(function(r){
      console.log("then1",r); //Dependency values.
      tests.then1(r);
      return 100.125;
  },function(){
    console.error(this.id + " then 1 rejected.");
  });

  q.then(function(r,deferred,last){
      console.log("then2",last); // 100.125
      tests.then2(r,last);
      return "abcdefg";
  });
}

//Test Runner Code
if(typeof describe !== 'undefined'){
  //Create a property with a true value after each chain segment,
  //to keep track of execution order.
  var output = {};
  var tests = {
    then1 : function(r){

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

      it('should not have run before then2', function(){
        should.not.exist(output.then2);
      })

      it('should not have run before done', function(){
        should.not.exist(output.done);
      })

      output.then1 = true;
    },
    then2 : function(r,last){

      it('should equal -102.33', function(){
        last.should.equal(-102.33);
      })

      it('should not have run before done', function(){
        should.not.exist(output.done);
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
