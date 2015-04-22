var Config = require('./config.js');
var _proto = require('./deferred.schema.js');

//Extend deferred schema
var _public = Object.create(_proto,{});

_public.model = 'queue';


//SET TRUE AFTER RESOLVER FIRED
_public.resolver_fired = 0;


//PREVENTS A QUEUE FROM RESOLVING EVEN IF ALL DEPENDENCIES MET
//PURPOSE: PREVENTS QUEUES CREATED BY ASSIGNMENT FROM RESOLVING
//BEFORE THEY ARE FORMALLY INSTANTIATED
_public.halt_resolution = 0;


//USED TO CHECK STATE, ENSURES ONE COPY
_public.upstream = {};


//USED RETURN VALUES, ENSURES ORDER
_public.dependencies = [];


///////////////////////////////////////////////////
//  QUEUE INSTANCE METHODS
///////////////////////////////////////////////////


/**
* Add list of dependencies to a queue's upstream array.
*
* The queue will resolve once all the promises in its
* upstream array are resolved.
*
* When _public.config.debug == 1, method will test each
* dependency is not previously scheduled to resolve
* downstream from the target, in which
* case it would never resolve because its upstream depends on it.
*
* @param {array} arr  /array of dependencies to add
* @returns {array} upstream
*/
_public.add = function(arr){

	var _private = require('./queue.private.js');

	 try{
			 if(arr.length === 0) return this.upstream;
	 }
	 catch(err){
			 Config.debug(err);
	 }

	 //IF NOT PENDING, DO NOT ALLOW TO ADD
	 if(this.state !== 0){
			return Config.debug([
				"Cannot add dependency list to queue id:'"+this.id
				+"'. Queue settled/in the process of being settled."
			],arr,this);
	 }

	 for(var a in arr){

			 switch(true){

					 //CHECK IF EXISTS
					 case(typeof Config.list[arr[a].id] === 'object'):
							 arr[a] = Config.list[arr[a].id];
							 break;

					 //IF NOT, ATTEMPT TO CONVERT IT TO AN ORGY PROMISE
					 case(typeof arr[a] === 'object' && (!arr[a].is_orgy)):
							 arr[a] = _private.convert_to_promise(arr[a],{
								 parent : this
							 });
							 break;

					 //REF IS A PROMISE.
					 case(typeof arr[a].then === 'function'):
							 break;

					 default:
							 console.error("Object could not be converted to promise.");
							 console.error(arr[a]);
							 debugger;
							 continue;
			 }

			 //must check the target to see if the dependency exists in its downstream
			 for(var b in this.downstream){
					 if(b === arr[a].id){
							return Config.debug([
								"Error adding upstream dependency '"
								+arr[a].id+"' to queue"+" '"
								+this.id+"'.\n Promise object for '"
								+arr[a].id+"' is scheduled to resolve downstream from queue '"
								+this.id+"' so it can't be added upstream."
							]
							,this);
					 }
			 }

			 //ADD TO UPSTREAM, DOWNSTREAM, DEPENDENCIES
			 this.upstream[arr[a].id] = arr[a];
			 arr[a].downstream[this.id] = this;
			 this.dependencies.push(arr[a]);
	 }

	 return this.upstream;
};


/**
* Remove list from a queue.
*
* @param {array} arr
* @returns {array} array of list the queue is upstream
*/
_public.remove = function(arr){

	//IF NOT PENDING, DO NOT ALLOW REMOVAL
	if(this.state !== 0){
			return Config.debug("Cannot remove list from queue id:'"+this.id+"'. Queue settled/in the process of being settled.");
	}

	for(var a in arr){
		 if(this.upstream[arr[a].id]){
				delete this.upstream[arr[a].id];
				delete arr[a].downstream[this.id];
		 }
	}
};


/**
* Resets an existing,settled queue back to Orgying state.
* Clears out the downstream.
* Fails if not settled.
* @param {object} options
* @returns {_private.tpl|Boolean}
*/
_public.reset = function(options){

	var _private = require('./deferred.private.js');

	if(this.settled !== 1 || this.state !== 1){
		return Config.debug("Can only reset a queue settled without errors.");
	}

	options = options || {};

	this.settled = 0;
	this.state = 0;
	this.resolver_fired = 0;
	this.done_fired = 0;

	//REMOVE AUTO TIMEOUT TIMER
	if(this.timeout_id){
		clearTimeout(this.timeout_id);
	}

	//CLEAR OUT THE DOWNSTREAM
	this.downstream = {};
	this.dependencies = [];

	//SET NEW AUTO TIMEOUT
	_private.auto_timeout.call(this,options.timeout);

	//POINTLESS - WILL JUST IMMEDIATELY RESOLVE SELF
	//this.check_self()

	return this;
};


/**
* Cauaes a queue to look over its dependencies and see if it
* can be resolved.
*
* This is done automatically by each dependency that loads,
* so is not needed unless:
*
* -debugging
*
* -the queue has been reset and no new
* dependencies were since added.
*
* @returns {int} State of the queue.
*/
_public.check_self = function(){
	var _private = require('./deferred.private.js');
	_private.receive_signal(this,this.id);
	return this.state;
};


module.exports = _public;
