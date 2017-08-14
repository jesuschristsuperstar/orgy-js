//let jsdom = require("jsdom").jsdom;
//let doc = jsdom("starting body content");
//let window = doc.defaultView;
//let document = let window.document;
//let $ = require("jquery");
let chai = require("chai");
let expect = chai.expect;
let assert = chai.assert;
let should = chai.should();
let Orgy = require("./../src/main.js");

describe('deferred.js test cases',function(){
  it('Should pass resolve() args to resolver fn',function(done){
    let d1 = new Orgy.deferred(function(){
      //resolver
      console.log('resolved',arguments);
      arguments[0].should.equal(1);
      arguments[1].should.equal(2);
      done();
    },function(){
      //rejector
      console.log('rejected');
      done();
    });
    d1.resolve(1,2);
  })

  it('Should run rejector callback when rejected',function(done){
    let d1 = Orgy.deferred(function(){
    },function(){
      //rejector
      console.log('Test 2 rejected',arguments);
      arguments[0].should.equal('reason for rejection');
      done();
    });
    d1.reject('reason for rejection');
  });

  it('Should run rejector callback when timed out',function(done){
    new Orgy.deferred(function(){
    },function(){
      //rejector
      console.log('Test 2 rejected',arguments);
      arguments[0].should.equal('timeout'); //reason for rejection
      arguments[1].should.equal(1000); //same as timeout
      done();
    },{
      timeout: 1000
    });
  })

  ;(function(){
    let d1 = new Orgy.deferred(function(){},function(){});
    let d2 = new Orgy.deferred(function(){},function(){});
    
    it('Should use a symbols as the id property',function(){
      //make sure id is a symbold
      let idType = typeof d1.id;
      idType.should.equal('symbol');
    });
    
    it('Should generate a unique symbol for each id',function(){
      console.log('Are ids equal?', d1.id === d2.id);
      d1['id'].should.not.equal(d2['id']);
    });
 
    setTimeout(function(){
      d1.resolve();
      d2.resolve();
    },100);

  }())
})
