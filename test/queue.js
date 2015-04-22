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
	},1000);


	/**
	 * If a then function returns a value, that value is passed down to any
	 * subsequent then() or done() functions.
	*/
	q.then(function(r){
			console.log("then1",r); //Dependency values.
			tests.then1(r);
			return -100.125;
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
			expect(r).to.have.length(4);
			expect(r[0]).to.have.property('value');
			r[0].value.should.equal(1);
			expect(r[1]).to.have.property('value');
			r[1].value.should.equal(2);
			//@todo check css has been added to dom
			should.not.exist(output.then2);
			should.not.exist(output.done);
			output.then1 = 1;
		},
		then2 : function(r,last){
			last.should.equal(-100.125);
			should.not.exist(output.done);
			output.then2 = 1;
		},
		done : function(r,last){
			expect(r).to.have.length(4);
			expect(r[0]).to.have.property('value');
			r[0].value.should.equal(1);
			expect(r[1]).to.have.property('value');
			r[1].value.should.equal(2);
			last.should.equal('abcdefg');
			output.then1.should.equal(1);
			output.then1.should.equal(1);
			output.done = 1;
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
		then1 : function(){}
		,then2 : function(){}
		,done  : function(){}
	}
	fn();
}
})()
