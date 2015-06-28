(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Orgy = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/src/main.js":[function(require,module,exports){
var Orgy = Object.create({
	private:{}
});

require('./config.js')(Orgy);
require('./file_loader.js')(Orgy);
require('./deferred.js')(Orgy);
require('./queue.js')(Orgy);
require('./cast.js')(Orgy);

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
Orgy.define = function(id,data,options){

		var def;
		options = options || {};
		options.dependencies = options.dependencies || null;
		options.resolver = options.resolver || null;

		//test for a valid id
		if(typeof id !== 'string'){
			Orgy.private.config.debug("Must set id when defining an instance.");
		}

		//Check no existing instance defined with same id
		if(Orgy.private.config.list[id] && Orgy.private.config.list[id].settled === 1){
			return Orgy.private.config.debug("Can't define " + id + ". Already resolved.");
		}

		options.id = id;

		if(options.dependencies !== null
			&& options.dependencies instanceof Array){
			//Define as a queue - can't autoresolve because we have deps
			var deps = options.dependencies;
			delete options.dependencies;
			def = Orgy.queue(deps,options);
		}
		else{
			//Define as a deferred
			def = Orgy.deferred(options);

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
Orgy.get = function(id){
	if(Orgy.private.config.list[id]){
		return Orgy.private.config.list[id];
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
 * @param {string|object} tgt Orgy.queue id / queue object
 * @param {array}  arr	Array of promise ids or dependency objects
 * @param {boolean} add  If true <b>ADD</b> array to queue dependencies, If false <b>REMOVE</b> array from queue dependencies
 *
 * @return {object} queue
 */
Orgy.assign = function(tgt,arr,add){

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
						return Orgy.private.config.debug("Assign target must be a queue object or the id of a queue.",this);
		}

		//IF TARGET ALREADY LISTED
		if(Orgy.private.config.list[id] && Orgy.private.config.list[id].model === 'queue'){
				q = Orgy.private.config.list[id];

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
				q = Orgy.queue(arr,{
						id : id
				});
		}
		//ERROR: CAN'T REMOVE FROM A QUEUE THAT DOES NOT EXIST
		else{
				return Orgy.private.config.debug("Cannot remove dependencies from a queue that does not exist.",this);
		}

		return q;
};

module.exports = Orgy;

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
module.exports = function(Orgy){

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
	Orgy.cast = function(obj){

			var required = ["then","error","id"];
			for(var i in required){
				if(!obj.hasOwnProperty(required[i])){
					return Orgy.private.config.debug("Cast method missing property '" + required[i] +"'");
				}
			}

			var options = {};
			options.id = obj.id;

			//Make sure id does not conflict with existing
			if(Orgy.private.config.list[options.id]){
				return Orgy.private.config.debug("Id "+options.id+" conflicts with existing id.");
			}

			//Create a deferred
			var def = Orgy.deferred(options);

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

	return Orgy;
}

},{}],4:[function(require,module,exports){
(function (process){
module.exports = function(Orgy){

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
	Orgy.config = function(obj){

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
	Orgy.private.config = _private;

	return Orgy;

}


}).call(this,require('_process'))

},{"_process":2}],5:[function(require,module,exports){
module.exports = function(Orgy){

	/**
	* @namespace orgy/deferred
	*/

	
	var _private = {};


	_private.activate = function(obj){

			 //if no id, generate one
			if(!obj.id){
				obj.id = Orgy.private.config.generate_id();
			}

			//MAKE SURE NAMING CONFLICT DOES NOT EXIST
			if(Orgy.private.config.list[obj.id] && !Orgy.private.config.list[obj.id].overwritable){
					Orgy.private.config.debug("Tried illegal overwrite of "+obj.id+".");
					return Orgy.private.config.list[obj.id];
			}

			//SAVE TO MASTER LIST
			//@todo only save if was assigned an id,
			//which implies user intends to access somewhere else outside of scope
			Orgy.private.config.list[obj.id] = obj;

			//AUTO TIMEOUT
			_private.auto_timeout.call(obj);

			//Call hook
			if(Orgy.private.config.settings.hooks.onActivate){
				Orgy.private.config.settings.hooks.onActivate(obj);
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
			if(Orgy.private.config.settings.hooks.onSettle){
				Orgy.private.config.settings.hooks.onSettle(def);
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
			? this.timeout : Orgy.private.config.settings.timeout;

			//AUTO REJECT ON timeout
			if(!this.type || this.type !== 'timer'){

					//DELETE PREVIOUS TIMEOUT IF EXISTS
					if(this.timeout_id){
							clearTimeout(this.timeout_id);
					}
					
					if(typeof this.timeout === 'undefined'){
							Orgy.private.config.debug([
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
					if(Orgy.private.config.settings.debug_mode){
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
							Orgy.private.config.debug(target.id + " tried to settle promise "+"'"+target.downstream[i].id+"' that has already been settled.");
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
									return Orgy.private.config.debug([
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
					obj.id = "timer-" + obj.timeout + "-" + (++Orgy.private.config.i);
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
			if(Orgy.private.config.list[obj.id] && obj.type !== 'timer'){
				//A previous promise of the same id exists.
				//Make sure this dependency object doesn't have a
				//resolver - if it does error
				if(obj.resolver){
					Orgy.private.config.debug([
						"You can't set a resolver on a queue that has already been declared. You can only reference the original."
						,"Detected re-init of '" + obj.id + "'."
						,"Attempted:"
						,obj
						,"Existing:"
						,Orgy.private.config.list[obj.id]
					]);
				}
				else{
					return Orgy.private.config.list[obj.id];
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
							def = Orgy.queue(obj.dependencies,obj);
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
									return Orgy.private.config.debug("Dependency labeled as a promise did not return a promise.",obj);
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
			Orgy.private.config.list[obj.id] = def;

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

			var def = Orgy.deferred({
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

			var def = Orgy.deferred();

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
					return Orgy.private.config.debug([
						"File requests converted to promises require: " + required[i]
						,"Make sure you weren't expecting dependency to already have been resolved upstream."
						,dep
					]);
				}
			}

			//IF PROMISE FOR THIS URL ALREADY EXISTS, RETURN IT
			if(Orgy.private.config.list[dep.id]){
				return Orgy.private.config.list[dep.id];
			}

			//CONVERT TO DEFERRED:
			var def = Orgy.deferred(dep);

			if(typeof Orgy.file_loader[Orgy.private.config.settings.mode][dep.type] !== 'undefined'){
				Orgy.file_loader[Orgy.private.config.settings.mode][dep.type](dep.url,def,dep);
			}
			else{
				Orgy.file_loader[Orgy.private.config.settings.mode]['default'](dep.url,def,dep);
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
			 return Orgy.private.config.debug(from_id + " can't signal " + target.id + " because not in upstream.");
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
			Orgy.private.config.debug([
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
				Orgy.private.config.debug(e);
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

		if(Orgy.private.config.settings.debug_mode){
			err.unshift(msg);
			Orgy.private.config.debug(err,this);
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
				return Orgy.private.config.debug(this.id+" can't attach .then() because .done() has already fired, and that means the execution chain is complete.");

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
				return Orgy.private.config.debug("done() must be passed a function.");
			}
		}
		else{
			return Orgy.private.config.debug("done() can only be called once.");
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
	Orgy.deferred = function(options){

		var _o;
		options = options || {};

		if(options.id && Orgy.private.config.list[options.id]){
			_o = Orgy.private.config.list[options.id];
		}
		else{

			//Create a new deferred object
			_o = Orgy.private.config.naive_cloner([_public],[options]);

			//ACTIVATE DEFERRED
			_o = _private.activate(_o);
		}

		return _o;
	};

	_private.public = _public;

	//Save for re-use
	Orgy.private.deferred = _private; 

	return Orgy;
}

},{}],6:[function(require,module,exports){
module.exports = function(Orgy){

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
			if(!Orgy.private.config.settings.debug_mode){
				Orgy.private.config.debug("Set config.debug_mode=1 to run remote scripts outside of debug mode.");
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

	Orgy.file_loader = _public;

	Orgy.private.file_loader = _private;

	return Orgy;
}

},{"fs":1,"request":1,"vm":1}],7:[function(require,module,exports){
module.exports = function(Orgy){


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
			o = Orgy.private.deferred.activate(o);

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
				Orgy.private.deferred.receive_signal(o,o.id);

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
					return Orgy.private.config.debug('Can only upgrade unsettled promise or deferred into a queue.');
			}

		 //GET A NEW QUEUE OBJECT AND MERGE IN
			var _o = Orgy.private.config.naive_cloner([_public],[options]);

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
	* When _public.Orgy.private.config.debug == 1, method will test each
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
				Orgy.private.config.debug(err);
		}

		//IF NOT PENDING, DO NOT ALLOW TO ADD
		if(this.state !== 0){
				return Orgy.private.config.debug([
					"Cannot add dependency list to queue id:'"+this.id
					+"'. Queue settled/in the process of being settled."
				],arr,this);
		}

		for(var a in arr){

				switch(true){

						//CHECK IF EXISTS
						case(typeof Orgy.private.config.list[arr[a].id] === 'object'):
								arr[a] = Orgy.private.config.list[arr[a].id];
								break;

						//IF NOT, ATTEMPT TO CONVERT IT TO AN ORGY PROMISE
						case(typeof arr[a] === 'object' && (!arr[a].is_orgy)):
								arr[a] = Orgy.private.deferred.convert_to_promise(arr[a],{
									parent : this
								});
								break;

						//REF IS A PROMISE.
						case(typeof arr[a].then === 'function'):
								break;

						default:
								Orgy.private.config.debug([
									"Object could not be converted to promise.",
									arr[a]
								]);
								continue;
				}

				//must check the target to see if the dependency exists in its downstream
				for(var b in this.downstream){
						if(b === arr[a].id){
								return Orgy.private.config.debug([
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
				return Orgy.private.config.debug("Cannot remove list from queue id:'"+this.id+"'. Queue settled/in the process of being settled.");
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
	* @returns {Orgy.private.deferred.tpl|Boolean}
	*/
	_public.reset = function(options){

		if(this.settled !== 1 || this.state !== 1){
			return Orgy.private.config.debug("Can only reset a queue settled without errors.");
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
		Orgy.private.deferred.auto_timeout.call(this,options.timeout);

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
		Orgy.private.deferred.receive_signal(this,this.id);
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
	Orgy.queue = function(deps,options){

		var _o;
		if(!(deps instanceof Array)){
			return Orgy.private.config.debug("Queue dependencies must be an array.");
		}

		options = options || {};

		//DOES NOT ALREADY EXIST
		if(!Orgy.private.config.list[options.id]){

			//Pass array of prototypes to queue factory
			_o = Orgy.private.config.naive_cloner([Orgy.private.deferred.public,_public],[options]);

			//Activate queue
			_o = _private.activate(_o,options,deps);

		}
		//ALREADY EXISTS
		else {

			_o = Orgy.private.config.list[options.id];

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
	Orgy.private.queue = _private;
		
	return Orgy;
};

},{}]},{},[])("/src/main.js")
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNyYy9tYWluLmpzIiwiLi4vLi4vLi4vdXNyL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIiwiLi4vLi4vLi4vdXNyL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjL2Nhc3QuanMiLCJzcmMvY29uZmlnLmpzIiwic3JjL2RlZmVycmVkLmpzIiwic3JjL2ZpbGVfbG9hZGVyLmpzIiwic3JjL3F1ZXVlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEpBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN0TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIE9yZ3kgPSBPYmplY3QuY3JlYXRlKHtcblx0cHJpdmF0ZTp7fVxufSk7XG5cbnJlcXVpcmUoJy4vY29uZmlnLmpzJykoT3JneSk7XG5yZXF1aXJlKCcuL2ZpbGVfbG9hZGVyLmpzJykoT3JneSk7XG5yZXF1aXJlKCcuL2RlZmVycmVkLmpzJykoT3JneSk7XG5yZXF1aXJlKCcuL3F1ZXVlLmpzJykoT3JneSk7XG5yZXF1aXJlKCcuL2Nhc3QuanMnKShPcmd5KTtcblxuLyoqXG4gKiBAbmFtZXNwYWNlIG9yZ3lcbiAqL1xuXG4vKipcbiogQ3JlYXRlcyBhIG5ldyBkZWZlcnJlZCBmcm9tIGEgdmFsdWUgYW5kIGFuIGlkIGFuZCBhdXRvbWF0aWNhbGx5XG4qIHJlc29sdmVzIGl0LlxuKlxuKiBAbWVtYmVyb2Ygb3JneVxuKiBAZnVuY3Rpb24gZGVmaW5lXG4qXG4qIEBwYXJhbSB7c3RyaW5nfSBpZCBBIHVuaXF1ZSBpZCB5b3UgZ2l2ZSB0byB0aGUgb2JqZWN0XG4qIEBwYXJhbSB7bWl4ZWR9XHRkYXRhIFRoZSB2YWx1ZSB0aGF0IHRoZSBvYmplY3QgaXMgYXNzaWduZWRcbiogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbi0gPGI+ZGVwZW5kZW5jaWVzPC9iPiB7YXJyYXl9XG4tIDxiPnJlc29sdmVyPC9iPiB7ZnVuY3Rpb24oPGk+YXNzaWduZWRWYWx1ZTwvaT4sPGk+ZGVmZXJyZWQ8L2k+fVxuKiBAcmV0dXJucyB7b2JqZWN0fSByZXNvbHZlZCBkZWZlcnJlZFxuKi9cbk9yZ3kuZGVmaW5lID0gZnVuY3Rpb24oaWQsZGF0YSxvcHRpb25zKXtcblxuXHRcdHZhciBkZWY7XG5cdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cdFx0b3B0aW9ucy5kZXBlbmRlbmNpZXMgPSBvcHRpb25zLmRlcGVuZGVuY2llcyB8fCBudWxsO1xuXHRcdG9wdGlvbnMucmVzb2x2ZXIgPSBvcHRpb25zLnJlc29sdmVyIHx8IG51bGw7XG5cblx0XHQvL3Rlc3QgZm9yIGEgdmFsaWQgaWRcblx0XHRpZih0eXBlb2YgaWQgIT09ICdzdHJpbmcnKXtcblx0XHRcdE9yZ3kucHJpdmF0ZS5jb25maWcuZGVidWcoXCJNdXN0IHNldCBpZCB3aGVuIGRlZmluaW5nIGFuIGluc3RhbmNlLlwiKTtcblx0XHR9XG5cblx0XHQvL0NoZWNrIG5vIGV4aXN0aW5nIGluc3RhbmNlIGRlZmluZWQgd2l0aCBzYW1lIGlkXG5cdFx0aWYoT3JneS5wcml2YXRlLmNvbmZpZy5saXN0W2lkXSAmJiBPcmd5LnByaXZhdGUuY29uZmlnLmxpc3RbaWRdLnNldHRsZWQgPT09IDEpe1xuXHRcdFx0cmV0dXJuIE9yZ3kucHJpdmF0ZS5jb25maWcuZGVidWcoXCJDYW4ndCBkZWZpbmUgXCIgKyBpZCArIFwiLiBBbHJlYWR5IHJlc29sdmVkLlwiKTtcblx0XHR9XG5cblx0XHRvcHRpb25zLmlkID0gaWQ7XG5cblx0XHRpZihvcHRpb25zLmRlcGVuZGVuY2llcyAhPT0gbnVsbFxuXHRcdFx0JiYgb3B0aW9ucy5kZXBlbmRlbmNpZXMgaW5zdGFuY2VvZiBBcnJheSl7XG5cdFx0XHQvL0RlZmluZSBhcyBhIHF1ZXVlIC0gY2FuJ3QgYXV0b3Jlc29sdmUgYmVjYXVzZSB3ZSBoYXZlIGRlcHNcblx0XHRcdHZhciBkZXBzID0gb3B0aW9ucy5kZXBlbmRlbmNpZXM7XG5cdFx0XHRkZWxldGUgb3B0aW9ucy5kZXBlbmRlbmNpZXM7XG5cdFx0XHRkZWYgPSBPcmd5LnF1ZXVlKGRlcHMsb3B0aW9ucyk7XG5cdFx0fVxuXHRcdGVsc2V7XG5cdFx0XHQvL0RlZmluZSBhcyBhIGRlZmVycmVkXG5cdFx0XHRkZWYgPSBPcmd5LmRlZmVycmVkKG9wdGlvbnMpO1xuXG5cdFx0XHQvL1RyeSB0byBpbW1lZGlhdGVseSBzZXR0bGUgW2RlZmluZV1cblx0XHRcdGlmKG9wdGlvbnMucmVzb2x2ZXIgPT09IG51bGxcblx0XHRcdFx0JiYgKHR5cGVvZiBvcHRpb25zLmF1dG9yZXNvbHZlICE9PSAnYm9vbGVhbidcblx0XHRcdFx0fHwgb3B0aW9ucy5hdXRvcmVzb2x2ZSA9PT0gdHJ1ZSkpe1xuXHRcdFx0XHQvL3ByZXZlbnQgZnV0dXJlIGF1dG9yZXNvdmUgYXR0ZW1wdHMgW2kuZS4gZnJvbSB4aHIgcmVzcG9uc2VdXG5cdFx0XHRcdGRlZi5hdXRvcmVzb2x2ZSA9IGZhbHNlO1xuXHRcdFx0XHRkZWYucmVzb2x2ZShkYXRhKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gZGVmO1xufTtcblxuXG4vKipcbiAqIEdldHMgYW4gZXhpc2l0aW5nIGRlZmVycmVkIC8gcXVldWUgb2JqZWN0IGZyb20gZ2xvYmFsIHN0b3JlLlxuICogUmV0dXJucyBudWxsIGlmIG5vbmUgZm91bmQuXG4gKlxuICogQG1lbWJlcm9mIG9yZ3lcbiAqIEBmdW5jdGlvbiBnZXRcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gaWQgSWQgb2YgZGVmZXJyZWQgb3IgcXVldWUgb2JqZWN0LlxuICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWQgfCBxdWV1ZSB8IG51bGxcbiAqL1xuT3JneS5nZXQgPSBmdW5jdGlvbihpZCl7XG5cdGlmKE9yZ3kucHJpdmF0ZS5jb25maWcubGlzdFtpZF0pe1xuXHRcdHJldHVybiBPcmd5LnByaXZhdGUuY29uZmlnLmxpc3RbaWRdO1xuXHR9XG5cdGVsc2V7XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cbn07XG5cblxuLyoqXG4gKiBBZGQvcmVtb3ZlIGFuIHVwc3RyZWFtIGRlcGVuZGVuY3kgdG8vZnJvbSBhIHF1ZXVlLlxuICpcbiAqIENhbiB1c2UgYSBxdWV1ZSBpZCwgZXZlbiBmb3IgYSBxdWV1ZSB0aGF0IGlzIHlldCB0byBiZSBjcmVhdGVkLlxuICpcbiAqIEBtZW1iZXJvZiBvcmd5XG4gKiBAZnVuY3Rpb24gYXNzaWduXG4gKlxuICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSB0Z3QgT3JneS5xdWV1ZSBpZCAvIHF1ZXVlIG9iamVjdFxuICogQHBhcmFtIHthcnJheX0gIGFyclx0QXJyYXkgb2YgcHJvbWlzZSBpZHMgb3IgZGVwZW5kZW5jeSBvYmplY3RzXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGFkZCAgSWYgdHJ1ZSA8Yj5BREQ8L2I+IGFycmF5IHRvIHF1ZXVlIGRlcGVuZGVuY2llcywgSWYgZmFsc2UgPGI+UkVNT1ZFPC9iPiBhcnJheSBmcm9tIHF1ZXVlIGRlcGVuZGVuY2llc1xuICpcbiAqIEByZXR1cm4ge29iamVjdH0gcXVldWVcbiAqL1xuT3JneS5hc3NpZ24gPSBmdW5jdGlvbih0Z3QsYXJyLGFkZCl7XG5cblx0XHRhZGQgPSAodHlwZW9mIGFkZCA9PT0gXCJib29sZWFuXCIpID8gYWRkIDogMTtcblxuXHRcdHZhciBpZCxxO1xuXHRcdHN3aXRjaCh0cnVlKXtcblx0XHRcdFx0Y2FzZSh0eXBlb2YgdGd0ID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgdGd0LnRoZW4gPT09ICdmdW5jdGlvbicpOlxuXHRcdFx0XHRcdFx0aWQgPSB0Z3QuaWQ7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSh0eXBlb2YgdGd0ID09PSAnc3RyaW5nJyk6XG5cdFx0XHRcdFx0XHRpZCA9IHRndDtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0cmV0dXJuIE9yZ3kucHJpdmF0ZS5jb25maWcuZGVidWcoXCJBc3NpZ24gdGFyZ2V0IG11c3QgYmUgYSBxdWV1ZSBvYmplY3Qgb3IgdGhlIGlkIG9mIGEgcXVldWUuXCIsdGhpcyk7XG5cdFx0fVxuXG5cdFx0Ly9JRiBUQVJHRVQgQUxSRUFEWSBMSVNURURcblx0XHRpZihPcmd5LnByaXZhdGUuY29uZmlnLmxpc3RbaWRdICYmIE9yZ3kucHJpdmF0ZS5jb25maWcubGlzdFtpZF0ubW9kZWwgPT09ICdxdWV1ZScpe1xuXHRcdFx0XHRxID0gT3JneS5wcml2YXRlLmNvbmZpZy5saXN0W2lkXTtcblxuXHRcdFx0XHQvLz0+IEFERCBUTyBRVUVVRSdTIFVQU1RSRUFNXG5cdFx0XHRcdGlmKGFkZCl7XG5cdFx0XHRcdFx0XHRxLmFkZChhcnIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vPT4gUkVNT1ZFIEZST00gUVVFVUUnUyBVUFNUUkVBTVxuXHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0cS5yZW1vdmUoYXJyKTtcblx0XHRcdFx0fVxuXHRcdH1cblx0XHQvL0NSRUFURSBORVcgUVVFVUUgQU5EIEFERCBERVBFTkRFTkNJRVNcblx0XHRlbHNlIGlmKGFkZCl7XG5cdFx0XHRcdHEgPSBPcmd5LnF1ZXVlKGFycix7XG5cdFx0XHRcdFx0XHRpZCA6IGlkXG5cdFx0XHRcdH0pO1xuXHRcdH1cblx0XHQvL0VSUk9SOiBDQU4nVCBSRU1PVkUgRlJPTSBBIFFVRVVFIFRIQVQgRE9FUyBOT1QgRVhJU1Rcblx0XHRlbHNle1xuXHRcdFx0XHRyZXR1cm4gT3JneS5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcIkNhbm5vdCByZW1vdmUgZGVwZW5kZW5jaWVzIGZyb20gYSBxdWV1ZSB0aGF0IGRvZXMgbm90IGV4aXN0LlwiLHRoaXMpO1xuXHRcdH1cblxuXHRcdHJldHVybiBxO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBPcmd5O1xuIixudWxsLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IHRydWU7XG4gICAgdmFyIGN1cnJlbnRRdWV1ZTtcbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgdmFyIGkgPSAtMTtcbiAgICAgICAgd2hpbGUgKCsraSA8IGxlbikge1xuICAgICAgICAgICAgY3VycmVudFF1ZXVlW2ldKCk7XG4gICAgICAgIH1cbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xufVxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICBxdWV1ZS5wdXNoKGZ1bik7XG4gICAgaWYgKCFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihPcmd5KXtcblxuXHQvKipcblx0ICogQ2FzdHMgYSB0aGVuYWJsZSBvYmplY3QgaW50byBhbiBPcmd5IGRlZmVycmVkIG9iamVjdC5cblx0ICpcblx0ICogPiBUbyBxdWFsaWZ5IGFzIGEgPGI+dGhlbmFibGU8L2I+LCB0aGUgb2JqZWN0IHRvIGJlIGNhc3RlZCBtdXN0IGhhdmUgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuXHQgKiA+XG5cdCAqID4gLSBpZFxuXHQgKiA+XG5cdCAqID4gLSB0aGVuKClcblx0ICogPlxuXHQgKiA+IC0gZXJyb3IoKVxuXHQgKlxuXHQgKiBAbWVtYmVyb2Ygb3JneVxuXHQgKiBAZnVuY3Rpb24gY2FzdFxuXHQgKlxuXHQgKiBAcGFyYW0ge29iamVjdH0gb2JqIEEgdGhlbmFibGUgd2l0aCB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG5cdCAqXHQtIHtzdHJpbmd9IDxiPmlkPC9iPlx0VW5pcXVlIGlkIG9mIHRoZSBvYmplY3QuXG5cdCAqXG5cdCAqXHQtIHtmdW5jdGlvbn0gPGI+dGhlbjwvYj5cblx0ICpcblx0ICpcdC0ge2Z1bmN0aW9ufSA8Yj5lcnJvcjwvYj5cblx0ICpcblx0ICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWRcblx0ICovXG5cdE9yZ3kuY2FzdCA9IGZ1bmN0aW9uKG9iail7XG5cblx0XHRcdHZhciByZXF1aXJlZCA9IFtcInRoZW5cIixcImVycm9yXCIsXCJpZFwiXTtcblx0XHRcdGZvcih2YXIgaSBpbiByZXF1aXJlZCl7XG5cdFx0XHRcdGlmKCFvYmouaGFzT3duUHJvcGVydHkocmVxdWlyZWRbaV0pKXtcblx0XHRcdFx0XHRyZXR1cm4gT3JneS5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcIkNhc3QgbWV0aG9kIG1pc3NpbmcgcHJvcGVydHkgJ1wiICsgcmVxdWlyZWRbaV0gK1wiJ1wiKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR2YXIgb3B0aW9ucyA9IHt9O1xuXHRcdFx0b3B0aW9ucy5pZCA9IG9iai5pZDtcblxuXHRcdFx0Ly9NYWtlIHN1cmUgaWQgZG9lcyBub3QgY29uZmxpY3Qgd2l0aCBleGlzdGluZ1xuXHRcdFx0aWYoT3JneS5wcml2YXRlLmNvbmZpZy5saXN0W29wdGlvbnMuaWRdKXtcblx0XHRcdFx0cmV0dXJuIE9yZ3kucHJpdmF0ZS5jb25maWcuZGVidWcoXCJJZCBcIitvcHRpb25zLmlkK1wiIGNvbmZsaWN0cyB3aXRoIGV4aXN0aW5nIGlkLlwiKTtcblx0XHRcdH1cblxuXHRcdFx0Ly9DcmVhdGUgYSBkZWZlcnJlZFxuXHRcdFx0dmFyIGRlZiA9IE9yZ3kuZGVmZXJyZWQob3B0aW9ucyk7XG5cblx0XHRcdC8vQ3JlYXRlIHJlc29sdmVyXG5cdFx0XHR2YXIgcmVzb2x2ZXIgPSBmdW5jdGlvbigpe1xuXHRcdFx0XHRkZWYucmVzb2x2ZS5jYWxsKGRlZixhcmd1bWVudHNbMF0pO1xuXHRcdFx0fTtcblxuXHRcdFx0Ly9TZXQgUmVzb2x2ZXJcblx0XHRcdG9iai50aGVuKHJlc29sdmVyKTtcblxuXHRcdFx0Ly9SZWplY3QgZGVmZXJyZWQgb24gLmVycm9yXG5cdFx0XHR2YXIgZXJyID0gZnVuY3Rpb24oZXJyKXtcblx0XHRcdFx0ZGVmLnJlamVjdChlcnIpO1xuXHRcdFx0fTtcblx0XHRcdG9iai5lcnJvcihlcnIpO1xuXG5cdFx0XHQvL1JldHVybiBkZWZlcnJlZFxuXHRcdFx0cmV0dXJuIGRlZjtcblx0fTtcblxuXHRyZXR1cm4gT3JneTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oT3JneSl7XG5cblx0dmFyIF9wcml2YXRlID0ge307XG5cblxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cdC8vXHRfcHJpdmF0ZSBWQVJJQUJMRVNcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cblx0LyoqXG5cdCAqIEEgZGlyZWN0b3J5IG9mIGFsbCBwcm9taXNlcywgZGVmZXJyZWRzLCBhbmQgcXVldWVzLlxuXHQgKiBAdHlwZSBvYmplY3Rcblx0ICovXG5cdF9wcml2YXRlLmxpc3QgPSB7fTtcblxuXG5cdC8qKlxuXHQgKiBpdGVyYXRvciBmb3IgaWRzXG5cdCAqIEB0eXBlIGludGVnZXJcblx0ICovXG5cdF9wcml2YXRlLmkgPSAwO1xuXG5cblx0LyoqXG5cdCAqIENvbmZpZ3VyYXRpb24gdmFsdWVzLlxuXHQgKlxuXHQgKiBAdHlwZSBvYmplY3Rcblx0ICovXG5cdF9wcml2YXRlLnNldHRpbmdzID0ge1xuXG5cdFx0XHRkZWJ1Z19tb2RlIDogMVxuXHRcdFx0Ly9zZXQgdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3Rvcnkgb2YgdGhlIGNhbGxlZSBzY3JpcHQsXG5cdFx0XHQvL2JlY2F1c2Ugbm9kZSBoYXMgbm8gY29uc3RhbnQgZm9yIHRoaXNcblx0XHRcdCxjd2QgOiBmYWxzZVxuXHRcdFx0LG1vZGUgOiAoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRpZih0eXBlb2YgcHJvY2VzcyA9PT0gJ29iamVjdCcgJiYgcHJvY2VzcyArICcnID09PSAnW29iamVjdCBwcm9jZXNzXScpe1xuXHRcdFx0XHRcdFx0XHQvLyBpcyBub2RlXG5cdFx0XHRcdFx0XHRcdHJldHVybiBcIm5hdGl2ZVwiO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0XHQvLyBub3Qgbm9kZVxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gXCJicm93c2VyXCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0fSgpKVxuXHRcdFx0LyoqXG5cdFx0XHQgKiAtIG9uQWN0aXZhdGUgL3doZW4gZWFjaCBpbnN0YW5jZSBhY3RpdmF0ZWRcblx0XHRcdCAqIC0gb25TZXR0bGVcdFx0L3doZW4gZWFjaCBpbnN0YW5jZSBzZXR0bGVzXG5cdFx0XHQgKlxuXHRcdFx0ICogQHR5cGUgb2JqZWN0XG5cdFx0XHQgKi9cblx0XHRcdCxob29rcyA6IHtcblx0XHRcdH1cblx0XHRcdCx0aW1lb3V0IDogNTAwMCAvL2RlZmF1bHQgdGltZW91dFxuXHR9O1xuXG5cblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXHQvL1x0X3ByaXZhdGUgVkFSSUFCTEVTXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblx0Ly9cdF9wcml2YXRlIE1FVEhPRFNcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cblx0LyoqXG5cdCAqIE9wdGlvbnMgeW91IHdpc2ggdG8gcGFzcyB0byBzZXQgdGhlIGdsb2JhbCBjb25maWd1cmF0aW9uXG5cdCAqXG5cdCAqIEBtZW1iZXJvZiBvcmd5XG5cdCAqIEBmdW5jdGlvbiBjb25maWdcblx0ICpcblx0ICogQHBhcmFtIHtvYmplY3R9IG9iaiBMaXN0IG9mIG9wdGlvbnM6XG5cblx0XHQtIHtudW1iZXJ9IDxiPnRpbWVvdXQ8L2I+XG5cblx0XHQtIHtzdHJpbmd9IDxiPmN3ZDwvYj4gU2V0cyBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5LiBTZXJ2ZXIgc2lkZSBzY3JpcHRzIG9ubHkuXG5cblx0XHQtIHtib29sZWFufSA8Yj5kZWJ1Z19tb2RlPC9iPlxuXG5cdCAqIEByZXR1cm5zIHtvYmplY3R9IGNvbmZpZ3VyYXRpb24gc2V0dGluZ3Ncblx0ICovXG5cdE9yZ3kuY29uZmlnID0gZnVuY3Rpb24ob2JqKXtcblxuXHRcdFx0aWYodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcpe1xuXHRcdFx0XHRcdGZvcih2YXIgaSBpbiBvYmope1xuXHRcdFx0XHRcdFx0X3ByaXZhdGUuc2V0dGluZ3NbaV0gPSBvYmpbaV07XG5cdFx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gX3ByaXZhdGUuc2V0dGluZ3M7XG5cdH07XG5cblxuXHQvKipcblx0ICogRGVidWdnaW5nIG1ldGhvZC5cblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd8YXJyYXl9IG1zZ1xuXHQgKiBAcGFyYW0ge29iamVjdH0gZGVmXG5cdCAqIEByZXR1cm5zIHtCb29sZWFufVxuXHQgKi9cblx0X3ByaXZhdGUuZGVidWcgPSBmdW5jdGlvbihtc2cpe1xuXG5cdFx0XHR2YXIgbXNncyA9IChtc2cgaW5zdGFuY2VvZiBBcnJheSkgPyBtc2cuam9pbihcIlxcblwiKSA6IFttc2ddO1xuXG5cdFx0XHR2YXIgZSA9IG5ldyBFcnJvcihtc2dzKTtcblx0XHRcdGNvbnNvbGUubG9nKGUuc3RhY2spO1xuXG5cdFx0XHRpZih0aGlzLnNldHRpbmdzLmRlYnVnX21vZGUpe1xuXHRcdFx0XHQvL3R1cm4gb2ZmIGRlYnVnX21vZGUgdG8gYXZvaWQgaGl0dGluZyBkZWJ1Z2dlclxuXHRcdFx0XHRkZWJ1Z2dlcjtcblx0XHRcdH1cblxuXHRcdFx0aWYoX3ByaXZhdGUuc2V0dGluZ3MubW9kZSA9PT0gJ2Jyb3dzZXInKXtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZXtcblx0XHRcdFx0cHJvY2Vzcy5leGl0KCk7XG5cdFx0XHR9XG5cdH07XG5cblxuXHQvKipcblx0ICogVGFrZSBhbiBhcnJheSBvZiBwcm90b3R5cGUgb2JqZWN0cyBhbmQgYW4gYXJyYXkgb2YgcHJvcGVydHkgb2JqZWN0cyxcblx0ICogbWVyZ2VzIGVhY2gsIGFuZCByZXR1cm5zIGEgc2hhbGxvdyBjb3B5LlxuXHQgKlxuXHQgKiBAcGFyYW0ge2FycmF5fSBwcm90b09iakFyciBBcnJheSBvZiBwcm90b3R5cGUgb2JqZWN0cyB3aGljaCBhcmUgb3ZlcndyaXR0ZW4gZnJvbSByaWdodCB0byBsZWZ0XG5cdCAqIEBwYXJhbSB7YXJyYXl9IHByb3BzT2JqQXJyIEFycmF5IG9mIGRlc2lyZWQgcHJvcGVydHkgb2JqZWN0cyB3aGljaCBhcmUgb3ZlcndyaXR0ZW4gZnJvbSByaWdodCB0byBsZWZ0XG5cdCAqIEByZXR1cm5zIHtvYmplY3R9IG9iamVjdFxuXHQgKi9cblx0X3ByaXZhdGUubmFpdmVfY2xvbmVyID0gZnVuY3Rpb24ocHJvdG9PYmpBcnIscHJvcHNPYmpBcnIpe1xuXG5cdFx0XHRmdW5jdGlvbiBtZXJnZShkb25vcnMpe1xuXHRcdFx0XHR2YXIgbyA9IHt9O1xuXHRcdFx0XHRmb3IodmFyIGEgaW4gZG9ub3JzKXtcblx0XHRcdFx0XHRcdGZvcih2YXIgYiBpbiBkb25vcnNbYV0pe1xuXHRcdFx0XHRcdFx0XHRcdGlmKGRvbm9yc1thXVtiXSBpbnN0YW5jZW9mIEFycmF5KXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0b1tiXSA9IGRvbm9yc1thXVtiXS5zbGljZSgwKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0ZWxzZSBpZih0eXBlb2YgZG9ub3JzW2FdW2JdID09PSAnb2JqZWN0Jyl7XG5cdFx0XHRcdFx0XHRcdFx0XHR0cnl7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdG9bYl0gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGRvbm9yc1thXVtiXSkpO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0Y2F0Y2goZSl7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGRlYnVnZ2VyO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRvW2JdID0gZG9ub3JzW2FdW2JdO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gbztcblx0XHRcdH1cblxuXHRcdFx0dmFyIHByb3RvID0gbWVyZ2UocHJvdG9PYmpBcnIpLFxuXHRcdFx0XHRcdHByb3BzID0gbWVyZ2UocHJvcHNPYmpBcnIpO1xuXG5cdFx0XHQvL0B0b2RvIGNvbnNpZGVyIG1hbnVhbGx5IHNldHRpbmcgdGhlIHByb3RvdHlwZSBpbnN0ZWFkXG5cdFx0XHR2YXIgZmluYWxPYmplY3QgPSBPYmplY3QuY3JlYXRlKHByb3RvKTtcblx0XHRcdGZvcih2YXIgaSBpbiBwcm9wcyl7XG5cdFx0XHRcdGZpbmFsT2JqZWN0W2ldID0gcHJvcHNbaV07XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBmaW5hbE9iamVjdDtcblx0fTtcblxuXG5cdF9wcml2YXRlLmdlbmVyYXRlX2lkID0gZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCkgKyAnLScgKyAoKyt0aGlzLmkpO1xuXHR9O1xuXHRcblx0XG5cdC8vU2F2ZSBmb3IgcmUtdXNlXG5cdE9yZ3kucHJpdmF0ZS5jb25maWcgPSBfcHJpdmF0ZTtcblxuXHRyZXR1cm4gT3JneTtcblxufVxuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKE9yZ3kpe1xuXG5cdC8qKlxuXHQqIEBuYW1lc3BhY2Ugb3JneS9kZWZlcnJlZFxuXHQqL1xuXG5cdFxuXHR2YXIgX3ByaXZhdGUgPSB7fTtcblxuXG5cdF9wcml2YXRlLmFjdGl2YXRlID0gZnVuY3Rpb24ob2JqKXtcblxuXHRcdFx0IC8vaWYgbm8gaWQsIGdlbmVyYXRlIG9uZVxuXHRcdFx0aWYoIW9iai5pZCl7XG5cdFx0XHRcdG9iai5pZCA9IE9yZ3kucHJpdmF0ZS5jb25maWcuZ2VuZXJhdGVfaWQoKTtcblx0XHRcdH1cblxuXHRcdFx0Ly9NQUtFIFNVUkUgTkFNSU5HIENPTkZMSUNUIERPRVMgTk9UIEVYSVNUXG5cdFx0XHRpZihPcmd5LnByaXZhdGUuY29uZmlnLmxpc3Rbb2JqLmlkXSAmJiAhT3JneS5wcml2YXRlLmNvbmZpZy5saXN0W29iai5pZF0ub3ZlcndyaXRhYmxlKXtcblx0XHRcdFx0XHRPcmd5LnByaXZhdGUuY29uZmlnLmRlYnVnKFwiVHJpZWQgaWxsZWdhbCBvdmVyd3JpdGUgb2YgXCIrb2JqLmlkK1wiLlwiKTtcblx0XHRcdFx0XHRyZXR1cm4gT3JneS5wcml2YXRlLmNvbmZpZy5saXN0W29iai5pZF07XG5cdFx0XHR9XG5cblx0XHRcdC8vU0FWRSBUTyBNQVNURVIgTElTVFxuXHRcdFx0Ly9AdG9kbyBvbmx5IHNhdmUgaWYgd2FzIGFzc2lnbmVkIGFuIGlkLFxuXHRcdFx0Ly93aGljaCBpbXBsaWVzIHVzZXIgaW50ZW5kcyB0byBhY2Nlc3Mgc29tZXdoZXJlIGVsc2Ugb3V0c2lkZSBvZiBzY29wZVxuXHRcdFx0T3JneS5wcml2YXRlLmNvbmZpZy5saXN0W29iai5pZF0gPSBvYmo7XG5cblx0XHRcdC8vQVVUTyBUSU1FT1VUXG5cdFx0XHRfcHJpdmF0ZS5hdXRvX3RpbWVvdXQuY2FsbChvYmopO1xuXG5cdFx0XHQvL0NhbGwgaG9va1xuXHRcdFx0aWYoT3JneS5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy5ob29rcy5vbkFjdGl2YXRlKXtcblx0XHRcdFx0T3JneS5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy5ob29rcy5vbkFjdGl2YXRlKG9iaik7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBvYmo7XG5cdH07XG5cblxuXHRfcHJpdmF0ZS5zZXR0bGUgPSBmdW5jdGlvbihkZWYpe1xuXG5cdFx0XHQvL1JFTU9WRSBBVVRPIFRJTUVPVVQgVElNRVJcblx0XHRcdGlmKGRlZi50aW1lb3V0X2lkKXtcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KGRlZi50aW1lb3V0X2lkKTtcblx0XHRcdH1cblxuXHRcdFx0Ly9TZXQgc3RhdGUgdG8gcmVzb2x2ZWRcblx0XHRcdF9wcml2YXRlLnNldF9zdGF0ZShkZWYsMSk7XG5cblx0XHRcdC8vQ2FsbCBob29rXG5cdFx0XHRpZihPcmd5LnByaXZhdGUuY29uZmlnLnNldHRpbmdzLmhvb2tzLm9uU2V0dGxlKXtcblx0XHRcdFx0T3JneS5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy5ob29rcy5vblNldHRsZShkZWYpO1xuXHRcdFx0fVxuXG5cdFx0XHQvL0FkZCBkb25lIGFzIGEgY2FsbGJhY2sgdG8gdGhlbiBjaGFpbiBjb21wbGV0aW9uLlxuXHRcdFx0ZGVmLmNhbGxiYWNrcy50aGVuLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChmdW5jdGlvbihkMixpdGluZXJhcnksbGFzdCl7XG5cdFx0XHRcdFx0ZGVmLmNhYm9vc2UgPSBsYXN0O1xuXG5cdFx0XHRcdFx0Ly9SdW4gZG9uZVxuXHRcdFx0XHRcdF9wcml2YXRlLnJ1bl90cmFpbihcblx0XHRcdFx0XHRcdFx0ZGVmXG5cdFx0XHRcdFx0XHRcdCxkZWYuY2FsbGJhY2tzLmRvbmVcblx0XHRcdFx0XHRcdFx0LGRlZi5jYWJvb3NlXG5cdFx0XHRcdFx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cblx0XHRcdFx0XHQpO1xuXHRcdFx0fSk7XG5cblx0XHRcdC8vUnVuIHRoZW4gcXVldWVcblx0XHRcdF9wcml2YXRlLnJ1bl90cmFpbihcblx0XHRcdFx0XHRkZWZcblx0XHRcdFx0XHQsZGVmLmNhbGxiYWNrcy50aGVuXG5cdFx0XHRcdFx0LGRlZi52YWx1ZVxuXHRcdFx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiB0cnVlfVxuXHRcdFx0KTtcblxuXHRcdFx0cmV0dXJuIGRlZjtcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBSdW5zIGFuIGFycmF5IG9mIGZ1bmN0aW9ucyBzZXF1ZW50aWFsbHkgYXMgYSBwYXJ0aWFsIGZ1bmN0aW9uLlxuXHQgKiBFYWNoIGZ1bmN0aW9uJ3MgYXJndW1lbnQgaXMgdGhlIHJlc3VsdCBvZiBpdHMgcHJlZGVjZXNzb3IgZnVuY3Rpb24uXG5cdCAqXG5cdCAqIEJ5IGRlZmF1bHQsIGV4ZWN1dGlvbiBjaGFpbiBpcyBwYXVzZWQgd2hlbiBhbnkgZnVuY3Rpb25cblx0ICogcmV0dXJucyBhbiB1bnJlc29sdmVkIGRlZmVycmVkLiAocGF1c2Vfb25fZGVmZXJyZWQpIFtPUFRJT05BTF1cblx0ICpcblx0ICogQHBhcmFtIHtvYmplY3R9IGRlZlx0L2RlZmVycmVkIG9iamVjdFxuXHQgKiBAcGFyYW0ge29iamVjdH0gb2JqXHQvaXRpbmVyYXJ5XG5cdCAqXHRcdFx0dHJhaW5cdFx0XHRcdHthcnJheX1cblx0ICpcdFx0XHRob29rc1x0XHRcdFx0e29iamVjdH1cblx0ICpcdFx0XHRcdFx0b25CZWZvcmVcdFx0XHRcdHthcnJheX1cblx0ICpcdFx0XHRcdFx0b25Db21wbGV0ZVx0XHRcdHthcnJheX1cblx0ICogQHBhcmFtIHttaXhlZH0gcGFyYW0gL3BhcmFtIHRvIHBhc3MgdG8gZmlyc3QgY2FsbGJhY2tcblx0ICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcblx0ICpcdFx0XHRwYXVzZV9vbl9kZWZlcnJlZFx0XHR7Ym9vbGVhbn1cblx0ICpcblx0ICogQHJldHVybnMge3ZvaWR9XG5cdCAqL1xuXHRfcHJpdmF0ZS5ydW5fdHJhaW4gPSBmdW5jdGlvbihkZWYsb2JqLHBhcmFtLG9wdGlvbnMpe1xuXG5cdFx0XHQvL2FsbG93IHByZXZpb3VzIHJldHVybiB2YWx1ZXMgdG8gYmUgcGFzc2VkIGRvd24gY2hhaW5cblx0XHRcdHZhciByID0gcGFyYW0gfHwgZGVmLmNhYm9vc2UgfHwgZGVmLnZhbHVlO1xuXG5cdFx0XHQvL29uQmVmb3JlIGV2ZW50XG5cdFx0XHRpZihvYmouaG9va3MgJiYgb2JqLmhvb2tzLm9uQmVmb3JlLnRyYWluLmxlbmd0aCA+IDApe1xuXHRcdFx0XHRcdF9wcml2YXRlLnJ1bl90cmFpbihcblx0XHRcdFx0XHRcdFx0ZGVmXG5cdFx0XHRcdFx0XHRcdCxvYmouaG9va3Mub25CZWZvcmVcblx0XHRcdFx0XHRcdFx0LHBhcmFtXG5cdFx0XHRcdFx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cblx0XHRcdFx0XHQpO1xuXHRcdFx0fVxuXG5cdFx0XHR3aGlsZShvYmoudHJhaW4ubGVuZ3RoID4gMCl7XG5cblx0XHRcdFx0XHQvL3JlbW92ZSBmbiB0byBleGVjdXRlXG5cdFx0XHRcdFx0dmFyIGxhc3QgPSBvYmoudHJhaW4uc2hpZnQoKTtcblx0XHRcdFx0XHRkZWYuZXhlY3V0aW9uX2hpc3RvcnkucHVzaChsYXN0KTtcblxuXHRcdFx0XHRcdC8vZGVmLmNhYm9vc2UgbmVlZGVkIGZvciB0aGVuIGNoYWluIGRlY2xhcmVkIGFmdGVyIHJlc29sdmVkIGluc3RhbmNlXG5cdFx0XHRcdFx0ciA9IGRlZi5jYWJvb3NlID0gbGFzdC5jYWxsKGRlZixkZWYudmFsdWUsZGVmLHIpO1xuXG5cdFx0XHRcdFx0Ly9pZiByZXN1bHQgaXMgYW4gdGhlbmFibGUsIGhhbHQgZXhlY3V0aW9uXG5cdFx0XHRcdFx0Ly9hbmQgcnVuIHVuZmlyZWQgYXJyIHdoZW4gdGhlbmFibGUgc2V0dGxlc1xuXHRcdFx0XHRcdGlmKG9wdGlvbnMucGF1c2Vfb25fZGVmZXJyZWQpe1xuXG5cdFx0XHRcdFx0XHRcdC8vSWYgciBpcyBhbiB1bnNldHRsZWQgdGhlbmFibGVcblx0XHRcdFx0XHRcdFx0aWYociAmJiByLnRoZW4gJiYgci5zZXR0bGVkICE9PSAxKXtcblxuXHRcdFx0XHRcdFx0XHRcdFx0Ly9leGVjdXRlIHJlc3Qgb2YgdGhpcyB0cmFpbiBhZnRlciByIHJlc29sdmVzXG5cdFx0XHRcdFx0XHRcdFx0XHRyLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChmdW5jdGlvbigpe1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0X3ByaXZhdGUucnVuX3RyYWluKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkZWZcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0LG9ialxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQsclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogdHJ1ZX1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRcdFx0XHRcdC8vdGVybWluYXRlIGV4ZWN1dGlvblxuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0Ly9JZiBpcyBhbiBhcnJheSB0aGFuIGNvbnRhaW5zIGFuIHVuc2V0dGxlZCB0aGVuYWJsZVxuXHRcdFx0XHRcdFx0XHRlbHNlIGlmKHIgaW5zdGFuY2VvZiBBcnJheSl7XG5cblx0XHRcdFx0XHRcdFx0XHRcdHZhciB0aGVuYWJsZXMgPSBbXTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0Zm9yKHZhciBpIGluIHIpe1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYocltpXS50aGVuICYmIHJbaV0uc2V0dGxlZCAhPT0gMSl7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGhlbmFibGVzLnB1c2gocltpXSk7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dmFyIGZuID0gKGZ1bmN0aW9uKHQsZGVmLG9iaixwYXJhbSl7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBmdW5jdGlvbigpe1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly9CYWlsIGlmIGFueSB0aGVuYWJsZXMgdW5zZXR0bGVkXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Zm9yKHZhciBpIGluIHQpe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpZih0W2ldLnNldHRsZWQgIT09IDEpe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0X3ByaXZhdGUucnVuX3RyYWluKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkZWZcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0LG9ialxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQscGFyYW1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSkodGhlbmFibGVzLGRlZixvYmoscGFyYW0pO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vZXhlY3V0ZSByZXN0IG9mIHRoaXMgdHJhaW4gYWZ0ZXJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly9hbGwgdGhlbmFibGVzIGZvdW5kIGluIHIgcmVzb2x2ZVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyW2ldLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChmbik7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly90ZXJtaW5hdGUgZXhlY3V0aW9uXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vb25Db21wbGV0ZSBldmVudFxuXHRcdFx0aWYob2JqLmhvb2tzICYmIG9iai5ob29rcy5vbkNvbXBsZXRlLnRyYWluLmxlbmd0aCA+IDApe1xuXHRcdFx0XHRcdF9wcml2YXRlLnJ1bl90cmFpbihkZWYsb2JqLmhvb2tzLm9uQ29tcGxldGUscix7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX0pO1xuXHRcdFx0fVxuXHR9O1xuXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIHN0YXRlIG9mIGFuIE9yZ3kgb2JqZWN0LlxuXHQgKlxuXHQgKiBAcGFyYW0ge29iamVjdH0gZGVmXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBpbnRcblx0ICogQHJldHVybnMge3ZvaWR9XG5cdCAqL1xuXHRfcHJpdmF0ZS5zZXRfc3RhdGUgPSBmdW5jdGlvbihkZWYsaW50KXtcblxuXHRcdFx0ZGVmLnN0YXRlID0gaW50O1xuXG5cdFx0XHQvL0lGIFJFU09MVkVEIE9SIFJFSkVDVEVELCBTRVRUTEVcblx0XHRcdGlmKGludCA9PT0gMSB8fCBpbnQgPT09IDIpe1xuXHRcdFx0XHRcdGRlZi5zZXR0bGVkID0gMTtcblx0XHRcdH1cblxuXHRcdFx0aWYoaW50ID09PSAxIHx8IGludCA9PT0gMil7XG5cdFx0XHRcdFx0X3ByaXZhdGUuc2lnbmFsX2Rvd25zdHJlYW0oZGVmKTtcblx0XHRcdH1cblx0fTtcblxuXG5cdC8qKlxuXHQgKiBHZXRzIHRoZSBzdGF0ZSBvZiBhbiBPcmd5IG9iamVjdFxuXHQgKlxuXHQgKiBAcGFyYW0ge29iamVjdH0gZGVmXG5cdCAqIEByZXR1cm5zIHtudW1iZXJ9XG5cdCAqL1xuXHRfcHJpdmF0ZS5nZXRfc3RhdGUgPSBmdW5jdGlvbihkZWYpe1xuXHRcdFx0cmV0dXJuIGRlZi5zdGF0ZTtcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBTZXRzIHRoZSBhdXRvbWF0aWMgdGltZW91dCBvbiBhIHByb21pc2Ugb2JqZWN0LlxuXHQgKlxuXHQgKiBAcmV0dXJucyB7Qm9vbGVhbn1cblx0ICovXG5cdF9wcml2YXRlLmF1dG9fdGltZW91dCA9IGZ1bmN0aW9uKCl7XG5cblx0XHRcdHRoaXMudGltZW91dCA9ICh0eXBlb2YgdGhpcy50aW1lb3V0ICE9PSAndW5kZWZpbmVkJylcblx0XHRcdD8gdGhpcy50aW1lb3V0IDogT3JneS5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy50aW1lb3V0O1xuXG5cdFx0XHQvL0FVVE8gUkVKRUNUIE9OIHRpbWVvdXRcblx0XHRcdGlmKCF0aGlzLnR5cGUgfHwgdGhpcy50eXBlICE9PSAndGltZXInKXtcblxuXHRcdFx0XHRcdC8vREVMRVRFIFBSRVZJT1VTIFRJTUVPVVQgSUYgRVhJU1RTXG5cdFx0XHRcdFx0aWYodGhpcy50aW1lb3V0X2lkKXtcblx0XHRcdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMudGltZW91dF9pZCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmKHR5cGVvZiB0aGlzLnRpbWVvdXQgPT09ICd1bmRlZmluZWQnKXtcblx0XHRcdFx0XHRcdFx0T3JneS5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhbXG5cdFx0XHRcdFx0XHRcdFx0XCJBdXRvIHRpbWVvdXQgdGhpcy50aW1lb3V0IGNhbm5vdCBiZSB1bmRlZmluZWQuXCJcblx0XHRcdFx0XHRcdFx0XHQsdGhpcy5pZFxuXHRcdFx0XHRcdFx0XHRdKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSBpZiAodGhpcy50aW1lb3V0ID09PSAtMSl7XG5cdFx0XHRcdFx0XHRcdC8vTk8gQVVUTyBUSU1FT1VUIFNFVFxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHZhciBzY29wZSA9IHRoaXM7XG5cblx0XHRcdFx0XHR0aGlzLnRpbWVvdXRfaWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdF9wcml2YXRlLmF1dG9fdGltZW91dF9jYi5jYWxsKHNjb3BlKTtcblx0XHRcdFx0XHR9LCB0aGlzLnRpbWVvdXQpO1xuXG5cdFx0XHR9XG5cdFx0XHQvL2Vsc2V7XG5cdFx0XHRcdFx0Ly9AdG9kbyBXSEVOIEEgVElNRVIsIEFERCBEVVJBVElPTiBUTyBBTEwgVVBTVFJFQU0gQU5EIExBVEVSQUw/XG5cdFx0XHQvL31cblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdH07XG5cblxuXHQvKipcblx0ICogQ2FsbGJhY2sgZm9yIGF1dG90aW1lb3V0LiBEZWNsYXJhdGlvbiBoZXJlIGF2b2lkcyBtZW1vcnkgbGVhay5cblx0ICpcblx0ICogQHJldHVybnMge3ZvaWR9XG5cdCAqL1xuXHRfcHJpdmF0ZS5hdXRvX3RpbWVvdXRfY2IgPSBmdW5jdGlvbigpe1xuXG5cdFx0XHRpZih0aGlzLnN0YXRlICE9PSAxKXtcblxuXHRcdFx0XHRcdC8vR0VUIFRIRSBVUFNUUkVBTSBFUlJPUiBJRFxuXHRcdFx0XHRcdHZhciBtc2dzID0gW107XG5cdFx0XHRcdFx0dmFyIHNjb3BlID0gdGhpcztcblxuXHRcdFx0XHRcdHZhciBmbiA9IGZ1bmN0aW9uKG9iail7XG5cdFx0XHRcdFx0XHRcdGlmKG9iai5zdGF0ZSAhPT0gMSl7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gb2JqLmlkO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0LyoqXG5cdFx0XHRcdFx0ICogUnVuIG92ZXIgYSBnaXZlbiBvYmplY3QgcHJvcGVydHkgcmVjdXJzaXZlbHksXG5cdFx0XHRcdFx0ICogYXBwbHlpbmcgY2FsbGJhY2sgdW50aWxcblx0XHRcdFx0XHQgKiBjYWxsYmFjayByZXR1cm5zIGEgbm9uLWZhbHNlIHZhbHVlLlxuXHRcdFx0XHRcdCAqL1xuXHRcdFx0XHRcdGlmKE9yZ3kucHJpdmF0ZS5jb25maWcuc2V0dGluZ3MuZGVidWdfbW9kZSl7XG5cdFx0XHRcdFx0XHRcdHZhciByID0gX3ByaXZhdGUuc2VhcmNoX29ial9yZWN1cnNpdmVseSh0aGlzLCd1cHN0cmVhbScsZm4pO1xuXHRcdFx0XHRcdFx0XHRtc2dzLnB1c2goc2NvcGUuaWQgKyBcIjogcmVqZWN0ZWQgYnkgYXV0byB0aW1lb3V0IGFmdGVyIFwiXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0KyB0aGlzLnRpbWVvdXQgKyBcIm1zXCIpO1xuXHRcdFx0XHRcdFx0XHRtc2dzLnB1c2goXCJDYXVzZTpcIik7XG5cdFx0XHRcdFx0XHRcdG1zZ3MucHVzaChyKTtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMucmVqZWN0LmNhbGwodGhpcyxtc2dzKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMucmVqZWN0LmNhbGwodGhpcyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0fVxuXHR9O1xuXG5cblx0X3ByaXZhdGUuZXJyb3IgPSBmdW5jdGlvbihjYil7XG5cblx0XHRcdC8vSUYgRVJST1IgQUxSRUFEWSBUSFJPV04sIEVYRUNVVEUgQ0IgSU1NRURJQVRFTFlcblx0XHRcdGlmKHRoaXMuc3RhdGUgPT09IDIpe1xuXHRcdFx0XHRcdGNiKCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNle1xuXHRcdFx0XHRcdHRoaXMucmVqZWN0X3EucHVzaChjYik7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cblx0LyoqXG5cdCAqIFNpZ25hbHMgYWxsIGRvd25zdHJlYW0gcHJvbWlzZXMgdGhhdCBfcHJpdmF0ZSBwcm9taXNlIG9iamVjdCdzXG5cdCAqIHN0YXRlIGhhcyBjaGFuZ2VkLlxuXHQgKlxuXHQgKiBAdG9kbyBTaW5jZSB0aGUgc2FtZSBxdWV1ZSBtYXkgaGF2ZSBiZWVuIGFzc2lnbmVkIHR3aWNlIGRpcmVjdGx5IG9yXG5cdCAqIGluZGlyZWN0bHkgdmlhIHNoYXJlZCBkZXBlbmRlbmNpZXMsIG1ha2Ugc3VyZSBub3QgdG8gZG91YmxlIHJlc29sdmVcblx0ICogLSB3aGljaCB0aHJvd3MgYW4gZXJyb3IuXG5cdCAqXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXQgZGVmZXJyZWQvcXVldWVcblx0ICogQHJldHVybnMge3ZvaWR9XG5cdCAqL1xuXHRfcHJpdmF0ZS5zaWduYWxfZG93bnN0cmVhbSA9IGZ1bmN0aW9uKHRhcmdldCl7XG5cblx0XHRcdC8vTUFLRSBTVVJFIEFMTCBET1dOU1RSRUFNIElTIFVOU0VUVExFRFxuXHRcdFx0Zm9yKHZhciBpIGluIHRhcmdldC5kb3duc3RyZWFtKXtcblx0XHRcdFx0XHRpZih0YXJnZXQuZG93bnN0cmVhbVtpXS5zZXR0bGVkID09PSAxKXtcblxuXHRcdFx0XHRcdFx0aWYodGFyZ2V0LmRvd25zdHJlYW1baV0uc3RhdGUgIT09IDEpe1xuXHRcdFx0XHRcdFx0XHQvL3RyaWVkIHRvIHNldHRsZSBhIHJlamVjdGVkIGRvd25zdHJlYW1cblx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0XHQvL3RyaWVkIHRvIHNldHRsZSBhIHN1Y2Nlc3NmdWxseSBzZXR0bGVkIGRvd25zdHJlYW1cblx0XHRcdFx0XHRcdFx0T3JneS5wcml2YXRlLmNvbmZpZy5kZWJ1Zyh0YXJnZXQuaWQgKyBcIiB0cmllZCB0byBzZXR0bGUgcHJvbWlzZSBcIitcIidcIit0YXJnZXQuZG93bnN0cmVhbVtpXS5pZCtcIicgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIHNldHRsZWQuXCIpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly9OT1cgVEhBVCBXRSBLTk9XIEFMTCBET1dOU1RSRUFNIElTIFVOU0VUVExFRCwgV0UgQ0FOIElHTk9SRSBBTllcblx0XHRcdC8vU0VUVExFRCBUSEFUIFJFU1VMVCBBUyBBIFNJREUgRUZGRUNUIFRPIEFOT1RIRVIgU0VUVExFTUVOVFxuXHRcdFx0Zm9yICh2YXIgaSBpbiB0YXJnZXQuZG93bnN0cmVhbSl7XG5cdFx0XHRcdFx0aWYodGFyZ2V0LmRvd25zdHJlYW1baV0uc2V0dGxlZCAhPT0gMSl7XG5cdFx0XHRcdFx0XHRcdF9wcml2YXRlLnJlY2VpdmVfc2lnbmFsKHRhcmdldC5kb3duc3RyZWFtW2ldLHRhcmdldC5pZCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0fVxuXHR9O1xuXG5cblx0LyoqXG5cdCogUnVuIG92ZXIgYSBnaXZlbiBvYmplY3QgcHJvcGVydHkgcmVjdXJzaXZlbHksIGFwcGx5aW5nIGNhbGxiYWNrIHVudGlsXG5cdCogY2FsbGJhY2sgcmV0dXJucyBhIG5vbi1mYWxzZSB2YWx1ZS5cblx0KlxuXHQqIEBwYXJhbSB7b2JqZWN0fSBvYmpcblx0KiBAcGFyYW0ge3N0cmluZ30gcHJvcE5hbWVcdFx0XHRcdFx0VGhlIHByb3BlcnR5IG5hbWUgb2YgdGhlIGFycmF5IHRvIGJ1YmJsZSB1cFxuXHQqIEBwYXJhbSB7ZnVuY3Rpb259IGZuXHRcdFx0XHRcdFx0XHRUaGUgdGVzdCBjYWxsYmFjayB0byBiZSBhcHBsaWVkIHRvIGVhY2ggb2JqZWN0XG5cdCogQHBhcmFtIHthcnJheX0gYnJlYWRjcnVtYlx0XHRcdFx0XHRUaGUgYnJlYWRjcnVtYiB0aHJvdWdoIHRoZSBjaGFpbiBvZiB0aGUgZmlyc3QgbWF0Y2hcblx0KiBAcmV0dXJucyB7bWl4ZWR9XG5cdCovXG5cdF9wcml2YXRlLnNlYXJjaF9vYmpfcmVjdXJzaXZlbHkgPSBmdW5jdGlvbihvYmoscHJvcE5hbWUsZm4sYnJlYWRjcnVtYil7XG5cblx0XHRcdGlmKHR5cGVvZiBicmVhZGNydW1iID09PSAndW5kZWZpbmVkJyl7XG5cdFx0XHRcdFx0YnJlYWRjcnVtYiA9IFtvYmouaWRdO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgcjE7XG5cblx0XHRcdGZvcih2YXIgaSBpbiBvYmpbcHJvcE5hbWVdKXtcblxuXHRcdFx0XHRcdC8vUlVOIFRFU1Rcblx0XHRcdFx0XHRyMSA9IGZuKG9ialtwcm9wTmFtZV1baV0pO1xuXG5cdFx0XHRcdFx0aWYocjEgIT09IGZhbHNlKXtcblx0XHRcdFx0XHQvL01BVENIIFJFVFVSTkVELiBSRUNVUlNFIElOVE8gTUFUQ0ggSUYgSEFTIFBST1BFUlRZIE9GIFNBTUUgTkFNRSBUTyBTRUFSQ0hcblx0XHRcdFx0XHRcdFx0Ly9DSEVDSyBUSEFUIFdFIEFSRU4nVCBDQVVHSFQgSU4gQSBDSVJDVUxBUiBMT09QXG5cdFx0XHRcdFx0XHRcdGlmKGJyZWFkY3J1bWIuaW5kZXhPZihyMSkgIT09IC0xKXtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBPcmd5LnByaXZhdGUuY29uZmlnLmRlYnVnKFtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcIkNpcmN1bGFyIGNvbmRpdGlvbiBpbiByZWN1cnNpdmUgc2VhcmNoIG9mIG9iaiBwcm9wZXJ0eSAnXCJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0K3Byb3BOYW1lK1wiJyBvZiBvYmplY3QgXCJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0KygodHlwZW9mIG9iai5pZCAhPT0gJ3VuZGVmaW5lZCcpID8gXCInXCIrb2JqLmlkK1wiJ1wiIDogJycpXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCtcIi4gT2ZmZW5kaW5nIHZhbHVlOiBcIityMVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCwoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWRjcnVtYi5wdXNoKHIxKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGJyZWFkY3J1bWIuam9pbihcIiBbZGVwZW5kcyBvbl09PiBcIik7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSkoKVxuXHRcdFx0XHRcdFx0XHRcdFx0XSk7XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRicmVhZGNydW1iLnB1c2gocjEpO1xuXG5cdFx0XHRcdFx0XHRcdGlmKG9ialtwcm9wTmFtZV1baV1bcHJvcE5hbWVdKXtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBfcHJpdmF0ZS5zZWFyY2hfb2JqX3JlY3Vyc2l2ZWx5KG9ialtwcm9wTmFtZV1baV0scHJvcE5hbWUsZm4sYnJlYWRjcnVtYik7XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGJyZWFkY3J1bWI7XG5cdH07XG5cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBwcm9taXNlIGRlc2NyaXB0aW9uIGludG8gYSBwcm9taXNlLlxuXHQgKlxuXHQgKiBAcGFyYW0ge3R5cGV9IG9ialxuXHQgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuXHQgKi9cblx0X3ByaXZhdGUuY29udmVydF90b19wcm9taXNlID0gZnVuY3Rpb24ob2JqLG9wdGlvbnMpe1xuXG5cdFx0XHRvYmouaWQgPSBvYmouaWQgfHwgb3B0aW9ucy5pZDtcblxuXHRcdFx0Ly9BdXRvbmFtZVxuXHRcdFx0aWYgKCFvYmouaWQpIHtcblx0XHRcdFx0aWYgKG9iai50eXBlID09PSAndGltZXInKSB7XG5cdFx0XHRcdFx0b2JqLmlkID0gXCJ0aW1lci1cIiArIG9iai50aW1lb3V0ICsgXCItXCIgKyAoKytPcmd5LnByaXZhdGUuY29uZmlnLmkpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKHR5cGVvZiBvYmoudXJsID09PSAnc3RyaW5nJykge1xuXHRcdFx0XHRcdG9iai5pZCA9IG9iai51cmwuc3BsaXQoXCIvXCIpLnBvcCgpO1xuXHRcdFx0XHRcdC8vUkVNT1ZFIC5qcyBGUk9NIElEXG5cdFx0XHRcdFx0aWYgKG9iai5pZC5zZWFyY2goXCIuanNcIikgIT09IC0xKSB7XG5cdFx0XHRcdFx0XHRvYmouaWQgPSBvYmouaWQuc3BsaXQoXCIuXCIpO1xuXHRcdFx0XHRcdFx0b2JqLmlkLnBvcCgpO1xuXHRcdFx0XHRcdFx0b2JqLmlkID0gb2JqLmlkLmpvaW4oXCIuXCIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvL1JldHVybiBpZiBhbHJlYWR5IGV4aXN0c1xuXHRcdFx0aWYoT3JneS5wcml2YXRlLmNvbmZpZy5saXN0W29iai5pZF0gJiYgb2JqLnR5cGUgIT09ICd0aW1lcicpe1xuXHRcdFx0XHQvL0EgcHJldmlvdXMgcHJvbWlzZSBvZiB0aGUgc2FtZSBpZCBleGlzdHMuXG5cdFx0XHRcdC8vTWFrZSBzdXJlIHRoaXMgZGVwZW5kZW5jeSBvYmplY3QgZG9lc24ndCBoYXZlIGFcblx0XHRcdFx0Ly9yZXNvbHZlciAtIGlmIGl0IGRvZXMgZXJyb3Jcblx0XHRcdFx0aWYob2JqLnJlc29sdmVyKXtcblx0XHRcdFx0XHRPcmd5LnByaXZhdGUuY29uZmlnLmRlYnVnKFtcblx0XHRcdFx0XHRcdFwiWW91IGNhbid0IHNldCBhIHJlc29sdmVyIG9uIGEgcXVldWUgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIGRlY2xhcmVkLiBZb3UgY2FuIG9ubHkgcmVmZXJlbmNlIHRoZSBvcmlnaW5hbC5cIlxuXHRcdFx0XHRcdFx0LFwiRGV0ZWN0ZWQgcmUtaW5pdCBvZiAnXCIgKyBvYmouaWQgKyBcIicuXCJcblx0XHRcdFx0XHRcdCxcIkF0dGVtcHRlZDpcIlxuXHRcdFx0XHRcdFx0LG9ialxuXHRcdFx0XHRcdFx0LFwiRXhpc3Rpbmc6XCJcblx0XHRcdFx0XHRcdCxPcmd5LnByaXZhdGUuY29uZmlnLmxpc3Rbb2JqLmlkXVxuXHRcdFx0XHRcdF0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0cmV0dXJuIE9yZ3kucHJpdmF0ZS5jb25maWcubGlzdFtvYmouaWRdO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblxuXHRcdFx0Ly9Db252ZXJ0IGRlcGVuZGVuY3kgdG8gYW4gaW5zdGFuY2Vcblx0XHRcdHZhciBkZWY7XG5cdFx0XHRzd2l0Y2godHJ1ZSl7XG5cblx0XHRcdFx0XHQvL0V2ZW50XG5cdFx0XHRcdFx0Y2FzZShvYmoudHlwZSA9PT0gJ2V2ZW50Jyk6XG5cdFx0XHRcdFx0XHRcdGRlZiA9IF9wcml2YXRlLndyYXBfZXZlbnQob2JqKTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRjYXNlKG9iai50eXBlID09PSAncXVldWUnKTpcblx0XHRcdFx0XHRcdFx0ZGVmID0gT3JneS5xdWV1ZShvYmouZGVwZW5kZW5jaWVzLG9iaik7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0Ly9BbHJlYWR5IGEgdGhlbmFibGVcblx0XHRcdFx0XHRjYXNlKHR5cGVvZiBvYmoudGhlbiA9PT0gJ2Z1bmN0aW9uJyk6XG5cblx0XHRcdFx0XHRcdFx0c3dpdGNoKHRydWUpe1xuXG5cdFx0XHRcdFx0XHRcdFx0XHQvL1JlZmVyZW5jZSB0byBhbiBleGlzdGluZyBpbnN0YW5jZVxuXHRcdFx0XHRcdFx0XHRcdFx0Y2FzZSh0eXBlb2Ygb2JqLmlkID09PSAnc3RyaW5nJyk6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiJ1wiK29iai5pZCArXCInOiBkaWQgbm90IGV4aXN0LiBBdXRvIGNyZWF0aW5nIG5ldyBkZWZlcnJlZC5cIik7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmID0gX3ByaXZhdGUuZGVmZXJyZWQoe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpZCA6IG9iai5pZFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly9JZiBvYmplY3Qgd2FzIGEgdGhlbmFibGUsIHJlc29sdmUgdGhlIG5ldyBkZWZlcnJlZCB3aGVuIHRoZW4gY2FsbGVkXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYob2JqLnRoZW4pe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0b2JqLnRoZW4oZnVuY3Rpb24ocil7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGRlZi5yZXNvbHZlKHIpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHQvL09CSkVDVCBQUk9QRVJUWSAucHJvbWlzZSBFWFBFQ1RFRCBUTyBSRVRVUk4gQSBQUk9NSVNFXG5cdFx0XHRcdFx0XHRcdFx0XHRjYXNlKHR5cGVvZiBvYmoucHJvbWlzZSA9PT0gJ2Z1bmN0aW9uJyk6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYob2JqLnNjb3BlKXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmID0gb2JqLnByb21pc2UuY2FsbChvYmouc2NvcGUpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkZWYgPSBvYmoucHJvbWlzZSgpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0XHRcdFx0Ly9PYmplY3QgaXMgYSB0aGVuYWJsZVxuXHRcdFx0XHRcdFx0XHRcdFx0Y2FzZShvYmoudGhlbik6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmID0gb2JqO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRkZWZhdWx0OlxuXG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHQvL0NoZWNrIGlmIGlzIGEgdGhlbmFibGVcblx0XHRcdFx0XHRcdFx0aWYodHlwZW9mIGRlZiAhPT0gJ29iamVjdCcgfHwgIWRlZi50aGVuKXtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBPcmd5LnByaXZhdGUuY29uZmlnLmRlYnVnKFwiRGVwZW5kZW5jeSBsYWJlbGVkIGFzIGEgcHJvbWlzZSBkaWQgbm90IHJldHVybiBhIHByb21pc2UuXCIsb2JqKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdGNhc2Uob2JqLnR5cGUgPT09ICd0aW1lcicpOlxuXHRcdFx0XHRcdFx0XHRkZWYgPSBfcHJpdmF0ZS53cmFwX3RpbWVyKG9iaik7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0Ly9Mb2FkIGZpbGVcblx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0XHRvYmoudHlwZSA9IG9iai50eXBlIHx8IFwiZGVmYXVsdFwiO1xuXHRcdFx0XHRcdFx0XHQvL0luaGVyaXQgcGFyZW50J3MgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeVxuXHRcdFx0XHRcdFx0XHRpZihvcHRpb25zLnBhcmVudCAmJiBvcHRpb25zLnBhcmVudC5jd2Qpe1xuXHRcdFx0XHRcdFx0XHRcdG9iai5jd2QgPSBvcHRpb25zLnBhcmVudC5jd2Q7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0ZGVmID0gX3ByaXZhdGUud3JhcF94aHIob2JqKTtcblx0XHRcdH1cblxuXHRcdFx0Ly9JbmRleCBwcm9taXNlIGJ5IGlkIGZvciBmdXR1cmUgcmVmZXJlbmNpbmdcblx0XHRcdE9yZ3kucHJpdmF0ZS5jb25maWcubGlzdFtvYmouaWRdID0gZGVmO1xuXG5cdFx0XHRyZXR1cm4gZGVmO1xuXHR9O1xuXG5cblx0LyoqXG5cdCAqIEB0b2RvOiByZWRvIHRoaXNcblx0ICpcblx0ICogQ29udmVydHMgYSByZWZlcmVuY2UgdG8gYSBET00gZXZlbnQgdG8gYSBwcm9taXNlLlxuXHQgKiBSZXNvbHZlZCBvbiBmaXJzdCBldmVudCB0cmlnZ2VyLlxuXHQgKlxuXHQgKiBAdG9kbyByZW1vdmUganF1ZXJ5IGRlcGVuZGVuY3lcblx0ICpcblx0ICogQHBhcmFtIHtvYmplY3R9IG9ialxuXHQgKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZCBvYmplY3Rcblx0ICovXG5cdF9wcml2YXRlLndyYXBfZXZlbnQgPSBmdW5jdGlvbihvYmope1xuXG5cdFx0XHR2YXIgZGVmID0gT3JneS5kZWZlcnJlZCh7XG5cdFx0XHRcdFx0aWQgOiBvYmouaWRcblx0XHRcdH0pO1xuXG5cblx0XHRcdGlmKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpe1xuXG5cdFx0XHRcdFx0aWYodHlwZW9mICQgIT09ICdmdW5jdGlvbicpe1xuXHRcdFx0XHRcdFx0XHR2YXIgbXNnID0gJ3dpbmRvdyBhbmQgZG9jdW1lbnQgYmFzZWQgZXZlbnRzIGRlcGVuZCBvbiBqUXVlcnknO1xuXHRcdFx0XHRcdFx0XHRkZWYucmVqZWN0KG1zZyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0XHQvL0ZvciBub3csIGRlcGVuZCBvbiBqcXVlcnkgZm9yIElFOCBET01Db250ZW50TG9hZGVkIHBvbHlmaWxsXG5cdFx0XHRcdFx0XHRzd2l0Y2godHJ1ZSl7XG5cdFx0XHRcdFx0XHRcdGNhc2Uob2JqLmlkID09PSAncmVhZHknIHx8IG9iai5pZCA9PT0gJ0RPTUNvbnRlbnRMb2FkZWQnKTpcblx0XHRcdFx0XHRcdFx0XHQkKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHRcdFx0ZGVmLnJlc29sdmUoMSk7XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdGNhc2Uob2JqLmlkID09PSAnbG9hZCcpOlxuXHRcdFx0XHRcdFx0XHRcdCQod2luZG93KS5sb2FkKGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdFx0XHRkZWYucmVzb2x2ZSgxKTtcblx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdFx0XHQkKGRvY3VtZW50KS5vbihvYmouaWQsXCJib2R5XCIsZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0XHRcdGRlZi5yZXNvbHZlKDEpO1xuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGRlZjtcblx0fTtcblxuXG5cdF9wcml2YXRlLndyYXBfdGltZXIgPSBmdW5jdGlvbihvYmope1xuXG5cdFx0XHR2YXIgZGVmID0gT3JneS5kZWZlcnJlZCgpO1xuXG5cdFx0XHQoZnVuY3Rpb24oZGVmKXtcblx0XHRcdFx0XHR2YXIgX3N0YXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdFx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHR2YXIgX2VuZCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHRcdFx0XHRcdFx0XHRkZWYucmVzb2x2ZSh7XG5cdFx0XHRcdFx0XHRcdFx0XHRzdGFydCA6IF9zdGFydFxuXHRcdFx0XHRcdFx0XHRcdFx0LGVuZCA6IF9lbmRcblx0XHRcdFx0XHRcdFx0XHRcdCxlbGFwc2VkIDogX2VuZCAtIF9zdGFydFxuXHRcdFx0XHRcdFx0XHRcdFx0LHRpbWVvdXQgOiBvYmoudGltZW91dFxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9LG9iai50aW1lb3V0KTtcblx0XHRcdH0oZGVmKSk7XG5cblx0XHRcdHJldHVybiBkZWY7XG5cdH07XG5cblxuXHQvKipcblx0ICogQ3JlYXRlcyBhIGRlZmVycmVkIG9iamVjdCB0aGF0IGRlcGVuZHMgb24gdGhlIGxvYWRpbmcgb2YgYSBmaWxlLlxuXHQgKlxuXHQgKiBAcGFyYW0ge29iamVjdH0gZGVwXG5cdCAqIEByZXR1cm5zIHtvYmplY3R9IGRlZmVycmVkIG9iamVjdFxuXHQgKi9cblx0X3ByaXZhdGUud3JhcF94aHIgPSBmdW5jdGlvbihkZXApe1xuXG5cdFx0XHR2YXIgcmVxdWlyZWQgPSBbXCJpZFwiLFwidXJsXCJdO1xuXHRcdFx0Zm9yKHZhciBpIGluIHJlcXVpcmVkKXtcblx0XHRcdFx0aWYoIWRlcFtyZXF1aXJlZFtpXV0pe1xuXHRcdFx0XHRcdHJldHVybiBPcmd5LnByaXZhdGUuY29uZmlnLmRlYnVnKFtcblx0XHRcdFx0XHRcdFwiRmlsZSByZXF1ZXN0cyBjb252ZXJ0ZWQgdG8gcHJvbWlzZXMgcmVxdWlyZTogXCIgKyByZXF1aXJlZFtpXVxuXHRcdFx0XHRcdFx0LFwiTWFrZSBzdXJlIHlvdSB3ZXJlbid0IGV4cGVjdGluZyBkZXBlbmRlbmN5IHRvIGFscmVhZHkgaGF2ZSBiZWVuIHJlc29sdmVkIHVwc3RyZWFtLlwiXG5cdFx0XHRcdFx0XHQsZGVwXG5cdFx0XHRcdFx0XSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly9JRiBQUk9NSVNFIEZPUiBUSElTIFVSTCBBTFJFQURZIEVYSVNUUywgUkVUVVJOIElUXG5cdFx0XHRpZihPcmd5LnByaXZhdGUuY29uZmlnLmxpc3RbZGVwLmlkXSl7XG5cdFx0XHRcdHJldHVybiBPcmd5LnByaXZhdGUuY29uZmlnLmxpc3RbZGVwLmlkXTtcblx0XHRcdH1cblxuXHRcdFx0Ly9DT05WRVJUIFRPIERFRkVSUkVEOlxuXHRcdFx0dmFyIGRlZiA9IE9yZ3kuZGVmZXJyZWQoZGVwKTtcblxuXHRcdFx0aWYodHlwZW9mIE9yZ3kuZmlsZV9sb2FkZXJbT3JneS5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy5tb2RlXVtkZXAudHlwZV0gIT09ICd1bmRlZmluZWQnKXtcblx0XHRcdFx0T3JneS5maWxlX2xvYWRlcltPcmd5LnByaXZhdGUuY29uZmlnLnNldHRpbmdzLm1vZGVdW2RlcC50eXBlXShkZXAudXJsLGRlZixkZXApO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZXtcblx0XHRcdFx0T3JneS5maWxlX2xvYWRlcltPcmd5LnByaXZhdGUuY29uZmlnLnNldHRpbmdzLm1vZGVdWydkZWZhdWx0J10oZGVwLnVybCxkZWYsZGVwKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGRlZjtcblx0fTtcblxuXHQvKipcblx0KiBBIFwic2lnbmFsXCIgaGVyZSBjYXVzZXMgYSBxdWV1ZSB0byBsb29rIHRocm91Z2ggZWFjaCBpdGVtXG5cdCogaW4gaXRzIHVwc3RyZWFtIGFuZCBjaGVjayB0byBzZWUgaWYgYWxsIGFyZSByZXNvbHZlZC5cblx0KlxuXHQqIFNpZ25hbHMgY2FuIG9ubHkgYmUgcmVjZWl2ZWQgYnkgYSBxdWV1ZSBpdHNlbGYgb3IgYW4gaW5zdGFuY2Vcblx0KiBpbiBpdHMgdXBzdHJlYW0uXG5cdCpcblx0KiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0XG5cdCogQHBhcmFtIHtzdHJpbmd9IGZyb21faWRcblx0KiBAcmV0dXJucyB7dm9pZH1cblx0Ki9cblx0X3ByaXZhdGUucmVjZWl2ZV9zaWduYWwgPSBmdW5jdGlvbih0YXJnZXQsZnJvbV9pZCl7XG5cblx0XHRpZih0YXJnZXQuaGFsdF9yZXNvbHV0aW9uID09PSAxKSByZXR1cm47XG5cblx0XHQvL01BS0UgU1VSRSBUSEUgU0lHTkFMIFdBUyBGUk9NIEEgUFJPTUlTRSBCRUlORyBMSVNURU5FRCBUT1xuXHQgLy9CVVQgQUxMT1cgU0VMRiBTVEFUVVMgQ0hFQ0tcblx0IHZhciBzdGF0dXM7XG5cdCBpZihmcm9tX2lkICE9PSB0YXJnZXQuaWQgJiYgIXRhcmdldC51cHN0cmVhbVtmcm9tX2lkXSl7XG5cdFx0XHQgcmV0dXJuIE9yZ3kucHJpdmF0ZS5jb25maWcuZGVidWcoZnJvbV9pZCArIFwiIGNhbid0IHNpZ25hbCBcIiArIHRhcmdldC5pZCArIFwiIGJlY2F1c2Ugbm90IGluIHVwc3RyZWFtLlwiKTtcblx0IH1cblx0IC8vUlVOIFRIUk9VR0ggUVVFVUUgT0YgT0JTRVJWSU5HIFBST01JU0VTIFRPIFNFRSBJRiBBTEwgRE9ORVxuXHQgZWxzZXtcblx0XHRcdCBzdGF0dXMgPSAxO1xuXHRcdFx0IGZvcih2YXIgaSBpbiB0YXJnZXQudXBzdHJlYW0pe1xuXHRcdFx0XHRcdCAvL1NFVFMgU1RBVFVTIFRPIDAgSUYgQU5ZIE9CU0VSVklORyBIQVZFIEZBSUxFRCwgQlVUIE5PVCBJRiBQRU5ESU5HIE9SIFJFU09MVkVEXG5cdFx0XHRcdFx0IGlmKHRhcmdldC51cHN0cmVhbVtpXS5zdGF0ZSAhPT0gMSkge1xuXHRcdFx0XHRcdFx0XHQgc3RhdHVzID0gdGFyZ2V0LnVwc3RyZWFtW2ldLnN0YXRlO1xuXHRcdFx0XHRcdFx0XHQgYnJlYWs7XG5cdFx0XHRcdFx0IH1cblx0XHRcdCB9XG5cdCB9XG5cblx0IC8vUkVTT0xWRSBRVUVVRSBJRiBVUFNUUkVBTSBGSU5JU0hFRFxuXHQgaWYoc3RhdHVzID09PSAxKXtcblxuXHRcdFx0Ly9HRVQgUkVUVVJOIFZBTFVFUyBQRVIgREVQRU5ERU5DSUVTLCBXSElDSCBTQVZFUyBPUkRFUiBBTkRcblx0XHRcdC8vUkVQT1JUUyBEVVBMSUNBVEVTXG5cdFx0XHR2YXIgdmFsdWVzID0gW107XG5cdFx0XHRmb3IodmFyIGkgaW4gdGFyZ2V0LmRlcGVuZGVuY2llcyl7XG5cdFx0XHRcdHZhbHVlcy5wdXNoKHRhcmdldC5kZXBlbmRlbmNpZXNbaV0udmFsdWUpO1xuXHRcdFx0fVxuXG5cdFx0XHR0YXJnZXQucmVzb2x2ZS5jYWxsKHRhcmdldCx2YWx1ZXMpO1xuXHQgfVxuXG5cdCBpZihzdGF0dXMgPT09IDIpe1xuXHRcdFx0IHZhciBlcnIgPSBbXG5cdFx0XHRcdFx0IHRhcmdldC5pZCtcIiBkZXBlbmRlbmN5ICdcIit0YXJnZXQudXBzdHJlYW1baV0uaWQgKyBcIicgd2FzIHJlamVjdGVkLlwiXG5cdFx0XHRcdFx0ICx0YXJnZXQudXBzdHJlYW1baV0uYXJndW1lbnRzXG5cdFx0XHQgXTtcblx0XHRcdCB0YXJnZXQucmVqZWN0LmFwcGx5KHRhcmdldCxlcnIpO1xuXHQgfVxuXHR9O1xuXG5cblxuXG5cdHZhciBfcHVibGljID0ge307XG5cblx0X3B1YmxpYy5pc19vcmd5ID0gdHJ1ZTtcblxuXHRfcHVibGljLmlkID0gbnVsbDtcblxuXHQvL0EgQ09VTlRFUiBGT1IgQVVUMC1HRU5FUkFURUQgUFJPTUlTRSBJRCdTXG5cdF9wdWJsaWMuc2V0dGxlZCA9IDA7XG5cblx0LyoqXG5cdCogU1RBVEUgQ09ERVM6XG5cdCogLS0tLS0tLS0tLS0tLS0tLS0tXG5cdCogLTFcdCA9PiBTRVRUTElORyBbRVhFQ1VUSU5HIENBTExCQUNLU11cblx0KiAgMFx0ID0+IFBFTkRJTkdcblx0KiAgMVx0ID0+IFJFU09MVkVEIC8gRlVMRklMTEVEXG5cdCogIDJcdCA9PiBSRUpFQ1RFRFxuXHQqL1xuXHRfcHVibGljLnN0YXRlID0gMDtcblxuXHRfcHVibGljLnZhbHVlID0gW107XG5cblx0Ly9UaGUgbW9zdCByZWNlbnQgdmFsdWUgZ2VuZXJhdGVkIGJ5IHRoZSB0aGVuLT5kb25lIGNoYWluLlxuXHRfcHVibGljLmNhYm9vc2UgPSBudWxsO1xuXG5cdF9wdWJsaWMubW9kZWwgPSBcImRlZmVycmVkXCI7XG5cblx0X3B1YmxpYy5kb25lX2ZpcmVkID0gMDtcblxuXHRfcHVibGljLnRpbWVvdXRfaWQgPSBudWxsO1xuXG5cdF9wdWJsaWMuY2FsbGJhY2tfc3RhdGVzID0ge1xuXHRcdHJlc29sdmUgOiAwXG5cdFx0LHRoZW4gOiAwXG5cdFx0LGRvbmUgOiAwXG5cdFx0LHJlamVjdCA6IDBcblx0fTtcblxuXHQvKipcblx0KiBTZWxmIGV4ZWN1dGluZyBmdW5jdGlvbiB0byBpbml0aWFsaXplIGNhbGxiYWNrIGV2ZW50XG5cdCogbGlzdC5cblx0KlxuXHQqIFJldHVybnMgYW4gb2JqZWN0IHdpdGggdGhlIHNhbWUgcHJvcGVydHlOYW1lcyBhc1xuXHQqIF9wdWJsaWMuY2FsbGJhY2tfc3RhdGVzOiBhZGRpbmcgYm9pbGVycGxhdGVcblx0KiBwcm9wZXJ0aWVzIGZvciBlYWNoXG5cdCpcblx0KiBAcmV0dXJucyB7b2JqZWN0fVxuXHQqL1xuXHRfcHVibGljLmNhbGxiYWNrcyA9IChmdW5jdGlvbigpe1xuXG5cdFx0dmFyIG8gPSB7fTtcblxuXHRcdGZvcih2YXIgaSBpbiBfcHVibGljLmNhbGxiYWNrX3N0YXRlcyl7XG5cdFx0XHRvW2ldID0ge1xuXHRcdFx0XHR0cmFpbiA6IFtdXG5cdFx0XHRcdCxob29rcyA6IHtcblx0XHRcdFx0XHRvbkJlZm9yZSA6IHtcblx0XHRcdFx0XHRcdHRyYWluIDogW11cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0LG9uQ29tcGxldGUgOiB7XG5cdFx0XHRcdFx0XHR0cmFpbiA6IFtdXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdHJldHVybiBvO1xuXHR9KSgpO1xuXG5cdC8vUFJPTUlTRSBIQVMgT0JTRVJWRVJTIEJVVCBET0VTIE5PVCBPQlNFUlZFIE9USEVSU1xuXHRfcHVibGljLmRvd25zdHJlYW0gPSB7fTtcblxuXHRfcHVibGljLmV4ZWN1dGlvbl9oaXN0b3J5ID0gW107XG5cblx0Ly9XSEVOIFRSVUUsIEFMTE9XUyBSRS1JTklUIFtGT1IgVVBHUkFERVMgVE8gQSBRVUVVRV1cblx0X3B1YmxpYy5vdmVyd3JpdGFibGUgPSAwO1xuXG5cdC8qKlxuXHQqIFJFTU9URVxuXHQqXG5cdCogUkVNT1RFID09IDEgID0+ICBbREVGQVVMVF0gTWFrZSBodHRwIHJlcXVlc3QgZm9yIGZpbGVcblx0KlxuXHQqIFJFTU9URSA9PSAwICA9PiAgUmVhZCBmaWxlIGRpcmVjdGx5IGZyb20gdGhlIGZpbGVzeXN0ZW1cblx0KlxuXHQqIE9OTFkgQVBQTElFUyBUTyBTQ1JJUFRTIFJVTiBVTkRFUiBOT0RFIEFTIEJST1dTRVIgSEFTIE5PXG5cdCogRklMRVNZU1RFTSBBQ0NFU1Ncblx0Ki9cblx0X3B1YmxpYy5yZW1vdGUgPSAxO1xuXG5cdC8vQUREUyBUTyBNQVNURVIgTElTVC4gQUxXQVlTIFRSVUUgVU5MRVNTIFVQR1JBRElORyBBIFBST01JU0UgVE8gQSBRVUVVRVxuXHRfcHVibGljLmxpc3QgPSAxO1xuXG5cblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cdC8vXHRfcHVibGljIE1FVEhPRFNcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuXHQvKipcblx0KiBSZXNvbHZlcyBhIGRlZmVycmVkL3F1ZXVlLlxuXHQqXG5cdCogQG1lbWJlcm9mIG9yZ3kvZGVmZXJyZWRcblx0KiBAZnVuY3Rpb24gb3JneS9kZWZlcnJlZCNyZXNvbHZlXG5cdCpcblx0KiBAcGFyYW0ge21peGVkfSB2YWx1ZSBSZXNvbHZlciB2YWx1ZS5cblx0KiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZC9xdWV1ZVxuXHQqL1xuXHRfcHVibGljLnJlc29sdmUgPSBmdW5jdGlvbih2YWx1ZSl7XG5cblx0XHRpZih0aGlzLnNldHRsZWQgPT09IDEpe1xuXHRcdFx0T3JneS5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhbXG5cdFx0XHRcdHRoaXMuaWQgKyBcIiBjYW4ndCByZXNvbHZlLlwiXG5cdFx0XHRcdCxcIk9ubHkgdW5zZXR0bGVkIGRlZmVycmVkcyBhcmUgcmVzb2x2YWJsZS5cIlxuXHRcdFx0XSk7XG5cdFx0fVxuXG5cdFx0Ly9TRVQgU1RBVEUgVE8gU0VUVExFTUVOVCBJTiBQUk9HUkVTU1xuXHRcdF9wcml2YXRlLnNldF9zdGF0ZSh0aGlzLC0xKTtcblxuXHRcdC8vU0VUIFZBTFVFXG5cdFx0dGhpcy52YWx1ZSA9IHZhbHVlO1xuXG5cdFx0Ly9SVU4gUkVTT0xWRVIgQkVGT1JFIFBST0NFRURJTkdcblx0XHQvL0VWRU4gSUYgVEhFUkUgSVMgTk8gUkVTT0xWRVIsIFNFVCBJVCBUTyBGSVJFRCBXSEVOIENBTExFRFxuXHRcdGlmKCF0aGlzLnJlc29sdmVyX2ZpcmVkICYmIHR5cGVvZiB0aGlzLnJlc29sdmVyID09PSAnZnVuY3Rpb24nKXtcblxuXHRcdFx0dGhpcy5yZXNvbHZlcl9maXJlZCA9IDE7XG5cblx0XHRcdC8vQWRkIHJlc29sdmVyIHRvIHJlc29sdmUgdHJhaW5cblx0XHRcdHRyeXtcblx0XHRcdFx0dGhpcy5jYWxsYmFja3MucmVzb2x2ZS50cmFpbi5wdXNoKGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0dGhpcy5yZXNvbHZlcih2YWx1ZSx0aGlzKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRjYXRjaChlKXtcblx0XHRcdFx0T3JneS5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhlKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0ZWxzZXtcblxuXHRcdFx0dGhpcy5yZXNvbHZlcl9maXJlZCA9IDE7XG5cblx0XHRcdC8vQWRkIHNldHRsZSB0byByZXNvbHZlIHRyYWluXG5cdFx0XHQvL0Fsd2F5cyBzZXR0bGUgYmVmb3JlIGFsbCBvdGhlciBjb21wbGV0ZSBjYWxsYmFja3Ncblx0XHRcdHRoaXMuY2FsbGJhY2tzLnJlc29sdmUuaG9va3Mub25Db21wbGV0ZS50cmFpbi51bnNoaWZ0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdF9wcml2YXRlLnNldHRsZSh0aGlzKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdC8vUnVuIHJlc29sdmVcblx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oXG5cdFx0XHR0aGlzXG5cdFx0XHQsdGhpcy5jYWxsYmFja3MucmVzb2x2ZVxuXHRcdFx0LHRoaXMudmFsdWVcblx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cblx0XHQpO1xuXG5cdFx0Ly9yZXNvbHZlciBpcyBleHBlY3RlZCB0byBjYWxsIHJlc29sdmUgYWdhaW5cblx0XHQvL2FuZCB0aGF0IHdpbGwgZ2V0IHVzIHBhc3QgdGhpcyBwb2ludFxuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cblx0LyoqXG5cdCogUmVqZWN0cyBhIGRlZmVycmVkL3F1ZXVlXG5cdCpcblx0KiBAbWVtYmVyb2Ygb3JneS9kZWZlcnJlZFxuXHQqIEBmdW5jdGlvbiBvcmd5L2RlZmVycmVkI3JlamVjdFxuXHQqXG5cdCogQHBhcmFtIHtzdHJpbmd8YXJyYXl9IGVyciBFcnJvciBpbmZvcm1hdGlvbi5cblx0KiBAcmV0dXJuIHtvYmplY3R9IGRlZmVycmVkL3F1ZXVlXG5cdCovXG5cdF9wdWJsaWMucmVqZWN0ID0gZnVuY3Rpb24oZXJyKXtcblxuXHRcdGlmKCEoZXJyIGluc3RhbmNlb2YgQXJyYXkpKXtcblx0XHRcdGVyciA9IFtlcnJdO1xuXHRcdH1cblxuXHRcdHZhciBtc2cgPSBcIlJlamVjdGVkIFwiK3RoaXMubW9kZWwrXCI6ICdcIit0aGlzLmlkK1wiJy5cIlxuXG5cdFx0aWYoT3JneS5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy5kZWJ1Z19tb2RlKXtcblx0XHRcdGVyci51bnNoaWZ0KG1zZyk7XG5cdFx0XHRPcmd5LnByaXZhdGUuY29uZmlnLmRlYnVnKGVycix0aGlzKTtcblx0XHR9XG5cdFx0ZWxzZXtcblx0XHRcdG1zZyA9IG1zZyArIFwiIFR1cm4gb24gZGVidWcgbW9kZSBmb3IgbW9yZSBpbmZvLlwiO1xuXHRcdFx0Y29uc29sZS53YXJuKG1zZyk7XG5cdFx0fVxuXG5cdFx0Ly9SZW1vdmUgYXV0byB0aW1lb3V0IHRpbWVyXG5cdFx0aWYodGhpcy50aW1lb3V0X2lkKXtcblx0XHRcdGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRfaWQpO1xuXHRcdH1cblxuXHRcdC8vU2V0IHN0YXRlIHRvIHJlamVjdGVkXG5cdFx0X3ByaXZhdGUuc2V0X3N0YXRlKHRoaXMsMik7XG5cblx0XHQvL0V4ZWN1dGUgcmVqZWN0aW9uIHF1ZXVlXG5cdFx0X3ByaXZhdGUucnVuX3RyYWluKFxuXHRcdFx0dGhpc1xuXHRcdFx0LHRoaXMuY2FsbGJhY2tzLnJlamVjdFxuXHRcdFx0LGVyclxuXHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuXHRcdCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXG5cdC8qKlxuXHQqIENoYWluIG1ldGhvZFxuXG5cdDxiPlVzYWdlOjwvYj5cblx0YGBgXG5cdHZhciBPcmd5ID0gcmVxdWlyZShcIm9yZ3lcIiksXG5cdFx0XHRcdFx0cSA9IE9yZ3kuZGVmZXJyZWQoe1xuXHRcdFx0XHRcdFx0aWQgOiBcInExXCJcblx0XHRcdFx0XHR9KTtcblxuXHQvL1Jlc29sdmUgdGhlIGRlZmVycmVkXG5cdHEucmVzb2x2ZShcIlNvbWUgdmFsdWUuXCIpO1xuXG5cdHEudGhlbihmdW5jdGlvbihyKXtcblx0XHRjb25zb2xlLmxvZyhyKTsgLy9Tb21lIHZhbHVlLlxuXHR9KVxuXG5cdGBgYFxuXG5cdCogQG1lbWJlcm9mIG9yZ3kvZGVmZXJyZWRcblx0KiBAZnVuY3Rpb24gb3JneS9kZWZlcnJlZCN0aGVuXG5cdCpcblx0KiBAcGFyYW0ge2Z1bmN0aW9ufSBmbiBDYWxsYmFjayBmdW5jdGlvblxuXHQqIEBwYXJhbSB7ZnVuY3Rpb259IHJlamVjdG9yIFJlamVjdGlvbiBjYWxsYmFjayBmdW5jdGlvblxuXHQqIEByZXR1cm4ge29iamVjdH0gZGVmZXJyZWQvcXVldWVcblx0Ki9cblx0X3B1YmxpYy50aGVuID0gZnVuY3Rpb24oZm4scmVqZWN0b3Ipe1xuXG5cdFx0c3dpdGNoKHRydWUpe1xuXG5cdFx0XHQvL0FuIGVycm9yIHdhcyBwcmV2aW91c2x5IHRocm93biwgYWRkIHJlamVjdG9yICYgYmFpbCBvdXRcblx0XHRcdGNhc2UodGhpcy5zdGF0ZSA9PT0gMik6XG5cdFx0XHRcdGlmKHR5cGVvZiByZWplY3RvciA9PT0gJ2Z1bmN0aW9uJyl7XG5cdFx0XHRcdFx0dGhpcy5jYWxsYmFja3MucmVqZWN0LnRyYWluLnB1c2gocmVqZWN0b3IpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHQvL0V4ZWN1dGlvbiBjaGFpbiBhbHJlYWR5IGZpbmlzaGVkLiBCYWlsIG91dC5cblx0XHRcdGNhc2UodGhpcy5kb25lX2ZpcmVkID09PSAxKTpcblx0XHRcdFx0cmV0dXJuIE9yZ3kucHJpdmF0ZS5jb25maWcuZGVidWcodGhpcy5pZCtcIiBjYW4ndCBhdHRhY2ggLnRoZW4oKSBiZWNhdXNlIC5kb25lKCkgaGFzIGFscmVhZHkgZmlyZWQsIGFuZCB0aGF0IG1lYW5zIHRoZSBleGVjdXRpb24gY2hhaW4gaXMgY29tcGxldGUuXCIpO1xuXG5cdFx0XHRkZWZhdWx0OlxuXG5cdFx0XHRcdC8vUHVzaCBjYWxsYmFjayB0byB0aGVuIHF1ZXVlXG5cdFx0XHRcdHRoaXMuY2FsbGJhY2tzLnRoZW4udHJhaW4ucHVzaChmbik7XG5cblx0XHRcdFx0Ly9QdXNoIHJlamVjdCBjYWxsYmFjayB0byB0aGUgcmVqZWN0aW9uIHF1ZXVlXG5cdFx0XHRcdGlmKHR5cGVvZiByZWplY3RvciA9PT0gJ2Z1bmN0aW9uJyl7XG5cdFx0XHRcdFx0dGhpcy5jYWxsYmFja3MucmVqZWN0LnRyYWluLnB1c2gocmVqZWN0b3IpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly9TZXR0bGVkLCBydW4gdHJhaW4gbm93XG5cdFx0XHRcdGlmKHRoaXMuc2V0dGxlZCA9PT0gMSAmJiB0aGlzLnN0YXRlID09PSAxICYmICF0aGlzLmRvbmVfZmlyZWQpe1xuXHRcdFx0XHRcdF9wcml2YXRlLnJ1bl90cmFpbihcblx0XHRcdFx0XHRcdHRoaXNcblx0XHRcdFx0XHRcdCx0aGlzLmNhbGxiYWNrcy50aGVuXG5cdFx0XHRcdFx0XHQsdGhpcy5jYWJvb3NlXG5cdFx0XHRcdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogdHJ1ZX1cblx0XHRcdFx0XHQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vVW5zZXR0bGVkLCB0cmFpbiB3aWxsIGJlIHJ1biB3aGVuIHNldHRsZWRcblx0XHRcdFx0Ly9lbHNle31cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXG5cdC8qKlxuXHQqIERvbmUgY2FsbGJhY2suXG5cdCpcblx0KiBAbWVtYmVyb2Ygb3JneS9kZWZlcnJlZFxuXHQqIEBmdW5jdGlvbiBvcmd5L2RlZmVycmVkI2RvbmVcblx0KlxuXHQqIEBwYXJhbSB7ZnVuY3Rpb259IGZuIENhbGxiYWNrIGZ1bmN0aW9uXG5cdCogQHBhcmFtIHtmdW5jdGlvbn0gcmVqZWN0b3IgUmVqZWN0aW9uIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWQvcXVldWVcblx0Ki9cblx0X3B1YmxpYy5kb25lID0gZnVuY3Rpb24oZm4scmVqZWN0b3Ipe1xuXG5cdFx0aWYodGhpcy5jYWxsYmFja3MuZG9uZS50cmFpbi5sZW5ndGggPT09IDBcblx0XHRcdCYmIHRoaXMuZG9uZV9maXJlZCA9PT0gMCl7XG5cdFx0XHRcdGlmKHR5cGVvZiBmbiA9PT0gJ2Z1bmN0aW9uJyl7XG5cblx0XHRcdFx0XHQvL3dyYXAgY2FsbGJhY2sgd2l0aCBzb21lIG90aGVyIGNvbW1hbmRzXG5cdFx0XHRcdFx0dmFyIGZuMiA9IGZ1bmN0aW9uKHIsZGVmZXJyZWQsbGFzdCl7XG5cblx0XHRcdFx0XHRcdC8vRG9uZSBjYW4gb25seSBiZSBjYWxsZWQgb25jZSwgc28gbm90ZSB0aGF0IGl0IGhhcyBiZWVuXG5cdFx0XHRcdFx0XHRkZWZlcnJlZC5kb25lX2ZpcmVkID0gMTtcblxuXHRcdFx0XHRcdFx0Zm4ocixkZWZlcnJlZCxsYXN0KTtcblx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0dGhpcy5jYWxsYmFja3MuZG9uZS50cmFpbi5wdXNoKGZuMik7XG5cblx0XHRcdFx0XHQvL1B1c2ggcmVqZWN0IGNhbGxiYWNrIHRvIHRoZSByZWplY3Rpb24gcXVldWUgb25Db21wbGV0ZVxuXHRcdFx0XHRcdGlmKHR5cGVvZiByZWplY3RvciA9PT0gJ2Z1bmN0aW9uJyl7XG5cdFx0XHRcdFx0XHR0aGlzLmNhbGxiYWNrcy5yZWplY3QuaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKHJlamVjdG9yKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvL1NldHRsZWQsIHJ1biB0cmFpbiBub3dcblx0XHRcdFx0XHRpZih0aGlzLnNldHRsZWQgPT09IDEpe1xuXHRcdFx0XHRcdFx0aWYodGhpcy5zdGF0ZSA9PT0gMSl7XG5cdFx0XHRcdFx0XHRcdF9wcml2YXRlLnJ1bl90cmFpbihcblx0XHRcdFx0XHRcdFx0XHR0aGlzXG5cdFx0XHRcdFx0XHRcdFx0LHRoaXMuY2FsbGJhY2tzLmRvbmVcblx0XHRcdFx0XHRcdFx0XHQsdGhpcy5jYWJvb3NlXG5cdFx0XHRcdFx0XHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRcdFx0X3ByaXZhdGUucnVuX3RyYWluKFxuXHRcdFx0XHRcdFx0XHRcdHRoaXNcblx0XHRcdFx0XHRcdFx0XHQsdGhpcy5jYWxsYmFja3MucmVqZWN0XG5cdFx0XHRcdFx0XHRcdFx0LHRoaXMuY2Fib29zZVxuXHRcdFx0XHRcdFx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly9VbnNldHRsZWQsIHRyYWluIHdpbGwgYmUgcnVuIHdoZW4gc2V0dGxlZFxuXHRcdFx0XHRcdC8vZWxzZXt9XG5cdFx0XHR9XG5cdFx0XHRlbHNle1xuXHRcdFx0XHRyZXR1cm4gT3JneS5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcImRvbmUoKSBtdXN0IGJlIHBhc3NlZCBhIGZ1bmN0aW9uLlwiKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0ZWxzZXtcblx0XHRcdHJldHVybiBPcmd5LnByaXZhdGUuY29uZmlnLmRlYnVnKFwiZG9uZSgpIGNhbiBvbmx5IGJlIGNhbGxlZCBvbmNlLlwiKTtcblx0XHR9XG5cdFx0XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblxuXHQvKipcblx0ICogQWxsb3dzIGEgcHJlcHJvY2Vzc29yIHRvIHNldCBiYWNrcmFjZSBkYXRhIG9uIGFuIE9yZ3kgb2JqZWN0LlxuXHQgKiBAcGFyYW0gIHtzdHJpbmd9IHN0ciBmaWxlbmFtZTpsaW5lIG51bWJlclxuXHQgKiBAcmV0dXJuIHtvYmplY3R9IGRlZmVycmVkL3F1ZXVlXG5cdCAqL1xuXHRfcHVibGljLl9idHJjID0gZnVuY3Rpb24oc3RyKXtcblx0XHR0aGlzLmJhY2t0cmFjZSA9IHN0cjtcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXG5cdC8qKlxuXHQqIENyZWF0ZXMgYSBuZXcgZGVmZXJyZWQgb2JqZWN0IG9yIGlmIG9uZSBleGlzdHMgYnkgdGhlIHNhbWUgaWQsXG5cdCogcmV0dXJucyBpdC5cblxuXHQ8Yj5Vc2FnZTo8L2I+XG5cdGBgYFxuXHR2YXIgT3JneSA9IHJlcXVpcmUoXCJvcmd5XCIpLFxuXHRxID0gT3JneS5kZWZlcnJlZCh7XG5cdGlkIDogXCJxMVwiXG5cdH0pO1xuXHRgYGBcblxuXHQqIEBtZW1iZXJvZiBvcmd5XG5cdCogQGZ1bmN0aW9uIGRlZmVycmVkXG5cdCpcblx0KiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBMaXN0IG9mIG9wdGlvbnM6XG5cdCpcblx0KiAgLSA8Yj5pZDwvYj4ge3N0cmluZ30gVW5pcXVlIGlkIG9mIHRoZSBvYmplY3QuXG5cdCpcdFx0LSBDYW4gYmUgdXNlZCB3aXRoIE9yZ3kuZ2V0KGlkKS5cblx0Klx0XHQtIE9wdGlvbmFsLlxuXHQqXG5cdCpcblx0KiAgLSA8Yj50aW1lb3V0PC9iPiB7bnVtYmVyfSBUaW1lIGluIG1zIGFmdGVyIHdoaWNoIHJlamVjdCBpcyBjYWxsZWQgaWYgbm90IHlldCByZXNvbHZlZC5cblx0LSBEZWZhdWx0cyB0byBPcmd5LmNvbmZpZygpLnRpbWVvdXQuXG5cdC0gRGVsYXlzIGluIG9iamVjdC50aGVuKCkgYW5kIG9iamVjdC5kb25lKCkgd29uJ3Qgbm90IHRyaWdnZXIgdGhpcywgYmVjYXVzZSB0aG9zZSBtZXRob2RzIHJ1biBhZnRlciByZXNvbHZlLlxuXHQqXG5cdCogQHJldHVybnMge29iamVjdH0ge0BsaW5rIG9yZ3kvZGVmZXJyZWR9XG5cdCovXG5cdE9yZ3kuZGVmZXJyZWQgPSBmdW5jdGlvbihvcHRpb25zKXtcblxuXHRcdHZhciBfbztcblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXHRcdGlmKG9wdGlvbnMuaWQgJiYgT3JneS5wcml2YXRlLmNvbmZpZy5saXN0W29wdGlvbnMuaWRdKXtcblx0XHRcdF9vID0gT3JneS5wcml2YXRlLmNvbmZpZy5saXN0W29wdGlvbnMuaWRdO1xuXHRcdH1cblx0XHRlbHNle1xuXG5cdFx0XHQvL0NyZWF0ZSBhIG5ldyBkZWZlcnJlZCBvYmplY3Rcblx0XHRcdF9vID0gT3JneS5wcml2YXRlLmNvbmZpZy5uYWl2ZV9jbG9uZXIoW19wdWJsaWNdLFtvcHRpb25zXSk7XG5cblx0XHRcdC8vQUNUSVZBVEUgREVGRVJSRURcblx0XHRcdF9vID0gX3ByaXZhdGUuYWN0aXZhdGUoX28pO1xuXHRcdH1cblxuXHRcdHJldHVybiBfbztcblx0fTtcblxuXHRfcHJpdmF0ZS5wdWJsaWMgPSBfcHVibGljO1xuXG5cdC8vU2F2ZSBmb3IgcmUtdXNlXG5cdE9yZ3kucHJpdmF0ZS5kZWZlcnJlZCA9IF9wcml2YXRlOyBcblxuXHRyZXR1cm4gT3JneTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oT3JneSl7XG5cblx0dmFyIF9wdWJsaWMgPSB7fSxcblx0XHRcdF9wcml2YXRlID0ge307XG5cblx0X3B1YmxpYy5icm93c2VyID0ge307XG5cdF9wdWJsaWMubmF0aXZlID0ge307XG5cdF9wcml2YXRlLm5hdGl2ZSA9IHt9O1xuXG5cdC8vQnJvd3NlciBsb2FkXG5cblx0X3B1YmxpYy5icm93c2VyLmNzcyA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXG5cdFx0dmFyIGhlYWQgPVx0ZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJoZWFkXCIpWzBdIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCxcblx0XHRlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpbmtcIik7XG5cblx0XHRlbGVtLnNldEF0dHJpYnV0ZShcImhyZWZcIixwYXRoKTtcblx0XHRlbGVtLnNldEF0dHJpYnV0ZShcInR5cGVcIixcInRleHQvY3NzXCIpO1xuXHRcdGVsZW0uc2V0QXR0cmlidXRlKFwicmVsXCIsXCJzdHlsZXNoZWV0XCIpO1xuXG5cdFx0aWYoZWxlbS5vbmxvYWQpe1xuXHRcdFx0KGZ1bmN0aW9uKGVsZW0pe1xuXHRcdFx0XHRcdGVsZW0ub25sb2FkID0gZWxlbS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblx0XHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoZWxlbSk7XG5cdFx0XHRcdCB9O1xuXG5cdFx0XHRcdCBlbGVtLm9uZXJyb3IgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblx0XHRcdFx0XHRcdGRlZmVycmVkLnJlamVjdChcIkZhaWxlZCB0byBsb2FkIHBhdGg6IFwiICsgcGF0aCk7XG5cdFx0XHRcdCB9O1xuXG5cdFx0XHR9KGVsZW0scGF0aCxkZWZlcnJlZCkpO1xuXG5cdFx0XHRoZWFkLmFwcGVuZENoaWxkKGVsZW0pO1xuXHRcdH1cblx0XHRlbHNle1xuXHRcdFx0Ly9BREQgZWxlbSBCVVQgTUFLRSBYSFIgUkVRVUVTVCBUTyBDSEVDSyBGSUxFIFJFQ0VJVkVEXG5cdFx0XHRoZWFkLmFwcGVuZENoaWxkKGVsZW0pO1xuXHRcdFx0Y29uc29sZS53YXJuKFwiTm8gb25sb2FkIGF2YWlsYWJsZSBmb3IgbGluayB0YWcsIGF1dG9yZXNvbHZpbmcuXCIpO1xuXHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShlbGVtKTtcblx0XHR9XG5cdH07XG5cblx0X3B1YmxpYy5icm93c2VyLnNjcmlwdCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXG5cdFx0dmFyIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xuXHRcdGVsZW0udHlwZSA9ICd0ZXh0L2phdmFzY3JpcHQnO1xuXHRcdGVsZW0uc2V0QXR0cmlidXRlKFwic3JjXCIscGF0aCk7XG5cblx0XHQoZnVuY3Rpb24oZWxlbSxwYXRoLGRlZmVycmVkKXtcblx0XHRcdFx0ZWxlbS5vbmxvYWQgPSBlbGVtLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0Ly9BdXRvcmVzb2x2ZSBieSBkZWZhdWx0XG5cdFx0XHRcdFx0aWYodHlwZW9mIGRlZmVycmVkLmF1dG9yZXNvbHZlICE9PSAnYm9vbGVhbidcblx0XHRcdFx0XHR8fCBkZWZlcnJlZC5hdXRvcmVzb2x2ZSA9PT0gdHJ1ZSl7XG5cdFx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKCh0eXBlb2YgZWxlbS52YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpID8gZWxlbS52YWx1ZSA6IGVsZW0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblx0XHRcdFx0ZWxlbS5vbmVycm9yID0gZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoXCJFcnJvciBsb2FkaW5nOiBcIiArIHBhdGgpO1xuXHRcdFx0XHR9O1xuXHRcdH0oZWxlbSxwYXRoLGRlZmVycmVkKSk7XG5cblx0XHR0aGlzLmhlYWQuYXBwZW5kQ2hpbGQoZWxlbSk7XG5cdH07XG5cblx0X3B1YmxpYy5icm93c2VyLmh0bWwgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkLGRlcCl7XG5cdFx0dGhpcy5kZWZhdWx0KHBhdGgsZGVmZXJyZWQsZGVwKTtcblx0fTtcblxuXHRfcHVibGljLmJyb3dzZXIuZGVmYXVsdCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQsb3B0aW9ucyl7XG5cdFx0dmFyIHIsXG5cdFx0cmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0cmVxLm9wZW4oJ0dFVCcsIHBhdGgsIHRydWUpO1xuXG5cdFx0KGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXHRcdFx0cmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAocmVxLnJlYWR5U3RhdGUgPT09IDQpIHtcblx0XHRcdFx0XHRpZihyZXEuc3RhdHVzID09PSAyMDApe1xuXHRcdFx0XHRcdFx0ciA9IHJlcS5yZXNwb25zZVRleHQ7XG5cdFx0XHRcdFx0XHRpZihvcHRpb25zLnR5cGUgJiYgb3B0aW9ucy50eXBlID09PSAnanNvbicpe1xuXHRcdFx0XHRcdFx0XHR0cnl7XG5cdFx0XHRcdFx0XHRcdFx0ciA9IEpTT04ucGFyc2Uocik7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0Y2F0Y2goZSl7XG5cdFx0XHRcdFx0XHRcdFx0X3B1YmxpYy5kZWJ1ZyhbXG5cdFx0XHRcdFx0XHRcdFx0XHRcIkNvdWxkIG5vdCBkZWNvZGUgSlNPTlwiXG5cdFx0XHRcdFx0XHRcdFx0XHQscGF0aFxuXHRcdFx0XHRcdFx0XHRcdFx0LHJcblx0XHRcdFx0XHRcdFx0XHRdLGRlZmVycmVkKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShyKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRcdGRlZmVycmVkLnJlamVjdChcIkVycm9yIGxvYWRpbmc6IFwiICsgcGF0aCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdH0ocGF0aCxkZWZlcnJlZCkpO1xuXG5cdFx0cmVxLnNlbmQobnVsbCk7XG5cdH07XG5cblxuXG5cdC8vTmF0aXZlIGxvYWRcblxuXHRfcHVibGljLm5hdGl2ZS5jc3MgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblx0XHRfcHVibGljLmJyb3dzZXIuY3NzKHBhdGgsZGVmZXJyZWQpO1xuXHR9O1xuXG5cdF9wdWJsaWMubmF0aXZlLnNjcmlwdCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXHRcdC8vbG9jYWwgcGFja2FnZVxuXHRcdGlmKHBhdGhbMF09PT0nLicpe1xuXHRcdFx0cGF0aCA9IF9wcml2YXRlLm5hdGl2ZS5wcmVwYXJlX3BhdGgocGF0aCxkZWZlcnJlZCk7XG5cdFx0XHR2YXIgciA9IHJlcXVpcmUocGF0aCk7XG5cdFx0XHQvL0F1dG9yZXNvbHZlIGJ5IGRlZmF1bHRcblx0XHRcdGlmKHR5cGVvZiBkZWZlcnJlZC5hdXRvcmVzb2x2ZSAhPT0gJ2Jvb2xlYW4nXG5cdFx0XHR8fCBkZWZlcnJlZC5hdXRvcmVzb2x2ZSA9PT0gdHJ1ZSl7XG5cdFx0XHRcdGRlZmVycmVkLnJlc29sdmUocik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdC8vcmVtb3RlIHNjcmlwdFxuXHRcdGVsc2V7XG5cdFx0XHQvL0NoZWNrIHRoYXQgd2UgaGF2ZSBjb25maWd1cmVkIHRoZSBlbnZpcm9ubWVudCB0byBhbGxvdyB0aGlzLFxuXHRcdFx0Ly9hcyBpdCByZXByZXNlbnRzIGEgc2VjdXJpdHkgdGhyZWF0IGFuZCBzaG91bGQgb25seSBiZSB1c2VkIGZvciBkZWJ1Z2dpbmdcblx0XHRcdGlmKCFPcmd5LnByaXZhdGUuY29uZmlnLnNldHRpbmdzLmRlYnVnX21vZGUpe1xuXHRcdFx0XHRPcmd5LnByaXZhdGUuY29uZmlnLmRlYnVnKFwiU2V0IGNvbmZpZy5kZWJ1Z19tb2RlPTEgdG8gcnVuIHJlbW90ZSBzY3JpcHRzIG91dHNpZGUgb2YgZGVidWcgbW9kZS5cIik7XG5cdFx0XHR9XG5cdFx0XHRlbHNle1xuXHRcdFx0XHRfcHJpdmF0ZS5uYXRpdmUuZ2V0KHBhdGgsZGVmZXJyZWQsZnVuY3Rpb24oZGF0YSl7XG5cdFx0XHRcdFx0dmFyIFZtID0gcmVxdWlyZSgndm0nKTtcblx0XHRcdFx0XHRyID0gVm0ucnVuSW5UaGlzQ29udGV4dChkYXRhKTtcblx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHIpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0X3B1YmxpYy5uYXRpdmUuaHRtbCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXHRcdF9wdWJsaWMubmF0aXZlLmRlZmF1bHQocGF0aCxkZWZlcnJlZCk7XG5cdH07XG5cblx0X3B1YmxpYy5uYXRpdmUuZGVmYXVsdCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXHRcdChmdW5jdGlvbihkZWZlcnJlZCl7XG5cdFx0XHRfcHJpdmF0ZS5uYXRpdmUuZ2V0KHBhdGgsZGVmZXJyZWQsZnVuY3Rpb24ocil7XG5cdFx0XHRcdGlmKGRlZmVycmVkLnR5cGUgPT09ICdqc29uJyl7XG5cdFx0XHRcdFx0ciA9IEpTT04ucGFyc2Uocik7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShyKTtcblx0XHRcdH0pO1xuXHRcdH0pKGRlZmVycmVkKTtcblx0fTtcblxuXHRfcHJpdmF0ZS5uYXRpdmUuZ2V0ID0gZnVuY3Rpb24gKHBhdGgsZGVmZXJyZWQsY2FsbGJhY2spe1xuXHRcdHBhdGggPSBfcHJpdmF0ZS5uYXRpdmUucHJlcGFyZV9wYXRoKHBhdGgpO1xuXHRcdGlmKHBhdGhbMF0gPT09ICcuJyl7XG5cdFx0XHQvL2ZpbGUgc3lzdGVtXG5cdFx0XHR2YXIgRnMgPSByZXF1aXJlKCdmcycpO1xuXHRcdFx0RnMucmVhZEZpbGUocGF0aCwgXCJ1dGYtOFwiLCBmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG5cdFx0XHRcdGlmIChlcnIpe1xuXHRcdFx0XHRcdHRocm93IGVycjtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdGNhbGxiYWNrKGRhdGEpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0ZWxzZXtcblx0XHRcdC8vaHR0cFxuXHRcdFx0dmFyIHJlcXVlc3QgPSByZXF1aXJlKCdyZXF1ZXN0Jyk7XG5cdFx0XHRyZXF1ZXN0KHBhdGgsZnVuY3Rpb24oZXJyb3IscmVzcG9uc2UsYm9keSl7XG5cdFx0XHRcdGlmICghZXJyb3IgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9PT0gMjAwKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2soYm9keSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHR0aHJvdyBlcnJvcjtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9O1xuXG5cdF9wcml2YXRlLm5hdGl2ZS5wcmVwYXJlX3BhdGggPSBmdW5jdGlvbihwKXtcblx0XHRwID0gKHBbMF0gIT09ICcvJyAmJiBwWzBdICE9PSAnLicpXG5cdFx0PyAoKHBbMF0uaW5kZXhPZihcImh0dHBcIikhPT0wKSA/ICcuLycgKyBwIDogcCkgOiBwO1xuXHRcdHJldHVybiBwO1xuXHR9O1xuXG5cdE9yZ3kuZmlsZV9sb2FkZXIgPSBfcHVibGljO1xuXG5cdE9yZ3kucHJpdmF0ZS5maWxlX2xvYWRlciA9IF9wcml2YXRlO1xuXG5cdHJldHVybiBPcmd5O1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihPcmd5KXtcblxuXG5cdC8qKlxuXHQgKiBAbmFtZXNwYWNlIG9yZ3kvcXVldWVcblx0ICogQGJvcnJvd3Mgb3JneS9kZWZlcnJlZCN0aGVuIGFzICN0aGVuXG5cdCAqIEBib3Jyb3dzIG9yZ3kvZGVmZXJyZWQjZG9uZSBhcyAjZG9uZVxuXHQgKiBAYm9ycm93cyBvcmd5L2RlZmVycmVkI3JlamVjdCBhcyAjcmVqZWN0XG5cdCAqIEBib3Jyb3dzIG9yZ3kvZGVmZXJyZWQjcmVzb2x2ZSBhcyAjcmVzb2x2ZVxuXHQgKlxuXHQqL1xuXG5cdHZhciBfcHJpdmF0ZSA9IHt9O1xuXG5cdC8qKlxuXHQgKiBBY3RpdmF0ZXMgYSBxdWV1ZSBvYmplY3QuXG5cdCAqXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBvXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG5cdCAqIEBwYXJhbSB7YXJyYXl9IGRlcHNcblx0ICogQHJldHVybnMge29iamVjdH0gcXVldWVcblx0ICovXG5cdF9wcml2YXRlLmFjdGl2YXRlID0gZnVuY3Rpb24obyxvcHRpb25zLGRlcHMpe1xuXG5cdFx0XHQvL0FDVElWQVRFIEFTIEEgREVGRVJSRURcblx0XHRcdC8vdmFyIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHRoaXMpO1xuXHRcdFx0byA9IE9yZ3kucHJpdmF0ZS5kZWZlcnJlZC5hY3RpdmF0ZShvKTtcblxuXHRcdFx0Ly9AdG9kbyByZXRoaW5rIHRoaXNcblx0XHRcdC8vVGhpcyB0aW1lb3V0IGdpdmVzIGRlZmluZWQgcHJvbWlzZXMgdGhhdCBhcmUgZGVmaW5lZFxuXHRcdFx0Ly9mdXJ0aGVyIGRvd24gdGhlIHNhbWUgc2NyaXB0IGEgY2hhbmNlIHRvIGRlZmluZSB0aGVtc2VsdmVzXG5cdFx0XHQvL2FuZCBpbiBjYXNlIHRoaXMgcXVldWUgaXMgYWJvdXQgdG8gcmVxdWVzdCB0aGVtIGZyb20gYVxuXHRcdFx0Ly9yZW1vdGUgc291cmNlIGhlcmUuXG5cdFx0XHQvL1RoaXMgaXMgaW1wb3J0YW50IGluIHRoZSBjYXNlIG9mIGNvbXBpbGVkIGpzIGZpbGVzIHRoYXQgY29udGFpblxuXHRcdFx0Ly9tdWx0aXBsZSBtb2R1bGVzIHdoZW4gZGVwZW5kIG9uIGVhY2ggb3RoZXIuXG5cblx0XHRcdC8vdGVtcG9yYXJpbHkgY2hhbmdlIHN0YXRlIHRvIHByZXZlbnQgb3V0c2lkZSByZXNvbHV0aW9uXG5cdFx0XHRvLnN0YXRlID0gLTE7XG5cblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXG5cdFx0XHRcdC8vUmVzdG9yZSBzdGF0ZVxuXHRcdFx0by5zdGF0ZSA9IDA7XG5cblx0XHRcdFx0Ly9BREQgREVQRU5ERU5DSUVTIFRPIFFVRVVFXG5cdFx0XHRcdF9wdWJsaWMuYWRkLmNhbGwobyxkZXBzKTtcblxuXHRcdFx0XHQvL1NFRSBJRiBDQU4gQkUgSU1NRURJQVRFTFkgUkVTT0xWRUQgQlkgQ0hFQ0tJTkcgVVBTVFJFQU1cblx0XHRcdFx0T3JneS5wcml2YXRlLmRlZmVycmVkLnJlY2VpdmVfc2lnbmFsKG8sby5pZCk7XG5cblx0XHRcdFx0Ly9BU1NJR04gVEhJUyBRVUVVRSBVUFNUUkVBTSBUTyBPVEhFUiBRVUVVRVNcblx0XHRcdFx0aWYoby5hc3NpZ24pe1xuXHRcdFx0XHRcdFx0Zm9yKHZhciBhIGluIG8uYXNzaWduKXtcblx0XHRcdFx0XHRcdFx0XHRzZWxmLmFzc2lnbihvLmFzc2lnblthXSxbb10sdHJ1ZSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0sMSk7XG5cblx0XHRcdHJldHVybiBvO1xuXHR9O1xuXG5cblx0LyoqXG5cdCogVXBncmFkZXMgYSBwcm9taXNlIG9iamVjdCB0byBhIHF1ZXVlLlxuXHQqXG5cdCogQHBhcmFtIHtvYmplY3R9IG9ialxuXHQqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG5cdCogQHBhcmFtIHthcnJheX0gZGVwcyBcXGRlcGVuZGVuY2llc1xuXHQqIEByZXR1cm5zIHtvYmplY3R9IHF1ZXVlIG9iamVjdFxuXHQqL1xuXHRfcHJpdmF0ZS51cGdyYWRlID0gZnVuY3Rpb24ob2JqLG9wdGlvbnMsZGVwcyl7XG5cblx0XHRcdGlmKG9iai5zZXR0bGVkICE9PSAwIHx8IChvYmoubW9kZWwgIT09ICdwcm9taXNlJyAmJiBvYmoubW9kZWwgIT09ICdkZWZlcnJlZCcpKXtcblx0XHRcdFx0XHRyZXR1cm4gT3JneS5wcml2YXRlLmNvbmZpZy5kZWJ1ZygnQ2FuIG9ubHkgdXBncmFkZSB1bnNldHRsZWQgcHJvbWlzZSBvciBkZWZlcnJlZCBpbnRvIGEgcXVldWUuJyk7XG5cdFx0XHR9XG5cblx0XHQgLy9HRVQgQSBORVcgUVVFVUUgT0JKRUNUIEFORCBNRVJHRSBJTlxuXHRcdFx0dmFyIF9vID0gT3JneS5wcml2YXRlLmNvbmZpZy5uYWl2ZV9jbG9uZXIoW19wdWJsaWNdLFtvcHRpb25zXSk7XG5cblx0XHRcdGZvcih2YXIgaSBpbiBfbyl7XG5cdFx0XHRcdCBvYmpbaV0gPSBfb1tpXTtcblx0XHRcdH1cblxuXHRcdFx0Ly9kZWxldGUgX287XG5cblx0XHRcdC8vQ1JFQVRFIE5FVyBJTlNUQU5DRSBPRiBRVUVVRVxuXHRcdFx0b2JqID0gdGhpcy5hY3RpdmF0ZShvYmosb3B0aW9ucyxkZXBzKTtcblxuXHRcdFx0Ly9SRVRVUk4gUVVFVUUgT0JKRUNUXG5cdFx0XHRyZXR1cm4gb2JqO1xuXHR9O1xuXG5cblxuXG5cdHZhciBfcHVibGljID0ge307XG5cdFxuXHRfcHVibGljLm1vZGVsID0gJ3F1ZXVlJztcblxuXHQvL1NFVCBUUlVFIEFGVEVSIFJFU09MVkVSIEZJUkVEXG5cdF9wdWJsaWMucmVzb2x2ZXJfZmlyZWQgPSAwO1xuXG5cdC8vUFJFVkVOVFMgQSBRVUVVRSBGUk9NIFJFU09MVklORyBFVkVOIElGIEFMTCBERVBFTkRFTkNJRVMgTUVUXG5cdC8vUFVSUE9TRTogUFJFVkVOVFMgUVVFVUVTIENSRUFURUQgQlkgQVNTSUdOTUVOVCBGUk9NIFJFU09MVklOR1xuXHQvL0JFRk9SRSBUSEVZIEFSRSBGT1JNQUxMWSBJTlNUQU5USUFURURcblx0X3B1YmxpYy5oYWx0X3Jlc29sdXRpb24gPSAwO1xuXG5cdC8vVVNFRCBUTyBDSEVDSyBTVEFURSwgRU5TVVJFUyBPTkUgQ09QWVxuXHRfcHVibGljLnVwc3RyZWFtID0ge307XG5cblx0Ly9VU0VEIFJFVFVSTiBWQUxVRVMsIEVOU1VSRVMgT1JERVJcblx0X3B1YmxpYy5kZXBlbmRlbmNpZXMgPSBbXTtcblxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblx0Ly9cdFFVRVVFIElOU1RBTkNFIE1FVEhPRFNcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblx0LyoqXG5cdCogQWRkIGxpc3Qgb2YgZGVwZW5kZW5jaWVzIHRvIGEgcXVldWUncyB1cHN0cmVhbSBhcnJheS5cblx0KlxuXHQqIFRoZSBxdWV1ZSB3aWxsIHJlc29sdmUgb25jZSBhbGwgdGhlIHByb21pc2VzIGluIGl0c1xuXHQqIHVwc3RyZWFtIGFycmF5IGFyZSByZXNvbHZlZC5cblx0KlxuXHQqIFdoZW4gX3B1YmxpYy5Pcmd5LnByaXZhdGUuY29uZmlnLmRlYnVnID09IDEsIG1ldGhvZCB3aWxsIHRlc3QgZWFjaFxuXHQqIGRlcGVuZGVuY3kgaXMgbm90IHByZXZpb3VzbHkgc2NoZWR1bGVkIHRvIHJlc29sdmVcblx0KiBkb3duc3RyZWFtIGZyb20gdGhlIHRhcmdldCwgaW4gd2hpY2hcblx0KiBjYXNlIGl0IHdvdWxkIG5ldmVyIHJlc29sdmUgYmVjYXVzZSBpdHMgdXBzdHJlYW0gZGVwZW5kcyBvbiBpdC5cblx0KlxuXHQqIEBwYXJhbSB7YXJyYXl9IGFyclx0L2FycmF5IG9mIGRlcGVuZGVuY2llcyB0byBhZGRcblx0KiBAcmV0dXJucyB7YXJyYXl9IHVwc3RyZWFtXG5cdCovXG5cdF9wdWJsaWMuYWRkID0gZnVuY3Rpb24oYXJyKXtcblxuXHRcdHRyeXtcblx0XHRcdFx0aWYoYXJyLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnVwc3RyZWFtO1xuXHRcdFx0XHR9XG5cdFx0fVxuXHRcdGNhdGNoKGVycil7XG5cdFx0XHRcdE9yZ3kucHJpdmF0ZS5jb25maWcuZGVidWcoZXJyKTtcblx0XHR9XG5cblx0XHQvL0lGIE5PVCBQRU5ESU5HLCBETyBOT1QgQUxMT1cgVE8gQUREXG5cdFx0aWYodGhpcy5zdGF0ZSAhPT0gMCl7XG5cdFx0XHRcdHJldHVybiBPcmd5LnByaXZhdGUuY29uZmlnLmRlYnVnKFtcblx0XHRcdFx0XHRcIkNhbm5vdCBhZGQgZGVwZW5kZW5jeSBsaXN0IHRvIHF1ZXVlIGlkOidcIit0aGlzLmlkXG5cdFx0XHRcdFx0K1wiJy4gUXVldWUgc2V0dGxlZC9pbiB0aGUgcHJvY2VzcyBvZiBiZWluZyBzZXR0bGVkLlwiXG5cdFx0XHRcdF0sYXJyLHRoaXMpO1xuXHRcdH1cblxuXHRcdGZvcih2YXIgYSBpbiBhcnIpe1xuXG5cdFx0XHRcdHN3aXRjaCh0cnVlKXtcblxuXHRcdFx0XHRcdFx0Ly9DSEVDSyBJRiBFWElTVFNcblx0XHRcdFx0XHRcdGNhc2UodHlwZW9mIE9yZ3kucHJpdmF0ZS5jb25maWcubGlzdFthcnJbYV0uaWRdID09PSAnb2JqZWN0Jyk6XG5cdFx0XHRcdFx0XHRcdFx0YXJyW2FdID0gT3JneS5wcml2YXRlLmNvbmZpZy5saXN0W2FyclthXS5pZF07XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdC8vSUYgTk9ULCBBVFRFTVBUIFRPIENPTlZFUlQgSVQgVE8gQU4gT1JHWSBQUk9NSVNFXG5cdFx0XHRcdFx0XHRjYXNlKHR5cGVvZiBhcnJbYV0gPT09ICdvYmplY3QnICYmICghYXJyW2FdLmlzX29yZ3kpKTpcblx0XHRcdFx0XHRcdFx0XHRhcnJbYV0gPSBPcmd5LnByaXZhdGUuZGVmZXJyZWQuY29udmVydF90b19wcm9taXNlKGFyclthXSx7XG5cdFx0XHRcdFx0XHRcdFx0XHRwYXJlbnQgOiB0aGlzXG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdC8vUkVGIElTIEEgUFJPTUlTRS5cblx0XHRcdFx0XHRcdGNhc2UodHlwZW9mIGFyclthXS50aGVuID09PSAnZnVuY3Rpb24nKTpcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdFx0XHRPcmd5LnByaXZhdGUuY29uZmlnLmRlYnVnKFtcblx0XHRcdFx0XHRcdFx0XHRcdFwiT2JqZWN0IGNvdWxkIG5vdCBiZSBjb252ZXJ0ZWQgdG8gcHJvbWlzZS5cIixcblx0XHRcdFx0XHRcdFx0XHRcdGFyclthXVxuXHRcdFx0XHRcdFx0XHRcdF0pO1xuXHRcdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly9tdXN0IGNoZWNrIHRoZSB0YXJnZXQgdG8gc2VlIGlmIHRoZSBkZXBlbmRlbmN5IGV4aXN0cyBpbiBpdHMgZG93bnN0cmVhbVxuXHRcdFx0XHRmb3IodmFyIGIgaW4gdGhpcy5kb3duc3RyZWFtKXtcblx0XHRcdFx0XHRcdGlmKGIgPT09IGFyclthXS5pZCl7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIE9yZ3kucHJpdmF0ZS5jb25maWcuZGVidWcoW1xuXHRcdFx0XHRcdFx0XHRcdFx0XCJFcnJvciBhZGRpbmcgdXBzdHJlYW0gZGVwZW5kZW5jeSAnXCJcblx0XHRcdFx0XHRcdFx0XHRcdCthcnJbYV0uaWQrXCInIHRvIHF1ZXVlXCIrXCIgJ1wiXG5cdFx0XHRcdFx0XHRcdFx0XHQrdGhpcy5pZCtcIicuXFxuIFByb21pc2Ugb2JqZWN0IGZvciAnXCJcblx0XHRcdFx0XHRcdFx0XHRcdCthcnJbYV0uaWQrXCInIGlzIHNjaGVkdWxlZCB0byByZXNvbHZlIGRvd25zdHJlYW0gZnJvbSBxdWV1ZSAnXCJcblx0XHRcdFx0XHRcdFx0XHRcdCt0aGlzLmlkK1wiJyBzbyBpdCBjYW4ndCBiZSBhZGRlZCB1cHN0cmVhbS5cIlxuXHRcdFx0XHRcdFx0XHRcdF1cblx0XHRcdFx0XHRcdFx0XHQsdGhpcyk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvL0FERCBUTyBVUFNUUkVBTSwgRE9XTlNUUkVBTSwgREVQRU5ERU5DSUVTXG5cdFx0XHRcdHRoaXMudXBzdHJlYW1bYXJyW2FdLmlkXSA9IGFyclthXTtcblx0XHRcdFx0YXJyW2FdLmRvd25zdHJlYW1bdGhpcy5pZF0gPSB0aGlzO1xuXHRcdFx0XHR0aGlzLmRlcGVuZGVuY2llcy5wdXNoKGFyclthXSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMudXBzdHJlYW07XG5cdH07XG5cblx0LyoqXG5cdCogUmVtb3ZlIGxpc3QgZnJvbSBhIHF1ZXVlLlxuXHQqXG5cdCogQHBhcmFtIHthcnJheX0gYXJyXG5cdCogQHJldHVybnMge2FycmF5fSBhcnJheSBvZiBsaXN0IHRoZSBxdWV1ZSBpcyB1cHN0cmVhbVxuXHQqL1xuXHRfcHVibGljLnJlbW92ZSA9IGZ1bmN0aW9uKGFycil7XG5cblx0XHQvL0lGIE5PVCBQRU5ESU5HLCBETyBOT1QgQUxMT1cgUkVNT1ZBTFxuXHRcdGlmKHRoaXMuc3RhdGUgIT09IDApe1xuXHRcdFx0XHRyZXR1cm4gT3JneS5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcIkNhbm5vdCByZW1vdmUgbGlzdCBmcm9tIHF1ZXVlIGlkOidcIit0aGlzLmlkK1wiJy4gUXVldWUgc2V0dGxlZC9pbiB0aGUgcHJvY2VzcyBvZiBiZWluZyBzZXR0bGVkLlwiKTtcblx0XHR9XG5cblx0XHRmb3IodmFyIGEgaW4gYXJyKXtcblx0XHRcdGlmKHRoaXMudXBzdHJlYW1bYXJyW2FdLmlkXSl7XG5cdFx0XHRcdFx0ZGVsZXRlIHRoaXMudXBzdHJlYW1bYXJyW2FdLmlkXTtcblx0XHRcdFx0XHRkZWxldGUgYXJyW2FdLmRvd25zdHJlYW1bdGhpcy5pZF07XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5cdC8qKlxuXHQqIFJlc2V0cyBhbiBleGlzdGluZyxzZXR0bGVkIHF1ZXVlIGJhY2sgdG8gT3JneWluZyBzdGF0ZS5cblx0KiBDbGVhcnMgb3V0IHRoZSBkb3duc3RyZWFtLlxuXHQqIEZhaWxzIGlmIG5vdCBzZXR0bGVkLlxuXHQqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG5cdCogQHJldHVybnMge09yZ3kucHJpdmF0ZS5kZWZlcnJlZC50cGx8Qm9vbGVhbn1cblx0Ki9cblx0X3B1YmxpYy5yZXNldCA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuXG5cdFx0aWYodGhpcy5zZXR0bGVkICE9PSAxIHx8IHRoaXMuc3RhdGUgIT09IDEpe1xuXHRcdFx0cmV0dXJuIE9yZ3kucHJpdmF0ZS5jb25maWcuZGVidWcoXCJDYW4gb25seSByZXNldCBhIHF1ZXVlIHNldHRsZWQgd2l0aG91dCBlcnJvcnMuXCIpO1xuXHRcdH1cblxuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG5cdFx0dGhpcy5zZXR0bGVkID0gMDtcblx0XHR0aGlzLnN0YXRlID0gMDtcblx0XHR0aGlzLnJlc29sdmVyX2ZpcmVkID0gMDtcblx0XHR0aGlzLmRvbmVfZmlyZWQgPSAwO1xuXG5cdFx0Ly9SRU1PVkUgQVVUTyBUSU1FT1VUIFRJTUVSXG5cdFx0aWYodGhpcy50aW1lb3V0X2lkKXtcblx0XHRcdGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRfaWQpO1xuXHRcdH1cblxuXHRcdC8vQ0xFQVIgT1VUIFRIRSBET1dOU1RSRUFNXG5cdFx0dGhpcy5kb3duc3RyZWFtID0ge307XG5cdFx0dGhpcy5kZXBlbmRlbmNpZXMgPSBbXTtcblxuXHRcdC8vU0VUIE5FVyBBVVRPIFRJTUVPVVRcblx0XHRPcmd5LnByaXZhdGUuZGVmZXJyZWQuYXV0b190aW1lb3V0LmNhbGwodGhpcyxvcHRpb25zLnRpbWVvdXQpO1xuXG5cdFx0Ly9QT0lOVExFU1MgLSBXSUxMIEpVU1QgSU1NRURJQVRFTFkgUkVTT0xWRSBTRUxGXG5cdFx0Ly90aGlzLmNoZWNrX3NlbGYoKVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblxuXHQvKipcblx0KiBDYXVhZXMgYSBxdWV1ZSB0byBsb29rIG92ZXIgaXRzIGRlcGVuZGVuY2llcyBhbmQgc2VlIGlmIGl0XG5cdCogY2FuIGJlIHJlc29sdmVkLlxuXHQqXG5cdCogVGhpcyBpcyBkb25lIGF1dG9tYXRpY2FsbHkgYnkgZWFjaCBkZXBlbmRlbmN5IHRoYXQgbG9hZHMsXG5cdCogc28gaXMgbm90IG5lZWRlZCB1bmxlc3M6XG5cdCpcblx0KiAtZGVidWdnaW5nXG5cdCpcblx0KiAtdGhlIHF1ZXVlIGhhcyBiZWVuIHJlc2V0IGFuZCBubyBuZXdcblx0KiBkZXBlbmRlbmNpZXMgd2VyZSBzaW5jZSBhZGRlZC5cblx0KlxuXHQqIEByZXR1cm5zIHtpbnR9IFN0YXRlIG9mIHRoZSBxdWV1ZS5cblx0Ki9cblx0X3B1YmxpYy5jaGVja19zZWxmID0gZnVuY3Rpb24oKXtcblx0XHRPcmd5LnByaXZhdGUuZGVmZXJyZWQucmVjZWl2ZV9zaWduYWwodGhpcyx0aGlzLmlkKTtcblx0XHRyZXR1cm4gdGhpcy5zdGF0ZTtcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGEgbmV3IHF1ZXVlIG9iamVjdC5cblx0ICogSWYgbm8gPGI+cmVzb2x2ZXI8L2I+IG9wdGlvbiBpcyBzZXQsIHJlc29sdmVkIHdoZW4gYWxsIGRlcGVuZGVuY2llcyBhcmUgcmVzb2x2ZWQuIEVsc2UsIHJlc29sdmVkIHdoZW4gdGhlIGRlZmVycmVkIHBhcmFtIHBhc3NlZCB0byB0aGUgcmVzb2x2ZXIgb3B0aW9uXG5cdCAqIGlzIHJlc29sdmVkLlxuXG5cdCAqIEBtZW1iZXJvZiBvcmd5XG5cdCAqIEBmdW5jdGlvbiBxdWV1ZVxuXHQgKlxuXHQgKiBAcGFyYW0ge2FycmF5fSBkZXBzIEFycmF5IG9mIGRlcGVuZGVuY2llcyB0aGF0IG11c3QgYmUgcmVzb2x2ZWQgYmVmb3JlIDxiPnJlc29sdmVyPC9iPiBvcHRpb24gaXMgY2FsbGVkLlxuXHQgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1x0TGlzdCBvZiBvcHRpb25zOlxuXG5cdC0gPGI+aWQ8L2I+IHtzdHJpbmd9IFVuaXF1ZSBpZCBvZiB0aGUgb2JqZWN0LlxuXHRcdC0gQ2FuIGJlIHVzZWQgd2l0aCBPcmd5LmdldChpZCkuXG5cdFx0LSBPcHRpb25hbC5cblxuXG5cdC0gPGI+dGltZW91dDwvYj4ge251bWJlcn0gVGltZSBpbiBtcyBhZnRlciB3aGljaCByZWplY3QgaXMgY2FsbGVkLlxuXHRcdC0gRGVmYXVsdHMgdG8gT3JneS5jb25maWcoKS50aW1lb3V0IFs1MDAwXS5cblx0XHQtIE5vdGUgdGhlIHRpbWVvdXQgaXMgb25seSBhZmZlY3RlZCBieSBkZXBlbmRlbmNpZXMgYW5kL29yIHRoZSByZXNvbHZlciBjYWxsYmFjay5cblx0XHQtIFRoZW4sZG9uZSBkZWxheXMgd2lsbCBub3QgZmxhZyBhIHRpbWVvdXQgYmVjYXVzZSB0aGV5IGFyZSBjYWxsZWQgYWZ0ZXIgdGhlIGluc3RhbmNlIGlzIGNvbnNpZGVyZWQgcmVzb2x2ZWQuXG5cblxuXHQtIDxiPnJlc29sdmVyPC9iPiB7ZnVuY3Rpb24oPGk+cmVzdWx0PC9pPiw8aT5kZWZlcnJlZDwvaT4pfSBDYWxsYmFjayBmdW5jdGlvbiB0byBleGVjdXRlIGFmdGVyIGFsbCBkZXBlbmRlbmNpZXMgaGF2ZSByZXNvbHZlZC5cblx0XHQtIDxpPnJlc3VsdDwvaT4gaXMgYW4gYXJyYXkgb2YgdGhlIHF1ZXVlJ3MgcmVzb2x2ZWQgZGVwZW5kZW5jeSB2YWx1ZXMuXG5cdFx0LSA8aT5kZWZlcnJlZDwvaT4gaXMgdGhlIHF1ZXVlIG9iamVjdC5cblx0XHQtIFRoZSBxdWV1ZSB3aWxsIG9ubHkgcmVzb2x2ZSB3aGVuIDxpPmRlZmVycmVkPC9pPi5yZXNvbHZlKCkgaXMgY2FsbGVkLiBJZiBub3QsIGl0IHdpbGwgdGltZW91dCB0byBvcHRpb25zLnRpbWVvdXQgfHwgT3JneS5jb25maWcoKS50aW1lb3V0LlxuXG5cdFx0KiBAcmV0dXJucyB7b2JqZWN0fSB7QGxpbmsgb3JneS9xdWV1ZX1cblx0ICpcblx0ICovXG5cdE9yZ3kucXVldWUgPSBmdW5jdGlvbihkZXBzLG9wdGlvbnMpe1xuXG5cdFx0dmFyIF9vO1xuXHRcdGlmKCEoZGVwcyBpbnN0YW5jZW9mIEFycmF5KSl7XG5cdFx0XHRyZXR1cm4gT3JneS5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcIlF1ZXVlIGRlcGVuZGVuY2llcyBtdXN0IGJlIGFuIGFycmF5LlwiKTtcblx0XHR9XG5cblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXHRcdC8vRE9FUyBOT1QgQUxSRUFEWSBFWElTVFxuXHRcdGlmKCFPcmd5LnByaXZhdGUuY29uZmlnLmxpc3Rbb3B0aW9ucy5pZF0pe1xuXG5cdFx0XHQvL1Bhc3MgYXJyYXkgb2YgcHJvdG90eXBlcyB0byBxdWV1ZSBmYWN0b3J5XG5cdFx0XHRfbyA9IE9yZ3kucHJpdmF0ZS5jb25maWcubmFpdmVfY2xvbmVyKFtPcmd5LnByaXZhdGUuZGVmZXJyZWQucHVibGljLF9wdWJsaWNdLFtvcHRpb25zXSk7XG5cblx0XHRcdC8vQWN0aXZhdGUgcXVldWVcblx0XHRcdF9vID0gX3ByaXZhdGUuYWN0aXZhdGUoX28sb3B0aW9ucyxkZXBzKTtcblxuXHRcdH1cblx0XHQvL0FMUkVBRFkgRVhJU1RTXG5cdFx0ZWxzZSB7XG5cblx0XHRcdF9vID0gT3JneS5wcml2YXRlLmNvbmZpZy5saXN0W29wdGlvbnMuaWRdO1xuXG5cdFx0XHRpZihfby5tb2RlbCAhPT0gJ3F1ZXVlJyl7XG5cdFx0XHQvL01BVENIIEZPVU5EIEJVVCBOT1QgQSBRVUVVRSwgVVBHUkFERSBUTyBPTkVcblxuXHRcdFx0XHRvcHRpb25zLm92ZXJ3cml0YWJsZSA9IDE7XG5cblx0XHRcdFx0X28gPSBfcHJpdmF0ZS51cGdyYWRlKF9vLG9wdGlvbnMsZGVwcyk7XG5cdFx0XHR9XG5cdFx0XHRlbHNle1xuXG5cdFx0XHRcdC8vT1ZFUldSSVRFIEFOWSBFWElTVElORyBPUFRJT05TXG5cdFx0XHRcdG9wdGlvbnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSxrZXkpe1xuXHRcdFx0XHRcdF9vW2tleV0gPSB2YWx1ZTsgXG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdC8vQUREIEFERElUSU9OQUwgREVQRU5ERU5DSUVTIElGIE5PVCBSRVNPTFZFRFxuXHRcdFx0XHRpZihkZXBzLmxlbmd0aCA+IDApe1xuXHRcdFx0XHRcdF9wcml2YXRlLnRwbC5hZGQuY2FsbChfbyxkZXBzKTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cblx0XHRcdC8vUkVTVU1FIFJFU09MVVRJT04gVU5MRVNTIFNQRUNJRklFRCBPVEhFUldJU0Vcblx0XHRcdF9vLmhhbHRfcmVzb2x1dGlvbiA9ICh0eXBlb2Ygb3B0aW9ucy5oYWx0X3Jlc29sdXRpb24gIT09ICd1bmRlZmluZWQnKSA/XG5cdFx0XHRvcHRpb25zLmhhbHRfcmVzb2x1dGlvbiA6IDA7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIF9vO1xuXHR9O1xuXG5cdC8vc2F2ZSBmb3IgcmUtdXNlXG5cdE9yZ3kucHJpdmF0ZS5xdWV1ZSA9IF9wcml2YXRlO1xuXHRcdFxuXHRyZXR1cm4gT3JneTtcbn07XG4iXX0=
