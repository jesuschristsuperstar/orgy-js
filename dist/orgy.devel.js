(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Orgy = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/src/main.js":[function(require,module,exports){
var Cls = Object.create({
	private:{},
	public:{}
});

require('./config.js')(Cls);
require('./file_loader.js')(Cls);
require('./deferred.js')(Cls);
require('./queue.js')(Cls);
require('./cast.js')(Cls);

/**
 * @namespace orgy
 */

/**
* Creates a new deferred from a value and an id and automatically
* resolves it.
*
* @memberof orgy
* @function define
*
* @param {string} id A unique id you give to the object
* @param {mixed}	data The value that the object is assigned
* @param {object} options
- <b>dependencies</b> {array}
- <b>resolver</b> {function(<i>assignedValue</i>,<i>deferred</i>}
* @returns {object} resolved deferred
*/
Cls.public.define = function(id,data,options){

		var def;
		options = options || {};
		options.dependencies = options.dependencies || null;
		options.resolver = options.resolver || null;

		//test for a valid id
		if(typeof id !== 'string'){
			Cls.private.config.debug("Must set id when defining an instance.");
		}

		//Check no existing instance defined with same id
		if(Cls.private.config.list[id] && Cls.private.config.list[id].settled === 1){
			return Cls.private.config.debug("Can't define " + id + ". Already resolved.");
		}

		options.id = id;

		if(options.dependencies !== null
			&& options.dependencies instanceof Array){
			//Define as a queue - can't autoresolve because we have deps
			var deps = options.dependencies;
			delete options.dependencies;
			def = Cls.public.queue(deps,options);
		}
		else{
			//Define as a deferred
			def = Cls.public.deferred(options);

			//Try to immediately settle [define]
			if(options.resolver === null
				&& (typeof options.autoresolve !== 'boolean'
				|| options.autoresolve === true)){
				//prevent future autoresove attempts [i.e. from xhr response]
				def.autoresolve = false;
				def.resolve(data);
			}
		}

		return def;
};


/**
 * Gets an exisiting deferred / queue object from global store.
 * Returns null if none found.
 *
 * @memberof orgy
 * @function get
 *
 * @param {string} id Id of deferred or queue object.
 * @returns {object} deferred | queue | null
 */
Cls.public.get = function(id){
	if(Cls.private.config.list[id]){
		return Cls.private.config.list[id];
	}
	else{
		return null;
	}
};


/**
 * Add/remove an upstream dependency to/from a queue.
 *
 * Can use a queue id, even for a queue that is yet to be created.
 *
 * @memberof orgy
 * @function assign
 *
 * @param {string|object} tgt Cls.public.queue id / queue object
 * @param {array}  arr	Array of promise ids or dependency objects
 * @param {boolean} add  If true <b>ADD</b> array to queue dependencies, If false <b>REMOVE</b> array from queue dependencies
 *
 * @return {object} queue
 */
Cls.public.assign = function(tgt,arr,add){

		add = (typeof add === "boolean") ? add : 1;

		var id,q;
		switch(true){
				case(typeof tgt === 'object' && typeof tgt.then === 'function'):
						id = tgt.id;
						break;
				case(typeof tgt === 'string'):
						id = tgt;
						break;
				default:
						return Cls.private.config.debug("Assign target must be a queue object or the id of a queue.",this);
		}

		//IF TARGET ALREADY LISTED
		if(Cls.private.config.list[id] && Cls.private.config.list[id].model === 'queue'){
				q = Cls.private.config.list[id];

				//=> ADD TO QUEUE'S UPSTREAM
				if(add){
						q.add(arr);
				}
				//=> REMOVE FROM QUEUE'S UPSTREAM
				else{
						q.remove(arr);
				}
		}
		//CREATE NEW QUEUE AND ADD DEPENDENCIES
		else if(add){
				q = Cls.public.queue(arr,{
						id : id
				});
		}
		//ERROR: CAN'T REMOVE FROM A QUEUE THAT DOES NOT EXIST
		else{
				return Cls.private.config.debug("Cannot remove dependencies from a queue that does not exist.",this);
		}

		return q;
};

module.exports = Cls.public;

},{"./cast.js":3,"./config.js":4,"./deferred.js":5,"./file_loader.js":6,"./queue.js":7}],1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
module.exports = function(Cls){

	/**
	 * Casts a thenable object into an Orgy deferred object.
	 *
	 * > To qualify as a <b>thenable</b>, the object to be casted must have the following properties:
	 * >
	 * > - id
	 * >
	 * > - then()
	 * >
	 * > - error()
	 *
	 * @memberof orgy
	 * @function cast
	 *
	 * @param {object} obj A thenable with the following properties:
	 *	- {string} <b>id</b>	Unique id of the object.
	 *
	 *	- {function} <b>then</b>
	 *
	 *	- {function} <b>error</b>
	 *
	 * @returns {object} deferred
	 */
	Cls.public.cast = function(obj){

			var required = ["then","error","id"];
			for(var i in required){
				if(!obj.hasOwnProperty(required[i])){
					return Cls.private.config.debug("Cast method missing property '" + required[i] +"'");
				}
			}

			var options = {};
			options.id = obj.id;

			//Make sure id does not conflict with existing
			if(Cls.private.config.list[options.id]){
				return Cls.private.config.debug("Id "+options.id+" conflicts with existing id.");
			}

			//Create a deferred
			var def = Cls.public.deferred(options);

			//Create resolver
			var resolver = function(){
				def.resolve.call(def,arguments[0]);
			};

			//Set Resolver
			obj.then(resolver);

			//Reject deferred on .error
			var err = function(err){
				def.reject(err);
			};
			obj.error(err);

			//Return deferred
			return def;
	};

	return Cls;
}

},{}],4:[function(require,module,exports){
(function (process){
module.exports = function(Cls){

	var _private = {};


	////////////////////////////////////////
	//	_private VARIABLES
	////////////////////////////////////////


	/**
	 * A directory of all promises, deferreds, and queues.
	 * @type object
	 */
	_private.list = {};


	/**
	 * iterator for ids
	 * @type integer
	 */
	_private.i = 0;


	/**
	 * Configuration values.
	 *
	 * @type object
	 */
	_private.settings = {

			debug_mode : 1
			//set the current working directory of the callee script,
			//because node has no constant for this
			,cwd : false
			,mode : (function(){
					if(typeof process === 'object' && process + '' === '[object process]'){
							// is node
							return "native";
					}
					else{
							// not node
							return "browser";
					}
			}())
			/**
			 * - onActivate /when each instance activated
			 * - onSettle		/when each instance settles
			 *
			 * @type object
			 */
			,hooks : {
			}
			,timeout : 5000 //default timeout
	};


	////////////////////////////////////////
	//	_private VARIABLES
	////////////////////////////////////////


	////////////////////////////////////////
	//	_private METHODS
	////////////////////////////////////////


	/**
	 * Options you wish to pass to set the global configuration
	 *
	 * @memberof orgy
	 * @function config
	 *
	 * @param {object} obj List of options:

		- {number} <b>timeout</b>

		- {string} <b>cwd</b> Sets current working directory. Server side scripts only.

		- {boolean} <b>debug_mode</b>

	 * @returns {object} configuration settings
	 */
	Cls.public.config = function(obj){

			if(typeof obj === 'object'){
					for(var i in obj){
						_private.settings[i] = obj[i];
					}
			}

			return _private.settings;
	};


	/**
	 * Debugging method.
	 *
	 * @param {string|array} msg
	 * @param {object} def
	 * @returns {Boolean}
	 */
	_private.debug = function(msg){

			var msgs = (msg instanceof Array) ? msg.join("\n") : [msg];

			var e = new Error(msgs);
			console.log(e.stack);

			if(this.settings.debug_mode){
				//turn off debug_mode to avoid hitting debugger
				debugger;
			}

			if(_private.settings.mode === 'browser'){
				return false;
			}
			else{
				process.exit();
			}
	};


	/**
	 * Take an array of prototype objects and an array of property objects,
	 * merges each, and returns a shallow copy.
	 *
	 * @param {array} protoObjArr Array of prototype objects which are overwritten from right to left
	 * @param {array} propsObjArr Array of desired property objects which are overwritten from right to left
	 * @returns {object} object
	 */
	_private.naive_cloner = function(protoObjArr,propsObjArr){

			function merge(donors){
				var o = {};
				for(var a in donors){
						for(var b in donors[a]){
								if(donors[a][b] instanceof Array){
										o[b] = donors[a][b].slice(0);
								}
								else if(typeof donors[a][b] === 'object'){
									try{
										o[b] = JSON.parse(JSON.stringify(donors[a][b]));
									}
									catch(e){
										console.error(e);
										debugger;
									}
								}
								else{
										o[b] = donors[a][b];
								}
						}
				}
				return o;
			}

			var proto = merge(protoObjArr),
					props = merge(propsObjArr);

			//@todo consider manually setting the prototype instead
			var finalObject = Object.create(proto);
			for(var i in props){
				finalObject[i] = props[i];
			}

			return finalObject;
	};


	_private.generate_id = function(){
		return new Date().getTime() + '-' + (++this.i);
	};
	
	
	//Save for re-use
	Cls.private.config = _private;

	return Cls;
}

}).call(this,require('_process'))

},{"_process":2}],5:[function(require,module,exports){
module.exports = function(Cls){

	/**
	* @namespace orgy/deferred
	*/

	
	var _private = {};


	_private.activate = function(obj){

			 //if no id, generate one
			if(!obj.id){
				obj.id = Cls.private.config.generate_id();
			}

			//MAKE SURE NAMING CONFLICT DOES NOT EXIST
			if(Cls.private.config.list[obj.id] && !Cls.private.config.list[obj.id].overwritable){
					Cls.private.config.debug("Tried illegal overwrite of "+obj.id+".");
					return Cls.private.config.list[obj.id];
			}

			//SAVE TO MASTER LIST
			//@todo only save if was assigned an id,
			//which implies user intends to access somewhere else outside of scope
			Cls.private.config.list[obj.id] = obj;

			//AUTO TIMEOUT
			_private.auto_timeout.call(obj);

			//Call hook
			if(Cls.private.config.settings.hooks.onActivate){
				Cls.private.config.settings.hooks.onActivate(obj);
			}

			return obj;
	};


	_private.settle = function(def){

			//REMOVE AUTO TIMEOUT TIMER
			if(def.timeout_id){
				clearTimeout(def.timeout_id);
			}

			//Set state to resolved
			_private.set_state(def,1);

			//Call hook
			if(Cls.private.config.settings.hooks.onSettle){
				Cls.private.config.settings.hooks.onSettle(def);
			}

			//Add done as a callback to then chain completion.
			def.callbacks.then.hooks.onComplete.train.push(function(d2,itinerary,last){
					def.caboose = last;

					//Run done
					_private.run_train(
							def
							,def.callbacks.done
							,def.caboose
							,{pause_on_deferred : false}
					);
			});

			//Run then queue
			_private.run_train(
					def
					,def.callbacks.then
					,def.value
					,{pause_on_deferred : true}
			);

			return def;
	};


	/**
	 * Runs an array of functions sequentially as a partial function.
	 * Each function's argument is the result of its predecessor function.
	 *
	 * By default, execution chain is paused when any function
	 * returns an unresolved deferred. (pause_on_deferred) [OPTIONAL]
	 *
	 * @param {object} def	/deferred object
	 * @param {object} obj	/itinerary
	 *			train				{array}
	 *			hooks				{object}
	 *					onBefore				{array}
	 *					onComplete			{array}
	 * @param {mixed} param /param to pass to first callback
	 * @param {object} options
	 *			pause_on_deferred		{boolean}
	 *
	 * @returns {void}
	 */
	_private.run_train = function(def,obj,param,options){

			//allow previous return values to be passed down chain
			var r = param || def.caboose || def.value;

			//onBefore event
			if(obj.hooks && obj.hooks.onBefore.train.length > 0){
					_private.run_train(
							def
							,obj.hooks.onBefore
							,param
							,{pause_on_deferred : false}
					);
			}

			while(obj.train.length > 0){

					//remove fn to execute
					var last = obj.train.shift();
					def.execution_history.push(last);

					//def.caboose needed for then chain declared after resolved instance
					r = def.caboose = last.call(def,def.value,def,r);

					//if result is an thenable, halt execution
					//and run unfired arr when thenable settles
					if(options.pause_on_deferred){

							//If r is an unsettled thenable
							if(r && r.then && r.settled !== 1){

									//execute rest of this train after r resolves
									r.callbacks.resolve.hooks.onComplete.train.push(function(){

											_private.run_train(
													def
													,obj
													,r
													,{pause_on_deferred : true}
											);
									});

									//terminate execution
									return;
							}

							//If is an array than contains an unsettled thenable
							else if(r instanceof Array){

									var thenables = [];

									for(var i in r){

											if(r[i].then && r[i].settled !== 1){

													thenables.push(r[i]);

													var fn = (function(t,def,obj,param){

															return function(){

																	//Bail if any thenables unsettled
																	for(var i in t){
																			if(t[i].settled !== 1){
																					return;
																			}
																	}

																	_private.run_train(
																			def
																			,obj
																			,param
																			,{pause_on_deferred : true}
																	);
															};

													})(thenables,def,obj,param);

													//execute rest of this train after
													//all thenables found in r resolve
													r[i].callbacks.resolve.hooks.onComplete.train.push(fn);

													//terminate execution
													return;
											}
									}
							}
					}
			}

			//onComplete event
			if(obj.hooks && obj.hooks.onComplete.train.length > 0){
					_private.run_train(def,obj.hooks.onComplete,r,{pause_on_deferred : false});
			}
	};


	/**
	 * Sets the state of an Orgy object.
	 *
	 * @param {object} def
	 * @param {number} int
	 * @returns {void}
	 */
	_private.set_state = function(def,int){

			def.state = int;

			//IF RESOLVED OR REJECTED, SETTLE
			if(int === 1 || int === 2){
					def.settled = 1;
			}

			if(int === 1 || int === 2){
					_private.signal_downstream(def);
			}
	};


	/**
	 * Gets the state of an Orgy object
	 *
	 * @param {object} def
	 * @returns {number}
	 */
	_private.get_state = function(def){
			return def.state;
	};


	/**
	 * Sets the automatic timeout on a promise object.
	 *
	 * @returns {Boolean}
	 */
	_private.auto_timeout = function(){

			this.timeout = (typeof this.timeout !== 'undefined')
			? this.timeout : Cls.private.config.settings.timeout;

			//AUTO REJECT ON timeout
			if(!this.type || this.type !== 'timer'){

					//DELETE PREVIOUS TIMEOUT IF EXISTS
					if(this.timeout_id){
							clearTimeout(this.timeout_id);
					}
					
					if(typeof this.timeout === 'undefined'){
							Cls.private.config.debug([
								"Auto timeout this.timeout cannot be undefined."
								,this.id
							]);
					}
					else if (this.timeout === -1){
							//NO AUTO TIMEOUT SET
							return false;
					}
					var scope = this;

					this.timeout_id = setTimeout(function(){
							_private.auto_timeout_cb.call(scope);
					}, this.timeout);

			}
			//else{
					//@todo WHEN A TIMER, ADD DURATION TO ALL UPSTREAM AND LATERAL?
			//}

			return true;
	};


	/**
	 * Callback for autotimeout. Declaration here avoids memory leak.
	 *
	 * @returns {void}
	 */
	_private.auto_timeout_cb = function(){

			if(this.state !== 1){

					//GET THE UPSTREAM ERROR ID
					var msgs = [];
					var scope = this;

					var fn = function(obj){
							if(obj.state !== 1){
									return obj.id;
							}
							else{
									return false;
							}
					};

					/**
					 * Run over a given object property recursively,
					 * applying callback until
					 * callback returns a non-false value.
					 */
					if(Cls.private.config.settings.debug_mode){
							var r = _private.search_obj_recursively(this,'upstream',fn);
							msgs.push(scope.id + ": rejected by auto timeout after "
											+ this.timeout + "ms");
							msgs.push("Cause:");
							msgs.push(r);
							return this.reject.call(this,msgs);
					}
					else{
							return this.reject.call(this);
					}
			}
	};


	_private.error = function(cb){

			//IF ERROR ALREADY THROWN, EXECUTE CB IMMEDIATELY
			if(this.state === 2){
					cb();
			}
			else{
					this.reject_q.push(cb);
			}

			return this;
	};


	/**
	 * Signals all downstream promises that _private promise object's
	 * state has changed.
	 *
	 * @todo Since the same queue may have been assigned twice directly or
	 * indirectly via shared dependencies, make sure not to double resolve
	 * - which throws an error.
	 *
	 * @param {object} target deferred/queue
	 * @returns {void}
	 */
	_private.signal_downstream = function(target){

			//MAKE SURE ALL DOWNSTREAM IS UNSETTLED
			for(var i in target.downstream){
					if(target.downstream[i].settled === 1){

						if(target.downstream[i].state !== 1){
							//tried to settle a rejected downstream
							continue;
						}
						else{
							//tried to settle a successfully settled downstream
							Cls.private.config.debug(target.id + " tried to settle promise "+"'"+target.downstream[i].id+"' that has already been settled.");
						}
					}
			}

			//NOW THAT WE KNOW ALL DOWNSTREAM IS UNSETTLED, WE CAN IGNORE ANY
			//SETTLED THAT RESULT AS A SIDE EFFECT TO ANOTHER SETTLEMENT
			for (var i in target.downstream){
					if(target.downstream[i].settled !== 1){
							_private.receive_signal(target.downstream[i],target.id);
					}
			}
	};


	/**
	* Run over a given object property recursively, applying callback until
	* callback returns a non-false value.
	*
	* @param {object} obj
	* @param {string} propName					The property name of the array to bubble up
	* @param {function} fn							The test callback to be applied to each object
	* @param {array} breadcrumb					The breadcrumb through the chain of the first match
	* @returns {mixed}
	*/
	_private.search_obj_recursively = function(obj,propName,fn,breadcrumb){

			if(typeof breadcrumb === 'undefined'){
					breadcrumb = [obj.id];
			}

			var r1;

			for(var i in obj[propName]){

					//RUN TEST
					r1 = fn(obj[propName][i]);

					if(r1 !== false){
					//MATCH RETURNED. RECURSE INTO MATCH IF HAS PROPERTY OF SAME NAME TO SEARCH
							//CHECK THAT WE AREN'T CAUGHT IN A CIRCULAR LOOP
							if(breadcrumb.indexOf(r1) !== -1){
									return Cls.private.config.debug([
											"Circular condition in recursive search of obj property '"
													+propName+"' of object "
													+((typeof obj.id !== 'undefined') ? "'"+obj.id+"'" : '')
													+". Offending value: "+r1
											,(function(){
													breadcrumb.push(r1);
													return breadcrumb.join(" [depends on]=> ");
											})()
									]);
							}

							breadcrumb.push(r1);

							if(obj[propName][i][propName]){
									return _private.search_obj_recursively(obj[propName][i],propName,fn,breadcrumb);
							}

							break;
					}

			}

			return breadcrumb;
	};


	/**
	 * Converts a promise description into a promise.
	 *
	 * @param {type} obj
	 * @returns {undefined}
	 */
	_private.convert_to_promise = function(obj,options){

			obj.id = obj.id || options.id;

			//Autoname
			if (!obj.id) {
				if (obj.type === 'timer') {
					obj.id = "timer-" + obj.timeout + "-" + (++Cls.private.config.i);
				}
				else if (typeof obj.url === 'string') {
					obj.id = obj.url.split("/").pop();
					//REMOVE .js FROM ID
					if (obj.id.search(".js") !== -1) {
						obj.id = obj.id.split(".");
						obj.id.pop();
						obj.id = obj.id.join(".");
					}
				}
			}

			//Return if already exists
			if(Cls.private.config.list[obj.id] && obj.type !== 'timer'){
				//A previous promise of the same id exists.
				//Make sure this dependency object doesn't have a
				//resolver - if it does error
				if(obj.resolver){
					Cls.private.config.debug([
						"You can't set a resolver on a queue that has already been declared. You can only reference the original."
						,"Detected re-init of '" + obj.id + "'."
						,"Attempted:"
						,obj
						,"Existing:"
						,Cls.private.config.list[obj.id]
					]);
				}
				else{
					return Cls.private.config.list[obj.id];
				}
			}


			//Convert dependency to an instance
			var def;
			switch(true){

					//Event
					case(obj.type === 'event'):
							def = _private.wrap_event(obj);
							break;

					case(obj.type === 'queue'):
							def = Cls.public.queue(obj.dependencies,obj);
							break;

					//Already a thenable
					case(typeof obj.then === 'function'):

							switch(true){

									//Reference to an existing instance
									case(typeof obj.id === 'string'):
											console.warn("'"+obj.id +"': did not exist. Auto creating new deferred.");
											def = _private.deferred({
													id : obj.id
											});

											//If object was a thenable, resolve the new deferred when then called
											if(obj.then){
												obj.then(function(r){
													def.resolve(r);
												});
											}
											break;

									//OBJECT PROPERTY .promise EXPECTED TO RETURN A PROMISE
									case(typeof obj.promise === 'function'):
											if(obj.scope){
													def = obj.promise.call(obj.scope);
											}
											else{
													def = obj.promise();
											}
											break;

									//Object is a thenable
									case(obj.then):
											def = obj;
											break;

									default:

							}

							//Check if is a thenable
							if(typeof def !== 'object' || !def.then){
									return Cls.private.config.debug("Dependency labeled as a promise did not return a promise.",obj);
							}
							break;

					case(obj.type === 'timer'):
							def = _private.wrap_timer(obj);
							break;

					//Load file
					default:
							obj.type = obj.type || "default";
							//Inherit parent's current working directory
							if(options.parent && options.parent.cwd){
								obj.cwd = options.parent.cwd;
							}
							def = _private.wrap_xhr(obj);
			}

			//Index promise by id for future referencing
			Cls.private.config.list[obj.id] = def;

			return def;
	};


	/**
	 * @todo: redo this
	 *
	 * Converts a reference to a DOM event to a promise.
	 * Resolved on first event trigger.
	 *
	 * @todo remove jquery dependency
	 *
	 * @param {object} obj
	 * @returns {object} deferred object
	 */
	_private.wrap_event = function(obj){

			var def = Cls.public.deferred({
					id : obj.id
			});


			if(typeof document !== 'undefined' && typeof window !== 'undefined'){

					if(typeof $ !== 'function'){
							var msg = 'window and document based events depend on jQuery';
							def.reject(msg);
					}
					else{
						//For now, depend on jquery for IE8 DOMContentLoaded polyfill
						switch(true){
							case(obj.id === 'ready' || obj.id === 'DOMContentLoaded'):
								$(document).ready(function(){
									def.resolve(1);
								});
								break;
							case(obj.id === 'load'):
								$(window).load(function(){
									def.resolve(1);
								});
								break;
							default:
								$(document).on(obj.id,"body",function(){
									def.resolve(1);
								});
						}
					}
			}

			return def;
	};


	_private.wrap_timer = function(obj){

			var def = Cls.public.deferred();

			(function(def){
					var _start = new Date().getTime();
					setTimeout(function(){
							var _end = new Date().getTime();
							def.resolve({
									start : _start
									,end : _end
									,elapsed : _end - _start
									,timeout : obj.timeout
							});
					},obj.timeout);
			}(def));

			return def;
	};


	/**
	 * Creates a deferred object that depends on the loading of a file.
	 *
	 * @param {object} dep
	 * @returns {object} deferred object
	 */
	_private.wrap_xhr = function(dep){

			var required = ["id","url"];
			for(var i in required){
				if(!dep[required[i]]){
					return Cls.private.config.debug([
						"File requests converted to promises require: " + required[i]
						,"Make sure you weren't expecting dependency to already have been resolved upstream."
						,dep
					]);
				}
			}

			//IF PROMISE FOR THIS URL ALREADY EXISTS, RETURN IT
			if(Cls.private.config.list[dep.id]){
				return Cls.private.config.list[dep.id];
			}

			//CONVERT TO DEFERRED:
			var def = Cls.public.deferred(dep);

			if(typeof Cls.public.file_loader[Cls.private.config.settings.mode][dep.type] !== 'undefined'){
				Cls.public.file_loader[Cls.private.config.settings.mode][dep.type](dep.url,def,dep);
			}
			else{
				Cls.public.file_loader[Cls.private.config.settings.mode]['default'](dep.url,def,dep);
			}

			return def;
	};

	/**
	* A "signal" here causes a queue to look through each item
	* in its upstream and check to see if all are resolved.
	*
	* Signals can only be received by a queue itself or an instance
	* in its upstream.
	*
	* @param {object} target
	* @param {string} from_id
	* @returns {void}
	*/
	_private.receive_signal = function(target,from_id){

		if(target.halt_resolution === 1) return;

		//MAKE SURE THE SIGNAL WAS FROM A PROMISE BEING LISTENED TO
	 //BUT ALLOW SELF STATUS CHECK
	 var status;
	 if(from_id !== target.id && !target.upstream[from_id]){
			 return Cls.private.config.debug(from_id + " can't signal " + target.id + " because not in upstream.");
	 }
	 //RUN THROUGH QUEUE OF OBSERVING PROMISES TO SEE IF ALL DONE
	 else{
			 status = 1;
			 for(var i in target.upstream){
					 //SETS STATUS TO 0 IF ANY OBSERVING HAVE FAILED, BUT NOT IF PENDING OR RESOLVED
					 if(target.upstream[i].state !== 1) {
							 status = target.upstream[i].state;
							 break;
					 }
			 }
	 }

	 //RESOLVE QUEUE IF UPSTREAM FINISHED
	 if(status === 1){

			//GET RETURN VALUES PER DEPENDENCIES, WHICH SAVES ORDER AND
			//REPORTS DUPLICATES
			var values = [];
			for(var i in target.dependencies){
				values.push(target.dependencies[i].value);
			}

			target.resolve.call(target,values);
	 }

	 if(status === 2){
			 var err = [
					 target.id+" dependency '"+target.upstream[i].id + "' was rejected."
					 ,target.upstream[i].arguments
			 ];
			 target.reject.apply(target,err);
	 }
	};




	var _public = {};

	_public.is_orgy = true;

	_public.id = null;

	//A COUNTER FOR AUT0-GENERATED PROMISE ID'S
	_public.settled = 0;

	/**
	* STATE CODES:
	* ------------------
	* -1	 => SETTLING [EXECUTING CALLBACKS]
	*  0	 => PENDING
	*  1	 => RESOLVED / FULFILLED
	*  2	 => REJECTED
	*/
	_public.state = 0;

	_public.value = [];

	//The most recent value generated by the then->done chain.
	_public.caboose = null;

	_public.model = "deferred";

	_public.done_fired = 0;

	_public.timeout_id = null;

	_public.callback_states = {
		resolve : 0
		,then : 0
		,done : 0
		,reject : 0
	};

	/**
	* Self executing function to initialize callback event
	* list.
	*
	* Returns an object with the same propertyNames as
	* _public.callback_states: adding boilerplate
	* properties for each
	*
	* @returns {object}
	*/
	_public.callbacks = (function(){

		var o = {};

		for(var i in _public.callback_states){
			o[i] = {
				train : []
				,hooks : {
					onBefore : {
						train : []
					}
					,onComplete : {
						train : []
					}
				}
			};
		}

		return o;
	})();

	//PROMISE HAS OBSERVERS BUT DOES NOT OBSERVE OTHERS
	_public.downstream = {};

	_public.execution_history = [];

	//WHEN TRUE, ALLOWS RE-INIT [FOR UPGRADES TO A QUEUE]
	_public.overwritable = 0;

	/**
	* REMOTE
	*
	* REMOTE == 1  =>  [DEFAULT] Make http request for file
	*
	* REMOTE == 0  =>  Read file directly from the filesystem
	*
	* ONLY APPLIES TO SCRIPTS RUN UNDER NODE AS BROWSER HAS NO
	* FILESYSTEM ACCESS
	*/
	_public.remote = 1;

	//ADDS TO MASTER LIST. ALWAYS TRUE UNLESS UPGRADING A PROMISE TO A QUEUE
	_public.list = 1;


	//////////////////////////////////////////
	//	_public METHODS
	//////////////////////////////////////////


	/**
	* Resolves a deferred/queue.
	*
	* @memberof orgy/deferred
	* @function orgy/deferred#resolve
	*
	* @param {mixed} value Resolver value.
	* @returns {object} deferred/queue
	*/
	_public.resolve = function(value){

		if(this.settled === 1){
			Cls.private.config.debug([
				this.id + " can't resolve."
				,"Only unsettled deferreds are resolvable."
			]);
		}

		//SET STATE TO SETTLEMENT IN PROGRESS
		_private.set_state(this,-1);

		//SET VALUE
		this.value = value;

		//RUN RESOLVER BEFORE PROCEEDING
		//EVEN IF THERE IS NO RESOLVER, SET IT TO FIRED WHEN CALLED
		if(!this.resolver_fired && typeof this.resolver === 'function'){

			this.resolver_fired = 1;

			//Add resolver to resolve train
			try{
				this.callbacks.resolve.train.push(function(){
					this.resolver(value,this);
				});
			}
			catch(e){
				Cls.private.config.debug(e);
			}
		}
		else{

			this.resolver_fired = 1;

			//Add settle to resolve train
			//Always settle before all other complete callbacks
			this.callbacks.resolve.hooks.onComplete.train.unshift(function(){
				_private.settle(this);
			});
		}

		//Run resolve
		_private.run_train(
			this
			,this.callbacks.resolve
			,this.value
			,{pause_on_deferred : false}
		);

		//resolver is expected to call resolve again
		//and that will get us past this point
		return this;
	};


	/**
	* Rejects a deferred/queue
	*
	* @memberof orgy/deferred
	* @function orgy/deferred#reject
	*
	* @param {string|array} err Error information.
	* @return {object} deferred/queue
	*/
	_public.reject = function(err){

		if(!(err instanceof Array)){
			err = [err];
		}

		var msg = "Rejected "+this.model+": '"+this.id+"'."

		if(Cls.private.config.settings.debug_mode){
			err.unshift(msg);
			Cls.private.config.debug(err,this);
		}
		else{
			msg = msg + " Turn on debug mode for more info.";
			console.warn(msg);
		}

		//Remove auto timeout timer
		if(this.timeout_id){
			clearTimeout(this.timeout_id);
		}

		//Set state to rejected
		_private.set_state(this,2);

		//Execute rejection queue
		_private.run_train(
			this
			,this.callbacks.reject
			,err
			,{pause_on_deferred : false}
		);

		return this;
	};


	/**
	* Chain method

	<b>Usage:</b>
	```
	var Orgy = require("orgy"),
					q = Orgy.deferred({
						id : "q1"
					});

	//Resolve the deferred
	q.resolve("Some value.");

	q.then(function(r){
		console.log(r); //Some value.
	})

	```

	* @memberof orgy/deferred
	* @function orgy/deferred#then
	*
	* @param {function} fn Callback function
	* @param {function} rejector Rejection callback function
	* @return {object} deferred/queue
	*/
	_public.then = function(fn,rejector){

		switch(true){

			//An error was previously thrown, add rejector & bail out
			case(this.state === 2):
				if(typeof rejector === 'function'){
					this.callbacks.reject.train.push(rejector);
				}
				break;

			//Execution chain already finished. Bail out.
			case(this.done_fired === 1):
				return Cls.private.config.debug(this.id+" can't attach .then() because .done() has already fired, and that means the execution chain is complete.");

			default:

				//Push callback to then queue
				this.callbacks.then.train.push(fn);

				//Push reject callback to the rejection queue
				if(typeof rejector === 'function'){
					this.callbacks.reject.train.push(rejector);
				}

				//Settled, run train now
				if(this.settled === 1 && this.state === 1 && !this.done_fired){
					_private.run_train(
						this
						,this.callbacks.then
						,this.caboose
						,{pause_on_deferred : true}
					);
				}
				//Unsettled, train will be run when settled
				//else{}
		}

		return this;
	};


	/**
	* Done callback.
	*
	* @memberof orgy/deferred
	* @function orgy/deferred#done
	*
	* @param {function} fn Callback function
	* @param {function} rejector Rejection callback function
	* @returns {object} deferred/queue
	*/
	_public.done = function(fn,rejector){

		if(this.callbacks.done.train.length === 0
			&& this.done_fired === 0){
				if(typeof fn === 'function'){

					//wrap callback with some other commands
					var fn2 = function(r,deferred,last){

						//Done can only be called once, so note that it has been
						deferred.done_fired = 1;

						fn(r,deferred,last);
					};

					this.callbacks.done.train.push(fn2);

					//Push reject callback to the rejection queue onComplete
					if(typeof rejector === 'function'){
						this.callbacks.reject.hooks.onComplete.train.push(rejector);
					}

					//Settled, run train now
					if(this.settled === 1){
						if(this.state === 1){
							_private.run_train(
								this
								,this.callbacks.done
								,this.caboose
								,{pause_on_deferred : false}
							);
						}
						else{
							_private.run_train(
								this
								,this.callbacks.reject
								,this.caboose
								,{pause_on_deferred : false}
							);
						}
					}
					//Unsettled, train will be run when settled
					//else{}
			}
			else{
				return Cls.private.config.debug("done() must be passed a function.");
			}
		}
		else{
			return Cls.private.config.debug("done() can only be called once.");
		}
		
		return this;
	};


	/**
	 * Allows a preprocessor to set backrace data on an Orgy object.
	 * @param  {string} str filename:line number
	 * @return {object} deferred/queue
	 */
	_public._btrc = function(str){
		this.backtrace = str;
		return this;
	};


	/**
	* Creates a new deferred object or if one exists by the same id,
	* returns it.

	<b>Usage:</b>
	```
	var Orgy = require("orgy"),
	q = Orgy.deferred({
	id : "q1"
	});
	```

	* @memberof orgy
	* @function deferred
	*
	* @param {object} options List of options:
	*
	*  - <b>id</b> {string} Unique id of the object.
	*		- Can be used with Orgy.get(id).
	*		- Optional.
	*
	*
	*  - <b>timeout</b> {number} Time in ms after which reject is called if not yet resolved.
	- Defaults to Orgy.config().timeout.
	- Delays in object.then() and object.done() won't not trigger this, because those methods run after resolve.
	*
	* @returns {object} {@link orgy/deferred}
	*/
	Cls.public.deferred = function(options){

		var _o;
		options = options || {};

		if(options.id && Cls.private.config.list[options.id]){
			_o = Cls.private.config.list[options.id];
		}
		else{

			//Create a new deferred object
			_o = Cls.private.config.naive_cloner([_public],[options]);

			//ACTIVATE DEFERRED
			_o = _private.activate(_o);
		}

		return _o;
	};

	_private.public = _public;

	//Save for re-use
	Cls.private.deferred = _private; 

	return Cls;
}

},{}],6:[function(require,module,exports){
module.exports = function(Cls){

	var _public = {},
			_private = {};

	_public.browser = {};
	_public.native = {};
	_private.native = {};

	//Browser load

	_public.browser.css = function(path,deferred){

		var head =	document.getElementsByTagName("head")[0] || document.documentElement,
		elem = document.createElement("link");

		elem.setAttribute("href",path);
		elem.setAttribute("type","text/css");
		elem.setAttribute("rel","stylesheet");

		if(elem.onload){
			(function(elem){
					elem.onload = elem.onreadystatechange = function(path,deferred){
						deferred.resolve(elem);
				 };

				 elem.onerror = function(path,deferred){
						deferred.reject("Failed to load path: " + path);
				 };

			}(elem,path,deferred));

			head.appendChild(elem);
		}
		else{
			//ADD elem BUT MAKE XHR REQUEST TO CHECK FILE RECEIVED
			head.appendChild(elem);
			console.warn("No onload available for link tag, autoresolving.");
			deferred.resolve(elem);
		}
	};

	_public.browser.script = function(path,deferred){

		var elem = document.createElement("script");
		elem.type = 'text/javascript';
		elem.setAttribute("src",path);

		(function(elem,path,deferred){
				elem.onload = elem.onreadystatechange = function(){
					//Autoresolve by default
					if(typeof deferred.autoresolve !== 'boolean'
					|| deferred.autoresolve === true){
						deferred.resolve((typeof elem.value !== 'undefined') ? elem.value : elem);
					}
				};
				elem.onerror = function(){
					deferred.reject("Error loading: " + path);
				};
		}(elem,path,deferred));

		this.head.appendChild(elem);
	};

	_public.browser.html = function(path,deferred,dep){
		this.default(path,deferred,dep);
	};

	_public.browser.default = function(path,deferred,options){
		var r,
		req = new XMLHttpRequest();
		req.open('GET', path, true);

		(function(path,deferred){
			req.onreadystatechange = function() {
				if (req.readyState === 4) {
					if(req.status === 200){
						r = req.responseText;
						if(options.type && options.type === 'json'){
							try{
								r = JSON.parse(r);
							}
							catch(e){
								_public.debug([
									"Could not decode JSON"
									,path
									,r
								],deferred);
							}
						}
						deferred.resolve(r);
					}
					else{
						deferred.reject("Error loading: " + path);
					}
				}
			};
		}(path,deferred));

		req.send(null);
	};



	//Native load

	_public.native.css = function(path,deferred){
		_public.browser.css(path,deferred);
	};

	_public.native.script = function(path,deferred){
		//local package
		if(path[0]==='.'){
			path = _private.native.prepare_path(path,deferred);
			var r = require(path);
			//Autoresolve by default
			if(typeof deferred.autoresolve !== 'boolean'
			|| deferred.autoresolve === true){
				deferred.resolve(r);
			}
		}
		//remote script
		else{
			//Check that we have configured the environment to allow this,
			//as it represents a security threat and should only be used for debugging
			if(!Cls.private.config.settings.debug_mode){
				Cls.private.config.debug("Set config.debug_mode=1 to run remote scripts outside of debug mode.");
			}
			else{
				_private.native.get(path,deferred,function(data){
					var Vm = require('vm');
					r = Vm.runInThisContext(data);
					deferred.resolve(r);
				});
			}
		}
	};

	_public.native.html = function(path,deferred){
		_public.native.default(path,deferred);
	};

	_public.native.default = function(path,deferred){
		(function(deferred){
			_private.native.get(path,deferred,function(r){
				if(deferred.type === 'json'){
					r = JSON.parse(r);
				}
				deferred.resolve(r);
			});
		})(deferred);
	};

	_private.native.get = function (path,deferred,callback){
		path = _private.native.prepare_path(path);
		if(path[0] === '.'){
			//file system
			var Fs = require('fs');
			Fs.readFile(path, "utf-8", function (err, data) {
				if (err){
					throw err;
				}
				else{
					callback(data);
				}
			});
		}
		else{
			//http
			var request = require('request');
			request(path,function(error,response,body){
				if (!error && response.statusCode === 200) {
					callback(body);
				}
				else{
					throw error;
				}
			});
		}
	};

	_private.native.prepare_path = function(p){
		p = (p[0] !== '/' && p[0] !== '.')
		? ((p[0].indexOf("http")!==0) ? './' + p : p) : p;
		return p;
	};

	Cls.public.file_loader = _public;

	Cls.private.file_loader = _private;

	return Cls;
}

},{"fs":1,"request":1,"vm":1}],7:[function(require,module,exports){
module.exports = function(Cls){


	/**
	 * @namespace orgy/queue
	 * @borrows orgy/deferred#then as #then
	 * @borrows orgy/deferred#done as #done
	 * @borrows orgy/deferred#reject as #reject
	 * @borrows orgy/deferred#resolve as #resolve
	 *
	*/

	var _private = {};

	/**
	 * Activates a queue object.
	 *
	 * @param {object} o
	 * @param {object} options
	 * @param {array} deps
	 * @returns {object} queue
	 */
	_private.activate = function(o,options,deps){

			//ACTIVATE AS A DEFERRED
			//var proto = Object.getPrototypeOf(this);
			o = Cls.private.deferred.activate(o);

			//@todo rethink this
			//This timeout gives defined promises that are defined
			//further down the same script a chance to define themselves
			//and in case this queue is about to request them from a
			//remote source here.
			//This is important in the case of compiled js files that contain
			//multiple modules when depend on each other.

			//temporarily change state to prevent outside resolution
			o.state = -1;

			var self = this;

			setTimeout(function(){

				//Restore state
			o.state = 0;

				//ADD DEPENDENCIES TO QUEUE
				_public.add.call(o,deps);

				//SEE IF CAN BE IMMEDIATELY RESOLVED BY CHECKING UPSTREAM
				Cls.private.deferred.receive_signal(o,o.id);

				//ASSIGN THIS QUEUE UPSTREAM TO OTHER QUEUES
				if(o.assign){
						for(var a in o.assign){
								self.assign(o.assign[a],[o],true);
						}
				}
			},1);

			return o;
	};


	/**
	* Upgrades a promise object to a queue.
	*
	* @param {object} obj
	* @param {object} options
	* @param {array} deps \dependencies
	* @returns {object} queue object
	*/
	_private.upgrade = function(obj,options,deps){

			if(obj.settled !== 0 || (obj.model !== 'promise' && obj.model !== 'deferred')){
					return Cls.private.config.debug('Can only upgrade unsettled promise or deferred into a queue.');
			}

		 //GET A NEW QUEUE OBJECT AND MERGE IN
			var _o = Cls.private.config.naive_cloner([_public],[options]);

			for(var i in _o){
				 obj[i] = _o[i];
			}

			//delete _o;

			//CREATE NEW INSTANCE OF QUEUE
			obj = this.activate(obj,options,deps);

			//RETURN QUEUE OBJECT
			return obj;
	};




	var _public = {};
	
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
	//	QUEUE INSTANCE METHODS
	///////////////////////////////////////////////////

	/**
	* Add list of dependencies to a queue's upstream array.
	*
	* The queue will resolve once all the promises in its
	* upstream array are resolved.
	*
	* When _public.Cls.private.config.debug == 1, method will test each
	* dependency is not previously scheduled to resolve
	* downstream from the target, in which
	* case it would never resolve because its upstream depends on it.
	*
	* @param {array} arr	/array of dependencies to add
	* @returns {array} upstream
	*/
	_public.add = function(arr){

		try{
				if(arr.length === 0) {
					return this.upstream;
				}
		}
		catch(err){
				Cls.private.config.debug(err);
		}

		//IF NOT PENDING, DO NOT ALLOW TO ADD
		if(this.state !== 0){
				return Cls.private.config.debug([
					"Cannot add dependency list to queue id:'"+this.id
					+"'. Queue settled/in the process of being settled."
				],arr,this);
		}

		for(var a in arr){

				switch(true){

						//CHECK IF EXISTS
						case(typeof Cls.private.config.list[arr[a].id] === 'object'):
								arr[a] = Cls.private.config.list[arr[a].id];
								break;

						//IF NOT, ATTEMPT TO CONVERT IT TO AN ORGY PROMISE
						case(typeof arr[a] === 'object' && (!arr[a].is_orgy)):
								arr[a] = Cls.private.deferred.convert_to_promise(arr[a],{
									parent : this
								});
								break;

						//REF IS A PROMISE.
						case(typeof arr[a].then === 'function'):
								break;

						default:
								Cls.private.config.debug([
									"Object could not be converted to promise.",
									arr[a]
								]);
								continue;
				}

				//must check the target to see if the dependency exists in its downstream
				for(var b in this.downstream){
						if(b === arr[a].id){
								return Cls.private.config.debug([
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
				return Cls.private.config.debug("Cannot remove list from queue id:'"+this.id+"'. Queue settled/in the process of being settled.");
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
	* @returns {Cls.private.deferred.tpl|Boolean}
	*/
	_public.reset = function(options){

		if(this.settled !== 1 || this.state !== 1){
			return Cls.private.config.debug("Can only reset a queue settled without errors.");
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
		Cls.private.deferred.auto_timeout.call(this,options.timeout);

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
		Cls.private.deferred.receive_signal(this,this.id);
		return this.state;
	};


	/**
	 * Creates a new queue object.
	 * If no <b>resolver</b> option is set, resolved when all dependencies are resolved. Else, resolved when the deferred param passed to the resolver option
	 * is resolved.

	 * @memberof orgy
	 * @function queue
	 *
	 * @param {array} deps Array of dependencies that must be resolved before <b>resolver</b> option is called.
	 * @param {object} options	List of options:

	- <b>id</b> {string} Unique id of the object.
		- Can be used with Orgy.get(id).
		- Optional.


	- <b>timeout</b> {number} Time in ms after which reject is called.
		- Defaults to Orgy.config().timeout [5000].
		- Note the timeout is only affected by dependencies and/or the resolver callback.
		- Then,done delays will not flag a timeout because they are called after the instance is considered resolved.


	- <b>resolver</b> {function(<i>result</i>,<i>deferred</i>)} Callback function to execute after all dependencies have resolved.
		- <i>result</i> is an array of the queue's resolved dependency values.
		- <i>deferred</i> is the queue object.
		- The queue will only resolve when <i>deferred</i>.resolve() is called. If not, it will timeout to options.timeout || Orgy.config().timeout.

		* @returns {object} {@link orgy/queue}
	 *
	 */
	Cls.public.queue = function(deps,options){

		var _o;
		if(!(deps instanceof Array)){
			return Cls.private.config.debug("Queue dependencies must be an array.");
		}

		options = options || {};

		//DOES NOT ALREADY EXIST
		if(!Cls.private.config.list[options.id]){

			//Pass array of prototypes to queue factory
			_o = Cls.private.config.naive_cloner([Cls.private.deferred.public,_public],[options]);

			//Activate queue
			_o = _private.activate(_o,options,deps);

		}
		//ALREADY EXISTS
		else {

			_o = Cls.private.config.list[options.id];

			if(_o.model !== 'queue'){
			//MATCH FOUND BUT NOT A QUEUE, UPGRADE TO ONE

				options.overwritable = 1;

				_o = _private.upgrade(_o,options,deps);
			}
			else{

				//OVERWRITE ANY EXISTING OPTIONS
				options.forEach(function(value,key){
					_o[key] = value; 
				});

				//ADD ADDITIONAL DEPENDENCIES IF NOT RESOLVED
				if(deps.length > 0){
					_private.tpl.add.call(_o,deps);
				}

			}

			//RESUME RESOLUTION UNLESS SPECIFIED OTHERWISE
			_o.halt_resolution = (typeof options.halt_resolution !== 'undefined') ?
			options.halt_resolution : 0;
		}

		return _o;
	};

	//save for re-use
	Cls.private.queue = _private;
		
	return Cls;
};

},{}]},{},[])("/src/main.js")
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNyYy9tYWluLmpzIiwiLi4vLi4vLi4vdXNyL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIiwiLi4vLi4vLi4vdXNyL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjL2Nhc3QuanMiLCJzcmMvY29uZmlnLmpzIiwic3JjL2RlZmVycmVkLmpzIiwic3JjL2ZpbGVfbG9hZGVyLmpzIiwic3JjL3F1ZXVlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SkE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNwTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIENscyA9IE9iamVjdC5jcmVhdGUoe1xuXHRwcml2YXRlOnt9LFxuXHRwdWJsaWM6e31cbn0pO1xuXG5yZXF1aXJlKCcuL2NvbmZpZy5qcycpKENscyk7XG5yZXF1aXJlKCcuL2ZpbGVfbG9hZGVyLmpzJykoQ2xzKTtcbnJlcXVpcmUoJy4vZGVmZXJyZWQuanMnKShDbHMpO1xucmVxdWlyZSgnLi9xdWV1ZS5qcycpKENscyk7XG5yZXF1aXJlKCcuL2Nhc3QuanMnKShDbHMpO1xuXG4vKipcbiAqIEBuYW1lc3BhY2Ugb3JneVxuICovXG5cbi8qKlxuKiBDcmVhdGVzIGEgbmV3IGRlZmVycmVkIGZyb20gYSB2YWx1ZSBhbmQgYW4gaWQgYW5kIGF1dG9tYXRpY2FsbHlcbiogcmVzb2x2ZXMgaXQuXG4qXG4qIEBtZW1iZXJvZiBvcmd5XG4qIEBmdW5jdGlvbiBkZWZpbmVcbipcbiogQHBhcmFtIHtzdHJpbmd9IGlkIEEgdW5pcXVlIGlkIHlvdSBnaXZlIHRvIHRoZSBvYmplY3RcbiogQHBhcmFtIHttaXhlZH1cdGRhdGEgVGhlIHZhbHVlIHRoYXQgdGhlIG9iamVjdCBpcyBhc3NpZ25lZFxuKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuLSA8Yj5kZXBlbmRlbmNpZXM8L2I+IHthcnJheX1cbi0gPGI+cmVzb2x2ZXI8L2I+IHtmdW5jdGlvbig8aT5hc3NpZ25lZFZhbHVlPC9pPiw8aT5kZWZlcnJlZDwvaT59XG4qIEByZXR1cm5zIHtvYmplY3R9IHJlc29sdmVkIGRlZmVycmVkXG4qL1xuQ2xzLnB1YmxpYy5kZWZpbmUgPSBmdW5jdGlvbihpZCxkYXRhLG9wdGlvbnMpe1xuXG5cdFx0dmFyIGRlZjtcblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0XHRvcHRpb25zLmRlcGVuZGVuY2llcyA9IG9wdGlvbnMuZGVwZW5kZW5jaWVzIHx8IG51bGw7XG5cdFx0b3B0aW9ucy5yZXNvbHZlciA9IG9wdGlvbnMucmVzb2x2ZXIgfHwgbnVsbDtcblxuXHRcdC8vdGVzdCBmb3IgYSB2YWxpZCBpZFxuXHRcdGlmKHR5cGVvZiBpZCAhPT0gJ3N0cmluZycpe1xuXHRcdFx0Q2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFwiTXVzdCBzZXQgaWQgd2hlbiBkZWZpbmluZyBhbiBpbnN0YW5jZS5cIik7XG5cdFx0fVxuXG5cdFx0Ly9DaGVjayBubyBleGlzdGluZyBpbnN0YW5jZSBkZWZpbmVkIHdpdGggc2FtZSBpZFxuXHRcdGlmKENscy5wcml2YXRlLmNvbmZpZy5saXN0W2lkXSAmJiBDbHMucHJpdmF0ZS5jb25maWcubGlzdFtpZF0uc2V0dGxlZCA9PT0gMSl7XG5cdFx0XHRyZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFwiQ2FuJ3QgZGVmaW5lIFwiICsgaWQgKyBcIi4gQWxyZWFkeSByZXNvbHZlZC5cIik7XG5cdFx0fVxuXG5cdFx0b3B0aW9ucy5pZCA9IGlkO1xuXG5cdFx0aWYob3B0aW9ucy5kZXBlbmRlbmNpZXMgIT09IG51bGxcblx0XHRcdCYmIG9wdGlvbnMuZGVwZW5kZW5jaWVzIGluc3RhbmNlb2YgQXJyYXkpe1xuXHRcdFx0Ly9EZWZpbmUgYXMgYSBxdWV1ZSAtIGNhbid0IGF1dG9yZXNvbHZlIGJlY2F1c2Ugd2UgaGF2ZSBkZXBzXG5cdFx0XHR2YXIgZGVwcyA9IG9wdGlvbnMuZGVwZW5kZW5jaWVzO1xuXHRcdFx0ZGVsZXRlIG9wdGlvbnMuZGVwZW5kZW5jaWVzO1xuXHRcdFx0ZGVmID0gQ2xzLnB1YmxpYy5xdWV1ZShkZXBzLG9wdGlvbnMpO1xuXHRcdH1cblx0XHRlbHNle1xuXHRcdFx0Ly9EZWZpbmUgYXMgYSBkZWZlcnJlZFxuXHRcdFx0ZGVmID0gQ2xzLnB1YmxpYy5kZWZlcnJlZChvcHRpb25zKTtcblxuXHRcdFx0Ly9UcnkgdG8gaW1tZWRpYXRlbHkgc2V0dGxlIFtkZWZpbmVdXG5cdFx0XHRpZihvcHRpb25zLnJlc29sdmVyID09PSBudWxsXG5cdFx0XHRcdCYmICh0eXBlb2Ygb3B0aW9ucy5hdXRvcmVzb2x2ZSAhPT0gJ2Jvb2xlYW4nXG5cdFx0XHRcdHx8IG9wdGlvbnMuYXV0b3Jlc29sdmUgPT09IHRydWUpKXtcblx0XHRcdFx0Ly9wcmV2ZW50IGZ1dHVyZSBhdXRvcmVzb3ZlIGF0dGVtcHRzIFtpLmUuIGZyb20geGhyIHJlc3BvbnNlXVxuXHRcdFx0XHRkZWYuYXV0b3Jlc29sdmUgPSBmYWxzZTtcblx0XHRcdFx0ZGVmLnJlc29sdmUoZGF0YSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGRlZjtcbn07XG5cblxuLyoqXG4gKiBHZXRzIGFuIGV4aXNpdGluZyBkZWZlcnJlZCAvIHF1ZXVlIG9iamVjdCBmcm9tIGdsb2JhbCBzdG9yZS5cbiAqIFJldHVybnMgbnVsbCBpZiBub25lIGZvdW5kLlxuICpcbiAqIEBtZW1iZXJvZiBvcmd5XG4gKiBAZnVuY3Rpb24gZ2V0XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGlkIElkIG9mIGRlZmVycmVkIG9yIHF1ZXVlIG9iamVjdC5cbiAqIEByZXR1cm5zIHtvYmplY3R9IGRlZmVycmVkIHwgcXVldWUgfCBudWxsXG4gKi9cbkNscy5wdWJsaWMuZ2V0ID0gZnVuY3Rpb24oaWQpe1xuXHRpZihDbHMucHJpdmF0ZS5jb25maWcubGlzdFtpZF0pe1xuXHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcubGlzdFtpZF07XG5cdH1cblx0ZWxzZXtcblx0XHRyZXR1cm4gbnVsbDtcblx0fVxufTtcblxuXG4vKipcbiAqIEFkZC9yZW1vdmUgYW4gdXBzdHJlYW0gZGVwZW5kZW5jeSB0by9mcm9tIGEgcXVldWUuXG4gKlxuICogQ2FuIHVzZSBhIHF1ZXVlIGlkLCBldmVuIGZvciBhIHF1ZXVlIHRoYXQgaXMgeWV0IHRvIGJlIGNyZWF0ZWQuXG4gKlxuICogQG1lbWJlcm9mIG9yZ3lcbiAqIEBmdW5jdGlvbiBhc3NpZ25cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHRndCBDbHMucHVibGljLnF1ZXVlIGlkIC8gcXVldWUgb2JqZWN0XG4gKiBAcGFyYW0ge2FycmF5fSAgYXJyXHRBcnJheSBvZiBwcm9taXNlIGlkcyBvciBkZXBlbmRlbmN5IG9iamVjdHNcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gYWRkICBJZiB0cnVlIDxiPkFERDwvYj4gYXJyYXkgdG8gcXVldWUgZGVwZW5kZW5jaWVzLCBJZiBmYWxzZSA8Yj5SRU1PVkU8L2I+IGFycmF5IGZyb20gcXVldWUgZGVwZW5kZW5jaWVzXG4gKlxuICogQHJldHVybiB7b2JqZWN0fSBxdWV1ZVxuICovXG5DbHMucHVibGljLmFzc2lnbiA9IGZ1bmN0aW9uKHRndCxhcnIsYWRkKXtcblxuXHRcdGFkZCA9ICh0eXBlb2YgYWRkID09PSBcImJvb2xlYW5cIikgPyBhZGQgOiAxO1xuXG5cdFx0dmFyIGlkLHE7XG5cdFx0c3dpdGNoKHRydWUpe1xuXHRcdFx0XHRjYXNlKHR5cGVvZiB0Z3QgPT09ICdvYmplY3QnICYmIHR5cGVvZiB0Z3QudGhlbiA9PT0gJ2Z1bmN0aW9uJyk6XG5cdFx0XHRcdFx0XHRpZCA9IHRndC5pZDtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlKHR5cGVvZiB0Z3QgPT09ICdzdHJpbmcnKTpcblx0XHRcdFx0XHRcdGlkID0gdGd0O1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRyZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFwiQXNzaWduIHRhcmdldCBtdXN0IGJlIGEgcXVldWUgb2JqZWN0IG9yIHRoZSBpZCBvZiBhIHF1ZXVlLlwiLHRoaXMpO1xuXHRcdH1cblxuXHRcdC8vSUYgVEFSR0VUIEFMUkVBRFkgTElTVEVEXG5cdFx0aWYoQ2xzLnByaXZhdGUuY29uZmlnLmxpc3RbaWRdICYmIENscy5wcml2YXRlLmNvbmZpZy5saXN0W2lkXS5tb2RlbCA9PT0gJ3F1ZXVlJyl7XG5cdFx0XHRcdHEgPSBDbHMucHJpdmF0ZS5jb25maWcubGlzdFtpZF07XG5cblx0XHRcdFx0Ly89PiBBREQgVE8gUVVFVUUnUyBVUFNUUkVBTVxuXHRcdFx0XHRpZihhZGQpe1xuXHRcdFx0XHRcdFx0cS5hZGQoYXJyKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLz0+IFJFTU9WRSBGUk9NIFFVRVVFJ1MgVVBTVFJFQU1cblx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRcdHEucmVtb3ZlKGFycik7XG5cdFx0XHRcdH1cblx0XHR9XG5cdFx0Ly9DUkVBVEUgTkVXIFFVRVVFIEFORCBBREQgREVQRU5ERU5DSUVTXG5cdFx0ZWxzZSBpZihhZGQpe1xuXHRcdFx0XHRxID0gQ2xzLnB1YmxpYy5xdWV1ZShhcnIse1xuXHRcdFx0XHRcdFx0aWQgOiBpZFxuXHRcdFx0XHR9KTtcblx0XHR9XG5cdFx0Ly9FUlJPUjogQ0FOJ1QgUkVNT1ZFIEZST00gQSBRVUVVRSBUSEFUIERPRVMgTk9UIEVYSVNUXG5cdFx0ZWxzZXtcblx0XHRcdFx0cmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcIkNhbm5vdCByZW1vdmUgZGVwZW5kZW5jaWVzIGZyb20gYSBxdWV1ZSB0aGF0IGRvZXMgbm90IGV4aXN0LlwiLHRoaXMpO1xuXHRcdH1cblxuXHRcdHJldHVybiBxO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDbHMucHVibGljO1xuIixudWxsLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IHRydWU7XG4gICAgdmFyIGN1cnJlbnRRdWV1ZTtcbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgdmFyIGkgPSAtMTtcbiAgICAgICAgd2hpbGUgKCsraSA8IGxlbikge1xuICAgICAgICAgICAgY3VycmVudFF1ZXVlW2ldKCk7XG4gICAgICAgIH1cbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xufVxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICBxdWV1ZS5wdXNoKGZ1bik7XG4gICAgaWYgKCFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihDbHMpe1xuXG5cdC8qKlxuXHQgKiBDYXN0cyBhIHRoZW5hYmxlIG9iamVjdCBpbnRvIGFuIE9yZ3kgZGVmZXJyZWQgb2JqZWN0LlxuXHQgKlxuXHQgKiA+IFRvIHF1YWxpZnkgYXMgYSA8Yj50aGVuYWJsZTwvYj4sIHRoZSBvYmplY3QgdG8gYmUgY2FzdGVkIG11c3QgaGF2ZSB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG5cdCAqID5cblx0ICogPiAtIGlkXG5cdCAqID5cblx0ICogPiAtIHRoZW4oKVxuXHQgKiA+XG5cdCAqID4gLSBlcnJvcigpXG5cdCAqXG5cdCAqIEBtZW1iZXJvZiBvcmd5XG5cdCAqIEBmdW5jdGlvbiBjYXN0XG5cdCAqXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBvYmogQSB0aGVuYWJsZSB3aXRoIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczpcblx0ICpcdC0ge3N0cmluZ30gPGI+aWQ8L2I+XHRVbmlxdWUgaWQgb2YgdGhlIG9iamVjdC5cblx0ICpcblx0ICpcdC0ge2Z1bmN0aW9ufSA8Yj50aGVuPC9iPlxuXHQgKlxuXHQgKlx0LSB7ZnVuY3Rpb259IDxiPmVycm9yPC9iPlxuXHQgKlxuXHQgKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZFxuXHQgKi9cblx0Q2xzLnB1YmxpYy5jYXN0ID0gZnVuY3Rpb24ob2JqKXtcblxuXHRcdFx0dmFyIHJlcXVpcmVkID0gW1widGhlblwiLFwiZXJyb3JcIixcImlkXCJdO1xuXHRcdFx0Zm9yKHZhciBpIGluIHJlcXVpcmVkKXtcblx0XHRcdFx0aWYoIW9iai5oYXNPd25Qcm9wZXJ0eShyZXF1aXJlZFtpXSkpe1xuXHRcdFx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoXCJDYXN0IG1ldGhvZCBtaXNzaW5nIHByb3BlcnR5ICdcIiArIHJlcXVpcmVkW2ldICtcIidcIik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dmFyIG9wdGlvbnMgPSB7fTtcblx0XHRcdG9wdGlvbnMuaWQgPSBvYmouaWQ7XG5cblx0XHRcdC8vTWFrZSBzdXJlIGlkIGRvZXMgbm90IGNvbmZsaWN0IHdpdGggZXhpc3Rpbmdcblx0XHRcdGlmKENscy5wcml2YXRlLmNvbmZpZy5saXN0W29wdGlvbnMuaWRdKXtcblx0XHRcdFx0cmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcIklkIFwiK29wdGlvbnMuaWQrXCIgY29uZmxpY3RzIHdpdGggZXhpc3RpbmcgaWQuXCIpO1xuXHRcdFx0fVxuXG5cdFx0XHQvL0NyZWF0ZSBhIGRlZmVycmVkXG5cdFx0XHR2YXIgZGVmID0gQ2xzLnB1YmxpYy5kZWZlcnJlZChvcHRpb25zKTtcblxuXHRcdFx0Ly9DcmVhdGUgcmVzb2x2ZXJcblx0XHRcdHZhciByZXNvbHZlciA9IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdGRlZi5yZXNvbHZlLmNhbGwoZGVmLGFyZ3VtZW50c1swXSk7XG5cdFx0XHR9O1xuXG5cdFx0XHQvL1NldCBSZXNvbHZlclxuXHRcdFx0b2JqLnRoZW4ocmVzb2x2ZXIpO1xuXG5cdFx0XHQvL1JlamVjdCBkZWZlcnJlZCBvbiAuZXJyb3Jcblx0XHRcdHZhciBlcnIgPSBmdW5jdGlvbihlcnIpe1xuXHRcdFx0XHRkZWYucmVqZWN0KGVycik7XG5cdFx0XHR9O1xuXHRcdFx0b2JqLmVycm9yKGVycik7XG5cblx0XHRcdC8vUmV0dXJuIGRlZmVycmVkXG5cdFx0XHRyZXR1cm4gZGVmO1xuXHR9O1xuXG5cdHJldHVybiBDbHM7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKENscyl7XG5cblx0dmFyIF9wcml2YXRlID0ge307XG5cblxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cdC8vXHRfcHJpdmF0ZSBWQVJJQUJMRVNcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cblx0LyoqXG5cdCAqIEEgZGlyZWN0b3J5IG9mIGFsbCBwcm9taXNlcywgZGVmZXJyZWRzLCBhbmQgcXVldWVzLlxuXHQgKiBAdHlwZSBvYmplY3Rcblx0ICovXG5cdF9wcml2YXRlLmxpc3QgPSB7fTtcblxuXG5cdC8qKlxuXHQgKiBpdGVyYXRvciBmb3IgaWRzXG5cdCAqIEB0eXBlIGludGVnZXJcblx0ICovXG5cdF9wcml2YXRlLmkgPSAwO1xuXG5cblx0LyoqXG5cdCAqIENvbmZpZ3VyYXRpb24gdmFsdWVzLlxuXHQgKlxuXHQgKiBAdHlwZSBvYmplY3Rcblx0ICovXG5cdF9wcml2YXRlLnNldHRpbmdzID0ge1xuXG5cdFx0XHRkZWJ1Z19tb2RlIDogMVxuXHRcdFx0Ly9zZXQgdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3Rvcnkgb2YgdGhlIGNhbGxlZSBzY3JpcHQsXG5cdFx0XHQvL2JlY2F1c2Ugbm9kZSBoYXMgbm8gY29uc3RhbnQgZm9yIHRoaXNcblx0XHRcdCxjd2QgOiBmYWxzZVxuXHRcdFx0LG1vZGUgOiAoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRpZih0eXBlb2YgcHJvY2VzcyA9PT0gJ29iamVjdCcgJiYgcHJvY2VzcyArICcnID09PSAnW29iamVjdCBwcm9jZXNzXScpe1xuXHRcdFx0XHRcdFx0XHQvLyBpcyBub2RlXG5cdFx0XHRcdFx0XHRcdHJldHVybiBcIm5hdGl2ZVwiO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0XHQvLyBub3Qgbm9kZVxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gXCJicm93c2VyXCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0fSgpKVxuXHRcdFx0LyoqXG5cdFx0XHQgKiAtIG9uQWN0aXZhdGUgL3doZW4gZWFjaCBpbnN0YW5jZSBhY3RpdmF0ZWRcblx0XHRcdCAqIC0gb25TZXR0bGVcdFx0L3doZW4gZWFjaCBpbnN0YW5jZSBzZXR0bGVzXG5cdFx0XHQgKlxuXHRcdFx0ICogQHR5cGUgb2JqZWN0XG5cdFx0XHQgKi9cblx0XHRcdCxob29rcyA6IHtcblx0XHRcdH1cblx0XHRcdCx0aW1lb3V0IDogNTAwMCAvL2RlZmF1bHQgdGltZW91dFxuXHR9O1xuXG5cblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXHQvL1x0X3ByaXZhdGUgVkFSSUFCTEVTXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblx0Ly9cdF9wcml2YXRlIE1FVEhPRFNcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cblx0LyoqXG5cdCAqIE9wdGlvbnMgeW91IHdpc2ggdG8gcGFzcyB0byBzZXQgdGhlIGdsb2JhbCBjb25maWd1cmF0aW9uXG5cdCAqXG5cdCAqIEBtZW1iZXJvZiBvcmd5XG5cdCAqIEBmdW5jdGlvbiBjb25maWdcblx0ICpcblx0ICogQHBhcmFtIHtvYmplY3R9IG9iaiBMaXN0IG9mIG9wdGlvbnM6XG5cblx0XHQtIHtudW1iZXJ9IDxiPnRpbWVvdXQ8L2I+XG5cblx0XHQtIHtzdHJpbmd9IDxiPmN3ZDwvYj4gU2V0cyBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5LiBTZXJ2ZXIgc2lkZSBzY3JpcHRzIG9ubHkuXG5cblx0XHQtIHtib29sZWFufSA8Yj5kZWJ1Z19tb2RlPC9iPlxuXG5cdCAqIEByZXR1cm5zIHtvYmplY3R9IGNvbmZpZ3VyYXRpb24gc2V0dGluZ3Ncblx0ICovXG5cdENscy5wdWJsaWMuY29uZmlnID0gZnVuY3Rpb24ob2JqKXtcblxuXHRcdFx0aWYodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcpe1xuXHRcdFx0XHRcdGZvcih2YXIgaSBpbiBvYmope1xuXHRcdFx0XHRcdFx0X3ByaXZhdGUuc2V0dGluZ3NbaV0gPSBvYmpbaV07XG5cdFx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gX3ByaXZhdGUuc2V0dGluZ3M7XG5cdH07XG5cblxuXHQvKipcblx0ICogRGVidWdnaW5nIG1ldGhvZC5cblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd8YXJyYXl9IG1zZ1xuXHQgKiBAcGFyYW0ge29iamVjdH0gZGVmXG5cdCAqIEByZXR1cm5zIHtCb29sZWFufVxuXHQgKi9cblx0X3ByaXZhdGUuZGVidWcgPSBmdW5jdGlvbihtc2cpe1xuXG5cdFx0XHR2YXIgbXNncyA9IChtc2cgaW5zdGFuY2VvZiBBcnJheSkgPyBtc2cuam9pbihcIlxcblwiKSA6IFttc2ddO1xuXG5cdFx0XHR2YXIgZSA9IG5ldyBFcnJvcihtc2dzKTtcblx0XHRcdGNvbnNvbGUubG9nKGUuc3RhY2spO1xuXG5cdFx0XHRpZih0aGlzLnNldHRpbmdzLmRlYnVnX21vZGUpe1xuXHRcdFx0XHQvL3R1cm4gb2ZmIGRlYnVnX21vZGUgdG8gYXZvaWQgaGl0dGluZyBkZWJ1Z2dlclxuXHRcdFx0XHRkZWJ1Z2dlcjtcblx0XHRcdH1cblxuXHRcdFx0aWYoX3ByaXZhdGUuc2V0dGluZ3MubW9kZSA9PT0gJ2Jyb3dzZXInKXtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZXtcblx0XHRcdFx0cHJvY2Vzcy5leGl0KCk7XG5cdFx0XHR9XG5cdH07XG5cblxuXHQvKipcblx0ICogVGFrZSBhbiBhcnJheSBvZiBwcm90b3R5cGUgb2JqZWN0cyBhbmQgYW4gYXJyYXkgb2YgcHJvcGVydHkgb2JqZWN0cyxcblx0ICogbWVyZ2VzIGVhY2gsIGFuZCByZXR1cm5zIGEgc2hhbGxvdyBjb3B5LlxuXHQgKlxuXHQgKiBAcGFyYW0ge2FycmF5fSBwcm90b09iakFyciBBcnJheSBvZiBwcm90b3R5cGUgb2JqZWN0cyB3aGljaCBhcmUgb3ZlcndyaXR0ZW4gZnJvbSByaWdodCB0byBsZWZ0XG5cdCAqIEBwYXJhbSB7YXJyYXl9IHByb3BzT2JqQXJyIEFycmF5IG9mIGRlc2lyZWQgcHJvcGVydHkgb2JqZWN0cyB3aGljaCBhcmUgb3ZlcndyaXR0ZW4gZnJvbSByaWdodCB0byBsZWZ0XG5cdCAqIEByZXR1cm5zIHtvYmplY3R9IG9iamVjdFxuXHQgKi9cblx0X3ByaXZhdGUubmFpdmVfY2xvbmVyID0gZnVuY3Rpb24ocHJvdG9PYmpBcnIscHJvcHNPYmpBcnIpe1xuXG5cdFx0XHRmdW5jdGlvbiBtZXJnZShkb25vcnMpe1xuXHRcdFx0XHR2YXIgbyA9IHt9O1xuXHRcdFx0XHRmb3IodmFyIGEgaW4gZG9ub3JzKXtcblx0XHRcdFx0XHRcdGZvcih2YXIgYiBpbiBkb25vcnNbYV0pe1xuXHRcdFx0XHRcdFx0XHRcdGlmKGRvbm9yc1thXVtiXSBpbnN0YW5jZW9mIEFycmF5KXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0b1tiXSA9IGRvbm9yc1thXVtiXS5zbGljZSgwKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0ZWxzZSBpZih0eXBlb2YgZG9ub3JzW2FdW2JdID09PSAnb2JqZWN0Jyl7XG5cdFx0XHRcdFx0XHRcdFx0XHR0cnl7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdG9bYl0gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGRvbm9yc1thXVtiXSkpO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0Y2F0Y2goZSl7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGRlYnVnZ2VyO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRvW2JdID0gZG9ub3JzW2FdW2JdO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gbztcblx0XHRcdH1cblxuXHRcdFx0dmFyIHByb3RvID0gbWVyZ2UocHJvdG9PYmpBcnIpLFxuXHRcdFx0XHRcdHByb3BzID0gbWVyZ2UocHJvcHNPYmpBcnIpO1xuXG5cdFx0XHQvL0B0b2RvIGNvbnNpZGVyIG1hbnVhbGx5IHNldHRpbmcgdGhlIHByb3RvdHlwZSBpbnN0ZWFkXG5cdFx0XHR2YXIgZmluYWxPYmplY3QgPSBPYmplY3QuY3JlYXRlKHByb3RvKTtcblx0XHRcdGZvcih2YXIgaSBpbiBwcm9wcyl7XG5cdFx0XHRcdGZpbmFsT2JqZWN0W2ldID0gcHJvcHNbaV07XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBmaW5hbE9iamVjdDtcblx0fTtcblxuXG5cdF9wcml2YXRlLmdlbmVyYXRlX2lkID0gZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCkgKyAnLScgKyAoKyt0aGlzLmkpO1xuXHR9O1xuXHRcblx0XG5cdC8vU2F2ZSBmb3IgcmUtdXNlXG5cdENscy5wcml2YXRlLmNvbmZpZyA9IF9wcml2YXRlO1xuXG5cdHJldHVybiBDbHM7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKENscyl7XG5cblx0LyoqXG5cdCogQG5hbWVzcGFjZSBvcmd5L2RlZmVycmVkXG5cdCovXG5cblx0XG5cdHZhciBfcHJpdmF0ZSA9IHt9O1xuXG5cblx0X3ByaXZhdGUuYWN0aXZhdGUgPSBmdW5jdGlvbihvYmope1xuXG5cdFx0XHQgLy9pZiBubyBpZCwgZ2VuZXJhdGUgb25lXG5cdFx0XHRpZighb2JqLmlkKXtcblx0XHRcdFx0b2JqLmlkID0gQ2xzLnByaXZhdGUuY29uZmlnLmdlbmVyYXRlX2lkKCk7XG5cdFx0XHR9XG5cblx0XHRcdC8vTUFLRSBTVVJFIE5BTUlORyBDT05GTElDVCBET0VTIE5PVCBFWElTVFxuXHRcdFx0aWYoQ2xzLnByaXZhdGUuY29uZmlnLmxpc3Rbb2JqLmlkXSAmJiAhQ2xzLnByaXZhdGUuY29uZmlnLmxpc3Rbb2JqLmlkXS5vdmVyd3JpdGFibGUpe1xuXHRcdFx0XHRcdENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcIlRyaWVkIGlsbGVnYWwgb3ZlcndyaXRlIG9mIFwiK29iai5pZCtcIi5cIik7XG5cdFx0XHRcdFx0cmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5saXN0W29iai5pZF07XG5cdFx0XHR9XG5cblx0XHRcdC8vU0FWRSBUTyBNQVNURVIgTElTVFxuXHRcdFx0Ly9AdG9kbyBvbmx5IHNhdmUgaWYgd2FzIGFzc2lnbmVkIGFuIGlkLFxuXHRcdFx0Ly93aGljaCBpbXBsaWVzIHVzZXIgaW50ZW5kcyB0byBhY2Nlc3Mgc29tZXdoZXJlIGVsc2Ugb3V0c2lkZSBvZiBzY29wZVxuXHRcdFx0Q2xzLnByaXZhdGUuY29uZmlnLmxpc3Rbb2JqLmlkXSA9IG9iajtcblxuXHRcdFx0Ly9BVVRPIFRJTUVPVVRcblx0XHRcdF9wcml2YXRlLmF1dG9fdGltZW91dC5jYWxsKG9iaik7XG5cblx0XHRcdC8vQ2FsbCBob29rXG5cdFx0XHRpZihDbHMucHJpdmF0ZS5jb25maWcuc2V0dGluZ3MuaG9va3Mub25BY3RpdmF0ZSl7XG5cdFx0XHRcdENscy5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy5ob29rcy5vbkFjdGl2YXRlKG9iaik7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBvYmo7XG5cdH07XG5cblxuXHRfcHJpdmF0ZS5zZXR0bGUgPSBmdW5jdGlvbihkZWYpe1xuXG5cdFx0XHQvL1JFTU9WRSBBVVRPIFRJTUVPVVQgVElNRVJcblx0XHRcdGlmKGRlZi50aW1lb3V0X2lkKXtcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KGRlZi50aW1lb3V0X2lkKTtcblx0XHRcdH1cblxuXHRcdFx0Ly9TZXQgc3RhdGUgdG8gcmVzb2x2ZWRcblx0XHRcdF9wcml2YXRlLnNldF9zdGF0ZShkZWYsMSk7XG5cblx0XHRcdC8vQ2FsbCBob29rXG5cdFx0XHRpZihDbHMucHJpdmF0ZS5jb25maWcuc2V0dGluZ3MuaG9va3Mub25TZXR0bGUpe1xuXHRcdFx0XHRDbHMucHJpdmF0ZS5jb25maWcuc2V0dGluZ3MuaG9va3Mub25TZXR0bGUoZGVmKTtcblx0XHRcdH1cblxuXHRcdFx0Ly9BZGQgZG9uZSBhcyBhIGNhbGxiYWNrIHRvIHRoZW4gY2hhaW4gY29tcGxldGlvbi5cblx0XHRcdGRlZi5jYWxsYmFja3MudGhlbi5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnB1c2goZnVuY3Rpb24oZDIsaXRpbmVyYXJ5LGxhc3Qpe1xuXHRcdFx0XHRcdGRlZi5jYWJvb3NlID0gbGFzdDtcblxuXHRcdFx0XHRcdC8vUnVuIGRvbmVcblx0XHRcdFx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oXG5cdFx0XHRcdFx0XHRcdGRlZlxuXHRcdFx0XHRcdFx0XHQsZGVmLmNhbGxiYWNrcy5kb25lXG5cdFx0XHRcdFx0XHRcdCxkZWYuY2Fib29zZVxuXHRcdFx0XHRcdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG5cdFx0XHRcdFx0KTtcblx0XHRcdH0pO1xuXG5cdFx0XHQvL1J1biB0aGVuIHF1ZXVlXG5cdFx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oXG5cdFx0XHRcdFx0ZGVmXG5cdFx0XHRcdFx0LGRlZi5jYWxsYmFja3MudGhlblxuXHRcdFx0XHRcdCxkZWYudmFsdWVcblx0XHRcdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogdHJ1ZX1cblx0XHRcdCk7XG5cblx0XHRcdHJldHVybiBkZWY7XG5cdH07XG5cblxuXHQvKipcblx0ICogUnVucyBhbiBhcnJheSBvZiBmdW5jdGlvbnMgc2VxdWVudGlhbGx5IGFzIGEgcGFydGlhbCBmdW5jdGlvbi5cblx0ICogRWFjaCBmdW5jdGlvbidzIGFyZ3VtZW50IGlzIHRoZSByZXN1bHQgb2YgaXRzIHByZWRlY2Vzc29yIGZ1bmN0aW9uLlxuXHQgKlxuXHQgKiBCeSBkZWZhdWx0LCBleGVjdXRpb24gY2hhaW4gaXMgcGF1c2VkIHdoZW4gYW55IGZ1bmN0aW9uXG5cdCAqIHJldHVybnMgYW4gdW5yZXNvbHZlZCBkZWZlcnJlZC4gKHBhdXNlX29uX2RlZmVycmVkKSBbT1BUSU9OQUxdXG5cdCAqXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBkZWZcdC9kZWZlcnJlZCBvYmplY3Rcblx0ICogQHBhcmFtIHtvYmplY3R9IG9ialx0L2l0aW5lcmFyeVxuXHQgKlx0XHRcdHRyYWluXHRcdFx0XHR7YXJyYXl9XG5cdCAqXHRcdFx0aG9va3NcdFx0XHRcdHtvYmplY3R9XG5cdCAqXHRcdFx0XHRcdG9uQmVmb3JlXHRcdFx0XHR7YXJyYXl9XG5cdCAqXHRcdFx0XHRcdG9uQ29tcGxldGVcdFx0XHR7YXJyYXl9XG5cdCAqIEBwYXJhbSB7bWl4ZWR9IHBhcmFtIC9wYXJhbSB0byBwYXNzIHRvIGZpcnN0IGNhbGxiYWNrXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG5cdCAqXHRcdFx0cGF1c2Vfb25fZGVmZXJyZWRcdFx0e2Jvb2xlYW59XG5cdCAqXG5cdCAqIEByZXR1cm5zIHt2b2lkfVxuXHQgKi9cblx0X3ByaXZhdGUucnVuX3RyYWluID0gZnVuY3Rpb24oZGVmLG9iaixwYXJhbSxvcHRpb25zKXtcblxuXHRcdFx0Ly9hbGxvdyBwcmV2aW91cyByZXR1cm4gdmFsdWVzIHRvIGJlIHBhc3NlZCBkb3duIGNoYWluXG5cdFx0XHR2YXIgciA9IHBhcmFtIHx8IGRlZi5jYWJvb3NlIHx8IGRlZi52YWx1ZTtcblxuXHRcdFx0Ly9vbkJlZm9yZSBldmVudFxuXHRcdFx0aWYob2JqLmhvb2tzICYmIG9iai5ob29rcy5vbkJlZm9yZS50cmFpbi5sZW5ndGggPiAwKXtcblx0XHRcdFx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oXG5cdFx0XHRcdFx0XHRcdGRlZlxuXHRcdFx0XHRcdFx0XHQsb2JqLmhvb2tzLm9uQmVmb3JlXG5cdFx0XHRcdFx0XHRcdCxwYXJhbVxuXHRcdFx0XHRcdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG5cdFx0XHRcdFx0KTtcblx0XHRcdH1cblxuXHRcdFx0d2hpbGUob2JqLnRyYWluLmxlbmd0aCA+IDApe1xuXG5cdFx0XHRcdFx0Ly9yZW1vdmUgZm4gdG8gZXhlY3V0ZVxuXHRcdFx0XHRcdHZhciBsYXN0ID0gb2JqLnRyYWluLnNoaWZ0KCk7XG5cdFx0XHRcdFx0ZGVmLmV4ZWN1dGlvbl9oaXN0b3J5LnB1c2gobGFzdCk7XG5cblx0XHRcdFx0XHQvL2RlZi5jYWJvb3NlIG5lZWRlZCBmb3IgdGhlbiBjaGFpbiBkZWNsYXJlZCBhZnRlciByZXNvbHZlZCBpbnN0YW5jZVxuXHRcdFx0XHRcdHIgPSBkZWYuY2Fib29zZSA9IGxhc3QuY2FsbChkZWYsZGVmLnZhbHVlLGRlZixyKTtcblxuXHRcdFx0XHRcdC8vaWYgcmVzdWx0IGlzIGFuIHRoZW5hYmxlLCBoYWx0IGV4ZWN1dGlvblxuXHRcdFx0XHRcdC8vYW5kIHJ1biB1bmZpcmVkIGFyciB3aGVuIHRoZW5hYmxlIHNldHRsZXNcblx0XHRcdFx0XHRpZihvcHRpb25zLnBhdXNlX29uX2RlZmVycmVkKXtcblxuXHRcdFx0XHRcdFx0XHQvL0lmIHIgaXMgYW4gdW5zZXR0bGVkIHRoZW5hYmxlXG5cdFx0XHRcdFx0XHRcdGlmKHIgJiYgci50aGVuICYmIHIuc2V0dGxlZCAhPT0gMSl7XG5cblx0XHRcdFx0XHRcdFx0XHRcdC8vZXhlY3V0ZSByZXN0IG9mIHRoaXMgdHJhaW4gYWZ0ZXIgciByZXNvbHZlc1xuXHRcdFx0XHRcdFx0XHRcdFx0ci5jYWxsYmFja3MucmVzb2x2ZS5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnB1c2goZnVuY3Rpb24oKXtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdF9wcml2YXRlLnJ1bl90cmFpbihcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCxvYmpcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0LHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHQvL3Rlcm1pbmF0ZSBleGVjdXRpb25cblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdC8vSWYgaXMgYW4gYXJyYXkgdGhhbiBjb250YWlucyBhbiB1bnNldHRsZWQgdGhlbmFibGVcblx0XHRcdFx0XHRcdFx0ZWxzZSBpZihyIGluc3RhbmNlb2YgQXJyYXkpe1xuXG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgdGhlbmFibGVzID0gW107XG5cblx0XHRcdFx0XHRcdFx0XHRcdGZvcih2YXIgaSBpbiByKXtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmKHJbaV0udGhlbiAmJiByW2ldLnNldHRsZWQgIT09IDEpe1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRoZW5hYmxlcy5wdXNoKHJbaV0pO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHZhciBmbiA9IChmdW5jdGlvbih0LGRlZixvYmoscGFyYW0pe1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24oKXtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vQmFpbCBpZiBhbnkgdGhlbmFibGVzIHVuc2V0dGxlZFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGZvcih2YXIgaSBpbiB0KXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYodFtpXS5zZXR0bGVkICE9PSAxKXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdF9wcml2YXRlLnJ1bl90cmFpbihcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCxvYmpcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0LHBhcmFtXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiB0cnVlfVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0pKHRoZW5hYmxlcyxkZWYsb2JqLHBhcmFtKTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvL2V4ZWN1dGUgcmVzdCBvZiB0aGlzIHRyYWluIGFmdGVyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vYWxsIHRoZW5hYmxlcyBmb3VuZCBpbiByIHJlc29sdmVcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cltpXS5jYWxsYmFja3MucmVzb2x2ZS5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnB1c2goZm4pO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vdGVybWluYXRlIGV4ZWN1dGlvblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvL29uQ29tcGxldGUgZXZlbnRcblx0XHRcdGlmKG9iai5ob29rcyAmJiBvYmouaG9va3Mub25Db21wbGV0ZS50cmFpbi5sZW5ndGggPiAwKXtcblx0XHRcdFx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oZGVmLG9iai5ob29rcy5vbkNvbXBsZXRlLHIse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9KTtcblx0XHRcdH1cblx0fTtcblxuXG5cdC8qKlxuXHQgKiBTZXRzIHRoZSBzdGF0ZSBvZiBhbiBPcmd5IG9iamVjdC5cblx0ICpcblx0ICogQHBhcmFtIHtvYmplY3R9IGRlZlxuXHQgKiBAcGFyYW0ge251bWJlcn0gaW50XG5cdCAqIEByZXR1cm5zIHt2b2lkfVxuXHQgKi9cblx0X3ByaXZhdGUuc2V0X3N0YXRlID0gZnVuY3Rpb24oZGVmLGludCl7XG5cblx0XHRcdGRlZi5zdGF0ZSA9IGludDtcblxuXHRcdFx0Ly9JRiBSRVNPTFZFRCBPUiBSRUpFQ1RFRCwgU0VUVExFXG5cdFx0XHRpZihpbnQgPT09IDEgfHwgaW50ID09PSAyKXtcblx0XHRcdFx0XHRkZWYuc2V0dGxlZCA9IDE7XG5cdFx0XHR9XG5cblx0XHRcdGlmKGludCA9PT0gMSB8fCBpbnQgPT09IDIpe1xuXHRcdFx0XHRcdF9wcml2YXRlLnNpZ25hbF9kb3duc3RyZWFtKGRlZik7XG5cdFx0XHR9XG5cdH07XG5cblxuXHQvKipcblx0ICogR2V0cyB0aGUgc3RhdGUgb2YgYW4gT3JneSBvYmplY3Rcblx0ICpcblx0ICogQHBhcmFtIHtvYmplY3R9IGRlZlxuXHQgKiBAcmV0dXJucyB7bnVtYmVyfVxuXHQgKi9cblx0X3ByaXZhdGUuZ2V0X3N0YXRlID0gZnVuY3Rpb24oZGVmKXtcblx0XHRcdHJldHVybiBkZWYuc3RhdGU7XG5cdH07XG5cblxuXHQvKipcblx0ICogU2V0cyB0aGUgYXV0b21hdGljIHRpbWVvdXQgb24gYSBwcm9taXNlIG9iamVjdC5cblx0ICpcblx0ICogQHJldHVybnMge0Jvb2xlYW59XG5cdCAqL1xuXHRfcHJpdmF0ZS5hdXRvX3RpbWVvdXQgPSBmdW5jdGlvbigpe1xuXG5cdFx0XHR0aGlzLnRpbWVvdXQgPSAodHlwZW9mIHRoaXMudGltZW91dCAhPT0gJ3VuZGVmaW5lZCcpXG5cdFx0XHQ/IHRoaXMudGltZW91dCA6IENscy5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy50aW1lb3V0O1xuXG5cdFx0XHQvL0FVVE8gUkVKRUNUIE9OIHRpbWVvdXRcblx0XHRcdGlmKCF0aGlzLnR5cGUgfHwgdGhpcy50eXBlICE9PSAndGltZXInKXtcblxuXHRcdFx0XHRcdC8vREVMRVRFIFBSRVZJT1VTIFRJTUVPVVQgSUYgRVhJU1RTXG5cdFx0XHRcdFx0aWYodGhpcy50aW1lb3V0X2lkKXtcblx0XHRcdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMudGltZW91dF9pZCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmKHR5cGVvZiB0aGlzLnRpbWVvdXQgPT09ICd1bmRlZmluZWQnKXtcblx0XHRcdFx0XHRcdFx0Q2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFtcblx0XHRcdFx0XHRcdFx0XHRcIkF1dG8gdGltZW91dCB0aGlzLnRpbWVvdXQgY2Fubm90IGJlIHVuZGVmaW5lZC5cIlxuXHRcdFx0XHRcdFx0XHRcdCx0aGlzLmlkXG5cdFx0XHRcdFx0XHRcdF0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIGlmICh0aGlzLnRpbWVvdXQgPT09IC0xKXtcblx0XHRcdFx0XHRcdFx0Ly9OTyBBVVRPIFRJTUVPVVQgU0VUXG5cdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dmFyIHNjb3BlID0gdGhpcztcblxuXHRcdFx0XHRcdHRoaXMudGltZW91dF9pZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0X3ByaXZhdGUuYXV0b190aW1lb3V0X2NiLmNhbGwoc2NvcGUpO1xuXHRcdFx0XHRcdH0sIHRoaXMudGltZW91dCk7XG5cblx0XHRcdH1cblx0XHRcdC8vZWxzZXtcblx0XHRcdFx0XHQvL0B0b2RvIFdIRU4gQSBUSU1FUiwgQUREIERVUkFUSU9OIFRPIEFMTCBVUFNUUkVBTSBBTkQgTEFURVJBTD9cblx0XHRcdC8vfVxuXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBDYWxsYmFjayBmb3IgYXV0b3RpbWVvdXQuIERlY2xhcmF0aW9uIGhlcmUgYXZvaWRzIG1lbW9yeSBsZWFrLlxuXHQgKlxuXHQgKiBAcmV0dXJucyB7dm9pZH1cblx0ICovXG5cdF9wcml2YXRlLmF1dG9fdGltZW91dF9jYiA9IGZ1bmN0aW9uKCl7XG5cblx0XHRcdGlmKHRoaXMuc3RhdGUgIT09IDEpe1xuXG5cdFx0XHRcdFx0Ly9HRVQgVEhFIFVQU1RSRUFNIEVSUk9SIElEXG5cdFx0XHRcdFx0dmFyIG1zZ3MgPSBbXTtcblx0XHRcdFx0XHR2YXIgc2NvcGUgPSB0aGlzO1xuXG5cdFx0XHRcdFx0dmFyIGZuID0gZnVuY3Rpb24ob2JqKXtcblx0XHRcdFx0XHRcdFx0aWYob2JqLnN0YXRlICE9PSAxKXtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBvYmouaWQ7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHQvKipcblx0XHRcdFx0XHQgKiBSdW4gb3ZlciBhIGdpdmVuIG9iamVjdCBwcm9wZXJ0eSByZWN1cnNpdmVseSxcblx0XHRcdFx0XHQgKiBhcHBseWluZyBjYWxsYmFjayB1bnRpbFxuXHRcdFx0XHRcdCAqIGNhbGxiYWNrIHJldHVybnMgYSBub24tZmFsc2UgdmFsdWUuXG5cdFx0XHRcdFx0ICovXG5cdFx0XHRcdFx0aWYoQ2xzLnByaXZhdGUuY29uZmlnLnNldHRpbmdzLmRlYnVnX21vZGUpe1xuXHRcdFx0XHRcdFx0XHR2YXIgciA9IF9wcml2YXRlLnNlYXJjaF9vYmpfcmVjdXJzaXZlbHkodGhpcywndXBzdHJlYW0nLGZuKTtcblx0XHRcdFx0XHRcdFx0bXNncy5wdXNoKHNjb3BlLmlkICsgXCI6IHJlamVjdGVkIGJ5IGF1dG8gdGltZW91dCBhZnRlciBcIlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCsgdGhpcy50aW1lb3V0ICsgXCJtc1wiKTtcblx0XHRcdFx0XHRcdFx0bXNncy5wdXNoKFwiQ2F1c2U6XCIpO1xuXHRcdFx0XHRcdFx0XHRtc2dzLnB1c2gocik7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aGlzLnJlamVjdC5jYWxsKHRoaXMsbXNncyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aGlzLnJlamVjdC5jYWxsKHRoaXMpO1xuXHRcdFx0XHRcdH1cblx0XHRcdH1cblx0fTtcblxuXG5cdF9wcml2YXRlLmVycm9yID0gZnVuY3Rpb24oY2Ipe1xuXG5cdFx0XHQvL0lGIEVSUk9SIEFMUkVBRFkgVEhST1dOLCBFWEVDVVRFIENCIElNTUVESUFURUxZXG5cdFx0XHRpZih0aGlzLnN0YXRlID09PSAyKXtcblx0XHRcdFx0XHRjYigpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZXtcblx0XHRcdFx0XHR0aGlzLnJlamVjdF9xLnB1c2goY2IpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBTaWduYWxzIGFsbCBkb3duc3RyZWFtIHByb21pc2VzIHRoYXQgX3ByaXZhdGUgcHJvbWlzZSBvYmplY3Qnc1xuXHQgKiBzdGF0ZSBoYXMgY2hhbmdlZC5cblx0ICpcblx0ICogQHRvZG8gU2luY2UgdGhlIHNhbWUgcXVldWUgbWF5IGhhdmUgYmVlbiBhc3NpZ25lZCB0d2ljZSBkaXJlY3RseSBvclxuXHQgKiBpbmRpcmVjdGx5IHZpYSBzaGFyZWQgZGVwZW5kZW5jaWVzLCBtYWtlIHN1cmUgbm90IHRvIGRvdWJsZSByZXNvbHZlXG5cdCAqIC0gd2hpY2ggdGhyb3dzIGFuIGVycm9yLlxuXHQgKlxuXHQgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0IGRlZmVycmVkL3F1ZXVlXG5cdCAqIEByZXR1cm5zIHt2b2lkfVxuXHQgKi9cblx0X3ByaXZhdGUuc2lnbmFsX2Rvd25zdHJlYW0gPSBmdW5jdGlvbih0YXJnZXQpe1xuXG5cdFx0XHQvL01BS0UgU1VSRSBBTEwgRE9XTlNUUkVBTSBJUyBVTlNFVFRMRURcblx0XHRcdGZvcih2YXIgaSBpbiB0YXJnZXQuZG93bnN0cmVhbSl7XG5cdFx0XHRcdFx0aWYodGFyZ2V0LmRvd25zdHJlYW1baV0uc2V0dGxlZCA9PT0gMSl7XG5cblx0XHRcdFx0XHRcdGlmKHRhcmdldC5kb3duc3RyZWFtW2ldLnN0YXRlICE9PSAxKXtcblx0XHRcdFx0XHRcdFx0Ly90cmllZCB0byBzZXR0bGUgYSByZWplY3RlZCBkb3duc3RyZWFtXG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRcdFx0Ly90cmllZCB0byBzZXR0bGUgYSBzdWNjZXNzZnVsbHkgc2V0dGxlZCBkb3duc3RyZWFtXG5cdFx0XHRcdFx0XHRcdENscy5wcml2YXRlLmNvbmZpZy5kZWJ1Zyh0YXJnZXQuaWQgKyBcIiB0cmllZCB0byBzZXR0bGUgcHJvbWlzZSBcIitcIidcIit0YXJnZXQuZG93bnN0cmVhbVtpXS5pZCtcIicgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIHNldHRsZWQuXCIpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly9OT1cgVEhBVCBXRSBLTk9XIEFMTCBET1dOU1RSRUFNIElTIFVOU0VUVExFRCwgV0UgQ0FOIElHTk9SRSBBTllcblx0XHRcdC8vU0VUVExFRCBUSEFUIFJFU1VMVCBBUyBBIFNJREUgRUZGRUNUIFRPIEFOT1RIRVIgU0VUVExFTUVOVFxuXHRcdFx0Zm9yICh2YXIgaSBpbiB0YXJnZXQuZG93bnN0cmVhbSl7XG5cdFx0XHRcdFx0aWYodGFyZ2V0LmRvd25zdHJlYW1baV0uc2V0dGxlZCAhPT0gMSl7XG5cdFx0XHRcdFx0XHRcdF9wcml2YXRlLnJlY2VpdmVfc2lnbmFsKHRhcmdldC5kb3duc3RyZWFtW2ldLHRhcmdldC5pZCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0fVxuXHR9O1xuXG5cblx0LyoqXG5cdCogUnVuIG92ZXIgYSBnaXZlbiBvYmplY3QgcHJvcGVydHkgcmVjdXJzaXZlbHksIGFwcGx5aW5nIGNhbGxiYWNrIHVudGlsXG5cdCogY2FsbGJhY2sgcmV0dXJucyBhIG5vbi1mYWxzZSB2YWx1ZS5cblx0KlxuXHQqIEBwYXJhbSB7b2JqZWN0fSBvYmpcblx0KiBAcGFyYW0ge3N0cmluZ30gcHJvcE5hbWVcdFx0XHRcdFx0VGhlIHByb3BlcnR5IG5hbWUgb2YgdGhlIGFycmF5IHRvIGJ1YmJsZSB1cFxuXHQqIEBwYXJhbSB7ZnVuY3Rpb259IGZuXHRcdFx0XHRcdFx0XHRUaGUgdGVzdCBjYWxsYmFjayB0byBiZSBhcHBsaWVkIHRvIGVhY2ggb2JqZWN0XG5cdCogQHBhcmFtIHthcnJheX0gYnJlYWRjcnVtYlx0XHRcdFx0XHRUaGUgYnJlYWRjcnVtYiB0aHJvdWdoIHRoZSBjaGFpbiBvZiB0aGUgZmlyc3QgbWF0Y2hcblx0KiBAcmV0dXJucyB7bWl4ZWR9XG5cdCovXG5cdF9wcml2YXRlLnNlYXJjaF9vYmpfcmVjdXJzaXZlbHkgPSBmdW5jdGlvbihvYmoscHJvcE5hbWUsZm4sYnJlYWRjcnVtYil7XG5cblx0XHRcdGlmKHR5cGVvZiBicmVhZGNydW1iID09PSAndW5kZWZpbmVkJyl7XG5cdFx0XHRcdFx0YnJlYWRjcnVtYiA9IFtvYmouaWRdO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgcjE7XG5cblx0XHRcdGZvcih2YXIgaSBpbiBvYmpbcHJvcE5hbWVdKXtcblxuXHRcdFx0XHRcdC8vUlVOIFRFU1Rcblx0XHRcdFx0XHRyMSA9IGZuKG9ialtwcm9wTmFtZV1baV0pO1xuXG5cdFx0XHRcdFx0aWYocjEgIT09IGZhbHNlKXtcblx0XHRcdFx0XHQvL01BVENIIFJFVFVSTkVELiBSRUNVUlNFIElOVE8gTUFUQ0ggSUYgSEFTIFBST1BFUlRZIE9GIFNBTUUgTkFNRSBUTyBTRUFSQ0hcblx0XHRcdFx0XHRcdFx0Ly9DSEVDSyBUSEFUIFdFIEFSRU4nVCBDQVVHSFQgSU4gQSBDSVJDVUxBUiBMT09QXG5cdFx0XHRcdFx0XHRcdGlmKGJyZWFkY3J1bWIuaW5kZXhPZihyMSkgIT09IC0xKXtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoW1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFwiQ2lyY3VsYXIgY29uZGl0aW9uIGluIHJlY3Vyc2l2ZSBzZWFyY2ggb2Ygb2JqIHByb3BlcnR5ICdcIlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQrcHJvcE5hbWUrXCInIG9mIG9iamVjdCBcIlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQrKCh0eXBlb2Ygb2JqLmlkICE9PSAndW5kZWZpbmVkJykgPyBcIidcIitvYmouaWQrXCInXCIgOiAnJylcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0K1wiLiBPZmZlbmRpbmcgdmFsdWU6IFwiK3IxXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhZGNydW1iLnB1c2gocjEpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gYnJlYWRjcnVtYi5qb2luKFwiIFtkZXBlbmRzIG9uXT0+IFwiKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9KSgpXG5cdFx0XHRcdFx0XHRcdFx0XHRdKTtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdGJyZWFkY3J1bWIucHVzaChyMSk7XG5cblx0XHRcdFx0XHRcdFx0aWYob2JqW3Byb3BOYW1lXVtpXVtwcm9wTmFtZV0pe1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIF9wcml2YXRlLnNlYXJjaF9vYmpfcmVjdXJzaXZlbHkob2JqW3Byb3BOYW1lXVtpXSxwcm9wTmFtZSxmbixicmVhZGNydW1iKTtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gYnJlYWRjcnVtYjtcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIHByb21pc2UgZGVzY3JpcHRpb24gaW50byBhIHByb21pc2UuXG5cdCAqXG5cdCAqIEBwYXJhbSB7dHlwZX0gb2JqXG5cdCAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG5cdCAqL1xuXHRfcHJpdmF0ZS5jb252ZXJ0X3RvX3Byb21pc2UgPSBmdW5jdGlvbihvYmosb3B0aW9ucyl7XG5cblx0XHRcdG9iai5pZCA9IG9iai5pZCB8fCBvcHRpb25zLmlkO1xuXG5cdFx0XHQvL0F1dG9uYW1lXG5cdFx0XHRpZiAoIW9iai5pZCkge1xuXHRcdFx0XHRpZiAob2JqLnR5cGUgPT09ICd0aW1lcicpIHtcblx0XHRcdFx0XHRvYmouaWQgPSBcInRpbWVyLVwiICsgb2JqLnRpbWVvdXQgKyBcIi1cIiArICgrK0Nscy5wcml2YXRlLmNvbmZpZy5pKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmICh0eXBlb2Ygb2JqLnVybCA9PT0gJ3N0cmluZycpIHtcblx0XHRcdFx0XHRvYmouaWQgPSBvYmoudXJsLnNwbGl0KFwiL1wiKS5wb3AoKTtcblx0XHRcdFx0XHQvL1JFTU9WRSAuanMgRlJPTSBJRFxuXHRcdFx0XHRcdGlmIChvYmouaWQuc2VhcmNoKFwiLmpzXCIpICE9PSAtMSkge1xuXHRcdFx0XHRcdFx0b2JqLmlkID0gb2JqLmlkLnNwbGl0KFwiLlwiKTtcblx0XHRcdFx0XHRcdG9iai5pZC5wb3AoKTtcblx0XHRcdFx0XHRcdG9iai5pZCA9IG9iai5pZC5qb2luKFwiLlwiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly9SZXR1cm4gaWYgYWxyZWFkeSBleGlzdHNcblx0XHRcdGlmKENscy5wcml2YXRlLmNvbmZpZy5saXN0W29iai5pZF0gJiYgb2JqLnR5cGUgIT09ICd0aW1lcicpe1xuXHRcdFx0XHQvL0EgcHJldmlvdXMgcHJvbWlzZSBvZiB0aGUgc2FtZSBpZCBleGlzdHMuXG5cdFx0XHRcdC8vTWFrZSBzdXJlIHRoaXMgZGVwZW5kZW5jeSBvYmplY3QgZG9lc24ndCBoYXZlIGFcblx0XHRcdFx0Ly9yZXNvbHZlciAtIGlmIGl0IGRvZXMgZXJyb3Jcblx0XHRcdFx0aWYob2JqLnJlc29sdmVyKXtcblx0XHRcdFx0XHRDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoW1xuXHRcdFx0XHRcdFx0XCJZb3UgY2FuJ3Qgc2V0IGEgcmVzb2x2ZXIgb24gYSBxdWV1ZSB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gZGVjbGFyZWQuIFlvdSBjYW4gb25seSByZWZlcmVuY2UgdGhlIG9yaWdpbmFsLlwiXG5cdFx0XHRcdFx0XHQsXCJEZXRlY3RlZCByZS1pbml0IG9mICdcIiArIG9iai5pZCArIFwiJy5cIlxuXHRcdFx0XHRcdFx0LFwiQXR0ZW1wdGVkOlwiXG5cdFx0XHRcdFx0XHQsb2JqXG5cdFx0XHRcdFx0XHQsXCJFeGlzdGluZzpcIlxuXHRcdFx0XHRcdFx0LENscy5wcml2YXRlLmNvbmZpZy5saXN0W29iai5pZF1cblx0XHRcdFx0XHRdKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcubGlzdFtvYmouaWRdO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblxuXHRcdFx0Ly9Db252ZXJ0IGRlcGVuZGVuY3kgdG8gYW4gaW5zdGFuY2Vcblx0XHRcdHZhciBkZWY7XG5cdFx0XHRzd2l0Y2godHJ1ZSl7XG5cblx0XHRcdFx0XHQvL0V2ZW50XG5cdFx0XHRcdFx0Y2FzZShvYmoudHlwZSA9PT0gJ2V2ZW50Jyk6XG5cdFx0XHRcdFx0XHRcdGRlZiA9IF9wcml2YXRlLndyYXBfZXZlbnQob2JqKTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRjYXNlKG9iai50eXBlID09PSAncXVldWUnKTpcblx0XHRcdFx0XHRcdFx0ZGVmID0gQ2xzLnB1YmxpYy5xdWV1ZShvYmouZGVwZW5kZW5jaWVzLG9iaik7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0Ly9BbHJlYWR5IGEgdGhlbmFibGVcblx0XHRcdFx0XHRjYXNlKHR5cGVvZiBvYmoudGhlbiA9PT0gJ2Z1bmN0aW9uJyk6XG5cblx0XHRcdFx0XHRcdFx0c3dpdGNoKHRydWUpe1xuXG5cdFx0XHRcdFx0XHRcdFx0XHQvL1JlZmVyZW5jZSB0byBhbiBleGlzdGluZyBpbnN0YW5jZVxuXHRcdFx0XHRcdFx0XHRcdFx0Y2FzZSh0eXBlb2Ygb2JqLmlkID09PSAnc3RyaW5nJyk6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiJ1wiK29iai5pZCArXCInOiBkaWQgbm90IGV4aXN0LiBBdXRvIGNyZWF0aW5nIG5ldyBkZWZlcnJlZC5cIik7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmID0gX3ByaXZhdGUuZGVmZXJyZWQoe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpZCA6IG9iai5pZFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly9JZiBvYmplY3Qgd2FzIGEgdGhlbmFibGUsIHJlc29sdmUgdGhlIG5ldyBkZWZlcnJlZCB3aGVuIHRoZW4gY2FsbGVkXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYob2JqLnRoZW4pe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0b2JqLnRoZW4oZnVuY3Rpb24ocil7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGRlZi5yZXNvbHZlKHIpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHQvL09CSkVDVCBQUk9QRVJUWSAucHJvbWlzZSBFWFBFQ1RFRCBUTyBSRVRVUk4gQSBQUk9NSVNFXG5cdFx0XHRcdFx0XHRcdFx0XHRjYXNlKHR5cGVvZiBvYmoucHJvbWlzZSA9PT0gJ2Z1bmN0aW9uJyk6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYob2JqLnNjb3BlKXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmID0gb2JqLnByb21pc2UuY2FsbChvYmouc2NvcGUpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkZWYgPSBvYmoucHJvbWlzZSgpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0XHRcdFx0Ly9PYmplY3QgaXMgYSB0aGVuYWJsZVxuXHRcdFx0XHRcdFx0XHRcdFx0Y2FzZShvYmoudGhlbik6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmID0gb2JqO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRkZWZhdWx0OlxuXG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHQvL0NoZWNrIGlmIGlzIGEgdGhlbmFibGVcblx0XHRcdFx0XHRcdFx0aWYodHlwZW9mIGRlZiAhPT0gJ29iamVjdCcgfHwgIWRlZi50aGVuKXtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoXCJEZXBlbmRlbmN5IGxhYmVsZWQgYXMgYSBwcm9taXNlIGRpZCBub3QgcmV0dXJuIGEgcHJvbWlzZS5cIixvYmopO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0Y2FzZShvYmoudHlwZSA9PT0gJ3RpbWVyJyk6XG5cdFx0XHRcdFx0XHRcdGRlZiA9IF9wcml2YXRlLndyYXBfdGltZXIob2JqKTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHQvL0xvYWQgZmlsZVxuXHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRcdG9iai50eXBlID0gb2JqLnR5cGUgfHwgXCJkZWZhdWx0XCI7XG5cdFx0XHRcdFx0XHRcdC8vSW5oZXJpdCBwYXJlbnQncyBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5XG5cdFx0XHRcdFx0XHRcdGlmKG9wdGlvbnMucGFyZW50ICYmIG9wdGlvbnMucGFyZW50LmN3ZCl7XG5cdFx0XHRcdFx0XHRcdFx0b2JqLmN3ZCA9IG9wdGlvbnMucGFyZW50LmN3ZDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRkZWYgPSBfcHJpdmF0ZS53cmFwX3hocihvYmopO1xuXHRcdFx0fVxuXG5cdFx0XHQvL0luZGV4IHByb21pc2UgYnkgaWQgZm9yIGZ1dHVyZSByZWZlcmVuY2luZ1xuXHRcdFx0Q2xzLnByaXZhdGUuY29uZmlnLmxpc3Rbb2JqLmlkXSA9IGRlZjtcblxuXHRcdFx0cmV0dXJuIGRlZjtcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBAdG9kbzogcmVkbyB0aGlzXG5cdCAqXG5cdCAqIENvbnZlcnRzIGEgcmVmZXJlbmNlIHRvIGEgRE9NIGV2ZW50IHRvIGEgcHJvbWlzZS5cblx0ICogUmVzb2x2ZWQgb24gZmlyc3QgZXZlbnQgdHJpZ2dlci5cblx0ICpcblx0ICogQHRvZG8gcmVtb3ZlIGpxdWVyeSBkZXBlbmRlbmN5XG5cdCAqXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBvYmpcblx0ICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWQgb2JqZWN0XG5cdCAqL1xuXHRfcHJpdmF0ZS53cmFwX2V2ZW50ID0gZnVuY3Rpb24ob2JqKXtcblxuXHRcdFx0dmFyIGRlZiA9IENscy5wdWJsaWMuZGVmZXJyZWQoe1xuXHRcdFx0XHRcdGlkIDogb2JqLmlkXG5cdFx0XHR9KTtcblxuXG5cdFx0XHRpZih0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKXtcblxuXHRcdFx0XHRcdGlmKHR5cGVvZiAkICE9PSAnZnVuY3Rpb24nKXtcblx0XHRcdFx0XHRcdFx0dmFyIG1zZyA9ICd3aW5kb3cgYW5kIGRvY3VtZW50IGJhc2VkIGV2ZW50cyBkZXBlbmQgb24galF1ZXJ5Jztcblx0XHRcdFx0XHRcdFx0ZGVmLnJlamVjdChtc2cpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0Ly9Gb3Igbm93LCBkZXBlbmQgb24ganF1ZXJ5IGZvciBJRTggRE9NQ29udGVudExvYWRlZCBwb2x5ZmlsbFxuXHRcdFx0XHRcdFx0c3dpdGNoKHRydWUpe1xuXHRcdFx0XHRcdFx0XHRjYXNlKG9iai5pZCA9PT0gJ3JlYWR5JyB8fCBvYmouaWQgPT09ICdET01Db250ZW50TG9hZGVkJyk6XG5cdFx0XHRcdFx0XHRcdFx0JChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0XHRcdGRlZi5yZXNvbHZlKDEpO1xuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRjYXNlKG9iai5pZCA9PT0gJ2xvYWQnKTpcblx0XHRcdFx0XHRcdFx0XHQkKHdpbmRvdykubG9hZChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHRcdFx0ZGVmLnJlc29sdmUoMSk7XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRcdFx0JChkb2N1bWVudCkub24ob2JqLmlkLFwiYm9keVwiLGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdFx0XHRkZWYucmVzb2x2ZSgxKTtcblx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBkZWY7XG5cdH07XG5cblxuXHRfcHJpdmF0ZS53cmFwX3RpbWVyID0gZnVuY3Rpb24ob2JqKXtcblxuXHRcdFx0dmFyIGRlZiA9IENscy5wdWJsaWMuZGVmZXJyZWQoKTtcblxuXHRcdFx0KGZ1bmN0aW9uKGRlZil7XG5cdFx0XHRcdFx0dmFyIF9zdGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0dmFyIF9lbmQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0XHRcdFx0XHRcdFx0ZGVmLnJlc29sdmUoe1xuXHRcdFx0XHRcdFx0XHRcdFx0c3RhcnQgOiBfc3RhcnRcblx0XHRcdFx0XHRcdFx0XHRcdCxlbmQgOiBfZW5kXG5cdFx0XHRcdFx0XHRcdFx0XHQsZWxhcHNlZCA6IF9lbmQgLSBfc3RhcnRcblx0XHRcdFx0XHRcdFx0XHRcdCx0aW1lb3V0IDogb2JqLnRpbWVvdXRcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSxvYmoudGltZW91dCk7XG5cdFx0XHR9KGRlZikpO1xuXG5cdFx0XHRyZXR1cm4gZGVmO1xuXHR9O1xuXG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYSBkZWZlcnJlZCBvYmplY3QgdGhhdCBkZXBlbmRzIG9uIHRoZSBsb2FkaW5nIG9mIGEgZmlsZS5cblx0ICpcblx0ICogQHBhcmFtIHtvYmplY3R9IGRlcFxuXHQgKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZCBvYmplY3Rcblx0ICovXG5cdF9wcml2YXRlLndyYXBfeGhyID0gZnVuY3Rpb24oZGVwKXtcblxuXHRcdFx0dmFyIHJlcXVpcmVkID0gW1wiaWRcIixcInVybFwiXTtcblx0XHRcdGZvcih2YXIgaSBpbiByZXF1aXJlZCl7XG5cdFx0XHRcdGlmKCFkZXBbcmVxdWlyZWRbaV1dKXtcblx0XHRcdFx0XHRyZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFtcblx0XHRcdFx0XHRcdFwiRmlsZSByZXF1ZXN0cyBjb252ZXJ0ZWQgdG8gcHJvbWlzZXMgcmVxdWlyZTogXCIgKyByZXF1aXJlZFtpXVxuXHRcdFx0XHRcdFx0LFwiTWFrZSBzdXJlIHlvdSB3ZXJlbid0IGV4cGVjdGluZyBkZXBlbmRlbmN5IHRvIGFscmVhZHkgaGF2ZSBiZWVuIHJlc29sdmVkIHVwc3RyZWFtLlwiXG5cdFx0XHRcdFx0XHQsZGVwXG5cdFx0XHRcdFx0XSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly9JRiBQUk9NSVNFIEZPUiBUSElTIFVSTCBBTFJFQURZIEVYSVNUUywgUkVUVVJOIElUXG5cdFx0XHRpZihDbHMucHJpdmF0ZS5jb25maWcubGlzdFtkZXAuaWRdKXtcblx0XHRcdFx0cmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5saXN0W2RlcC5pZF07XG5cdFx0XHR9XG5cblx0XHRcdC8vQ09OVkVSVCBUTyBERUZFUlJFRDpcblx0XHRcdHZhciBkZWYgPSBDbHMucHVibGljLmRlZmVycmVkKGRlcCk7XG5cblx0XHRcdGlmKHR5cGVvZiBDbHMucHVibGljLmZpbGVfbG9hZGVyW0Nscy5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy5tb2RlXVtkZXAudHlwZV0gIT09ICd1bmRlZmluZWQnKXtcblx0XHRcdFx0Q2xzLnB1YmxpYy5maWxlX2xvYWRlcltDbHMucHJpdmF0ZS5jb25maWcuc2V0dGluZ3MubW9kZV1bZGVwLnR5cGVdKGRlcC51cmwsZGVmLGRlcCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNle1xuXHRcdFx0XHRDbHMucHVibGljLmZpbGVfbG9hZGVyW0Nscy5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy5tb2RlXVsnZGVmYXVsdCddKGRlcC51cmwsZGVmLGRlcCk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBkZWY7XG5cdH07XG5cblx0LyoqXG5cdCogQSBcInNpZ25hbFwiIGhlcmUgY2F1c2VzIGEgcXVldWUgdG8gbG9vayB0aHJvdWdoIGVhY2ggaXRlbVxuXHQqIGluIGl0cyB1cHN0cmVhbSBhbmQgY2hlY2sgdG8gc2VlIGlmIGFsbCBhcmUgcmVzb2x2ZWQuXG5cdCpcblx0KiBTaWduYWxzIGNhbiBvbmx5IGJlIHJlY2VpdmVkIGJ5IGEgcXVldWUgaXRzZWxmIG9yIGFuIGluc3RhbmNlXG5cdCogaW4gaXRzIHVwc3RyZWFtLlxuXHQqXG5cdCogQHBhcmFtIHtvYmplY3R9IHRhcmdldFxuXHQqIEBwYXJhbSB7c3RyaW5nfSBmcm9tX2lkXG5cdCogQHJldHVybnMge3ZvaWR9XG5cdCovXG5cdF9wcml2YXRlLnJlY2VpdmVfc2lnbmFsID0gZnVuY3Rpb24odGFyZ2V0LGZyb21faWQpe1xuXG5cdFx0aWYodGFyZ2V0LmhhbHRfcmVzb2x1dGlvbiA9PT0gMSkgcmV0dXJuO1xuXG5cdFx0Ly9NQUtFIFNVUkUgVEhFIFNJR05BTCBXQVMgRlJPTSBBIFBST01JU0UgQkVJTkcgTElTVEVORUQgVE9cblx0IC8vQlVUIEFMTE9XIFNFTEYgU1RBVFVTIENIRUNLXG5cdCB2YXIgc3RhdHVzO1xuXHQgaWYoZnJvbV9pZCAhPT0gdGFyZ2V0LmlkICYmICF0YXJnZXQudXBzdHJlYW1bZnJvbV9pZF0pe1xuXHRcdFx0IHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoZnJvbV9pZCArIFwiIGNhbid0IHNpZ25hbCBcIiArIHRhcmdldC5pZCArIFwiIGJlY2F1c2Ugbm90IGluIHVwc3RyZWFtLlwiKTtcblx0IH1cblx0IC8vUlVOIFRIUk9VR0ggUVVFVUUgT0YgT0JTRVJWSU5HIFBST01JU0VTIFRPIFNFRSBJRiBBTEwgRE9ORVxuXHQgZWxzZXtcblx0XHRcdCBzdGF0dXMgPSAxO1xuXHRcdFx0IGZvcih2YXIgaSBpbiB0YXJnZXQudXBzdHJlYW0pe1xuXHRcdFx0XHRcdCAvL1NFVFMgU1RBVFVTIFRPIDAgSUYgQU5ZIE9CU0VSVklORyBIQVZFIEZBSUxFRCwgQlVUIE5PVCBJRiBQRU5ESU5HIE9SIFJFU09MVkVEXG5cdFx0XHRcdFx0IGlmKHRhcmdldC51cHN0cmVhbVtpXS5zdGF0ZSAhPT0gMSkge1xuXHRcdFx0XHRcdFx0XHQgc3RhdHVzID0gdGFyZ2V0LnVwc3RyZWFtW2ldLnN0YXRlO1xuXHRcdFx0XHRcdFx0XHQgYnJlYWs7XG5cdFx0XHRcdFx0IH1cblx0XHRcdCB9XG5cdCB9XG5cblx0IC8vUkVTT0xWRSBRVUVVRSBJRiBVUFNUUkVBTSBGSU5JU0hFRFxuXHQgaWYoc3RhdHVzID09PSAxKXtcblxuXHRcdFx0Ly9HRVQgUkVUVVJOIFZBTFVFUyBQRVIgREVQRU5ERU5DSUVTLCBXSElDSCBTQVZFUyBPUkRFUiBBTkRcblx0XHRcdC8vUkVQT1JUUyBEVVBMSUNBVEVTXG5cdFx0XHR2YXIgdmFsdWVzID0gW107XG5cdFx0XHRmb3IodmFyIGkgaW4gdGFyZ2V0LmRlcGVuZGVuY2llcyl7XG5cdFx0XHRcdHZhbHVlcy5wdXNoKHRhcmdldC5kZXBlbmRlbmNpZXNbaV0udmFsdWUpO1xuXHRcdFx0fVxuXG5cdFx0XHR0YXJnZXQucmVzb2x2ZS5jYWxsKHRhcmdldCx2YWx1ZXMpO1xuXHQgfVxuXG5cdCBpZihzdGF0dXMgPT09IDIpe1xuXHRcdFx0IHZhciBlcnIgPSBbXG5cdFx0XHRcdFx0IHRhcmdldC5pZCtcIiBkZXBlbmRlbmN5ICdcIit0YXJnZXQudXBzdHJlYW1baV0uaWQgKyBcIicgd2FzIHJlamVjdGVkLlwiXG5cdFx0XHRcdFx0ICx0YXJnZXQudXBzdHJlYW1baV0uYXJndW1lbnRzXG5cdFx0XHQgXTtcblx0XHRcdCB0YXJnZXQucmVqZWN0LmFwcGx5KHRhcmdldCxlcnIpO1xuXHQgfVxuXHR9O1xuXG5cblxuXG5cdHZhciBfcHVibGljID0ge307XG5cblx0X3B1YmxpYy5pc19vcmd5ID0gdHJ1ZTtcblxuXHRfcHVibGljLmlkID0gbnVsbDtcblxuXHQvL0EgQ09VTlRFUiBGT1IgQVVUMC1HRU5FUkFURUQgUFJPTUlTRSBJRCdTXG5cdF9wdWJsaWMuc2V0dGxlZCA9IDA7XG5cblx0LyoqXG5cdCogU1RBVEUgQ09ERVM6XG5cdCogLS0tLS0tLS0tLS0tLS0tLS0tXG5cdCogLTFcdCA9PiBTRVRUTElORyBbRVhFQ1VUSU5HIENBTExCQUNLU11cblx0KiAgMFx0ID0+IFBFTkRJTkdcblx0KiAgMVx0ID0+IFJFU09MVkVEIC8gRlVMRklMTEVEXG5cdCogIDJcdCA9PiBSRUpFQ1RFRFxuXHQqL1xuXHRfcHVibGljLnN0YXRlID0gMDtcblxuXHRfcHVibGljLnZhbHVlID0gW107XG5cblx0Ly9UaGUgbW9zdCByZWNlbnQgdmFsdWUgZ2VuZXJhdGVkIGJ5IHRoZSB0aGVuLT5kb25lIGNoYWluLlxuXHRfcHVibGljLmNhYm9vc2UgPSBudWxsO1xuXG5cdF9wdWJsaWMubW9kZWwgPSBcImRlZmVycmVkXCI7XG5cblx0X3B1YmxpYy5kb25lX2ZpcmVkID0gMDtcblxuXHRfcHVibGljLnRpbWVvdXRfaWQgPSBudWxsO1xuXG5cdF9wdWJsaWMuY2FsbGJhY2tfc3RhdGVzID0ge1xuXHRcdHJlc29sdmUgOiAwXG5cdFx0LHRoZW4gOiAwXG5cdFx0LGRvbmUgOiAwXG5cdFx0LHJlamVjdCA6IDBcblx0fTtcblxuXHQvKipcblx0KiBTZWxmIGV4ZWN1dGluZyBmdW5jdGlvbiB0byBpbml0aWFsaXplIGNhbGxiYWNrIGV2ZW50XG5cdCogbGlzdC5cblx0KlxuXHQqIFJldHVybnMgYW4gb2JqZWN0IHdpdGggdGhlIHNhbWUgcHJvcGVydHlOYW1lcyBhc1xuXHQqIF9wdWJsaWMuY2FsbGJhY2tfc3RhdGVzOiBhZGRpbmcgYm9pbGVycGxhdGVcblx0KiBwcm9wZXJ0aWVzIGZvciBlYWNoXG5cdCpcblx0KiBAcmV0dXJucyB7b2JqZWN0fVxuXHQqL1xuXHRfcHVibGljLmNhbGxiYWNrcyA9IChmdW5jdGlvbigpe1xuXG5cdFx0dmFyIG8gPSB7fTtcblxuXHRcdGZvcih2YXIgaSBpbiBfcHVibGljLmNhbGxiYWNrX3N0YXRlcyl7XG5cdFx0XHRvW2ldID0ge1xuXHRcdFx0XHR0cmFpbiA6IFtdXG5cdFx0XHRcdCxob29rcyA6IHtcblx0XHRcdFx0XHRvbkJlZm9yZSA6IHtcblx0XHRcdFx0XHRcdHRyYWluIDogW11cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0LG9uQ29tcGxldGUgOiB7XG5cdFx0XHRcdFx0XHR0cmFpbiA6IFtdXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdHJldHVybiBvO1xuXHR9KSgpO1xuXG5cdC8vUFJPTUlTRSBIQVMgT0JTRVJWRVJTIEJVVCBET0VTIE5PVCBPQlNFUlZFIE9USEVSU1xuXHRfcHVibGljLmRvd25zdHJlYW0gPSB7fTtcblxuXHRfcHVibGljLmV4ZWN1dGlvbl9oaXN0b3J5ID0gW107XG5cblx0Ly9XSEVOIFRSVUUsIEFMTE9XUyBSRS1JTklUIFtGT1IgVVBHUkFERVMgVE8gQSBRVUVVRV1cblx0X3B1YmxpYy5vdmVyd3JpdGFibGUgPSAwO1xuXG5cdC8qKlxuXHQqIFJFTU9URVxuXHQqXG5cdCogUkVNT1RFID09IDEgID0+ICBbREVGQVVMVF0gTWFrZSBodHRwIHJlcXVlc3QgZm9yIGZpbGVcblx0KlxuXHQqIFJFTU9URSA9PSAwICA9PiAgUmVhZCBmaWxlIGRpcmVjdGx5IGZyb20gdGhlIGZpbGVzeXN0ZW1cblx0KlxuXHQqIE9OTFkgQVBQTElFUyBUTyBTQ1JJUFRTIFJVTiBVTkRFUiBOT0RFIEFTIEJST1dTRVIgSEFTIE5PXG5cdCogRklMRVNZU1RFTSBBQ0NFU1Ncblx0Ki9cblx0X3B1YmxpYy5yZW1vdGUgPSAxO1xuXG5cdC8vQUREUyBUTyBNQVNURVIgTElTVC4gQUxXQVlTIFRSVUUgVU5MRVNTIFVQR1JBRElORyBBIFBST01JU0UgVE8gQSBRVUVVRVxuXHRfcHVibGljLmxpc3QgPSAxO1xuXG5cblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cdC8vXHRfcHVibGljIE1FVEhPRFNcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuXHQvKipcblx0KiBSZXNvbHZlcyBhIGRlZmVycmVkL3F1ZXVlLlxuXHQqXG5cdCogQG1lbWJlcm9mIG9yZ3kvZGVmZXJyZWRcblx0KiBAZnVuY3Rpb24gb3JneS9kZWZlcnJlZCNyZXNvbHZlXG5cdCpcblx0KiBAcGFyYW0ge21peGVkfSB2YWx1ZSBSZXNvbHZlciB2YWx1ZS5cblx0KiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZC9xdWV1ZVxuXHQqL1xuXHRfcHVibGljLnJlc29sdmUgPSBmdW5jdGlvbih2YWx1ZSl7XG5cblx0XHRpZih0aGlzLnNldHRsZWQgPT09IDEpe1xuXHRcdFx0Q2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFtcblx0XHRcdFx0dGhpcy5pZCArIFwiIGNhbid0IHJlc29sdmUuXCJcblx0XHRcdFx0LFwiT25seSB1bnNldHRsZWQgZGVmZXJyZWRzIGFyZSByZXNvbHZhYmxlLlwiXG5cdFx0XHRdKTtcblx0XHR9XG5cblx0XHQvL1NFVCBTVEFURSBUTyBTRVRUTEVNRU5UIElOIFBST0dSRVNTXG5cdFx0X3ByaXZhdGUuc2V0X3N0YXRlKHRoaXMsLTEpO1xuXG5cdFx0Ly9TRVQgVkFMVUVcblx0XHR0aGlzLnZhbHVlID0gdmFsdWU7XG5cblx0XHQvL1JVTiBSRVNPTFZFUiBCRUZPUkUgUFJPQ0VFRElOR1xuXHRcdC8vRVZFTiBJRiBUSEVSRSBJUyBOTyBSRVNPTFZFUiwgU0VUIElUIFRPIEZJUkVEIFdIRU4gQ0FMTEVEXG5cdFx0aWYoIXRoaXMucmVzb2x2ZXJfZmlyZWQgJiYgdHlwZW9mIHRoaXMucmVzb2x2ZXIgPT09ICdmdW5jdGlvbicpe1xuXG5cdFx0XHR0aGlzLnJlc29sdmVyX2ZpcmVkID0gMTtcblxuXHRcdFx0Ly9BZGQgcmVzb2x2ZXIgdG8gcmVzb2x2ZSB0cmFpblxuXHRcdFx0dHJ5e1xuXHRcdFx0XHR0aGlzLmNhbGxiYWNrcy5yZXNvbHZlLnRyYWluLnB1c2goZnVuY3Rpb24oKXtcblx0XHRcdFx0XHR0aGlzLnJlc29sdmVyKHZhbHVlLHRoaXMpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGNhdGNoKGUpe1xuXHRcdFx0XHRDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGVsc2V7XG5cblx0XHRcdHRoaXMucmVzb2x2ZXJfZmlyZWQgPSAxO1xuXG5cdFx0XHQvL0FkZCBzZXR0bGUgdG8gcmVzb2x2ZSB0cmFpblxuXHRcdFx0Ly9BbHdheXMgc2V0dGxlIGJlZm9yZSBhbGwgb3RoZXIgY29tcGxldGUgY2FsbGJhY2tzXG5cdFx0XHR0aGlzLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4udW5zaGlmdChmdW5jdGlvbigpe1xuXHRcdFx0XHRfcHJpdmF0ZS5zZXR0bGUodGhpcyk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHQvL1J1biByZXNvbHZlXG5cdFx0X3ByaXZhdGUucnVuX3RyYWluKFxuXHRcdFx0dGhpc1xuXHRcdFx0LHRoaXMuY2FsbGJhY2tzLnJlc29sdmVcblx0XHRcdCx0aGlzLnZhbHVlXG5cdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG5cdFx0KTtcblxuXHRcdC8vcmVzb2x2ZXIgaXMgZXhwZWN0ZWQgdG8gY2FsbCByZXNvbHZlIGFnYWluXG5cdFx0Ly9hbmQgdGhhdCB3aWxsIGdldCB1cyBwYXN0IHRoaXMgcG9pbnRcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXG5cdC8qKlxuXHQqIFJlamVjdHMgYSBkZWZlcnJlZC9xdWV1ZVxuXHQqXG5cdCogQG1lbWJlcm9mIG9yZ3kvZGVmZXJyZWRcblx0KiBAZnVuY3Rpb24gb3JneS9kZWZlcnJlZCNyZWplY3Rcblx0KlxuXHQqIEBwYXJhbSB7c3RyaW5nfGFycmF5fSBlcnIgRXJyb3IgaW5mb3JtYXRpb24uXG5cdCogQHJldHVybiB7b2JqZWN0fSBkZWZlcnJlZC9xdWV1ZVxuXHQqL1xuXHRfcHVibGljLnJlamVjdCA9IGZ1bmN0aW9uKGVycil7XG5cblx0XHRpZighKGVyciBpbnN0YW5jZW9mIEFycmF5KSl7XG5cdFx0XHRlcnIgPSBbZXJyXTtcblx0XHR9XG5cblx0XHR2YXIgbXNnID0gXCJSZWplY3RlZCBcIit0aGlzLm1vZGVsK1wiOiAnXCIrdGhpcy5pZCtcIicuXCJcblxuXHRcdGlmKENscy5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy5kZWJ1Z19tb2RlKXtcblx0XHRcdGVyci51bnNoaWZ0KG1zZyk7XG5cdFx0XHRDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoZXJyLHRoaXMpO1xuXHRcdH1cblx0XHRlbHNle1xuXHRcdFx0bXNnID0gbXNnICsgXCIgVHVybiBvbiBkZWJ1ZyBtb2RlIGZvciBtb3JlIGluZm8uXCI7XG5cdFx0XHRjb25zb2xlLndhcm4obXNnKTtcblx0XHR9XG5cblx0XHQvL1JlbW92ZSBhdXRvIHRpbWVvdXQgdGltZXJcblx0XHRpZih0aGlzLnRpbWVvdXRfaWQpe1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMudGltZW91dF9pZCk7XG5cdFx0fVxuXG5cdFx0Ly9TZXQgc3RhdGUgdG8gcmVqZWN0ZWRcblx0XHRfcHJpdmF0ZS5zZXRfc3RhdGUodGhpcywyKTtcblxuXHRcdC8vRXhlY3V0ZSByZWplY3Rpb24gcXVldWVcblx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oXG5cdFx0XHR0aGlzXG5cdFx0XHQsdGhpcy5jYWxsYmFja3MucmVqZWN0XG5cdFx0XHQsZXJyXG5cdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG5cdFx0KTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cblx0LyoqXG5cdCogQ2hhaW4gbWV0aG9kXG5cblx0PGI+VXNhZ2U6PC9iPlxuXHRgYGBcblx0dmFyIE9yZ3kgPSByZXF1aXJlKFwib3JneVwiKSxcblx0XHRcdFx0XHRxID0gT3JneS5kZWZlcnJlZCh7XG5cdFx0XHRcdFx0XHRpZCA6IFwicTFcIlxuXHRcdFx0XHRcdH0pO1xuXG5cdC8vUmVzb2x2ZSB0aGUgZGVmZXJyZWRcblx0cS5yZXNvbHZlKFwiU29tZSB2YWx1ZS5cIik7XG5cblx0cS50aGVuKGZ1bmN0aW9uKHIpe1xuXHRcdGNvbnNvbGUubG9nKHIpOyAvL1NvbWUgdmFsdWUuXG5cdH0pXG5cblx0YGBgXG5cblx0KiBAbWVtYmVyb2Ygb3JneS9kZWZlcnJlZFxuXHQqIEBmdW5jdGlvbiBvcmd5L2RlZmVycmVkI3RoZW5cblx0KlxuXHQqIEBwYXJhbSB7ZnVuY3Rpb259IGZuIENhbGxiYWNrIGZ1bmN0aW9uXG5cdCogQHBhcmFtIHtmdW5jdGlvbn0gcmVqZWN0b3IgUmVqZWN0aW9uIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCogQHJldHVybiB7b2JqZWN0fSBkZWZlcnJlZC9xdWV1ZVxuXHQqL1xuXHRfcHVibGljLnRoZW4gPSBmdW5jdGlvbihmbixyZWplY3Rvcil7XG5cblx0XHRzd2l0Y2godHJ1ZSl7XG5cblx0XHRcdC8vQW4gZXJyb3Igd2FzIHByZXZpb3VzbHkgdGhyb3duLCBhZGQgcmVqZWN0b3IgJiBiYWlsIG91dFxuXHRcdFx0Y2FzZSh0aGlzLnN0YXRlID09PSAyKTpcblx0XHRcdFx0aWYodHlwZW9mIHJlamVjdG9yID09PSAnZnVuY3Rpb24nKXtcblx0XHRcdFx0XHR0aGlzLmNhbGxiYWNrcy5yZWplY3QudHJhaW4ucHVzaChyZWplY3Rvcik7XG5cdFx0XHRcdH1cblx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdC8vRXhlY3V0aW9uIGNoYWluIGFscmVhZHkgZmluaXNoZWQuIEJhaWwgb3V0LlxuXHRcdFx0Y2FzZSh0aGlzLmRvbmVfZmlyZWQgPT09IDEpOlxuXHRcdFx0XHRyZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKHRoaXMuaWQrXCIgY2FuJ3QgYXR0YWNoIC50aGVuKCkgYmVjYXVzZSAuZG9uZSgpIGhhcyBhbHJlYWR5IGZpcmVkLCBhbmQgdGhhdCBtZWFucyB0aGUgZXhlY3V0aW9uIGNoYWluIGlzIGNvbXBsZXRlLlwiKTtcblxuXHRcdFx0ZGVmYXVsdDpcblxuXHRcdFx0XHQvL1B1c2ggY2FsbGJhY2sgdG8gdGhlbiBxdWV1ZVxuXHRcdFx0XHR0aGlzLmNhbGxiYWNrcy50aGVuLnRyYWluLnB1c2goZm4pO1xuXG5cdFx0XHRcdC8vUHVzaCByZWplY3QgY2FsbGJhY2sgdG8gdGhlIHJlamVjdGlvbiBxdWV1ZVxuXHRcdFx0XHRpZih0eXBlb2YgcmVqZWN0b3IgPT09ICdmdW5jdGlvbicpe1xuXHRcdFx0XHRcdHRoaXMuY2FsbGJhY2tzLnJlamVjdC50cmFpbi5wdXNoKHJlamVjdG9yKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vU2V0dGxlZCwgcnVuIHRyYWluIG5vd1xuXHRcdFx0XHRpZih0aGlzLnNldHRsZWQgPT09IDEgJiYgdGhpcy5zdGF0ZSA9PT0gMSAmJiAhdGhpcy5kb25lX2ZpcmVkKXtcblx0XHRcdFx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oXG5cdFx0XHRcdFx0XHR0aGlzXG5cdFx0XHRcdFx0XHQsdGhpcy5jYWxsYmFja3MudGhlblxuXHRcdFx0XHRcdFx0LHRoaXMuY2Fib29zZVxuXHRcdFx0XHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvL1Vuc2V0dGxlZCwgdHJhaW4gd2lsbCBiZSBydW4gd2hlbiBzZXR0bGVkXG5cdFx0XHRcdC8vZWxzZXt9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblxuXHQvKipcblx0KiBEb25lIGNhbGxiYWNrLlxuXHQqXG5cdCogQG1lbWJlcm9mIG9yZ3kvZGVmZXJyZWRcblx0KiBAZnVuY3Rpb24gb3JneS9kZWZlcnJlZCNkb25lXG5cdCpcblx0KiBAcGFyYW0ge2Z1bmN0aW9ufSBmbiBDYWxsYmFjayBmdW5jdGlvblxuXHQqIEBwYXJhbSB7ZnVuY3Rpb259IHJlamVjdG9yIFJlamVjdGlvbiBjYWxsYmFjayBmdW5jdGlvblxuXHQqIEByZXR1cm5zIHtvYmplY3R9IGRlZmVycmVkL3F1ZXVlXG5cdCovXG5cdF9wdWJsaWMuZG9uZSA9IGZ1bmN0aW9uKGZuLHJlamVjdG9yKXtcblxuXHRcdGlmKHRoaXMuY2FsbGJhY2tzLmRvbmUudHJhaW4ubGVuZ3RoID09PSAwXG5cdFx0XHQmJiB0aGlzLmRvbmVfZmlyZWQgPT09IDApe1xuXHRcdFx0XHRpZih0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicpe1xuXG5cdFx0XHRcdFx0Ly93cmFwIGNhbGxiYWNrIHdpdGggc29tZSBvdGhlciBjb21tYW5kc1xuXHRcdFx0XHRcdHZhciBmbjIgPSBmdW5jdGlvbihyLGRlZmVycmVkLGxhc3Qpe1xuXG5cdFx0XHRcdFx0XHQvL0RvbmUgY2FuIG9ubHkgYmUgY2FsbGVkIG9uY2UsIHNvIG5vdGUgdGhhdCBpdCBoYXMgYmVlblxuXHRcdFx0XHRcdFx0ZGVmZXJyZWQuZG9uZV9maXJlZCA9IDE7XG5cblx0XHRcdFx0XHRcdGZuKHIsZGVmZXJyZWQsbGFzdCk7XG5cdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdHRoaXMuY2FsbGJhY2tzLmRvbmUudHJhaW4ucHVzaChmbjIpO1xuXG5cdFx0XHRcdFx0Ly9QdXNoIHJlamVjdCBjYWxsYmFjayB0byB0aGUgcmVqZWN0aW9uIHF1ZXVlIG9uQ29tcGxldGVcblx0XHRcdFx0XHRpZih0eXBlb2YgcmVqZWN0b3IgPT09ICdmdW5jdGlvbicpe1xuXHRcdFx0XHRcdFx0dGhpcy5jYWxsYmFja3MucmVqZWN0Lmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChyZWplY3Rvcik7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly9TZXR0bGVkLCBydW4gdHJhaW4gbm93XG5cdFx0XHRcdFx0aWYodGhpcy5zZXR0bGVkID09PSAxKXtcblx0XHRcdFx0XHRcdGlmKHRoaXMuc3RhdGUgPT09IDEpe1xuXHRcdFx0XHRcdFx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oXG5cdFx0XHRcdFx0XHRcdFx0dGhpc1xuXHRcdFx0XHRcdFx0XHRcdCx0aGlzLmNhbGxiYWNrcy5kb25lXG5cdFx0XHRcdFx0XHRcdFx0LHRoaXMuY2Fib29zZVxuXHRcdFx0XHRcdFx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0XHRcdF9wcml2YXRlLnJ1bl90cmFpbihcblx0XHRcdFx0XHRcdFx0XHR0aGlzXG5cdFx0XHRcdFx0XHRcdFx0LHRoaXMuY2FsbGJhY2tzLnJlamVjdFxuXHRcdFx0XHRcdFx0XHRcdCx0aGlzLmNhYm9vc2Vcblx0XHRcdFx0XHRcdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vVW5zZXR0bGVkLCB0cmFpbiB3aWxsIGJlIHJ1biB3aGVuIHNldHRsZWRcblx0XHRcdFx0XHQvL2Vsc2V7fVxuXHRcdFx0fVxuXHRcdFx0ZWxzZXtcblx0XHRcdFx0cmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcImRvbmUoKSBtdXN0IGJlIHBhc3NlZCBhIGZ1bmN0aW9uLlwiKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0ZWxzZXtcblx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoXCJkb25lKCkgY2FuIG9ubHkgYmUgY2FsbGVkIG9uY2UuXCIpO1xuXHRcdH1cblx0XHRcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBBbGxvd3MgYSBwcmVwcm9jZXNzb3IgdG8gc2V0IGJhY2tyYWNlIGRhdGEgb24gYW4gT3JneSBvYmplY3QuXG5cdCAqIEBwYXJhbSAge3N0cmluZ30gc3RyIGZpbGVuYW1lOmxpbmUgbnVtYmVyXG5cdCAqIEByZXR1cm4ge29iamVjdH0gZGVmZXJyZWQvcXVldWVcblx0ICovXG5cdF9wdWJsaWMuX2J0cmMgPSBmdW5jdGlvbihzdHIpe1xuXHRcdHRoaXMuYmFja3RyYWNlID0gc3RyO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cblx0LyoqXG5cdCogQ3JlYXRlcyBhIG5ldyBkZWZlcnJlZCBvYmplY3Qgb3IgaWYgb25lIGV4aXN0cyBieSB0aGUgc2FtZSBpZCxcblx0KiByZXR1cm5zIGl0LlxuXG5cdDxiPlVzYWdlOjwvYj5cblx0YGBgXG5cdHZhciBPcmd5ID0gcmVxdWlyZShcIm9yZ3lcIiksXG5cdHEgPSBPcmd5LmRlZmVycmVkKHtcblx0aWQgOiBcInExXCJcblx0fSk7XG5cdGBgYFxuXG5cdCogQG1lbWJlcm9mIG9yZ3lcblx0KiBAZnVuY3Rpb24gZGVmZXJyZWRcblx0KlxuXHQqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIExpc3Qgb2Ygb3B0aW9uczpcblx0KlxuXHQqICAtIDxiPmlkPC9iPiB7c3RyaW5nfSBVbmlxdWUgaWQgb2YgdGhlIG9iamVjdC5cblx0Klx0XHQtIENhbiBiZSB1c2VkIHdpdGggT3JneS5nZXQoaWQpLlxuXHQqXHRcdC0gT3B0aW9uYWwuXG5cdCpcblx0KlxuXHQqICAtIDxiPnRpbWVvdXQ8L2I+IHtudW1iZXJ9IFRpbWUgaW4gbXMgYWZ0ZXIgd2hpY2ggcmVqZWN0IGlzIGNhbGxlZCBpZiBub3QgeWV0IHJlc29sdmVkLlxuXHQtIERlZmF1bHRzIHRvIE9yZ3kuY29uZmlnKCkudGltZW91dC5cblx0LSBEZWxheXMgaW4gb2JqZWN0LnRoZW4oKSBhbmQgb2JqZWN0LmRvbmUoKSB3b24ndCBub3QgdHJpZ2dlciB0aGlzLCBiZWNhdXNlIHRob3NlIG1ldGhvZHMgcnVuIGFmdGVyIHJlc29sdmUuXG5cdCpcblx0KiBAcmV0dXJucyB7b2JqZWN0fSB7QGxpbmsgb3JneS9kZWZlcnJlZH1cblx0Ki9cblx0Q2xzLnB1YmxpYy5kZWZlcnJlZCA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuXG5cdFx0dmFyIF9vO1xuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG5cdFx0aWYob3B0aW9ucy5pZCAmJiBDbHMucHJpdmF0ZS5jb25maWcubGlzdFtvcHRpb25zLmlkXSl7XG5cdFx0XHRfbyA9IENscy5wcml2YXRlLmNvbmZpZy5saXN0W29wdGlvbnMuaWRdO1xuXHRcdH1cblx0XHRlbHNle1xuXG5cdFx0XHQvL0NyZWF0ZSBhIG5ldyBkZWZlcnJlZCBvYmplY3Rcblx0XHRcdF9vID0gQ2xzLnByaXZhdGUuY29uZmlnLm5haXZlX2Nsb25lcihbX3B1YmxpY10sW29wdGlvbnNdKTtcblxuXHRcdFx0Ly9BQ1RJVkFURSBERUZFUlJFRFxuXHRcdFx0X28gPSBfcHJpdmF0ZS5hY3RpdmF0ZShfbyk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIF9vO1xuXHR9O1xuXG5cdF9wcml2YXRlLnB1YmxpYyA9IF9wdWJsaWM7XG5cblx0Ly9TYXZlIGZvciByZS11c2Vcblx0Q2xzLnByaXZhdGUuZGVmZXJyZWQgPSBfcHJpdmF0ZTsgXG5cblx0cmV0dXJuIENscztcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oQ2xzKXtcblxuXHR2YXIgX3B1YmxpYyA9IHt9LFxuXHRcdFx0X3ByaXZhdGUgPSB7fTtcblxuXHRfcHVibGljLmJyb3dzZXIgPSB7fTtcblx0X3B1YmxpYy5uYXRpdmUgPSB7fTtcblx0X3ByaXZhdGUubmF0aXZlID0ge307XG5cblx0Ly9Ccm93c2VyIGxvYWRcblxuXHRfcHVibGljLmJyb3dzZXIuY3NzID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cblx0XHR2YXIgaGVhZCA9XHRkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImhlYWRcIilbMF0gfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuXHRcdGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlua1wiKTtcblxuXHRcdGVsZW0uc2V0QXR0cmlidXRlKFwiaHJlZlwiLHBhdGgpO1xuXHRcdGVsZW0uc2V0QXR0cmlidXRlKFwidHlwZVwiLFwidGV4dC9jc3NcIik7XG5cdFx0ZWxlbS5zZXRBdHRyaWJ1dGUoXCJyZWxcIixcInN0eWxlc2hlZXRcIik7XG5cblx0XHRpZihlbGVtLm9ubG9hZCl7XG5cdFx0XHQoZnVuY3Rpb24oZWxlbSl7XG5cdFx0XHRcdFx0ZWxlbS5vbmxvYWQgPSBlbGVtLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXHRcdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShlbGVtKTtcblx0XHRcdFx0IH07XG5cblx0XHRcdFx0IGVsZW0ub25lcnJvciA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXHRcdFx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KFwiRmFpbGVkIHRvIGxvYWQgcGF0aDogXCIgKyBwYXRoKTtcblx0XHRcdFx0IH07XG5cblx0XHRcdH0oZWxlbSxwYXRoLGRlZmVycmVkKSk7XG5cblx0XHRcdGhlYWQuYXBwZW5kQ2hpbGQoZWxlbSk7XG5cdFx0fVxuXHRcdGVsc2V7XG5cdFx0XHQvL0FERCBlbGVtIEJVVCBNQUtFIFhIUiBSRVFVRVNUIFRPIENIRUNLIEZJTEUgUkVDRUlWRURcblx0XHRcdGhlYWQuYXBwZW5kQ2hpbGQoZWxlbSk7XG5cdFx0XHRjb25zb2xlLndhcm4oXCJObyBvbmxvYWQgYXZhaWxhYmxlIGZvciBsaW5rIHRhZywgYXV0b3Jlc29sdmluZy5cIik7XG5cdFx0XHRkZWZlcnJlZC5yZXNvbHZlKGVsZW0pO1xuXHRcdH1cblx0fTtcblxuXHRfcHVibGljLmJyb3dzZXIuc2NyaXB0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cblx0XHR2YXIgZWxlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIik7XG5cdFx0ZWxlbS50eXBlID0gJ3RleHQvamF2YXNjcmlwdCc7XG5cdFx0ZWxlbS5zZXRBdHRyaWJ1dGUoXCJzcmNcIixwYXRoKTtcblxuXHRcdChmdW5jdGlvbihlbGVtLHBhdGgsZGVmZXJyZWQpe1xuXHRcdFx0XHRlbGVtLm9ubG9hZCA9IGVsZW0ub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKXtcblx0XHRcdFx0XHQvL0F1dG9yZXNvbHZlIGJ5IGRlZmF1bHRcblx0XHRcdFx0XHRpZih0eXBlb2YgZGVmZXJyZWQuYXV0b3Jlc29sdmUgIT09ICdib29sZWFuJ1xuXHRcdFx0XHRcdHx8IGRlZmVycmVkLmF1dG9yZXNvbHZlID09PSB0cnVlKXtcblx0XHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoKHR5cGVvZiBlbGVtLnZhbHVlICE9PSAndW5kZWZpbmVkJykgPyBlbGVtLnZhbHVlIDogZWxlbSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXHRcdFx0XHRlbGVtLm9uZXJyb3IgPSBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdGRlZmVycmVkLnJlamVjdChcIkVycm9yIGxvYWRpbmc6IFwiICsgcGF0aCk7XG5cdFx0XHRcdH07XG5cdFx0fShlbGVtLHBhdGgsZGVmZXJyZWQpKTtcblxuXHRcdHRoaXMuaGVhZC5hcHBlbmRDaGlsZChlbGVtKTtcblx0fTtcblxuXHRfcHVibGljLmJyb3dzZXIuaHRtbCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQsZGVwKXtcblx0XHR0aGlzLmRlZmF1bHQocGF0aCxkZWZlcnJlZCxkZXApO1xuXHR9O1xuXG5cdF9wdWJsaWMuYnJvd3Nlci5kZWZhdWx0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCxvcHRpb25zKXtcblx0XHR2YXIgcixcblx0XHRyZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0XHRyZXEub3BlbignR0VUJywgcGF0aCwgdHJ1ZSk7XG5cblx0XHQoZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cdFx0XHRyZXEub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmIChyZXEucmVhZHlTdGF0ZSA9PT0gNCkge1xuXHRcdFx0XHRcdGlmKHJlcS5zdGF0dXMgPT09IDIwMCl7XG5cdFx0XHRcdFx0XHRyID0gcmVxLnJlc3BvbnNlVGV4dDtcblx0XHRcdFx0XHRcdGlmKG9wdGlvbnMudHlwZSAmJiBvcHRpb25zLnR5cGUgPT09ICdqc29uJyl7XG5cdFx0XHRcdFx0XHRcdHRyeXtcblx0XHRcdFx0XHRcdFx0XHRyID0gSlNPTi5wYXJzZShyKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRjYXRjaChlKXtcblx0XHRcdFx0XHRcdFx0XHRfcHVibGljLmRlYnVnKFtcblx0XHRcdFx0XHRcdFx0XHRcdFwiQ291bGQgbm90IGRlY29kZSBKU09OXCJcblx0XHRcdFx0XHRcdFx0XHRcdCxwYXRoXG5cdFx0XHRcdFx0XHRcdFx0XHQsclxuXHRcdFx0XHRcdFx0XHRcdF0sZGVmZXJyZWQpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KFwiRXJyb3IgbG9hZGluZzogXCIgKyBwYXRoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0fShwYXRoLGRlZmVycmVkKSk7XG5cblx0XHRyZXEuc2VuZChudWxsKTtcblx0fTtcblxuXG5cblx0Ly9OYXRpdmUgbG9hZFxuXG5cdF9wdWJsaWMubmF0aXZlLmNzcyA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXHRcdF9wdWJsaWMuYnJvd3Nlci5jc3MocGF0aCxkZWZlcnJlZCk7XG5cdH07XG5cblx0X3B1YmxpYy5uYXRpdmUuc2NyaXB0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cdFx0Ly9sb2NhbCBwYWNrYWdlXG5cdFx0aWYocGF0aFswXT09PScuJyl7XG5cdFx0XHRwYXRoID0gX3ByaXZhdGUubmF0aXZlLnByZXBhcmVfcGF0aChwYXRoLGRlZmVycmVkKTtcblx0XHRcdHZhciByID0gcmVxdWlyZShwYXRoKTtcblx0XHRcdC8vQXV0b3Jlc29sdmUgYnkgZGVmYXVsdFxuXHRcdFx0aWYodHlwZW9mIGRlZmVycmVkLmF1dG9yZXNvbHZlICE9PSAnYm9vbGVhbidcblx0XHRcdHx8IGRlZmVycmVkLmF1dG9yZXNvbHZlID09PSB0cnVlKXtcblx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShyKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly9yZW1vdGUgc2NyaXB0XG5cdFx0ZWxzZXtcblx0XHRcdC8vQ2hlY2sgdGhhdCB3ZSBoYXZlIGNvbmZpZ3VyZWQgdGhlIGVudmlyb25tZW50IHRvIGFsbG93IHRoaXMsXG5cdFx0XHQvL2FzIGl0IHJlcHJlc2VudHMgYSBzZWN1cml0eSB0aHJlYXQgYW5kIHNob3VsZCBvbmx5IGJlIHVzZWQgZm9yIGRlYnVnZ2luZ1xuXHRcdFx0aWYoIUNscy5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy5kZWJ1Z19tb2RlKXtcblx0XHRcdFx0Q2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFwiU2V0IGNvbmZpZy5kZWJ1Z19tb2RlPTEgdG8gcnVuIHJlbW90ZSBzY3JpcHRzIG91dHNpZGUgb2YgZGVidWcgbW9kZS5cIik7XG5cdFx0XHR9XG5cdFx0XHRlbHNle1xuXHRcdFx0XHRfcHJpdmF0ZS5uYXRpdmUuZ2V0KHBhdGgsZGVmZXJyZWQsZnVuY3Rpb24oZGF0YSl7XG5cdFx0XHRcdFx0dmFyIFZtID0gcmVxdWlyZSgndm0nKTtcblx0XHRcdFx0XHRyID0gVm0ucnVuSW5UaGlzQ29udGV4dChkYXRhKTtcblx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHIpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0X3B1YmxpYy5uYXRpdmUuaHRtbCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXHRcdF9wdWJsaWMubmF0aXZlLmRlZmF1bHQocGF0aCxkZWZlcnJlZCk7XG5cdH07XG5cblx0X3B1YmxpYy5uYXRpdmUuZGVmYXVsdCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXHRcdChmdW5jdGlvbihkZWZlcnJlZCl7XG5cdFx0XHRfcHJpdmF0ZS5uYXRpdmUuZ2V0KHBhdGgsZGVmZXJyZWQsZnVuY3Rpb24ocil7XG5cdFx0XHRcdGlmKGRlZmVycmVkLnR5cGUgPT09ICdqc29uJyl7XG5cdFx0XHRcdFx0ciA9IEpTT04ucGFyc2Uocik7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShyKTtcblx0XHRcdH0pO1xuXHRcdH0pKGRlZmVycmVkKTtcblx0fTtcblxuXHRfcHJpdmF0ZS5uYXRpdmUuZ2V0ID0gZnVuY3Rpb24gKHBhdGgsZGVmZXJyZWQsY2FsbGJhY2spe1xuXHRcdHBhdGggPSBfcHJpdmF0ZS5uYXRpdmUucHJlcGFyZV9wYXRoKHBhdGgpO1xuXHRcdGlmKHBhdGhbMF0gPT09ICcuJyl7XG5cdFx0XHQvL2ZpbGUgc3lzdGVtXG5cdFx0XHR2YXIgRnMgPSByZXF1aXJlKCdmcycpO1xuXHRcdFx0RnMucmVhZEZpbGUocGF0aCwgXCJ1dGYtOFwiLCBmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG5cdFx0XHRcdGlmIChlcnIpe1xuXHRcdFx0XHRcdHRocm93IGVycjtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdGNhbGxiYWNrKGRhdGEpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0ZWxzZXtcblx0XHRcdC8vaHR0cFxuXHRcdFx0dmFyIHJlcXVlc3QgPSByZXF1aXJlKCdyZXF1ZXN0Jyk7XG5cdFx0XHRyZXF1ZXN0KHBhdGgsZnVuY3Rpb24oZXJyb3IscmVzcG9uc2UsYm9keSl7XG5cdFx0XHRcdGlmICghZXJyb3IgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9PT0gMjAwKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2soYm9keSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHR0aHJvdyBlcnJvcjtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9O1xuXG5cdF9wcml2YXRlLm5hdGl2ZS5wcmVwYXJlX3BhdGggPSBmdW5jdGlvbihwKXtcblx0XHRwID0gKHBbMF0gIT09ICcvJyAmJiBwWzBdICE9PSAnLicpXG5cdFx0PyAoKHBbMF0uaW5kZXhPZihcImh0dHBcIikhPT0wKSA/ICcuLycgKyBwIDogcCkgOiBwO1xuXHRcdHJldHVybiBwO1xuXHR9O1xuXG5cdENscy5wdWJsaWMuZmlsZV9sb2FkZXIgPSBfcHVibGljO1xuXG5cdENscy5wcml2YXRlLmZpbGVfbG9hZGVyID0gX3ByaXZhdGU7XG5cblx0cmV0dXJuIENscztcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oQ2xzKXtcblxuXG5cdC8qKlxuXHQgKiBAbmFtZXNwYWNlIG9yZ3kvcXVldWVcblx0ICogQGJvcnJvd3Mgb3JneS9kZWZlcnJlZCN0aGVuIGFzICN0aGVuXG5cdCAqIEBib3Jyb3dzIG9yZ3kvZGVmZXJyZWQjZG9uZSBhcyAjZG9uZVxuXHQgKiBAYm9ycm93cyBvcmd5L2RlZmVycmVkI3JlamVjdCBhcyAjcmVqZWN0XG5cdCAqIEBib3Jyb3dzIG9yZ3kvZGVmZXJyZWQjcmVzb2x2ZSBhcyAjcmVzb2x2ZVxuXHQgKlxuXHQqL1xuXG5cdHZhciBfcHJpdmF0ZSA9IHt9O1xuXG5cdC8qKlxuXHQgKiBBY3RpdmF0ZXMgYSBxdWV1ZSBvYmplY3QuXG5cdCAqXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBvXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG5cdCAqIEBwYXJhbSB7YXJyYXl9IGRlcHNcblx0ICogQHJldHVybnMge29iamVjdH0gcXVldWVcblx0ICovXG5cdF9wcml2YXRlLmFjdGl2YXRlID0gZnVuY3Rpb24obyxvcHRpb25zLGRlcHMpe1xuXG5cdFx0XHQvL0FDVElWQVRFIEFTIEEgREVGRVJSRURcblx0XHRcdC8vdmFyIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHRoaXMpO1xuXHRcdFx0byA9IENscy5wcml2YXRlLmRlZmVycmVkLmFjdGl2YXRlKG8pO1xuXG5cdFx0XHQvL0B0b2RvIHJldGhpbmsgdGhpc1xuXHRcdFx0Ly9UaGlzIHRpbWVvdXQgZ2l2ZXMgZGVmaW5lZCBwcm9taXNlcyB0aGF0IGFyZSBkZWZpbmVkXG5cdFx0XHQvL2Z1cnRoZXIgZG93biB0aGUgc2FtZSBzY3JpcHQgYSBjaGFuY2UgdG8gZGVmaW5lIHRoZW1zZWx2ZXNcblx0XHRcdC8vYW5kIGluIGNhc2UgdGhpcyBxdWV1ZSBpcyBhYm91dCB0byByZXF1ZXN0IHRoZW0gZnJvbSBhXG5cdFx0XHQvL3JlbW90ZSBzb3VyY2UgaGVyZS5cblx0XHRcdC8vVGhpcyBpcyBpbXBvcnRhbnQgaW4gdGhlIGNhc2Ugb2YgY29tcGlsZWQganMgZmlsZXMgdGhhdCBjb250YWluXG5cdFx0XHQvL211bHRpcGxlIG1vZHVsZXMgd2hlbiBkZXBlbmQgb24gZWFjaCBvdGhlci5cblxuXHRcdFx0Ly90ZW1wb3JhcmlseSBjaGFuZ2Ugc3RhdGUgdG8gcHJldmVudCBvdXRzaWRlIHJlc29sdXRpb25cblx0XHRcdG8uc3RhdGUgPSAtMTtcblxuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cblx0XHRcdFx0Ly9SZXN0b3JlIHN0YXRlXG5cdFx0XHRvLnN0YXRlID0gMDtcblxuXHRcdFx0XHQvL0FERCBERVBFTkRFTkNJRVMgVE8gUVVFVUVcblx0XHRcdFx0X3B1YmxpYy5hZGQuY2FsbChvLGRlcHMpO1xuXG5cdFx0XHRcdC8vU0VFIElGIENBTiBCRSBJTU1FRElBVEVMWSBSRVNPTFZFRCBCWSBDSEVDS0lORyBVUFNUUkVBTVxuXHRcdFx0XHRDbHMucHJpdmF0ZS5kZWZlcnJlZC5yZWNlaXZlX3NpZ25hbChvLG8uaWQpO1xuXG5cdFx0XHRcdC8vQVNTSUdOIFRISVMgUVVFVUUgVVBTVFJFQU0gVE8gT1RIRVIgUVVFVUVTXG5cdFx0XHRcdGlmKG8uYXNzaWduKXtcblx0XHRcdFx0XHRcdGZvcih2YXIgYSBpbiBvLmFzc2lnbil7XG5cdFx0XHRcdFx0XHRcdFx0c2VsZi5hc3NpZ24oby5hc3NpZ25bYV0sW29dLHRydWUpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LDEpO1xuXG5cdFx0XHRyZXR1cm4gbztcblx0fTtcblxuXG5cdC8qKlxuXHQqIFVwZ3JhZGVzIGEgcHJvbWlzZSBvYmplY3QgdG8gYSBxdWV1ZS5cblx0KlxuXHQqIEBwYXJhbSB7b2JqZWN0fSBvYmpcblx0KiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuXHQqIEBwYXJhbSB7YXJyYXl9IGRlcHMgXFxkZXBlbmRlbmNpZXNcblx0KiBAcmV0dXJucyB7b2JqZWN0fSBxdWV1ZSBvYmplY3Rcblx0Ki9cblx0X3ByaXZhdGUudXBncmFkZSA9IGZ1bmN0aW9uKG9iaixvcHRpb25zLGRlcHMpe1xuXG5cdFx0XHRpZihvYmouc2V0dGxlZCAhPT0gMCB8fCAob2JqLm1vZGVsICE9PSAncHJvbWlzZScgJiYgb2JqLm1vZGVsICE9PSAnZGVmZXJyZWQnKSl7XG5cdFx0XHRcdFx0cmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZygnQ2FuIG9ubHkgdXBncmFkZSB1bnNldHRsZWQgcHJvbWlzZSBvciBkZWZlcnJlZCBpbnRvIGEgcXVldWUuJyk7XG5cdFx0XHR9XG5cblx0XHQgLy9HRVQgQSBORVcgUVVFVUUgT0JKRUNUIEFORCBNRVJHRSBJTlxuXHRcdFx0dmFyIF9vID0gQ2xzLnByaXZhdGUuY29uZmlnLm5haXZlX2Nsb25lcihbX3B1YmxpY10sW29wdGlvbnNdKTtcblxuXHRcdFx0Zm9yKHZhciBpIGluIF9vKXtcblx0XHRcdFx0IG9ialtpXSA9IF9vW2ldO1xuXHRcdFx0fVxuXG5cdFx0XHQvL2RlbGV0ZSBfbztcblxuXHRcdFx0Ly9DUkVBVEUgTkVXIElOU1RBTkNFIE9GIFFVRVVFXG5cdFx0XHRvYmogPSB0aGlzLmFjdGl2YXRlKG9iaixvcHRpb25zLGRlcHMpO1xuXG5cdFx0XHQvL1JFVFVSTiBRVUVVRSBPQkpFQ1Rcblx0XHRcdHJldHVybiBvYmo7XG5cdH07XG5cblxuXG5cblx0dmFyIF9wdWJsaWMgPSB7fTtcblx0XG5cdF9wdWJsaWMubW9kZWwgPSAncXVldWUnO1xuXG5cdC8vU0VUIFRSVUUgQUZURVIgUkVTT0xWRVIgRklSRURcblx0X3B1YmxpYy5yZXNvbHZlcl9maXJlZCA9IDA7XG5cblx0Ly9QUkVWRU5UUyBBIFFVRVVFIEZST00gUkVTT0xWSU5HIEVWRU4gSUYgQUxMIERFUEVOREVOQ0lFUyBNRVRcblx0Ly9QVVJQT1NFOiBQUkVWRU5UUyBRVUVVRVMgQ1JFQVRFRCBCWSBBU1NJR05NRU5UIEZST00gUkVTT0xWSU5HXG5cdC8vQkVGT1JFIFRIRVkgQVJFIEZPUk1BTExZIElOU1RBTlRJQVRFRFxuXHRfcHVibGljLmhhbHRfcmVzb2x1dGlvbiA9IDA7XG5cblx0Ly9VU0VEIFRPIENIRUNLIFNUQVRFLCBFTlNVUkVTIE9ORSBDT1BZXG5cdF9wdWJsaWMudXBzdHJlYW0gPSB7fTtcblxuXHQvL1VTRUQgUkVUVVJOIFZBTFVFUywgRU5TVVJFUyBPUkRFUlxuXHRfcHVibGljLmRlcGVuZGVuY2llcyA9IFtdO1xuXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXHQvL1x0UVVFVUUgSU5TVEFOQ0UgTUVUSE9EU1xuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXHQvKipcblx0KiBBZGQgbGlzdCBvZiBkZXBlbmRlbmNpZXMgdG8gYSBxdWV1ZSdzIHVwc3RyZWFtIGFycmF5LlxuXHQqXG5cdCogVGhlIHF1ZXVlIHdpbGwgcmVzb2x2ZSBvbmNlIGFsbCB0aGUgcHJvbWlzZXMgaW4gaXRzXG5cdCogdXBzdHJlYW0gYXJyYXkgYXJlIHJlc29sdmVkLlxuXHQqXG5cdCogV2hlbiBfcHVibGljLkNscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyA9PSAxLCBtZXRob2Qgd2lsbCB0ZXN0IGVhY2hcblx0KiBkZXBlbmRlbmN5IGlzIG5vdCBwcmV2aW91c2x5IHNjaGVkdWxlZCB0byByZXNvbHZlXG5cdCogZG93bnN0cmVhbSBmcm9tIHRoZSB0YXJnZXQsIGluIHdoaWNoXG5cdCogY2FzZSBpdCB3b3VsZCBuZXZlciByZXNvbHZlIGJlY2F1c2UgaXRzIHVwc3RyZWFtIGRlcGVuZHMgb24gaXQuXG5cdCpcblx0KiBAcGFyYW0ge2FycmF5fSBhcnJcdC9hcnJheSBvZiBkZXBlbmRlbmNpZXMgdG8gYWRkXG5cdCogQHJldHVybnMge2FycmF5fSB1cHN0cmVhbVxuXHQqL1xuXHRfcHVibGljLmFkZCA9IGZ1bmN0aW9uKGFycil7XG5cblx0XHR0cnl7XG5cdFx0XHRcdGlmKGFyci5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy51cHN0cmVhbTtcblx0XHRcdFx0fVxuXHRcdH1cblx0XHRjYXRjaChlcnIpe1xuXHRcdFx0XHRDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoZXJyKTtcblx0XHR9XG5cblx0XHQvL0lGIE5PVCBQRU5ESU5HLCBETyBOT1QgQUxMT1cgVE8gQUREXG5cdFx0aWYodGhpcy5zdGF0ZSAhPT0gMCl7XG5cdFx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoW1xuXHRcdFx0XHRcdFwiQ2Fubm90IGFkZCBkZXBlbmRlbmN5IGxpc3QgdG8gcXVldWUgaWQ6J1wiK3RoaXMuaWRcblx0XHRcdFx0XHQrXCInLiBRdWV1ZSBzZXR0bGVkL2luIHRoZSBwcm9jZXNzIG9mIGJlaW5nIHNldHRsZWQuXCJcblx0XHRcdFx0XSxhcnIsdGhpcyk7XG5cdFx0fVxuXG5cdFx0Zm9yKHZhciBhIGluIGFycil7XG5cblx0XHRcdFx0c3dpdGNoKHRydWUpe1xuXG5cdFx0XHRcdFx0XHQvL0NIRUNLIElGIEVYSVNUU1xuXHRcdFx0XHRcdFx0Y2FzZSh0eXBlb2YgQ2xzLnByaXZhdGUuY29uZmlnLmxpc3RbYXJyW2FdLmlkXSA9PT0gJ29iamVjdCcpOlxuXHRcdFx0XHRcdFx0XHRcdGFyclthXSA9IENscy5wcml2YXRlLmNvbmZpZy5saXN0W2FyclthXS5pZF07XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdC8vSUYgTk9ULCBBVFRFTVBUIFRPIENPTlZFUlQgSVQgVE8gQU4gT1JHWSBQUk9NSVNFXG5cdFx0XHRcdFx0XHRjYXNlKHR5cGVvZiBhcnJbYV0gPT09ICdvYmplY3QnICYmICghYXJyW2FdLmlzX29yZ3kpKTpcblx0XHRcdFx0XHRcdFx0XHRhcnJbYV0gPSBDbHMucHJpdmF0ZS5kZWZlcnJlZC5jb252ZXJ0X3RvX3Byb21pc2UoYXJyW2FdLHtcblx0XHRcdFx0XHRcdFx0XHRcdHBhcmVudCA6IHRoaXNcblx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0Ly9SRUYgSVMgQSBQUk9NSVNFLlxuXHRcdFx0XHRcdFx0Y2FzZSh0eXBlb2YgYXJyW2FdLnRoZW4gPT09ICdmdW5jdGlvbicpOlxuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0XHRcdENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhbXG5cdFx0XHRcdFx0XHRcdFx0XHRcIk9iamVjdCBjb3VsZCBub3QgYmUgY29udmVydGVkIHRvIHByb21pc2UuXCIsXG5cdFx0XHRcdFx0XHRcdFx0XHRhcnJbYV1cblx0XHRcdFx0XHRcdFx0XHRdKTtcblx0XHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vbXVzdCBjaGVjayB0aGUgdGFyZ2V0IHRvIHNlZSBpZiB0aGUgZGVwZW5kZW5jeSBleGlzdHMgaW4gaXRzIGRvd25zdHJlYW1cblx0XHRcdFx0Zm9yKHZhciBiIGluIHRoaXMuZG93bnN0cmVhbSl7XG5cdFx0XHRcdFx0XHRpZihiID09PSBhcnJbYV0uaWQpe1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoW1xuXHRcdFx0XHRcdFx0XHRcdFx0XCJFcnJvciBhZGRpbmcgdXBzdHJlYW0gZGVwZW5kZW5jeSAnXCJcblx0XHRcdFx0XHRcdFx0XHRcdCthcnJbYV0uaWQrXCInIHRvIHF1ZXVlXCIrXCIgJ1wiXG5cdFx0XHRcdFx0XHRcdFx0XHQrdGhpcy5pZCtcIicuXFxuIFByb21pc2Ugb2JqZWN0IGZvciAnXCJcblx0XHRcdFx0XHRcdFx0XHRcdCthcnJbYV0uaWQrXCInIGlzIHNjaGVkdWxlZCB0byByZXNvbHZlIGRvd25zdHJlYW0gZnJvbSBxdWV1ZSAnXCJcblx0XHRcdFx0XHRcdFx0XHRcdCt0aGlzLmlkK1wiJyBzbyBpdCBjYW4ndCBiZSBhZGRlZCB1cHN0cmVhbS5cIlxuXHRcdFx0XHRcdFx0XHRcdF1cblx0XHRcdFx0XHRcdFx0XHQsdGhpcyk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvL0FERCBUTyBVUFNUUkVBTSwgRE9XTlNUUkVBTSwgREVQRU5ERU5DSUVTXG5cdFx0XHRcdHRoaXMudXBzdHJlYW1bYXJyW2FdLmlkXSA9IGFyclthXTtcblx0XHRcdFx0YXJyW2FdLmRvd25zdHJlYW1bdGhpcy5pZF0gPSB0aGlzO1xuXHRcdFx0XHR0aGlzLmRlcGVuZGVuY2llcy5wdXNoKGFyclthXSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMudXBzdHJlYW07XG5cdH07XG5cblx0LyoqXG5cdCogUmVtb3ZlIGxpc3QgZnJvbSBhIHF1ZXVlLlxuXHQqXG5cdCogQHBhcmFtIHthcnJheX0gYXJyXG5cdCogQHJldHVybnMge2FycmF5fSBhcnJheSBvZiBsaXN0IHRoZSBxdWV1ZSBpcyB1cHN0cmVhbVxuXHQqL1xuXHRfcHVibGljLnJlbW92ZSA9IGZ1bmN0aW9uKGFycil7XG5cblx0XHQvL0lGIE5PVCBQRU5ESU5HLCBETyBOT1QgQUxMT1cgUkVNT1ZBTFxuXHRcdGlmKHRoaXMuc3RhdGUgIT09IDApe1xuXHRcdFx0XHRyZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFwiQ2Fubm90IHJlbW92ZSBsaXN0IGZyb20gcXVldWUgaWQ6J1wiK3RoaXMuaWQrXCInLiBRdWV1ZSBzZXR0bGVkL2luIHRoZSBwcm9jZXNzIG9mIGJlaW5nIHNldHRsZWQuXCIpO1xuXHRcdH1cblxuXHRcdGZvcih2YXIgYSBpbiBhcnIpe1xuXHRcdFx0aWYodGhpcy51cHN0cmVhbVthcnJbYV0uaWRdKXtcblx0XHRcdFx0XHRkZWxldGUgdGhpcy51cHN0cmVhbVthcnJbYV0uaWRdO1xuXHRcdFx0XHRcdGRlbGV0ZSBhcnJbYV0uZG93bnN0cmVhbVt0aGlzLmlkXTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCogUmVzZXRzIGFuIGV4aXN0aW5nLHNldHRsZWQgcXVldWUgYmFjayB0byBPcmd5aW5nIHN0YXRlLlxuXHQqIENsZWFycyBvdXQgdGhlIGRvd25zdHJlYW0uXG5cdCogRmFpbHMgaWYgbm90IHNldHRsZWQuXG5cdCogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcblx0KiBAcmV0dXJucyB7Q2xzLnByaXZhdGUuZGVmZXJyZWQudHBsfEJvb2xlYW59XG5cdCovXG5cdF9wdWJsaWMucmVzZXQgPSBmdW5jdGlvbihvcHRpb25zKXtcblxuXHRcdGlmKHRoaXMuc2V0dGxlZCAhPT0gMSB8fCB0aGlzLnN0YXRlICE9PSAxKXtcblx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoXCJDYW4gb25seSByZXNldCBhIHF1ZXVlIHNldHRsZWQgd2l0aG91dCBlcnJvcnMuXCIpO1xuXHRcdH1cblxuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG5cdFx0dGhpcy5zZXR0bGVkID0gMDtcblx0XHR0aGlzLnN0YXRlID0gMDtcblx0XHR0aGlzLnJlc29sdmVyX2ZpcmVkID0gMDtcblx0XHR0aGlzLmRvbmVfZmlyZWQgPSAwO1xuXG5cdFx0Ly9SRU1PVkUgQVVUTyBUSU1FT1VUIFRJTUVSXG5cdFx0aWYodGhpcy50aW1lb3V0X2lkKXtcblx0XHRcdGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRfaWQpO1xuXHRcdH1cblxuXHRcdC8vQ0xFQVIgT1VUIFRIRSBET1dOU1RSRUFNXG5cdFx0dGhpcy5kb3duc3RyZWFtID0ge307XG5cdFx0dGhpcy5kZXBlbmRlbmNpZXMgPSBbXTtcblxuXHRcdC8vU0VUIE5FVyBBVVRPIFRJTUVPVVRcblx0XHRDbHMucHJpdmF0ZS5kZWZlcnJlZC5hdXRvX3RpbWVvdXQuY2FsbCh0aGlzLG9wdGlvbnMudGltZW91dCk7XG5cblx0XHQvL1BPSU5UTEVTUyAtIFdJTEwgSlVTVCBJTU1FRElBVEVMWSBSRVNPTFZFIFNFTEZcblx0XHQvL3RoaXMuY2hlY2tfc2VsZigpXG5cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXG5cdC8qKlxuXHQqIENhdWFlcyBhIHF1ZXVlIHRvIGxvb2sgb3ZlciBpdHMgZGVwZW5kZW5jaWVzIGFuZCBzZWUgaWYgaXRcblx0KiBjYW4gYmUgcmVzb2x2ZWQuXG5cdCpcblx0KiBUaGlzIGlzIGRvbmUgYXV0b21hdGljYWxseSBieSBlYWNoIGRlcGVuZGVuY3kgdGhhdCBsb2Fkcyxcblx0KiBzbyBpcyBub3QgbmVlZGVkIHVubGVzczpcblx0KlxuXHQqIC1kZWJ1Z2dpbmdcblx0KlxuXHQqIC10aGUgcXVldWUgaGFzIGJlZW4gcmVzZXQgYW5kIG5vIG5ld1xuXHQqIGRlcGVuZGVuY2llcyB3ZXJlIHNpbmNlIGFkZGVkLlxuXHQqXG5cdCogQHJldHVybnMge2ludH0gU3RhdGUgb2YgdGhlIHF1ZXVlLlxuXHQqL1xuXHRfcHVibGljLmNoZWNrX3NlbGYgPSBmdW5jdGlvbigpe1xuXHRcdENscy5wcml2YXRlLmRlZmVycmVkLnJlY2VpdmVfc2lnbmFsKHRoaXMsdGhpcy5pZCk7XG5cdFx0cmV0dXJuIHRoaXMuc3RhdGU7XG5cdH07XG5cblxuXHQvKipcblx0ICogQ3JlYXRlcyBhIG5ldyBxdWV1ZSBvYmplY3QuXG5cdCAqIElmIG5vIDxiPnJlc29sdmVyPC9iPiBvcHRpb24gaXMgc2V0LCByZXNvbHZlZCB3aGVuIGFsbCBkZXBlbmRlbmNpZXMgYXJlIHJlc29sdmVkLiBFbHNlLCByZXNvbHZlZCB3aGVuIHRoZSBkZWZlcnJlZCBwYXJhbSBwYXNzZWQgdG8gdGhlIHJlc29sdmVyIG9wdGlvblxuXHQgKiBpcyByZXNvbHZlZC5cblxuXHQgKiBAbWVtYmVyb2Ygb3JneVxuXHQgKiBAZnVuY3Rpb24gcXVldWVcblx0ICpcblx0ICogQHBhcmFtIHthcnJheX0gZGVwcyBBcnJheSBvZiBkZXBlbmRlbmNpZXMgdGhhdCBtdXN0IGJlIHJlc29sdmVkIGJlZm9yZSA8Yj5yZXNvbHZlcjwvYj4gb3B0aW9uIGlzIGNhbGxlZC5cblx0ICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcdExpc3Qgb2Ygb3B0aW9uczpcblxuXHQtIDxiPmlkPC9iPiB7c3RyaW5nfSBVbmlxdWUgaWQgb2YgdGhlIG9iamVjdC5cblx0XHQtIENhbiBiZSB1c2VkIHdpdGggT3JneS5nZXQoaWQpLlxuXHRcdC0gT3B0aW9uYWwuXG5cblxuXHQtIDxiPnRpbWVvdXQ8L2I+IHtudW1iZXJ9IFRpbWUgaW4gbXMgYWZ0ZXIgd2hpY2ggcmVqZWN0IGlzIGNhbGxlZC5cblx0XHQtIERlZmF1bHRzIHRvIE9yZ3kuY29uZmlnKCkudGltZW91dCBbNTAwMF0uXG5cdFx0LSBOb3RlIHRoZSB0aW1lb3V0IGlzIG9ubHkgYWZmZWN0ZWQgYnkgZGVwZW5kZW5jaWVzIGFuZC9vciB0aGUgcmVzb2x2ZXIgY2FsbGJhY2suXG5cdFx0LSBUaGVuLGRvbmUgZGVsYXlzIHdpbGwgbm90IGZsYWcgYSB0aW1lb3V0IGJlY2F1c2UgdGhleSBhcmUgY2FsbGVkIGFmdGVyIHRoZSBpbnN0YW5jZSBpcyBjb25zaWRlcmVkIHJlc29sdmVkLlxuXG5cblx0LSA8Yj5yZXNvbHZlcjwvYj4ge2Z1bmN0aW9uKDxpPnJlc3VsdDwvaT4sPGk+ZGVmZXJyZWQ8L2k+KX0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gZXhlY3V0ZSBhZnRlciBhbGwgZGVwZW5kZW5jaWVzIGhhdmUgcmVzb2x2ZWQuXG5cdFx0LSA8aT5yZXN1bHQ8L2k+IGlzIGFuIGFycmF5IG9mIHRoZSBxdWV1ZSdzIHJlc29sdmVkIGRlcGVuZGVuY3kgdmFsdWVzLlxuXHRcdC0gPGk+ZGVmZXJyZWQ8L2k+IGlzIHRoZSBxdWV1ZSBvYmplY3QuXG5cdFx0LSBUaGUgcXVldWUgd2lsbCBvbmx5IHJlc29sdmUgd2hlbiA8aT5kZWZlcnJlZDwvaT4ucmVzb2x2ZSgpIGlzIGNhbGxlZC4gSWYgbm90LCBpdCB3aWxsIHRpbWVvdXQgdG8gb3B0aW9ucy50aW1lb3V0IHx8IE9yZ3kuY29uZmlnKCkudGltZW91dC5cblxuXHRcdCogQHJldHVybnMge29iamVjdH0ge0BsaW5rIG9yZ3kvcXVldWV9XG5cdCAqXG5cdCAqL1xuXHRDbHMucHVibGljLnF1ZXVlID0gZnVuY3Rpb24oZGVwcyxvcHRpb25zKXtcblxuXHRcdHZhciBfbztcblx0XHRpZighKGRlcHMgaW5zdGFuY2VvZiBBcnJheSkpe1xuXHRcdFx0cmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcIlF1ZXVlIGRlcGVuZGVuY2llcyBtdXN0IGJlIGFuIGFycmF5LlwiKTtcblx0XHR9XG5cblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXHRcdC8vRE9FUyBOT1QgQUxSRUFEWSBFWElTVFxuXHRcdGlmKCFDbHMucHJpdmF0ZS5jb25maWcubGlzdFtvcHRpb25zLmlkXSl7XG5cblx0XHRcdC8vUGFzcyBhcnJheSBvZiBwcm90b3R5cGVzIHRvIHF1ZXVlIGZhY3Rvcnlcblx0XHRcdF9vID0gQ2xzLnByaXZhdGUuY29uZmlnLm5haXZlX2Nsb25lcihbQ2xzLnByaXZhdGUuZGVmZXJyZWQucHVibGljLF9wdWJsaWNdLFtvcHRpb25zXSk7XG5cblx0XHRcdC8vQWN0aXZhdGUgcXVldWVcblx0XHRcdF9vID0gX3ByaXZhdGUuYWN0aXZhdGUoX28sb3B0aW9ucyxkZXBzKTtcblxuXHRcdH1cblx0XHQvL0FMUkVBRFkgRVhJU1RTXG5cdFx0ZWxzZSB7XG5cblx0XHRcdF9vID0gQ2xzLnByaXZhdGUuY29uZmlnLmxpc3Rbb3B0aW9ucy5pZF07XG5cblx0XHRcdGlmKF9vLm1vZGVsICE9PSAncXVldWUnKXtcblx0XHRcdC8vTUFUQ0ggRk9VTkQgQlVUIE5PVCBBIFFVRVVFLCBVUEdSQURFIFRPIE9ORVxuXG5cdFx0XHRcdG9wdGlvbnMub3ZlcndyaXRhYmxlID0gMTtcblxuXHRcdFx0XHRfbyA9IF9wcml2YXRlLnVwZ3JhZGUoX28sb3B0aW9ucyxkZXBzKTtcblx0XHRcdH1cblx0XHRcdGVsc2V7XG5cblx0XHRcdFx0Ly9PVkVSV1JJVEUgQU5ZIEVYSVNUSU5HIE9QVElPTlNcblx0XHRcdFx0b3B0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLGtleSl7XG5cdFx0XHRcdFx0X29ba2V5XSA9IHZhbHVlOyBcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0Ly9BREQgQURESVRJT05BTCBERVBFTkRFTkNJRVMgSUYgTk9UIFJFU09MVkVEXG5cdFx0XHRcdGlmKGRlcHMubGVuZ3RoID4gMCl7XG5cdFx0XHRcdFx0X3ByaXZhdGUudHBsLmFkZC5jYWxsKF9vLGRlcHMpO1xuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdFx0Ly9SRVNVTUUgUkVTT0xVVElPTiBVTkxFU1MgU1BFQ0lGSUVEIE9USEVSV0lTRVxuXHRcdFx0X28uaGFsdF9yZXNvbHV0aW9uID0gKHR5cGVvZiBvcHRpb25zLmhhbHRfcmVzb2x1dGlvbiAhPT0gJ3VuZGVmaW5lZCcpID9cblx0XHRcdG9wdGlvbnMuaGFsdF9yZXNvbHV0aW9uIDogMDtcblx0XHR9XG5cblx0XHRyZXR1cm4gX287XG5cdH07XG5cblx0Ly9zYXZlIGZvciByZS11c2Vcblx0Q2xzLnByaXZhdGUucXVldWUgPSBfcHJpdmF0ZTtcblx0XHRcblx0cmV0dXJuIENscztcbn07XG4iXX0=
