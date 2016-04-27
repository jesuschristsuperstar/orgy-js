require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
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

			debug_mode : false
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

		- {boolean} <b>debug_mode</b> (default: false) When a queue or deferred is "rejected", shows stack trace and other debugging information if true.
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

},{}],"orgy":[function(require,module,exports){
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

},{"./cast.js":3,"./config.js":4,"./deferred.js":5,"./file_loader.js":6,"./queue.js":7}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2hvbWUvYmFzZS8ubnZtL3ZlcnNpb25zL25vZGUvdjQuMy4xL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiLi4vLi4vLi4vaG9tZS9iYXNlLy5udm0vdmVyc2lvbnMvbm9kZS92NC4zLjEvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L2xpYi9fZW1wdHkuanMiLCIuLi8uLi8uLi9ob21lL2Jhc2UvLm52bS92ZXJzaW9ucy9ub2RlL3Y0LjMuMS9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsInNyYy9jYXN0LmpzIiwic3JjL2NvbmZpZy5qcyIsInNyYy9kZWZlcnJlZC5qcyIsInNyYy9maWxlX2xvYWRlci5qcyIsInNyYy9xdWV1ZS5qcyIsInNyYy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oQ2xzKXtcblxuXHQvKipcblx0ICogQ2FzdHMgYSB0aGVuYWJsZSBvYmplY3QgaW50byBhbiBPcmd5IGRlZmVycmVkIG9iamVjdC5cblx0ICpcblx0ICogPiBUbyBxdWFsaWZ5IGFzIGEgPGI+dGhlbmFibGU8L2I+LCB0aGUgb2JqZWN0IHRvIGJlIGNhc3RlZCBtdXN0IGhhdmUgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuXHQgKiA+XG5cdCAqID4gLSBpZFxuXHQgKiA+XG5cdCAqID4gLSB0aGVuKClcblx0ICogPlxuXHQgKiA+IC0gZXJyb3IoKVxuXHQgKlxuXHQgKiBAbWVtYmVyb2Ygb3JneVxuXHQgKiBAZnVuY3Rpb24gY2FzdFxuXHQgKlxuXHQgKiBAcGFyYW0ge29iamVjdH0gb2JqIEEgdGhlbmFibGUgd2l0aCB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG5cdCAqXHQtIHtzdHJpbmd9IDxiPmlkPC9iPlx0VW5pcXVlIGlkIG9mIHRoZSBvYmplY3QuXG5cdCAqXG5cdCAqXHQtIHtmdW5jdGlvbn0gPGI+dGhlbjwvYj5cblx0ICpcblx0ICpcdC0ge2Z1bmN0aW9ufSA8Yj5lcnJvcjwvYj5cblx0ICpcblx0ICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWRcblx0ICovXG5cdENscy5wdWJsaWMuY2FzdCA9IGZ1bmN0aW9uKG9iail7XG5cblx0XHRcdHZhciByZXF1aXJlZCA9IFtcInRoZW5cIixcImVycm9yXCIsXCJpZFwiXTtcblx0XHRcdGZvcih2YXIgaSBpbiByZXF1aXJlZCl7XG5cdFx0XHRcdGlmKCFvYmouaGFzT3duUHJvcGVydHkocmVxdWlyZWRbaV0pKXtcblx0XHRcdFx0XHRyZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFwiQ2FzdCBtZXRob2QgbWlzc2luZyBwcm9wZXJ0eSAnXCIgKyByZXF1aXJlZFtpXSArXCInXCIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHZhciBvcHRpb25zID0ge307XG5cdFx0XHRvcHRpb25zLmlkID0gb2JqLmlkO1xuXG5cdFx0XHQvL01ha2Ugc3VyZSBpZCBkb2VzIG5vdCBjb25mbGljdCB3aXRoIGV4aXN0aW5nXG5cdFx0XHRpZihDbHMucHJpdmF0ZS5jb25maWcubGlzdFtvcHRpb25zLmlkXSl7XG5cdFx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoXCJJZCBcIitvcHRpb25zLmlkK1wiIGNvbmZsaWN0cyB3aXRoIGV4aXN0aW5nIGlkLlwiKTtcblx0XHRcdH1cblxuXHRcdFx0Ly9DcmVhdGUgYSBkZWZlcnJlZFxuXHRcdFx0dmFyIGRlZiA9IENscy5wdWJsaWMuZGVmZXJyZWQob3B0aW9ucyk7XG5cblx0XHRcdC8vQ3JlYXRlIHJlc29sdmVyXG5cdFx0XHR2YXIgcmVzb2x2ZXIgPSBmdW5jdGlvbigpe1xuXHRcdFx0XHRkZWYucmVzb2x2ZS5jYWxsKGRlZixhcmd1bWVudHNbMF0pO1xuXHRcdFx0fTtcblxuXHRcdFx0Ly9TZXQgUmVzb2x2ZXJcblx0XHRcdG9iai50aGVuKHJlc29sdmVyKTtcblxuXHRcdFx0Ly9SZWplY3QgZGVmZXJyZWQgb24gLmVycm9yXG5cdFx0XHR2YXIgZXJyID0gZnVuY3Rpb24oZXJyKXtcblx0XHRcdFx0ZGVmLnJlamVjdChlcnIpO1xuXHRcdFx0fTtcblx0XHRcdG9iai5lcnJvcihlcnIpO1xuXG5cdFx0XHQvL1JldHVybiBkZWZlcnJlZFxuXHRcdFx0cmV0dXJuIGRlZjtcblx0fTtcblxuXHRyZXR1cm4gQ2xzO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihDbHMpe1xuXG5cdHZhciBfcHJpdmF0ZSA9IHt9O1xuXG5cblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXHQvL1x0X3ByaXZhdGUgVkFSSUFCTEVTXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG5cdC8qKlxuXHQgKiBBIGRpcmVjdG9yeSBvZiBhbGwgcHJvbWlzZXMsIGRlZmVycmVkcywgYW5kIHF1ZXVlcy5cblx0ICogQHR5cGUgb2JqZWN0XG5cdCAqL1xuXHRfcHJpdmF0ZS5saXN0ID0ge307XG5cblxuXHQvKipcblx0ICogaXRlcmF0b3IgZm9yIGlkc1xuXHQgKiBAdHlwZSBpbnRlZ2VyXG5cdCAqL1xuXHRfcHJpdmF0ZS5pID0gMDtcblxuXG5cdC8qKlxuXHQgKiBDb25maWd1cmF0aW9uIHZhbHVlcy5cblx0ICpcblx0ICogQHR5cGUgb2JqZWN0XG5cdCAqL1xuXHRfcHJpdmF0ZS5zZXR0aW5ncyA9IHtcblxuXHRcdFx0ZGVidWdfbW9kZSA6IGZhbHNlXG5cdFx0XHQvL3NldCB0aGUgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeSBvZiB0aGUgY2FsbGVlIHNjcmlwdCxcblx0XHRcdC8vYmVjYXVzZSBub2RlIGhhcyBubyBjb25zdGFudCBmb3IgdGhpc1xuXHRcdFx0LGN3ZCA6IGZhbHNlXG5cdFx0XHQsbW9kZSA6IChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdGlmKHR5cGVvZiBwcm9jZXNzID09PSAnb2JqZWN0JyAmJiBwcm9jZXNzICsgJycgPT09ICdbb2JqZWN0IHByb2Nlc3NdJyl7XG5cdFx0XHRcdFx0XHRcdC8vIGlzIG5vZGVcblx0XHRcdFx0XHRcdFx0cmV0dXJuIFwibmF0aXZlXCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0XHRcdC8vIG5vdCBub2RlXG5cdFx0XHRcdFx0XHRcdHJldHVybiBcImJyb3dzZXJcIjtcblx0XHRcdFx0XHR9XG5cdFx0XHR9KCkpXG5cdFx0XHQvKipcblx0XHRcdCAqIC0gb25BY3RpdmF0ZSAvd2hlbiBlYWNoIGluc3RhbmNlIGFjdGl2YXRlZFxuXHRcdFx0ICogLSBvblNldHRsZVx0XHQvd2hlbiBlYWNoIGluc3RhbmNlIHNldHRsZXNcblx0XHRcdCAqXG5cdFx0XHQgKiBAdHlwZSBvYmplY3Rcblx0XHRcdCAqL1xuXHRcdFx0LGhvb2tzIDoge1xuXHRcdFx0fVxuXHRcdFx0LHRpbWVvdXQgOiA1MDAwIC8vZGVmYXVsdCB0aW1lb3V0XG5cdH07XG5cblxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cdC8vXHRfcHJpdmF0ZSBWQVJJQUJMRVNcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXHQvL1x0X3ByaXZhdGUgTUVUSE9EU1xuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuXHQvKipcblx0ICogT3B0aW9ucyB5b3Ugd2lzaCB0byBwYXNzIHRvIHNldCB0aGUgZ2xvYmFsIGNvbmZpZ3VyYXRpb25cblx0ICpcblx0ICogQG1lbWJlcm9mIG9yZ3lcblx0ICogQGZ1bmN0aW9uIGNvbmZpZ1xuXHQgKlxuXHQgKiBAcGFyYW0ge29iamVjdH0gb2JqIExpc3Qgb2Ygb3B0aW9uczpcblxuXHRcdC0ge251bWJlcn0gPGI+dGltZW91dDwvYj5cblxuXHRcdC0ge3N0cmluZ30gPGI+Y3dkPC9iPiBTZXRzIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkuIFNlcnZlciBzaWRlIHNjcmlwdHMgb25seS5cblxuXHRcdC0ge2Jvb2xlYW59IDxiPmRlYnVnX21vZGU8L2I+IChkZWZhdWx0OiBmYWxzZSkgV2hlbiBhIHF1ZXVlIG9yIGRlZmVycmVkIGlzIFwicmVqZWN0ZWRcIiwgc2hvd3Mgc3RhY2sgdHJhY2UgYW5kIG90aGVyIGRlYnVnZ2luZyBpbmZvcm1hdGlvbiBpZiB0cnVlLlxuXHQgKiBAcmV0dXJucyB7b2JqZWN0fSBjb25maWd1cmF0aW9uIHNldHRpbmdzXG5cdCAqL1xuXHRDbHMucHVibGljLmNvbmZpZyA9IGZ1bmN0aW9uKG9iail7XG5cblx0XHRcdGlmKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKXtcblx0XHRcdFx0XHRmb3IodmFyIGkgaW4gb2JqKXtcblx0XHRcdFx0XHRcdF9wcml2YXRlLnNldHRpbmdzW2ldID0gb2JqW2ldO1xuXHRcdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIF9wcml2YXRlLnNldHRpbmdzO1xuXHR9O1xuXG5cblx0LyoqXG5cdCAqIERlYnVnZ2luZyBtZXRob2QuXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfGFycmF5fSBtc2dcblx0ICogQHBhcmFtIHtvYmplY3R9IGRlZlxuXHQgKiBAcmV0dXJucyB7Qm9vbGVhbn1cblx0ICovXG5cdF9wcml2YXRlLmRlYnVnID0gZnVuY3Rpb24obXNnKXtcblxuXHRcdFx0dmFyIG1zZ3MgPSAobXNnIGluc3RhbmNlb2YgQXJyYXkpID8gbXNnLmpvaW4oXCJcXG5cIikgOiBbbXNnXTtcblxuXHRcdFx0dmFyIGUgPSBuZXcgRXJyb3IobXNncyk7XG5cdFx0XHRjb25zb2xlLmxvZyhlLnN0YWNrKTtcblxuXHRcdFx0aWYodGhpcy5zZXR0aW5ncy5kZWJ1Z19tb2RlKXtcblx0XHRcdFx0Ly90dXJuIG9mZiBkZWJ1Z19tb2RlIHRvIGF2b2lkIGhpdHRpbmcgZGVidWdnZXJcblx0XHRcdFx0ZGVidWdnZXI7XG5cdFx0XHR9XG5cblx0XHRcdGlmKF9wcml2YXRlLnNldHRpbmdzLm1vZGUgPT09ICdicm93c2VyJyl7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHRcdGVsc2V7XG5cdFx0XHRcdHByb2Nlc3MuZXhpdCgpO1xuXHRcdFx0fVxuXHR9O1xuXG5cblx0LyoqXG5cdCAqIFRha2UgYW4gYXJyYXkgb2YgcHJvdG90eXBlIG9iamVjdHMgYW5kIGFuIGFycmF5IG9mIHByb3BlcnR5IG9iamVjdHMsXG5cdCAqIG1lcmdlcyBlYWNoLCBhbmQgcmV0dXJucyBhIHNoYWxsb3cgY29weS5cblx0ICpcblx0ICogQHBhcmFtIHthcnJheX0gcHJvdG9PYmpBcnIgQXJyYXkgb2YgcHJvdG90eXBlIG9iamVjdHMgd2hpY2ggYXJlIG92ZXJ3cml0dGVuIGZyb20gcmlnaHQgdG8gbGVmdFxuXHQgKiBAcGFyYW0ge2FycmF5fSBwcm9wc09iakFyciBBcnJheSBvZiBkZXNpcmVkIHByb3BlcnR5IG9iamVjdHMgd2hpY2ggYXJlIG92ZXJ3cml0dGVuIGZyb20gcmlnaHQgdG8gbGVmdFxuXHQgKiBAcmV0dXJucyB7b2JqZWN0fSBvYmplY3Rcblx0ICovXG5cdF9wcml2YXRlLm5haXZlX2Nsb25lciA9IGZ1bmN0aW9uKHByb3RvT2JqQXJyLHByb3BzT2JqQXJyKXtcblxuXHRcdFx0ZnVuY3Rpb24gbWVyZ2UoZG9ub3JzKXtcblx0XHRcdFx0dmFyIG8gPSB7fTtcblx0XHRcdFx0Zm9yKHZhciBhIGluIGRvbm9ycyl7XG5cdFx0XHRcdFx0XHRmb3IodmFyIGIgaW4gZG9ub3JzW2FdKXtcblx0XHRcdFx0XHRcdFx0XHRpZihkb25vcnNbYV1bYl0gaW5zdGFuY2VvZiBBcnJheSl7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdG9bYl0gPSBkb25vcnNbYV1bYl0uc2xpY2UoMCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdGVsc2UgaWYodHlwZW9mIGRvbm9yc1thXVtiXSA9PT0gJ29iamVjdCcpe1xuXHRcdFx0XHRcdFx0XHRcdFx0dHJ5e1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRvW2JdID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShkb25vcnNbYV1bYl0pKTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdGNhdGNoKGUpe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKGUpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRkZWJ1Z2dlcjtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0b1tiXSA9IGRvbm9yc1thXVtiXTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIG87XG5cdFx0XHR9XG5cblx0XHRcdHZhciBwcm90byA9IG1lcmdlKHByb3RvT2JqQXJyKSxcblx0XHRcdFx0XHRwcm9wcyA9IG1lcmdlKHByb3BzT2JqQXJyKTtcblxuXHRcdFx0Ly9AdG9kbyBjb25zaWRlciBtYW51YWxseSBzZXR0aW5nIHRoZSBwcm90b3R5cGUgaW5zdGVhZFxuXHRcdFx0dmFyIGZpbmFsT2JqZWN0ID0gT2JqZWN0LmNyZWF0ZShwcm90byk7XG5cdFx0XHRmb3IodmFyIGkgaW4gcHJvcHMpe1xuXHRcdFx0XHRmaW5hbE9iamVjdFtpXSA9IHByb3BzW2ldO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZmluYWxPYmplY3Q7XG5cdH07XG5cblxuXHRfcHJpdmF0ZS5nZW5lcmF0ZV9pZCA9IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpICsgJy0nICsgKCsrdGhpcy5pKTtcblx0fTtcblx0XG5cdFxuXHQvL1NhdmUgZm9yIHJlLXVzZVxuXHRDbHMucHJpdmF0ZS5jb25maWcgPSBfcHJpdmF0ZTtcblxuXHRyZXR1cm4gQ2xzO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihDbHMpe1xuXG5cdC8qKlxuXHQqIEBuYW1lc3BhY2Ugb3JneS9kZWZlcnJlZFxuXHQqL1xuXG5cdFxuXHR2YXIgX3ByaXZhdGUgPSB7fTtcblxuXG5cdF9wcml2YXRlLmFjdGl2YXRlID0gZnVuY3Rpb24ob2JqKXtcblxuXHRcdFx0IC8vaWYgbm8gaWQsIGdlbmVyYXRlIG9uZVxuXHRcdFx0aWYoIW9iai5pZCl7XG5cdFx0XHRcdG9iai5pZCA9IENscy5wcml2YXRlLmNvbmZpZy5nZW5lcmF0ZV9pZCgpO1xuXHRcdFx0fVxuXG5cdFx0XHQvL01BS0UgU1VSRSBOQU1JTkcgQ09ORkxJQ1QgRE9FUyBOT1QgRVhJU1Rcblx0XHRcdGlmKENscy5wcml2YXRlLmNvbmZpZy5saXN0W29iai5pZF0gJiYgIUNscy5wcml2YXRlLmNvbmZpZy5saXN0W29iai5pZF0ub3ZlcndyaXRhYmxlKXtcblx0XHRcdFx0XHRDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoXCJUcmllZCBpbGxlZ2FsIG92ZXJ3cml0ZSBvZiBcIitvYmouaWQrXCIuXCIpO1xuXHRcdFx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcubGlzdFtvYmouaWRdO1xuXHRcdFx0fVxuXG5cdFx0XHQvL1NBVkUgVE8gTUFTVEVSIExJU1Rcblx0XHRcdC8vQHRvZG8gb25seSBzYXZlIGlmIHdhcyBhc3NpZ25lZCBhbiBpZCxcblx0XHRcdC8vd2hpY2ggaW1wbGllcyB1c2VyIGludGVuZHMgdG8gYWNjZXNzIHNvbWV3aGVyZSBlbHNlIG91dHNpZGUgb2Ygc2NvcGVcblx0XHRcdENscy5wcml2YXRlLmNvbmZpZy5saXN0W29iai5pZF0gPSBvYmo7XG5cblx0XHRcdC8vQVVUTyBUSU1FT1VUXG5cdFx0XHRfcHJpdmF0ZS5hdXRvX3RpbWVvdXQuY2FsbChvYmopO1xuXG5cdFx0XHQvL0NhbGwgaG9va1xuXHRcdFx0aWYoQ2xzLnByaXZhdGUuY29uZmlnLnNldHRpbmdzLmhvb2tzLm9uQWN0aXZhdGUpe1xuXHRcdFx0XHRDbHMucHJpdmF0ZS5jb25maWcuc2V0dGluZ3MuaG9va3Mub25BY3RpdmF0ZShvYmopO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gb2JqO1xuXHR9O1xuXG5cblx0X3ByaXZhdGUuc2V0dGxlID0gZnVuY3Rpb24oZGVmKXtcblxuXHRcdFx0Ly9SRU1PVkUgQVVUTyBUSU1FT1VUIFRJTUVSXG5cdFx0XHRpZihkZWYudGltZW91dF9pZCl7XG5cdFx0XHRcdGNsZWFyVGltZW91dChkZWYudGltZW91dF9pZCk7XG5cdFx0XHR9XG5cblx0XHRcdC8vU2V0IHN0YXRlIHRvIHJlc29sdmVkXG5cdFx0XHRfcHJpdmF0ZS5zZXRfc3RhdGUoZGVmLDEpO1xuXG5cdFx0XHQvL0NhbGwgaG9va1xuXHRcdFx0aWYoQ2xzLnByaXZhdGUuY29uZmlnLnNldHRpbmdzLmhvb2tzLm9uU2V0dGxlKXtcblx0XHRcdFx0Q2xzLnByaXZhdGUuY29uZmlnLnNldHRpbmdzLmhvb2tzLm9uU2V0dGxlKGRlZik7XG5cdFx0XHR9XG5cblx0XHRcdC8vQWRkIGRvbmUgYXMgYSBjYWxsYmFjayB0byB0aGVuIGNoYWluIGNvbXBsZXRpb24uXG5cdFx0XHRkZWYuY2FsbGJhY2tzLnRoZW4uaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKGZ1bmN0aW9uKGQyLGl0aW5lcmFyeSxsYXN0KXtcblx0XHRcdFx0XHRkZWYuY2Fib29zZSA9IGxhc3Q7XG5cblx0XHRcdFx0XHQvL1J1biBkb25lXG5cdFx0XHRcdFx0X3ByaXZhdGUucnVuX3RyYWluKFxuXHRcdFx0XHRcdFx0XHRkZWZcblx0XHRcdFx0XHRcdFx0LGRlZi5jYWxsYmFja3MuZG9uZVxuXHRcdFx0XHRcdFx0XHQsZGVmLmNhYm9vc2Vcblx0XHRcdFx0XHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuXHRcdFx0XHRcdCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0Ly9SdW4gdGhlbiBxdWV1ZVxuXHRcdFx0X3ByaXZhdGUucnVuX3RyYWluKFxuXHRcdFx0XHRcdGRlZlxuXHRcdFx0XHRcdCxkZWYuY2FsbGJhY2tzLnRoZW5cblx0XHRcdFx0XHQsZGVmLnZhbHVlXG5cdFx0XHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG5cdFx0XHQpO1xuXG5cdFx0XHRyZXR1cm4gZGVmO1xuXHR9O1xuXG5cblx0LyoqXG5cdCAqIFJ1bnMgYW4gYXJyYXkgb2YgZnVuY3Rpb25zIHNlcXVlbnRpYWxseSBhcyBhIHBhcnRpYWwgZnVuY3Rpb24uXG5cdCAqIEVhY2ggZnVuY3Rpb24ncyBhcmd1bWVudCBpcyB0aGUgcmVzdWx0IG9mIGl0cyBwcmVkZWNlc3NvciBmdW5jdGlvbi5cblx0ICpcblx0ICogQnkgZGVmYXVsdCwgZXhlY3V0aW9uIGNoYWluIGlzIHBhdXNlZCB3aGVuIGFueSBmdW5jdGlvblxuXHQgKiByZXR1cm5zIGFuIHVucmVzb2x2ZWQgZGVmZXJyZWQuIChwYXVzZV9vbl9kZWZlcnJlZCkgW09QVElPTkFMXVxuXHQgKlxuXHQgKiBAcGFyYW0ge29iamVjdH0gZGVmXHQvZGVmZXJyZWQgb2JqZWN0XG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBvYmpcdC9pdGluZXJhcnlcblx0ICpcdFx0XHR0cmFpblx0XHRcdFx0e2FycmF5fVxuXHQgKlx0XHRcdGhvb2tzXHRcdFx0XHR7b2JqZWN0fVxuXHQgKlx0XHRcdFx0XHRvbkJlZm9yZVx0XHRcdFx0e2FycmF5fVxuXHQgKlx0XHRcdFx0XHRvbkNvbXBsZXRlXHRcdFx0e2FycmF5fVxuXHQgKiBAcGFyYW0ge21peGVkfSBwYXJhbSAvcGFyYW0gdG8gcGFzcyB0byBmaXJzdCBjYWxsYmFja1xuXHQgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuXHQgKlx0XHRcdHBhdXNlX29uX2RlZmVycmVkXHRcdHtib29sZWFufVxuXHQgKlxuXHQgKiBAcmV0dXJucyB7dm9pZH1cblx0ICovXG5cdF9wcml2YXRlLnJ1bl90cmFpbiA9IGZ1bmN0aW9uKGRlZixvYmoscGFyYW0sb3B0aW9ucyl7XG5cblx0XHRcdC8vYWxsb3cgcHJldmlvdXMgcmV0dXJuIHZhbHVlcyB0byBiZSBwYXNzZWQgZG93biBjaGFpblxuXHRcdFx0dmFyIHIgPSBwYXJhbSB8fCBkZWYuY2Fib29zZSB8fCBkZWYudmFsdWU7XG5cblx0XHRcdC8vb25CZWZvcmUgZXZlbnRcblx0XHRcdGlmKG9iai5ob29rcyAmJiBvYmouaG9va3Mub25CZWZvcmUudHJhaW4ubGVuZ3RoID4gMCl7XG5cdFx0XHRcdFx0X3ByaXZhdGUucnVuX3RyYWluKFxuXHRcdFx0XHRcdFx0XHRkZWZcblx0XHRcdFx0XHRcdFx0LG9iai5ob29rcy5vbkJlZm9yZVxuXHRcdFx0XHRcdFx0XHQscGFyYW1cblx0XHRcdFx0XHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuXHRcdFx0XHRcdCk7XG5cdFx0XHR9XG5cblx0XHRcdHdoaWxlKG9iai50cmFpbi5sZW5ndGggPiAwKXtcblxuXHRcdFx0XHRcdC8vcmVtb3ZlIGZuIHRvIGV4ZWN1dGVcblx0XHRcdFx0XHR2YXIgbGFzdCA9IG9iai50cmFpbi5zaGlmdCgpO1xuXHRcdFx0XHRcdGRlZi5leGVjdXRpb25faGlzdG9yeS5wdXNoKGxhc3QpO1xuXG5cdFx0XHRcdFx0Ly9kZWYuY2Fib29zZSBuZWVkZWQgZm9yIHRoZW4gY2hhaW4gZGVjbGFyZWQgYWZ0ZXIgcmVzb2x2ZWQgaW5zdGFuY2Vcblx0XHRcdFx0XHRyID0gZGVmLmNhYm9vc2UgPSBsYXN0LmNhbGwoZGVmLGRlZi52YWx1ZSxkZWYscik7XG5cblx0XHRcdFx0XHQvL2lmIHJlc3VsdCBpcyBhbiB0aGVuYWJsZSwgaGFsdCBleGVjdXRpb25cblx0XHRcdFx0XHQvL2FuZCBydW4gdW5maXJlZCBhcnIgd2hlbiB0aGVuYWJsZSBzZXR0bGVzXG5cdFx0XHRcdFx0aWYob3B0aW9ucy5wYXVzZV9vbl9kZWZlcnJlZCl7XG5cblx0XHRcdFx0XHRcdFx0Ly9JZiByIGlzIGFuIHVuc2V0dGxlZCB0aGVuYWJsZVxuXHRcdFx0XHRcdFx0XHRpZihyICYmIHIudGhlbiAmJiByLnNldHRsZWQgIT09IDEpe1xuXG5cdFx0XHRcdFx0XHRcdFx0XHQvL2V4ZWN1dGUgcmVzdCBvZiB0aGlzIHRyYWluIGFmdGVyIHIgcmVzb2x2ZXNcblx0XHRcdFx0XHRcdFx0XHRcdHIuY2FsbGJhY2tzLnJlc29sdmUuaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKGZ1bmN0aW9uKCl7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGRlZlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQsb2JqXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiB0cnVlfVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0Ly90ZXJtaW5hdGUgZXhlY3V0aW9uXG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHQvL0lmIGlzIGFuIGFycmF5IHRoYW4gY29udGFpbnMgYW4gdW5zZXR0bGVkIHRoZW5hYmxlXG5cdFx0XHRcdFx0XHRcdGVsc2UgaWYociBpbnN0YW5jZW9mIEFycmF5KXtcblxuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIHRoZW5hYmxlcyA9IFtdO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRmb3IodmFyIGkgaW4gcil7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpZihyW2ldLnRoZW4gJiYgcltpXS5zZXR0bGVkICE9PSAxKXtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aGVuYWJsZXMucHVzaChyW2ldKTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR2YXIgZm4gPSAoZnVuY3Rpb24odCxkZWYsb2JqLHBhcmFtKXtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCl7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvL0JhaWwgaWYgYW55IHRoZW5hYmxlcyB1bnNldHRsZWRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRmb3IodmFyIGkgaW4gdCl7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmKHRbaV0uc2V0dGxlZCAhPT0gMSl7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGRlZlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQsb2JqXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCxwYXJhbVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogdHJ1ZX1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9KSh0aGVuYWJsZXMsZGVmLG9iaixwYXJhbSk7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly9leGVjdXRlIHJlc3Qgb2YgdGhpcyB0cmFpbiBhZnRlclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvL2FsbCB0aGVuYWJsZXMgZm91bmQgaW4gciByZXNvbHZlXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHJbaV0uY2FsbGJhY2tzLnJlc29sdmUuaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKGZuKTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvL3Rlcm1pbmF0ZSBleGVjdXRpb25cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly9vbkNvbXBsZXRlIGV2ZW50XG5cdFx0XHRpZihvYmouaG9va3MgJiYgb2JqLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ubGVuZ3RoID4gMCl7XG5cdFx0XHRcdFx0X3ByaXZhdGUucnVuX3RyYWluKGRlZixvYmouaG9va3Mub25Db21wbGV0ZSxyLHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfSk7XG5cdFx0XHR9XG5cdH07XG5cblxuXHQvKipcblx0ICogU2V0cyB0aGUgc3RhdGUgb2YgYW4gT3JneSBvYmplY3QuXG5cdCAqXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBkZWZcblx0ICogQHBhcmFtIHtudW1iZXJ9IGludFxuXHQgKiBAcmV0dXJucyB7dm9pZH1cblx0ICovXG5cdF9wcml2YXRlLnNldF9zdGF0ZSA9IGZ1bmN0aW9uKGRlZixpbnQpe1xuXG5cdFx0XHRkZWYuc3RhdGUgPSBpbnQ7XG5cblx0XHRcdC8vSUYgUkVTT0xWRUQgT1IgUkVKRUNURUQsIFNFVFRMRVxuXHRcdFx0aWYoaW50ID09PSAxIHx8IGludCA9PT0gMil7XG5cdFx0XHRcdFx0ZGVmLnNldHRsZWQgPSAxO1xuXHRcdFx0fVxuXG5cdFx0XHRpZihpbnQgPT09IDEgfHwgaW50ID09PSAyKXtcblx0XHRcdFx0XHRfcHJpdmF0ZS5zaWduYWxfZG93bnN0cmVhbShkZWYpO1xuXHRcdFx0fVxuXHR9O1xuXG5cblx0LyoqXG5cdCAqIEdldHMgdGhlIHN0YXRlIG9mIGFuIE9yZ3kgb2JqZWN0XG5cdCAqXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBkZWZcblx0ICogQHJldHVybnMge251bWJlcn1cblx0ICovXG5cdF9wcml2YXRlLmdldF9zdGF0ZSA9IGZ1bmN0aW9uKGRlZil7XG5cdFx0XHRyZXR1cm4gZGVmLnN0YXRlO1xuXHR9O1xuXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIGF1dG9tYXRpYyB0aW1lb3V0IG9uIGEgcHJvbWlzZSBvYmplY3QuXG5cdCAqXG5cdCAqIEByZXR1cm5zIHtCb29sZWFufVxuXHQgKi9cblx0X3ByaXZhdGUuYXV0b190aW1lb3V0ID0gZnVuY3Rpb24oKXtcblxuXHRcdFx0dGhpcy50aW1lb3V0ID0gKHR5cGVvZiB0aGlzLnRpbWVvdXQgIT09ICd1bmRlZmluZWQnKVxuXHRcdFx0PyB0aGlzLnRpbWVvdXQgOiBDbHMucHJpdmF0ZS5jb25maWcuc2V0dGluZ3MudGltZW91dDtcblxuXHRcdFx0Ly9BVVRPIFJFSkVDVCBPTiB0aW1lb3V0XG5cdFx0XHRpZighdGhpcy50eXBlIHx8IHRoaXMudHlwZSAhPT0gJ3RpbWVyJyl7XG5cblx0XHRcdFx0XHQvL0RFTEVURSBQUkVWSU9VUyBUSU1FT1VUIElGIEVYSVNUU1xuXHRcdFx0XHRcdGlmKHRoaXMudGltZW91dF9pZCl7XG5cdFx0XHRcdFx0XHRcdGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRfaWQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZih0eXBlb2YgdGhpcy50aW1lb3V0ID09PSAndW5kZWZpbmVkJyl7XG5cdFx0XHRcdFx0XHRcdENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhbXG5cdFx0XHRcdFx0XHRcdFx0XCJBdXRvIHRpbWVvdXQgdGhpcy50aW1lb3V0IGNhbm5vdCBiZSB1bmRlZmluZWQuXCJcblx0XHRcdFx0XHRcdFx0XHQsdGhpcy5pZFxuXHRcdFx0XHRcdFx0XHRdKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSBpZiAodGhpcy50aW1lb3V0ID09PSAtMSl7XG5cdFx0XHRcdFx0XHRcdC8vTk8gQVVUTyBUSU1FT1VUIFNFVFxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHZhciBzY29wZSA9IHRoaXM7XG5cblx0XHRcdFx0XHR0aGlzLnRpbWVvdXRfaWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdF9wcml2YXRlLmF1dG9fdGltZW91dF9jYi5jYWxsKHNjb3BlKTtcblx0XHRcdFx0XHR9LCB0aGlzLnRpbWVvdXQpO1xuXG5cdFx0XHR9XG5cdFx0XHQvL2Vsc2V7XG5cdFx0XHRcdFx0Ly9AdG9kbyBXSEVOIEEgVElNRVIsIEFERCBEVVJBVElPTiBUTyBBTEwgVVBTVFJFQU0gQU5EIExBVEVSQUw/XG5cdFx0XHQvL31cblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdH07XG5cblxuXHQvKipcblx0ICogQ2FsbGJhY2sgZm9yIGF1dG90aW1lb3V0LiBEZWNsYXJhdGlvbiBoZXJlIGF2b2lkcyBtZW1vcnkgbGVhay5cblx0ICpcblx0ICogQHJldHVybnMge3ZvaWR9XG5cdCAqL1xuXHRfcHJpdmF0ZS5hdXRvX3RpbWVvdXRfY2IgPSBmdW5jdGlvbigpe1xuXG5cdFx0XHRpZih0aGlzLnN0YXRlICE9PSAxKXtcblxuXHRcdFx0XHRcdC8vR0VUIFRIRSBVUFNUUkVBTSBFUlJPUiBJRFxuXHRcdFx0XHRcdHZhciBtc2dzID0gW107XG5cdFx0XHRcdFx0dmFyIHNjb3BlID0gdGhpcztcblxuXHRcdFx0XHRcdHZhciBmbiA9IGZ1bmN0aW9uKG9iail7XG5cdFx0XHRcdFx0XHRcdGlmKG9iai5zdGF0ZSAhPT0gMSl7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gb2JqLmlkO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0LyoqXG5cdFx0XHRcdFx0ICogUnVuIG92ZXIgYSBnaXZlbiBvYmplY3QgcHJvcGVydHkgcmVjdXJzaXZlbHksXG5cdFx0XHRcdFx0ICogYXBwbHlpbmcgY2FsbGJhY2sgdW50aWxcblx0XHRcdFx0XHQgKiBjYWxsYmFjayByZXR1cm5zIGEgbm9uLWZhbHNlIHZhbHVlLlxuXHRcdFx0XHRcdCAqL1xuXHRcdFx0XHRcdGlmKENscy5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy5kZWJ1Z19tb2RlKXtcblx0XHRcdFx0XHRcdFx0dmFyIHIgPSBfcHJpdmF0ZS5zZWFyY2hfb2JqX3JlY3Vyc2l2ZWx5KHRoaXMsJ3Vwc3RyZWFtJyxmbik7XG5cdFx0XHRcdFx0XHRcdG1zZ3MucHVzaChzY29wZS5pZCArIFwiOiByZWplY3RlZCBieSBhdXRvIHRpbWVvdXQgYWZ0ZXIgXCJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQrIHRoaXMudGltZW91dCArIFwibXNcIik7XG5cdFx0XHRcdFx0XHRcdG1zZ3MucHVzaChcIkNhdXNlOlwiKTtcblx0XHRcdFx0XHRcdFx0bXNncy5wdXNoKHIpO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5yZWplY3QuY2FsbCh0aGlzLG1zZ3MpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5yZWplY3QuY2FsbCh0aGlzKTtcblx0XHRcdFx0XHR9XG5cdFx0XHR9XG5cdH07XG5cblxuXHRfcHJpdmF0ZS5lcnJvciA9IGZ1bmN0aW9uKGNiKXtcblxuXHRcdFx0Ly9JRiBFUlJPUiBBTFJFQURZIFRIUk9XTiwgRVhFQ1VURSBDQiBJTU1FRElBVEVMWVxuXHRcdFx0aWYodGhpcy5zdGF0ZSA9PT0gMil7XG5cdFx0XHRcdFx0Y2IoKTtcblx0XHRcdH1cblx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0dGhpcy5yZWplY3RfcS5wdXNoKGNiKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblxuXHQvKipcblx0ICogU2lnbmFscyBhbGwgZG93bnN0cmVhbSBwcm9taXNlcyB0aGF0IF9wcml2YXRlIHByb21pc2Ugb2JqZWN0J3Ncblx0ICogc3RhdGUgaGFzIGNoYW5nZWQuXG5cdCAqXG5cdCAqIEB0b2RvIFNpbmNlIHRoZSBzYW1lIHF1ZXVlIG1heSBoYXZlIGJlZW4gYXNzaWduZWQgdHdpY2UgZGlyZWN0bHkgb3Jcblx0ICogaW5kaXJlY3RseSB2aWEgc2hhcmVkIGRlcGVuZGVuY2llcywgbWFrZSBzdXJlIG5vdCB0byBkb3VibGUgcmVzb2x2ZVxuXHQgKiAtIHdoaWNoIHRocm93cyBhbiBlcnJvci5cblx0ICpcblx0ICogQHBhcmFtIHtvYmplY3R9IHRhcmdldCBkZWZlcnJlZC9xdWV1ZVxuXHQgKiBAcmV0dXJucyB7dm9pZH1cblx0ICovXG5cdF9wcml2YXRlLnNpZ25hbF9kb3duc3RyZWFtID0gZnVuY3Rpb24odGFyZ2V0KXtcblxuXHRcdFx0Ly9NQUtFIFNVUkUgQUxMIERPV05TVFJFQU0gSVMgVU5TRVRUTEVEXG5cdFx0XHRmb3IodmFyIGkgaW4gdGFyZ2V0LmRvd25zdHJlYW0pe1xuXHRcdFx0XHRcdGlmKHRhcmdldC5kb3duc3RyZWFtW2ldLnNldHRsZWQgPT09IDEpe1xuXG5cdFx0XHRcdFx0XHRpZih0YXJnZXQuZG93bnN0cmVhbVtpXS5zdGF0ZSAhPT0gMSl7XG5cdFx0XHRcdFx0XHRcdC8vdHJpZWQgdG8gc2V0dGxlIGEgcmVqZWN0ZWQgZG93bnN0cmVhbVxuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0XHRcdC8vdHJpZWQgdG8gc2V0dGxlIGEgc3VjY2Vzc2Z1bGx5IHNldHRsZWQgZG93bnN0cmVhbVxuXHRcdFx0XHRcdFx0XHRDbHMucHJpdmF0ZS5jb25maWcuZGVidWcodGFyZ2V0LmlkICsgXCIgdHJpZWQgdG8gc2V0dGxlIHByb21pc2UgXCIrXCInXCIrdGFyZ2V0LmRvd25zdHJlYW1baV0uaWQrXCInIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBzZXR0bGVkLlwiKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vTk9XIFRIQVQgV0UgS05PVyBBTEwgRE9XTlNUUkVBTSBJUyBVTlNFVFRMRUQsIFdFIENBTiBJR05PUkUgQU5ZXG5cdFx0XHQvL1NFVFRMRUQgVEhBVCBSRVNVTFQgQVMgQSBTSURFIEVGRkVDVCBUTyBBTk9USEVSIFNFVFRMRU1FTlRcblx0XHRcdGZvciAodmFyIGkgaW4gdGFyZ2V0LmRvd25zdHJlYW0pe1xuXHRcdFx0XHRcdGlmKHRhcmdldC5kb3duc3RyZWFtW2ldLnNldHRsZWQgIT09IDEpe1xuXHRcdFx0XHRcdFx0XHRfcHJpdmF0ZS5yZWNlaXZlX3NpZ25hbCh0YXJnZXQuZG93bnN0cmVhbVtpXSx0YXJnZXQuaWQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdH1cblx0fTtcblxuXG5cdC8qKlxuXHQqIFJ1biBvdmVyIGEgZ2l2ZW4gb2JqZWN0IHByb3BlcnR5IHJlY3Vyc2l2ZWx5LCBhcHBseWluZyBjYWxsYmFjayB1bnRpbFxuXHQqIGNhbGxiYWNrIHJldHVybnMgYSBub24tZmFsc2UgdmFsdWUuXG5cdCpcblx0KiBAcGFyYW0ge29iamVjdH0gb2JqXG5cdCogQHBhcmFtIHtzdHJpbmd9IHByb3BOYW1lXHRcdFx0XHRcdFRoZSBwcm9wZXJ0eSBuYW1lIG9mIHRoZSBhcnJheSB0byBidWJibGUgdXBcblx0KiBAcGFyYW0ge2Z1bmN0aW9ufSBmblx0XHRcdFx0XHRcdFx0VGhlIHRlc3QgY2FsbGJhY2sgdG8gYmUgYXBwbGllZCB0byBlYWNoIG9iamVjdFxuXHQqIEBwYXJhbSB7YXJyYXl9IGJyZWFkY3J1bWJcdFx0XHRcdFx0VGhlIGJyZWFkY3J1bWIgdGhyb3VnaCB0aGUgY2hhaW4gb2YgdGhlIGZpcnN0IG1hdGNoXG5cdCogQHJldHVybnMge21peGVkfVxuXHQqL1xuXHRfcHJpdmF0ZS5zZWFyY2hfb2JqX3JlY3Vyc2l2ZWx5ID0gZnVuY3Rpb24ob2JqLHByb3BOYW1lLGZuLGJyZWFkY3J1bWIpe1xuXG5cdFx0XHRpZih0eXBlb2YgYnJlYWRjcnVtYiA9PT0gJ3VuZGVmaW5lZCcpe1xuXHRcdFx0XHRcdGJyZWFkY3J1bWIgPSBbb2JqLmlkXTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIHIxO1xuXG5cdFx0XHRmb3IodmFyIGkgaW4gb2JqW3Byb3BOYW1lXSl7XG5cblx0XHRcdFx0XHQvL1JVTiBURVNUXG5cdFx0XHRcdFx0cjEgPSBmbihvYmpbcHJvcE5hbWVdW2ldKTtcblxuXHRcdFx0XHRcdGlmKHIxICE9PSBmYWxzZSl7XG5cdFx0XHRcdFx0Ly9NQVRDSCBSRVRVUk5FRC4gUkVDVVJTRSBJTlRPIE1BVENIIElGIEhBUyBQUk9QRVJUWSBPRiBTQU1FIE5BTUUgVE8gU0VBUkNIXG5cdFx0XHRcdFx0XHRcdC8vQ0hFQ0sgVEhBVCBXRSBBUkVOJ1QgQ0FVR0hUIElOIEEgQ0lSQ1VMQVIgTE9PUFxuXHRcdFx0XHRcdFx0XHRpZihicmVhZGNydW1iLmluZGV4T2YocjEpICE9PSAtMSl7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcIkNpcmN1bGFyIGNvbmRpdGlvbiBpbiByZWN1cnNpdmUgc2VhcmNoIG9mIG9iaiBwcm9wZXJ0eSAnXCJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0K3Byb3BOYW1lK1wiJyBvZiBvYmplY3QgXCJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0KygodHlwZW9mIG9iai5pZCAhPT0gJ3VuZGVmaW5lZCcpID8gXCInXCIrb2JqLmlkK1wiJ1wiIDogJycpXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCtcIi4gT2ZmZW5kaW5nIHZhbHVlOiBcIityMVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCwoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWRjcnVtYi5wdXNoKHIxKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGJyZWFkY3J1bWIuam9pbihcIiBbZGVwZW5kcyBvbl09PiBcIik7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSkoKVxuXHRcdFx0XHRcdFx0XHRcdFx0XSk7XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRicmVhZGNydW1iLnB1c2gocjEpO1xuXG5cdFx0XHRcdFx0XHRcdGlmKG9ialtwcm9wTmFtZV1baV1bcHJvcE5hbWVdKXtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBfcHJpdmF0ZS5zZWFyY2hfb2JqX3JlY3Vyc2l2ZWx5KG9ialtwcm9wTmFtZV1baV0scHJvcE5hbWUsZm4sYnJlYWRjcnVtYik7XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGJyZWFkY3J1bWI7XG5cdH07XG5cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBwcm9taXNlIGRlc2NyaXB0aW9uIGludG8gYSBwcm9taXNlLlxuXHQgKlxuXHQgKiBAcGFyYW0ge3R5cGV9IG9ialxuXHQgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuXHQgKi9cblx0X3ByaXZhdGUuY29udmVydF90b19wcm9taXNlID0gZnVuY3Rpb24ob2JqLG9wdGlvbnMpe1xuXG5cdFx0XHRvYmouaWQgPSBvYmouaWQgfHwgb3B0aW9ucy5pZDtcblxuXHRcdFx0Ly9BdXRvbmFtZVxuXHRcdFx0aWYgKCFvYmouaWQpIHtcblx0XHRcdFx0aWYgKG9iai50eXBlID09PSAndGltZXInKSB7XG5cdFx0XHRcdFx0b2JqLmlkID0gXCJ0aW1lci1cIiArIG9iai50aW1lb3V0ICsgXCItXCIgKyAoKytDbHMucHJpdmF0ZS5jb25maWcuaSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAodHlwZW9mIG9iai51cmwgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdFx0b2JqLmlkID0gb2JqLnVybC5zcGxpdChcIi9cIikucG9wKCk7XG5cdFx0XHRcdFx0Ly9SRU1PVkUgLmpzIEZST00gSURcblx0XHRcdFx0XHRpZiAob2JqLmlkLnNlYXJjaChcIi5qc1wiKSAhPT0gLTEpIHtcblx0XHRcdFx0XHRcdG9iai5pZCA9IG9iai5pZC5zcGxpdChcIi5cIik7XG5cdFx0XHRcdFx0XHRvYmouaWQucG9wKCk7XG5cdFx0XHRcdFx0XHRvYmouaWQgPSBvYmouaWQuam9pbihcIi5cIik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vUmV0dXJuIGlmIGFscmVhZHkgZXhpc3RzXG5cdFx0XHRpZihDbHMucHJpdmF0ZS5jb25maWcubGlzdFtvYmouaWRdICYmIG9iai50eXBlICE9PSAndGltZXInKXtcblx0XHRcdFx0Ly9BIHByZXZpb3VzIHByb21pc2Ugb2YgdGhlIHNhbWUgaWQgZXhpc3RzLlxuXHRcdFx0XHQvL01ha2Ugc3VyZSB0aGlzIGRlcGVuZGVuY3kgb2JqZWN0IGRvZXNuJ3QgaGF2ZSBhXG5cdFx0XHRcdC8vcmVzb2x2ZXIgLSBpZiBpdCBkb2VzIGVycm9yXG5cdFx0XHRcdGlmKG9iai5yZXNvbHZlcil7XG5cdFx0XHRcdFx0Q2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFtcblx0XHRcdFx0XHRcdFwiWW91IGNhbid0IHNldCBhIHJlc29sdmVyIG9uIGEgcXVldWUgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIGRlY2xhcmVkLiBZb3UgY2FuIG9ubHkgcmVmZXJlbmNlIHRoZSBvcmlnaW5hbC5cIlxuXHRcdFx0XHRcdFx0LFwiRGV0ZWN0ZWQgcmUtaW5pdCBvZiAnXCIgKyBvYmouaWQgKyBcIicuXCJcblx0XHRcdFx0XHRcdCxcIkF0dGVtcHRlZDpcIlxuXHRcdFx0XHRcdFx0LG9ialxuXHRcdFx0XHRcdFx0LFwiRXhpc3Rpbmc6XCJcblx0XHRcdFx0XHRcdCxDbHMucHJpdmF0ZS5jb25maWcubGlzdFtvYmouaWRdXG5cdFx0XHRcdFx0XSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRyZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmxpc3Rbb2JqLmlkXTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cblx0XHRcdC8vQ29udmVydCBkZXBlbmRlbmN5IHRvIGFuIGluc3RhbmNlXG5cdFx0XHR2YXIgZGVmO1xuXHRcdFx0c3dpdGNoKHRydWUpe1xuXG5cdFx0XHRcdFx0Ly9FdmVudFxuXHRcdFx0XHRcdGNhc2Uob2JqLnR5cGUgPT09ICdldmVudCcpOlxuXHRcdFx0XHRcdFx0XHRkZWYgPSBfcHJpdmF0ZS53cmFwX2V2ZW50KG9iaik7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0Y2FzZShvYmoudHlwZSA9PT0gJ3F1ZXVlJyk6XG5cdFx0XHRcdFx0XHRcdGRlZiA9IENscy5wdWJsaWMucXVldWUob2JqLmRlcGVuZGVuY2llcyxvYmopO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdC8vQWxyZWFkeSBhIHRoZW5hYmxlXG5cdFx0XHRcdFx0Y2FzZSh0eXBlb2Ygb2JqLnRoZW4gPT09ICdmdW5jdGlvbicpOlxuXG5cdFx0XHRcdFx0XHRcdHN3aXRjaCh0cnVlKXtcblxuXHRcdFx0XHRcdFx0XHRcdFx0Ly9SZWZlcmVuY2UgdG8gYW4gZXhpc3RpbmcgaW5zdGFuY2Vcblx0XHRcdFx0XHRcdFx0XHRcdGNhc2UodHlwZW9mIG9iai5pZCA9PT0gJ3N0cmluZycpOlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUud2FybihcIidcIitvYmouaWQgK1wiJzogZGlkIG5vdCBleGlzdC4gQXV0byBjcmVhdGluZyBuZXcgZGVmZXJyZWQuXCIpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGRlZiA9IF9wcml2YXRlLmRlZmVycmVkKHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWQgOiBvYmouaWRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vSWYgb2JqZWN0IHdhcyBhIHRoZW5hYmxlLCByZXNvbHZlIHRoZSBuZXcgZGVmZXJyZWQgd2hlbiB0aGVuIGNhbGxlZFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmKG9iai50aGVuKXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdG9iai50aGVuKGZ1bmN0aW9uKHIpe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkZWYucmVzb2x2ZShyKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0XHRcdFx0Ly9PQkpFQ1QgUFJPUEVSVFkgLnByb21pc2UgRVhQRUNURUQgVE8gUkVUVVJOIEEgUFJPTUlTRVxuXHRcdFx0XHRcdFx0XHRcdFx0Y2FzZSh0eXBlb2Ygb2JqLnByb21pc2UgPT09ICdmdW5jdGlvbicpOlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmKG9iai5zY29wZSl7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGRlZiA9IG9iai5wcm9taXNlLmNhbGwob2JqLnNjb3BlKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmID0gb2JqLnByb21pc2UoKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdFx0XHRcdC8vT2JqZWN0IGlzIGEgdGhlbmFibGVcblx0XHRcdFx0XHRcdFx0XHRcdGNhc2Uob2JqLnRoZW4pOlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGRlZiA9IG9iajtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0XHRcdFx0ZGVmYXVsdDpcblxuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0Ly9DaGVjayBpZiBpcyBhIHRoZW5hYmxlXG5cdFx0XHRcdFx0XHRcdGlmKHR5cGVvZiBkZWYgIT09ICdvYmplY3QnIHx8ICFkZWYudGhlbil7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFwiRGVwZW5kZW5jeSBsYWJlbGVkIGFzIGEgcHJvbWlzZSBkaWQgbm90IHJldHVybiBhIHByb21pc2UuXCIsb2JqKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdGNhc2Uob2JqLnR5cGUgPT09ICd0aW1lcicpOlxuXHRcdFx0XHRcdFx0XHRkZWYgPSBfcHJpdmF0ZS53cmFwX3RpbWVyKG9iaik7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0Ly9Mb2FkIGZpbGVcblx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0XHRvYmoudHlwZSA9IG9iai50eXBlIHx8IFwiZGVmYXVsdFwiO1xuXHRcdFx0XHRcdFx0XHQvL0luaGVyaXQgcGFyZW50J3MgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeVxuXHRcdFx0XHRcdFx0XHRpZihvcHRpb25zLnBhcmVudCAmJiBvcHRpb25zLnBhcmVudC5jd2Qpe1xuXHRcdFx0XHRcdFx0XHRcdG9iai5jd2QgPSBvcHRpb25zLnBhcmVudC5jd2Q7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0ZGVmID0gX3ByaXZhdGUud3JhcF94aHIob2JqKTtcblx0XHRcdH1cblxuXHRcdFx0Ly9JbmRleCBwcm9taXNlIGJ5IGlkIGZvciBmdXR1cmUgcmVmZXJlbmNpbmdcblx0XHRcdENscy5wcml2YXRlLmNvbmZpZy5saXN0W29iai5pZF0gPSBkZWY7XG5cblx0XHRcdHJldHVybiBkZWY7XG5cdH07XG5cblxuXHQvKipcblx0ICogQHRvZG86IHJlZG8gdGhpc1xuXHQgKlxuXHQgKiBDb252ZXJ0cyBhIHJlZmVyZW5jZSB0byBhIERPTSBldmVudCB0byBhIHByb21pc2UuXG5cdCAqIFJlc29sdmVkIG9uIGZpcnN0IGV2ZW50IHRyaWdnZXIuXG5cdCAqXG5cdCAqIEB0b2RvIHJlbW92ZSBqcXVlcnkgZGVwZW5kZW5jeVxuXHQgKlxuXHQgKiBAcGFyYW0ge29iamVjdH0gb2JqXG5cdCAqIEByZXR1cm5zIHtvYmplY3R9IGRlZmVycmVkIG9iamVjdFxuXHQgKi9cblx0X3ByaXZhdGUud3JhcF9ldmVudCA9IGZ1bmN0aW9uKG9iail7XG5cblx0XHRcdHZhciBkZWYgPSBDbHMucHVibGljLmRlZmVycmVkKHtcblx0XHRcdFx0XHRpZCA6IG9iai5pZFxuXHRcdFx0fSk7XG5cblxuXHRcdFx0aWYodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyl7XG5cblx0XHRcdFx0XHRpZih0eXBlb2YgJCAhPT0gJ2Z1bmN0aW9uJyl7XG5cdFx0XHRcdFx0XHRcdHZhciBtc2cgPSAnd2luZG93IGFuZCBkb2N1bWVudCBiYXNlZCBldmVudHMgZGVwZW5kIG9uIGpRdWVyeSc7XG5cdFx0XHRcdFx0XHRcdGRlZi5yZWplY3QobXNnKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRcdC8vRm9yIG5vdywgZGVwZW5kIG9uIGpxdWVyeSBmb3IgSUU4IERPTUNvbnRlbnRMb2FkZWQgcG9seWZpbGxcblx0XHRcdFx0XHRcdHN3aXRjaCh0cnVlKXtcblx0XHRcdFx0XHRcdFx0Y2FzZShvYmouaWQgPT09ICdyZWFkeScgfHwgb2JqLmlkID09PSAnRE9NQ29udGVudExvYWRlZCcpOlxuXHRcdFx0XHRcdFx0XHRcdCQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdFx0XHRkZWYucmVzb2x2ZSgxKTtcblx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0Y2FzZShvYmouaWQgPT09ICdsb2FkJyk6XG5cdFx0XHRcdFx0XHRcdFx0JCh3aW5kb3cpLmxvYWQoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0XHRcdGRlZi5yZXNvbHZlKDEpO1xuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0XHRcdCQoZG9jdW1lbnQpLm9uKG9iai5pZCxcImJvZHlcIixmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHRcdFx0ZGVmLnJlc29sdmUoMSk7XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZGVmO1xuXHR9O1xuXG5cblx0X3ByaXZhdGUud3JhcF90aW1lciA9IGZ1bmN0aW9uKG9iail7XG5cblx0XHRcdHZhciBkZWYgPSBDbHMucHVibGljLmRlZmVycmVkKCk7XG5cblx0XHRcdChmdW5jdGlvbihkZWYpe1xuXHRcdFx0XHRcdHZhciBfc3RhcnQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0XHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdHZhciBfZW5kID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdFx0XHRcdFx0XHRcdGRlZi5yZXNvbHZlKHtcblx0XHRcdFx0XHRcdFx0XHRcdHN0YXJ0IDogX3N0YXJ0XG5cdFx0XHRcdFx0XHRcdFx0XHQsZW5kIDogX2VuZFxuXHRcdFx0XHRcdFx0XHRcdFx0LGVsYXBzZWQgOiBfZW5kIC0gX3N0YXJ0XG5cdFx0XHRcdFx0XHRcdFx0XHQsdGltZW91dCA6IG9iai50aW1lb3V0XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0sb2JqLnRpbWVvdXQpO1xuXHRcdFx0fShkZWYpKTtcblxuXHRcdFx0cmV0dXJuIGRlZjtcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGEgZGVmZXJyZWQgb2JqZWN0IHRoYXQgZGVwZW5kcyBvbiB0aGUgbG9hZGluZyBvZiBhIGZpbGUuXG5cdCAqXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBkZXBcblx0ICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWQgb2JqZWN0XG5cdCAqL1xuXHRfcHJpdmF0ZS53cmFwX3hociA9IGZ1bmN0aW9uKGRlcCl7XG5cblx0XHRcdHZhciByZXF1aXJlZCA9IFtcImlkXCIsXCJ1cmxcIl07XG5cdFx0XHRmb3IodmFyIGkgaW4gcmVxdWlyZWQpe1xuXHRcdFx0XHRpZighZGVwW3JlcXVpcmVkW2ldXSl7XG5cdFx0XHRcdFx0cmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhbXG5cdFx0XHRcdFx0XHRcIkZpbGUgcmVxdWVzdHMgY29udmVydGVkIHRvIHByb21pc2VzIHJlcXVpcmU6IFwiICsgcmVxdWlyZWRbaV1cblx0XHRcdFx0XHRcdCxcIk1ha2Ugc3VyZSB5b3Ugd2VyZW4ndCBleHBlY3RpbmcgZGVwZW5kZW5jeSB0byBhbHJlYWR5IGhhdmUgYmVlbiByZXNvbHZlZCB1cHN0cmVhbS5cIlxuXHRcdFx0XHRcdFx0LGRlcFxuXHRcdFx0XHRcdF0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vSUYgUFJPTUlTRSBGT1IgVEhJUyBVUkwgQUxSRUFEWSBFWElTVFMsIFJFVFVSTiBJVFxuXHRcdFx0aWYoQ2xzLnByaXZhdGUuY29uZmlnLmxpc3RbZGVwLmlkXSl7XG5cdFx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcubGlzdFtkZXAuaWRdO1xuXHRcdFx0fVxuXG5cdFx0XHQvL0NPTlZFUlQgVE8gREVGRVJSRUQ6XG5cdFx0XHR2YXIgZGVmID0gQ2xzLnB1YmxpYy5kZWZlcnJlZChkZXApO1xuXG5cdFx0XHRpZih0eXBlb2YgQ2xzLnB1YmxpYy5maWxlX2xvYWRlcltDbHMucHJpdmF0ZS5jb25maWcuc2V0dGluZ3MubW9kZV1bZGVwLnR5cGVdICE9PSAndW5kZWZpbmVkJyl7XG5cdFx0XHRcdENscy5wdWJsaWMuZmlsZV9sb2FkZXJbQ2xzLnByaXZhdGUuY29uZmlnLnNldHRpbmdzLm1vZGVdW2RlcC50eXBlXShkZXAudXJsLGRlZixkZXApO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZXtcblx0XHRcdFx0Q2xzLnB1YmxpYy5maWxlX2xvYWRlcltDbHMucHJpdmF0ZS5jb25maWcuc2V0dGluZ3MubW9kZV1bJ2RlZmF1bHQnXShkZXAudXJsLGRlZixkZXApO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZGVmO1xuXHR9O1xuXG5cdC8qKlxuXHQqIEEgXCJzaWduYWxcIiBoZXJlIGNhdXNlcyBhIHF1ZXVlIHRvIGxvb2sgdGhyb3VnaCBlYWNoIGl0ZW1cblx0KiBpbiBpdHMgdXBzdHJlYW0gYW5kIGNoZWNrIHRvIHNlZSBpZiBhbGwgYXJlIHJlc29sdmVkLlxuXHQqXG5cdCogU2lnbmFscyBjYW4gb25seSBiZSByZWNlaXZlZCBieSBhIHF1ZXVlIGl0c2VsZiBvciBhbiBpbnN0YW5jZVxuXHQqIGluIGl0cyB1cHN0cmVhbS5cblx0KlxuXHQqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXRcblx0KiBAcGFyYW0ge3N0cmluZ30gZnJvbV9pZFxuXHQqIEByZXR1cm5zIHt2b2lkfVxuXHQqL1xuXHRfcHJpdmF0ZS5yZWNlaXZlX3NpZ25hbCA9IGZ1bmN0aW9uKHRhcmdldCxmcm9tX2lkKXtcblxuXHRcdGlmKHRhcmdldC5oYWx0X3Jlc29sdXRpb24gPT09IDEpIHJldHVybjtcblxuXHRcdC8vTUFLRSBTVVJFIFRIRSBTSUdOQUwgV0FTIEZST00gQSBQUk9NSVNFIEJFSU5HIExJU1RFTkVEIFRPXG5cdCAvL0JVVCBBTExPVyBTRUxGIFNUQVRVUyBDSEVDS1xuXHQgdmFyIHN0YXR1cztcblx0IGlmKGZyb21faWQgIT09IHRhcmdldC5pZCAmJiAhdGFyZ2V0LnVwc3RyZWFtW2Zyb21faWRdKXtcblx0XHRcdCByZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKGZyb21faWQgKyBcIiBjYW4ndCBzaWduYWwgXCIgKyB0YXJnZXQuaWQgKyBcIiBiZWNhdXNlIG5vdCBpbiB1cHN0cmVhbS5cIik7XG5cdCB9XG5cdCAvL1JVTiBUSFJPVUdIIFFVRVVFIE9GIE9CU0VSVklORyBQUk9NSVNFUyBUTyBTRUUgSUYgQUxMIERPTkVcblx0IGVsc2V7XG5cdFx0XHQgc3RhdHVzID0gMTtcblx0XHRcdCBmb3IodmFyIGkgaW4gdGFyZ2V0LnVwc3RyZWFtKXtcblx0XHRcdFx0XHQgLy9TRVRTIFNUQVRVUyBUTyAwIElGIEFOWSBPQlNFUlZJTkcgSEFWRSBGQUlMRUQsIEJVVCBOT1QgSUYgUEVORElORyBPUiBSRVNPTFZFRFxuXHRcdFx0XHRcdCBpZih0YXJnZXQudXBzdHJlYW1baV0uc3RhdGUgIT09IDEpIHtcblx0XHRcdFx0XHRcdFx0IHN0YXR1cyA9IHRhcmdldC51cHN0cmVhbVtpXS5zdGF0ZTtcblx0XHRcdFx0XHRcdFx0IGJyZWFrO1xuXHRcdFx0XHRcdCB9XG5cdFx0XHQgfVxuXHQgfVxuXG5cdCAvL1JFU09MVkUgUVVFVUUgSUYgVVBTVFJFQU0gRklOSVNIRURcblx0IGlmKHN0YXR1cyA9PT0gMSl7XG5cblx0XHRcdC8vR0VUIFJFVFVSTiBWQUxVRVMgUEVSIERFUEVOREVOQ0lFUywgV0hJQ0ggU0FWRVMgT1JERVIgQU5EXG5cdFx0XHQvL1JFUE9SVFMgRFVQTElDQVRFU1xuXHRcdFx0dmFyIHZhbHVlcyA9IFtdO1xuXHRcdFx0Zm9yKHZhciBpIGluIHRhcmdldC5kZXBlbmRlbmNpZXMpe1xuXHRcdFx0XHR2YWx1ZXMucHVzaCh0YXJnZXQuZGVwZW5kZW5jaWVzW2ldLnZhbHVlKTtcblx0XHRcdH1cblxuXHRcdFx0dGFyZ2V0LnJlc29sdmUuY2FsbCh0YXJnZXQsdmFsdWVzKTtcblx0IH1cblxuXHQgaWYoc3RhdHVzID09PSAyKXtcblx0XHRcdCB2YXIgZXJyID0gW1xuXHRcdFx0XHRcdCB0YXJnZXQuaWQrXCIgZGVwZW5kZW5jeSAnXCIrdGFyZ2V0LnVwc3RyZWFtW2ldLmlkICsgXCInIHdhcyByZWplY3RlZC5cIlxuXHRcdFx0XHRcdCAsdGFyZ2V0LnVwc3RyZWFtW2ldLmFyZ3VtZW50c1xuXHRcdFx0IF07XG5cdFx0XHQgdGFyZ2V0LnJlamVjdC5hcHBseSh0YXJnZXQsZXJyKTtcblx0IH1cblx0fTtcblxuXG5cblxuXHR2YXIgX3B1YmxpYyA9IHt9O1xuXG5cdF9wdWJsaWMuaXNfb3JneSA9IHRydWU7XG5cblx0X3B1YmxpYy5pZCA9IG51bGw7XG5cblx0Ly9BIENPVU5URVIgRk9SIEFVVDAtR0VORVJBVEVEIFBST01JU0UgSUQnU1xuXHRfcHVibGljLnNldHRsZWQgPSAwO1xuXG5cdC8qKlxuXHQqIFNUQVRFIENPREVTOlxuXHQqIC0tLS0tLS0tLS0tLS0tLS0tLVxuXHQqIC0xXHQgPT4gU0VUVExJTkcgW0VYRUNVVElORyBDQUxMQkFDS1NdXG5cdCogIDBcdCA9PiBQRU5ESU5HXG5cdCogIDFcdCA9PiBSRVNPTFZFRCAvIEZVTEZJTExFRFxuXHQqICAyXHQgPT4gUkVKRUNURURcblx0Ki9cblx0X3B1YmxpYy5zdGF0ZSA9IDA7XG5cblx0X3B1YmxpYy52YWx1ZSA9IFtdO1xuXG5cdC8vVGhlIG1vc3QgcmVjZW50IHZhbHVlIGdlbmVyYXRlZCBieSB0aGUgdGhlbi0+ZG9uZSBjaGFpbi5cblx0X3B1YmxpYy5jYWJvb3NlID0gbnVsbDtcblxuXHRfcHVibGljLm1vZGVsID0gXCJkZWZlcnJlZFwiO1xuXG5cdF9wdWJsaWMuZG9uZV9maXJlZCA9IDA7XG5cblx0X3B1YmxpYy50aW1lb3V0X2lkID0gbnVsbDtcblxuXHRfcHVibGljLmNhbGxiYWNrX3N0YXRlcyA9IHtcblx0XHRyZXNvbHZlIDogMFxuXHRcdCx0aGVuIDogMFxuXHRcdCxkb25lIDogMFxuXHRcdCxyZWplY3QgOiAwXG5cdH07XG5cblx0LyoqXG5cdCogU2VsZiBleGVjdXRpbmcgZnVuY3Rpb24gdG8gaW5pdGlhbGl6ZSBjYWxsYmFjayBldmVudFxuXHQqIGxpc3QuXG5cdCpcblx0KiBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHRoZSBzYW1lIHByb3BlcnR5TmFtZXMgYXNcblx0KiBfcHVibGljLmNhbGxiYWNrX3N0YXRlczogYWRkaW5nIGJvaWxlcnBsYXRlXG5cdCogcHJvcGVydGllcyBmb3IgZWFjaFxuXHQqXG5cdCogQHJldHVybnMge29iamVjdH1cblx0Ki9cblx0X3B1YmxpYy5jYWxsYmFja3MgPSAoZnVuY3Rpb24oKXtcblxuXHRcdHZhciBvID0ge307XG5cblx0XHRmb3IodmFyIGkgaW4gX3B1YmxpYy5jYWxsYmFja19zdGF0ZXMpe1xuXHRcdFx0b1tpXSA9IHtcblx0XHRcdFx0dHJhaW4gOiBbXVxuXHRcdFx0XHQsaG9va3MgOiB7XG5cdFx0XHRcdFx0b25CZWZvcmUgOiB7XG5cdFx0XHRcdFx0XHR0cmFpbiA6IFtdXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdCxvbkNvbXBsZXRlIDoge1xuXHRcdFx0XHRcdFx0dHJhaW4gOiBbXVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRyZXR1cm4gbztcblx0fSkoKTtcblxuXHQvL1BST01JU0UgSEFTIE9CU0VSVkVSUyBCVVQgRE9FUyBOT1QgT0JTRVJWRSBPVEhFUlNcblx0X3B1YmxpYy5kb3duc3RyZWFtID0ge307XG5cblx0X3B1YmxpYy5leGVjdXRpb25faGlzdG9yeSA9IFtdO1xuXG5cdC8vV0hFTiBUUlVFLCBBTExPV1MgUkUtSU5JVCBbRk9SIFVQR1JBREVTIFRPIEEgUVVFVUVdXG5cdF9wdWJsaWMub3ZlcndyaXRhYmxlID0gMDtcblxuXHQvKipcblx0KiBSRU1PVEVcblx0KlxuXHQqIFJFTU9URSA9PSAxICA9PiAgW0RFRkFVTFRdIE1ha2UgaHR0cCByZXF1ZXN0IGZvciBmaWxlXG5cdCpcblx0KiBSRU1PVEUgPT0gMCAgPT4gIFJlYWQgZmlsZSBkaXJlY3RseSBmcm9tIHRoZSBmaWxlc3lzdGVtXG5cdCpcblx0KiBPTkxZIEFQUExJRVMgVE8gU0NSSVBUUyBSVU4gVU5ERVIgTk9ERSBBUyBCUk9XU0VSIEhBUyBOT1xuXHQqIEZJTEVTWVNURU0gQUNDRVNTXG5cdCovXG5cdF9wdWJsaWMucmVtb3RlID0gMTtcblxuXHQvL0FERFMgVE8gTUFTVEVSIExJU1QuIEFMV0FZUyBUUlVFIFVOTEVTUyBVUEdSQURJTkcgQSBQUk9NSVNFIFRPIEEgUVVFVUVcblx0X3B1YmxpYy5saXN0ID0gMTtcblxuXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXHQvL1x0X3B1YmxpYyBNRVRIT0RTXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cblx0LyoqXG5cdCogUmVzb2x2ZXMgYSBkZWZlcnJlZC9xdWV1ZS5cblx0KlxuXHQqIEBtZW1iZXJvZiBvcmd5L2RlZmVycmVkXG5cdCogQGZ1bmN0aW9uIG9yZ3kvZGVmZXJyZWQjcmVzb2x2ZVxuXHQqXG5cdCogQHBhcmFtIHttaXhlZH0gdmFsdWUgUmVzb2x2ZXIgdmFsdWUuXG5cdCogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWQvcXVldWVcblx0Ki9cblx0X3B1YmxpYy5yZXNvbHZlID0gZnVuY3Rpb24odmFsdWUpe1xuXG5cdFx0aWYodGhpcy5zZXR0bGVkID09PSAxKXtcblx0XHRcdENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhbXG5cdFx0XHRcdHRoaXMuaWQgKyBcIiBjYW4ndCByZXNvbHZlLlwiXG5cdFx0XHRcdCxcIk9ubHkgdW5zZXR0bGVkIGRlZmVycmVkcyBhcmUgcmVzb2x2YWJsZS5cIlxuXHRcdFx0XSk7XG5cdFx0fVxuXG5cdFx0Ly9TRVQgU1RBVEUgVE8gU0VUVExFTUVOVCBJTiBQUk9HUkVTU1xuXHRcdF9wcml2YXRlLnNldF9zdGF0ZSh0aGlzLC0xKTtcblxuXHRcdC8vU0VUIFZBTFVFXG5cdFx0dGhpcy52YWx1ZSA9IHZhbHVlO1xuXG5cdFx0Ly9SVU4gUkVTT0xWRVIgQkVGT1JFIFBST0NFRURJTkdcblx0XHQvL0VWRU4gSUYgVEhFUkUgSVMgTk8gUkVTT0xWRVIsIFNFVCBJVCBUTyBGSVJFRCBXSEVOIENBTExFRFxuXHRcdGlmKCF0aGlzLnJlc29sdmVyX2ZpcmVkICYmIHR5cGVvZiB0aGlzLnJlc29sdmVyID09PSAnZnVuY3Rpb24nKXtcblxuXHRcdFx0dGhpcy5yZXNvbHZlcl9maXJlZCA9IDE7XG5cblx0XHRcdC8vQWRkIHJlc29sdmVyIHRvIHJlc29sdmUgdHJhaW5cblx0XHRcdHRyeXtcblx0XHRcdFx0dGhpcy5jYWxsYmFja3MucmVzb2x2ZS50cmFpbi5wdXNoKGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0dGhpcy5yZXNvbHZlcih2YWx1ZSx0aGlzKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRjYXRjaChlKXtcblx0XHRcdFx0Q2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKGUpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNle1xuXG5cdFx0XHR0aGlzLnJlc29sdmVyX2ZpcmVkID0gMTtcblxuXHRcdFx0Ly9BZGQgc2V0dGxlIHRvIHJlc29sdmUgdHJhaW5cblx0XHRcdC8vQWx3YXlzIHNldHRsZSBiZWZvcmUgYWxsIG90aGVyIGNvbXBsZXRlIGNhbGxiYWNrc1xuXHRcdFx0dGhpcy5jYWxsYmFja3MucmVzb2x2ZS5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnVuc2hpZnQoZnVuY3Rpb24oKXtcblx0XHRcdFx0X3ByaXZhdGUuc2V0dGxlKHRoaXMpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Ly9SdW4gcmVzb2x2ZVxuXHRcdF9wcml2YXRlLnJ1bl90cmFpbihcblx0XHRcdHRoaXNcblx0XHRcdCx0aGlzLmNhbGxiYWNrcy5yZXNvbHZlXG5cdFx0XHQsdGhpcy52YWx1ZVxuXHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuXHRcdCk7XG5cblx0XHQvL3Jlc29sdmVyIGlzIGV4cGVjdGVkIHRvIGNhbGwgcmVzb2x2ZSBhZ2FpblxuXHRcdC8vYW5kIHRoYXQgd2lsbCBnZXQgdXMgcGFzdCB0aGlzIHBvaW50XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblxuXHQvKipcblx0KiBSZWplY3RzIGEgZGVmZXJyZWQvcXVldWVcblx0KlxuXHQqIEBtZW1iZXJvZiBvcmd5L2RlZmVycmVkXG5cdCogQGZ1bmN0aW9uIG9yZ3kvZGVmZXJyZWQjcmVqZWN0XG5cdCpcblx0KiBAcGFyYW0ge3N0cmluZ3xhcnJheX0gZXJyIEVycm9yIGluZm9ybWF0aW9uLlxuXHQqIEByZXR1cm4ge29iamVjdH0gZGVmZXJyZWQvcXVldWVcblx0Ki9cblx0X3B1YmxpYy5yZWplY3QgPSBmdW5jdGlvbihlcnIpe1xuXG5cdFx0aWYoIShlcnIgaW5zdGFuY2VvZiBBcnJheSkpe1xuXHRcdFx0ZXJyID0gW2Vycl07XG5cdFx0fVxuXG5cdFx0dmFyIG1zZyA9IFwiUmVqZWN0ZWQgXCIrdGhpcy5tb2RlbCtcIjogJ1wiK3RoaXMuaWQrXCInLlwiXG5cblx0XHRpZihDbHMucHJpdmF0ZS5jb25maWcuc2V0dGluZ3MuZGVidWdfbW9kZSl7XG5cdFx0XHRlcnIudW5zaGlmdChtc2cpO1xuXHRcdFx0Q2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKGVycix0aGlzKTtcblx0XHR9XG5cblx0XHQvL1JlbW92ZSBhdXRvIHRpbWVvdXQgdGltZXJcblx0XHRpZih0aGlzLnRpbWVvdXRfaWQpe1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMudGltZW91dF9pZCk7XG5cdFx0fVxuXG5cdFx0Ly9TZXQgc3RhdGUgdG8gcmVqZWN0ZWRcblx0XHRfcHJpdmF0ZS5zZXRfc3RhdGUodGhpcywyKTtcblxuXHRcdC8vRXhlY3V0ZSByZWplY3Rpb24gcXVldWVcblx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oXG5cdFx0XHR0aGlzXG5cdFx0XHQsdGhpcy5jYWxsYmFja3MucmVqZWN0XG5cdFx0XHQsZXJyXG5cdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG5cdFx0KTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cblx0LyoqXG5cdCogQ2hhaW4gbWV0aG9kXG5cblx0PGI+VXNhZ2U6PC9iPlxuXHRgYGBcblx0dmFyIE9yZ3kgPSByZXF1aXJlKFwib3JneVwiKSxcblx0XHRcdFx0XHRxID0gT3JneS5kZWZlcnJlZCh7XG5cdFx0XHRcdFx0XHRpZCA6IFwicTFcIlxuXHRcdFx0XHRcdH0pO1xuXG5cdC8vUmVzb2x2ZSB0aGUgZGVmZXJyZWRcblx0cS5yZXNvbHZlKFwiU29tZSB2YWx1ZS5cIik7XG5cblx0cS50aGVuKGZ1bmN0aW9uKHIpe1xuXHRcdGNvbnNvbGUubG9nKHIpOyAvL1NvbWUgdmFsdWUuXG5cdH0pXG5cblx0YGBgXG5cblx0KiBAbWVtYmVyb2Ygb3JneS9kZWZlcnJlZFxuXHQqIEBmdW5jdGlvbiBvcmd5L2RlZmVycmVkI3RoZW5cblx0KlxuXHQqIEBwYXJhbSB7ZnVuY3Rpb259IGZuIENhbGxiYWNrIGZ1bmN0aW9uXG5cdCogQHBhcmFtIHtmdW5jdGlvbn0gcmVqZWN0b3IgUmVqZWN0aW9uIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCogQHJldHVybiB7b2JqZWN0fSBkZWZlcnJlZC9xdWV1ZVxuXHQqL1xuXHRfcHVibGljLnRoZW4gPSBmdW5jdGlvbihmbixyZWplY3Rvcil7XG5cblx0XHRzd2l0Y2godHJ1ZSl7XG5cblx0XHRcdC8vQW4gZXJyb3Igd2FzIHByZXZpb3VzbHkgdGhyb3duLCBhZGQgcmVqZWN0b3IgJiBiYWlsIG91dFxuXHRcdFx0Y2FzZSh0aGlzLnN0YXRlID09PSAyKTpcblx0XHRcdFx0aWYodHlwZW9mIHJlamVjdG9yID09PSAnZnVuY3Rpb24nKXtcblx0XHRcdFx0XHR0aGlzLmNhbGxiYWNrcy5yZWplY3QudHJhaW4ucHVzaChyZWplY3Rvcik7XG5cdFx0XHRcdH1cblx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdC8vRXhlY3V0aW9uIGNoYWluIGFscmVhZHkgZmluaXNoZWQuIEJhaWwgb3V0LlxuXHRcdFx0Y2FzZSh0aGlzLmRvbmVfZmlyZWQgPT09IDEpOlxuXHRcdFx0XHRyZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKHRoaXMuaWQrXCIgY2FuJ3QgYXR0YWNoIC50aGVuKCkgYmVjYXVzZSAuZG9uZSgpIGhhcyBhbHJlYWR5IGZpcmVkLCBhbmQgdGhhdCBtZWFucyB0aGUgZXhlY3V0aW9uIGNoYWluIGlzIGNvbXBsZXRlLlwiKTtcblxuXHRcdFx0ZGVmYXVsdDpcblxuXHRcdFx0XHQvL1B1c2ggY2FsbGJhY2sgdG8gdGhlbiBxdWV1ZVxuXHRcdFx0XHR0aGlzLmNhbGxiYWNrcy50aGVuLnRyYWluLnB1c2goZm4pO1xuXG5cdFx0XHRcdC8vUHVzaCByZWplY3QgY2FsbGJhY2sgdG8gdGhlIHJlamVjdGlvbiBxdWV1ZVxuXHRcdFx0XHRpZih0eXBlb2YgcmVqZWN0b3IgPT09ICdmdW5jdGlvbicpe1xuXHRcdFx0XHRcdHRoaXMuY2FsbGJhY2tzLnJlamVjdC50cmFpbi5wdXNoKHJlamVjdG9yKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vU2V0dGxlZCwgcnVuIHRyYWluIG5vd1xuXHRcdFx0XHRpZih0aGlzLnNldHRsZWQgPT09IDEgJiYgdGhpcy5zdGF0ZSA9PT0gMSAmJiAhdGhpcy5kb25lX2ZpcmVkKXtcblx0XHRcdFx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oXG5cdFx0XHRcdFx0XHR0aGlzXG5cdFx0XHRcdFx0XHQsdGhpcy5jYWxsYmFja3MudGhlblxuXHRcdFx0XHRcdFx0LHRoaXMuY2Fib29zZVxuXHRcdFx0XHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvL1Vuc2V0dGxlZCwgdHJhaW4gd2lsbCBiZSBydW4gd2hlbiBzZXR0bGVkXG5cdFx0XHRcdC8vZWxzZXt9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblxuXHQvKipcblx0KiBEb25lIGNhbGxiYWNrLlxuXHQqXG5cdCogQG1lbWJlcm9mIG9yZ3kvZGVmZXJyZWRcblx0KiBAZnVuY3Rpb24gb3JneS9kZWZlcnJlZCNkb25lXG5cdCpcblx0KiBAcGFyYW0ge2Z1bmN0aW9ufSBmbiBDYWxsYmFjayBmdW5jdGlvblxuXHQqIEBwYXJhbSB7ZnVuY3Rpb259IHJlamVjdG9yIFJlamVjdGlvbiBjYWxsYmFjayBmdW5jdGlvblxuXHQqIEByZXR1cm5zIHtvYmplY3R9IGRlZmVycmVkL3F1ZXVlXG5cdCovXG5cdF9wdWJsaWMuZG9uZSA9IGZ1bmN0aW9uKGZuLHJlamVjdG9yKXtcblxuXHRcdGlmKHRoaXMuY2FsbGJhY2tzLmRvbmUudHJhaW4ubGVuZ3RoID09PSAwXG5cdFx0XHQmJiB0aGlzLmRvbmVfZmlyZWQgPT09IDApe1xuXHRcdFx0XHRpZih0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicpe1xuXG5cdFx0XHRcdFx0Ly93cmFwIGNhbGxiYWNrIHdpdGggc29tZSBvdGhlciBjb21tYW5kc1xuXHRcdFx0XHRcdHZhciBmbjIgPSBmdW5jdGlvbihyLGRlZmVycmVkLGxhc3Qpe1xuXG5cdFx0XHRcdFx0XHQvL0RvbmUgY2FuIG9ubHkgYmUgY2FsbGVkIG9uY2UsIHNvIG5vdGUgdGhhdCBpdCBoYXMgYmVlblxuXHRcdFx0XHRcdFx0ZGVmZXJyZWQuZG9uZV9maXJlZCA9IDE7XG5cblx0XHRcdFx0XHRcdGZuKHIsZGVmZXJyZWQsbGFzdCk7XG5cdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdHRoaXMuY2FsbGJhY2tzLmRvbmUudHJhaW4ucHVzaChmbjIpO1xuXG5cdFx0XHRcdFx0Ly9QdXNoIHJlamVjdCBjYWxsYmFjayB0byB0aGUgcmVqZWN0aW9uIHF1ZXVlIG9uQ29tcGxldGVcblx0XHRcdFx0XHRpZih0eXBlb2YgcmVqZWN0b3IgPT09ICdmdW5jdGlvbicpe1xuXHRcdFx0XHRcdFx0dGhpcy5jYWxsYmFja3MucmVqZWN0Lmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChyZWplY3Rvcik7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly9TZXR0bGVkLCBydW4gdHJhaW4gbm93XG5cdFx0XHRcdFx0aWYodGhpcy5zZXR0bGVkID09PSAxKXtcblx0XHRcdFx0XHRcdGlmKHRoaXMuc3RhdGUgPT09IDEpe1xuXHRcdFx0XHRcdFx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oXG5cdFx0XHRcdFx0XHRcdFx0dGhpc1xuXHRcdFx0XHRcdFx0XHRcdCx0aGlzLmNhbGxiYWNrcy5kb25lXG5cdFx0XHRcdFx0XHRcdFx0LHRoaXMuY2Fib29zZVxuXHRcdFx0XHRcdFx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0XHRcdF9wcml2YXRlLnJ1bl90cmFpbihcblx0XHRcdFx0XHRcdFx0XHR0aGlzXG5cdFx0XHRcdFx0XHRcdFx0LHRoaXMuY2FsbGJhY2tzLnJlamVjdFxuXHRcdFx0XHRcdFx0XHRcdCx0aGlzLmNhYm9vc2Vcblx0XHRcdFx0XHRcdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vVW5zZXR0bGVkLCB0cmFpbiB3aWxsIGJlIHJ1biB3aGVuIHNldHRsZWRcblx0XHRcdFx0XHQvL2Vsc2V7fVxuXHRcdFx0fVxuXHRcdFx0ZWxzZXtcblx0XHRcdFx0cmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcImRvbmUoKSBtdXN0IGJlIHBhc3NlZCBhIGZ1bmN0aW9uLlwiKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0ZWxzZXtcblx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoXCJkb25lKCkgY2FuIG9ubHkgYmUgY2FsbGVkIG9uY2UuXCIpO1xuXHRcdH1cblx0XHRcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBBbGxvd3MgYSBwcmVwcm9jZXNzb3IgdG8gc2V0IGJhY2tyYWNlIGRhdGEgb24gYW4gT3JneSBvYmplY3QuXG5cdCAqIEBwYXJhbSAge3N0cmluZ30gc3RyIGZpbGVuYW1lOmxpbmUgbnVtYmVyXG5cdCAqIEByZXR1cm4ge29iamVjdH0gZGVmZXJyZWQvcXVldWVcblx0ICovXG5cdF9wdWJsaWMuX2J0cmMgPSBmdW5jdGlvbihzdHIpe1xuXHRcdHRoaXMuYmFja3RyYWNlID0gc3RyO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cblx0LyoqXG5cdCogQ3JlYXRlcyBhIG5ldyBkZWZlcnJlZCBvYmplY3Qgb3IgaWYgb25lIGV4aXN0cyBieSB0aGUgc2FtZSBpZCxcblx0KiByZXR1cm5zIGl0LlxuXG5cdDxiPlVzYWdlOjwvYj5cblx0YGBgXG5cdHZhciBPcmd5ID0gcmVxdWlyZShcIm9yZ3lcIiksXG5cdHEgPSBPcmd5LmRlZmVycmVkKHtcblx0aWQgOiBcInExXCJcblx0fSk7XG5cdGBgYFxuXG5cdCogQG1lbWJlcm9mIG9yZ3lcblx0KiBAZnVuY3Rpb24gZGVmZXJyZWRcblx0KlxuXHQqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIExpc3Qgb2Ygb3B0aW9uczpcblx0KlxuXHQqICAtIDxiPmlkPC9iPiB7c3RyaW5nfSBVbmlxdWUgaWQgb2YgdGhlIG9iamVjdC5cblx0Klx0XHQtIENhbiBiZSB1c2VkIHdpdGggT3JneS5nZXQoaWQpLlxuXHQqXHRcdC0gT3B0aW9uYWwuXG5cdCpcblx0KlxuXHQqICAtIDxiPnRpbWVvdXQ8L2I+IHtudW1iZXJ9IFRpbWUgaW4gbXMgYWZ0ZXIgd2hpY2ggcmVqZWN0IGlzIGNhbGxlZCBpZiBub3QgeWV0IHJlc29sdmVkLlxuXHQtIERlZmF1bHRzIHRvIE9yZ3kuY29uZmlnKCkudGltZW91dC5cblx0LSBEZWxheXMgaW4gb2JqZWN0LnRoZW4oKSBhbmQgb2JqZWN0LmRvbmUoKSB3b24ndCBub3QgdHJpZ2dlciB0aGlzLCBiZWNhdXNlIHRob3NlIG1ldGhvZHMgcnVuIGFmdGVyIHJlc29sdmUuXG5cdCpcblx0KiBAcmV0dXJucyB7b2JqZWN0fSB7QGxpbmsgb3JneS9kZWZlcnJlZH1cblx0Ki9cblx0Q2xzLnB1YmxpYy5kZWZlcnJlZCA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuXG5cdFx0dmFyIF9vO1xuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG5cdFx0aWYob3B0aW9ucy5pZCAmJiBDbHMucHJpdmF0ZS5jb25maWcubGlzdFtvcHRpb25zLmlkXSl7XG5cdFx0XHRfbyA9IENscy5wcml2YXRlLmNvbmZpZy5saXN0W29wdGlvbnMuaWRdO1xuXHRcdH1cblx0XHRlbHNle1xuXG5cdFx0XHQvL0NyZWF0ZSBhIG5ldyBkZWZlcnJlZCBvYmplY3Rcblx0XHRcdF9vID0gQ2xzLnByaXZhdGUuY29uZmlnLm5haXZlX2Nsb25lcihbX3B1YmxpY10sW29wdGlvbnNdKTtcblxuXHRcdFx0Ly9BQ1RJVkFURSBERUZFUlJFRFxuXHRcdFx0X28gPSBfcHJpdmF0ZS5hY3RpdmF0ZShfbyk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIF9vO1xuXHR9O1xuXG5cdF9wcml2YXRlLnB1YmxpYyA9IF9wdWJsaWM7XG5cblx0Ly9TYXZlIGZvciByZS11c2Vcblx0Q2xzLnByaXZhdGUuZGVmZXJyZWQgPSBfcHJpdmF0ZTsgXG5cblx0cmV0dXJuIENscztcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oQ2xzKXtcblxuXHR2YXIgX3B1YmxpYyA9IHt9LFxuXHRcdFx0X3ByaXZhdGUgPSB7fTtcblxuXHRfcHVibGljLmJyb3dzZXIgPSB7fTtcblx0X3B1YmxpYy5uYXRpdmUgPSB7fTtcblx0X3ByaXZhdGUubmF0aXZlID0ge307XG5cblx0Ly9Ccm93c2VyIGxvYWRcblxuXHRfcHVibGljLmJyb3dzZXIuY3NzID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cblx0XHR2YXIgaGVhZCA9XHRkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImhlYWRcIilbMF0gfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuXHRcdGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlua1wiKTtcblxuXHRcdGVsZW0uc2V0QXR0cmlidXRlKFwiaHJlZlwiLHBhdGgpO1xuXHRcdGVsZW0uc2V0QXR0cmlidXRlKFwidHlwZVwiLFwidGV4dC9jc3NcIik7XG5cdFx0ZWxlbS5zZXRBdHRyaWJ1dGUoXCJyZWxcIixcInN0eWxlc2hlZXRcIik7XG5cblx0XHRpZihlbGVtLm9ubG9hZCl7XG5cdFx0XHQoZnVuY3Rpb24oZWxlbSl7XG5cdFx0XHRcdFx0ZWxlbS5vbmxvYWQgPSBlbGVtLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXHRcdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShlbGVtKTtcblx0XHRcdFx0IH07XG5cblx0XHRcdFx0IGVsZW0ub25lcnJvciA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXHRcdFx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KFwiRmFpbGVkIHRvIGxvYWQgcGF0aDogXCIgKyBwYXRoKTtcblx0XHRcdFx0IH07XG5cblx0XHRcdH0oZWxlbSxwYXRoLGRlZmVycmVkKSk7XG5cblx0XHRcdGhlYWQuYXBwZW5kQ2hpbGQoZWxlbSk7XG5cdFx0fVxuXHRcdGVsc2V7XG5cdFx0XHQvL0FERCBlbGVtIEJVVCBNQUtFIFhIUiBSRVFVRVNUIFRPIENIRUNLIEZJTEUgUkVDRUlWRURcblx0XHRcdGhlYWQuYXBwZW5kQ2hpbGQoZWxlbSk7XG5cdFx0XHRjb25zb2xlLndhcm4oXCJObyBvbmxvYWQgYXZhaWxhYmxlIGZvciBsaW5rIHRhZywgYXV0b3Jlc29sdmluZy5cIik7XG5cdFx0XHRkZWZlcnJlZC5yZXNvbHZlKGVsZW0pO1xuXHRcdH1cblx0fTtcblxuXHRfcHVibGljLmJyb3dzZXIuc2NyaXB0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cblx0XHR2YXIgZWxlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIik7XG5cdFx0ZWxlbS50eXBlID0gJ3RleHQvamF2YXNjcmlwdCc7XG5cdFx0ZWxlbS5zZXRBdHRyaWJ1dGUoXCJzcmNcIixwYXRoKTtcblxuXHRcdChmdW5jdGlvbihlbGVtLHBhdGgsZGVmZXJyZWQpe1xuXHRcdFx0XHRlbGVtLm9ubG9hZCA9IGVsZW0ub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKXtcblx0XHRcdFx0XHQvL0F1dG9yZXNvbHZlIGJ5IGRlZmF1bHRcblx0XHRcdFx0XHRpZih0eXBlb2YgZGVmZXJyZWQuYXV0b3Jlc29sdmUgIT09ICdib29sZWFuJ1xuXHRcdFx0XHRcdHx8IGRlZmVycmVkLmF1dG9yZXNvbHZlID09PSB0cnVlKXtcblx0XHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoKHR5cGVvZiBlbGVtLnZhbHVlICE9PSAndW5kZWZpbmVkJykgPyBlbGVtLnZhbHVlIDogZWxlbSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXHRcdFx0XHRlbGVtLm9uZXJyb3IgPSBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdGRlZmVycmVkLnJlamVjdChcIkVycm9yIGxvYWRpbmc6IFwiICsgcGF0aCk7XG5cdFx0XHRcdH07XG5cdFx0fShlbGVtLHBhdGgsZGVmZXJyZWQpKTtcblxuXHRcdHRoaXMuaGVhZC5hcHBlbmRDaGlsZChlbGVtKTtcblx0fTtcblxuXHRfcHVibGljLmJyb3dzZXIuaHRtbCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQsZGVwKXtcblx0XHR0aGlzLmRlZmF1bHQocGF0aCxkZWZlcnJlZCxkZXApO1xuXHR9O1xuXG5cdF9wdWJsaWMuYnJvd3Nlci5kZWZhdWx0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCxvcHRpb25zKXtcblx0XHR2YXIgcixcblx0XHRyZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0XHRyZXEub3BlbignR0VUJywgcGF0aCwgdHJ1ZSk7XG5cblx0XHQoZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cdFx0XHRyZXEub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmIChyZXEucmVhZHlTdGF0ZSA9PT0gNCkge1xuXHRcdFx0XHRcdGlmKHJlcS5zdGF0dXMgPT09IDIwMCl7XG5cdFx0XHRcdFx0XHRyID0gcmVxLnJlc3BvbnNlVGV4dDtcblx0XHRcdFx0XHRcdGlmKG9wdGlvbnMudHlwZSAmJiBvcHRpb25zLnR5cGUgPT09ICdqc29uJyl7XG5cdFx0XHRcdFx0XHRcdHRyeXtcblx0XHRcdFx0XHRcdFx0XHRyID0gSlNPTi5wYXJzZShyKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRjYXRjaChlKXtcblx0XHRcdFx0XHRcdFx0XHRfcHVibGljLmRlYnVnKFtcblx0XHRcdFx0XHRcdFx0XHRcdFwiQ291bGQgbm90IGRlY29kZSBKU09OXCJcblx0XHRcdFx0XHRcdFx0XHRcdCxwYXRoXG5cdFx0XHRcdFx0XHRcdFx0XHQsclxuXHRcdFx0XHRcdFx0XHRcdF0sZGVmZXJyZWQpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KFwiRXJyb3IgbG9hZGluZzogXCIgKyBwYXRoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0fShwYXRoLGRlZmVycmVkKSk7XG5cblx0XHRyZXEuc2VuZChudWxsKTtcblx0fTtcblxuXG5cblx0Ly9OYXRpdmUgbG9hZFxuXG5cdF9wdWJsaWMubmF0aXZlLmNzcyA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXHRcdF9wdWJsaWMuYnJvd3Nlci5jc3MocGF0aCxkZWZlcnJlZCk7XG5cdH07XG5cblx0X3B1YmxpYy5uYXRpdmUuc2NyaXB0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cdFx0Ly9sb2NhbCBwYWNrYWdlXG5cdFx0aWYocGF0aFswXT09PScuJyl7XG5cdFx0XHRwYXRoID0gX3ByaXZhdGUubmF0aXZlLnByZXBhcmVfcGF0aChwYXRoLGRlZmVycmVkKTtcblx0XHRcdHZhciByID0gcmVxdWlyZShwYXRoKTtcblx0XHRcdC8vQXV0b3Jlc29sdmUgYnkgZGVmYXVsdFxuXHRcdFx0aWYodHlwZW9mIGRlZmVycmVkLmF1dG9yZXNvbHZlICE9PSAnYm9vbGVhbidcblx0XHRcdHx8IGRlZmVycmVkLmF1dG9yZXNvbHZlID09PSB0cnVlKXtcblx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShyKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly9yZW1vdGUgc2NyaXB0XG5cdFx0ZWxzZXtcblx0XHRcdC8vQ2hlY2sgdGhhdCB3ZSBoYXZlIGNvbmZpZ3VyZWQgdGhlIGVudmlyb25tZW50IHRvIGFsbG93IHRoaXMsXG5cdFx0XHQvL2FzIGl0IHJlcHJlc2VudHMgYSBzZWN1cml0eSB0aHJlYXQgYW5kIHNob3VsZCBvbmx5IGJlIHVzZWQgZm9yIGRlYnVnZ2luZ1xuXHRcdFx0aWYoIUNscy5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy5kZWJ1Z19tb2RlKXtcblx0XHRcdFx0Q2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFwiU2V0IGNvbmZpZy5kZWJ1Z19tb2RlPTEgdG8gcnVuIHJlbW90ZSBzY3JpcHRzIG91dHNpZGUgb2YgZGVidWcgbW9kZS5cIik7XG5cdFx0XHR9XG5cdFx0XHRlbHNle1xuXHRcdFx0XHRfcHJpdmF0ZS5uYXRpdmUuZ2V0KHBhdGgsZGVmZXJyZWQsZnVuY3Rpb24oZGF0YSl7XG5cdFx0XHRcdFx0dmFyIFZtID0gcmVxdWlyZSgndm0nKTtcblx0XHRcdFx0XHRyID0gVm0ucnVuSW5UaGlzQ29udGV4dChkYXRhKTtcblx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHIpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0X3B1YmxpYy5uYXRpdmUuaHRtbCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXHRcdF9wdWJsaWMubmF0aXZlLmRlZmF1bHQocGF0aCxkZWZlcnJlZCk7XG5cdH07XG5cblx0X3B1YmxpYy5uYXRpdmUuZGVmYXVsdCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXHRcdChmdW5jdGlvbihkZWZlcnJlZCl7XG5cdFx0XHRfcHJpdmF0ZS5uYXRpdmUuZ2V0KHBhdGgsZGVmZXJyZWQsZnVuY3Rpb24ocil7XG5cdFx0XHRcdGlmKGRlZmVycmVkLnR5cGUgPT09ICdqc29uJyl7XG5cdFx0XHRcdFx0ciA9IEpTT04ucGFyc2Uocik7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShyKTtcblx0XHRcdH0pO1xuXHRcdH0pKGRlZmVycmVkKTtcblx0fTtcblxuXHRfcHJpdmF0ZS5uYXRpdmUuZ2V0ID0gZnVuY3Rpb24gKHBhdGgsZGVmZXJyZWQsY2FsbGJhY2spe1xuXHRcdHBhdGggPSBfcHJpdmF0ZS5uYXRpdmUucHJlcGFyZV9wYXRoKHBhdGgpO1xuXHRcdGlmKHBhdGhbMF0gPT09ICcuJyl7XG5cdFx0XHQvL2ZpbGUgc3lzdGVtXG5cdFx0XHR2YXIgRnMgPSByZXF1aXJlKCdmcycpO1xuXHRcdFx0RnMucmVhZEZpbGUocGF0aCwgXCJ1dGYtOFwiLCBmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG5cdFx0XHRcdGlmIChlcnIpe1xuXHRcdFx0XHRcdHRocm93IGVycjtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdGNhbGxiYWNrKGRhdGEpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0ZWxzZXtcblx0XHRcdC8vaHR0cFxuXHRcdFx0dmFyIHJlcXVlc3QgPSByZXF1aXJlKCdyZXF1ZXN0Jyk7XG5cdFx0XHRyZXF1ZXN0KHBhdGgsZnVuY3Rpb24oZXJyb3IscmVzcG9uc2UsYm9keSl7XG5cdFx0XHRcdGlmICghZXJyb3IgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9PT0gMjAwKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2soYm9keSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHR0aHJvdyBlcnJvcjtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9O1xuXG5cdF9wcml2YXRlLm5hdGl2ZS5wcmVwYXJlX3BhdGggPSBmdW5jdGlvbihwKXtcblx0XHRwID0gKHBbMF0gIT09ICcvJyAmJiBwWzBdICE9PSAnLicpXG5cdFx0PyAoKHBbMF0uaW5kZXhPZihcImh0dHBcIikhPT0wKSA/ICcuLycgKyBwIDogcCkgOiBwO1xuXHRcdHJldHVybiBwO1xuXHR9O1xuXG5cdENscy5wdWJsaWMuZmlsZV9sb2FkZXIgPSBfcHVibGljO1xuXG5cdENscy5wcml2YXRlLmZpbGVfbG9hZGVyID0gX3ByaXZhdGU7XG5cblx0cmV0dXJuIENscztcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oQ2xzKXtcblxuXG5cdC8qKlxuXHQgKiBAbmFtZXNwYWNlIG9yZ3kvcXVldWVcblx0ICogQGJvcnJvd3Mgb3JneS9kZWZlcnJlZCN0aGVuIGFzICN0aGVuXG5cdCAqIEBib3Jyb3dzIG9yZ3kvZGVmZXJyZWQjZG9uZSBhcyAjZG9uZVxuXHQgKiBAYm9ycm93cyBvcmd5L2RlZmVycmVkI3JlamVjdCBhcyAjcmVqZWN0XG5cdCAqIEBib3Jyb3dzIG9yZ3kvZGVmZXJyZWQjcmVzb2x2ZSBhcyAjcmVzb2x2ZVxuXHQgKlxuXHQqL1xuXG5cdHZhciBfcHJpdmF0ZSA9IHt9O1xuXG5cdC8qKlxuXHQgKiBBY3RpdmF0ZXMgYSBxdWV1ZSBvYmplY3QuXG5cdCAqXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBvXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG5cdCAqIEBwYXJhbSB7YXJyYXl9IGRlcHNcblx0ICogQHJldHVybnMge29iamVjdH0gcXVldWVcblx0ICovXG5cdF9wcml2YXRlLmFjdGl2YXRlID0gZnVuY3Rpb24obyxvcHRpb25zLGRlcHMpe1xuXG5cdFx0XHQvL0FDVElWQVRFIEFTIEEgREVGRVJSRURcblx0XHRcdC8vdmFyIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHRoaXMpO1xuXHRcdFx0byA9IENscy5wcml2YXRlLmRlZmVycmVkLmFjdGl2YXRlKG8pO1xuXG5cdFx0XHQvL0B0b2RvIHJldGhpbmsgdGhpc1xuXHRcdFx0Ly9UaGlzIHRpbWVvdXQgZ2l2ZXMgZGVmaW5lZCBwcm9taXNlcyB0aGF0IGFyZSBkZWZpbmVkXG5cdFx0XHQvL2Z1cnRoZXIgZG93biB0aGUgc2FtZSBzY3JpcHQgYSBjaGFuY2UgdG8gZGVmaW5lIHRoZW1zZWx2ZXNcblx0XHRcdC8vYW5kIGluIGNhc2UgdGhpcyBxdWV1ZSBpcyBhYm91dCB0byByZXF1ZXN0IHRoZW0gZnJvbSBhXG5cdFx0XHQvL3JlbW90ZSBzb3VyY2UgaGVyZS5cblx0XHRcdC8vVGhpcyBpcyBpbXBvcnRhbnQgaW4gdGhlIGNhc2Ugb2YgY29tcGlsZWQganMgZmlsZXMgdGhhdCBjb250YWluXG5cdFx0XHQvL211bHRpcGxlIG1vZHVsZXMgd2hlbiBkZXBlbmQgb24gZWFjaCBvdGhlci5cblxuXHRcdFx0Ly90ZW1wb3JhcmlseSBjaGFuZ2Ugc3RhdGUgdG8gcHJldmVudCBvdXRzaWRlIHJlc29sdXRpb25cblx0XHRcdG8uc3RhdGUgPSAtMTtcblxuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cblx0XHRcdFx0Ly9SZXN0b3JlIHN0YXRlXG5cdFx0XHRvLnN0YXRlID0gMDtcblxuXHRcdFx0XHQvL0FERCBERVBFTkRFTkNJRVMgVE8gUVVFVUVcblx0XHRcdFx0X3B1YmxpYy5hZGQuY2FsbChvLGRlcHMpO1xuXG5cdFx0XHRcdC8vU0VFIElGIENBTiBCRSBJTU1FRElBVEVMWSBSRVNPTFZFRCBCWSBDSEVDS0lORyBVUFNUUkVBTVxuXHRcdFx0XHRDbHMucHJpdmF0ZS5kZWZlcnJlZC5yZWNlaXZlX3NpZ25hbChvLG8uaWQpO1xuXG5cdFx0XHRcdC8vQVNTSUdOIFRISVMgUVVFVUUgVVBTVFJFQU0gVE8gT1RIRVIgUVVFVUVTXG5cdFx0XHRcdGlmKG8uYXNzaWduKXtcblx0XHRcdFx0XHRcdGZvcih2YXIgYSBpbiBvLmFzc2lnbil7XG5cdFx0XHRcdFx0XHRcdFx0c2VsZi5hc3NpZ24oby5hc3NpZ25bYV0sW29dLHRydWUpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LDEpO1xuXG5cdFx0XHRyZXR1cm4gbztcblx0fTtcblxuXG5cdC8qKlxuXHQqIFVwZ3JhZGVzIGEgcHJvbWlzZSBvYmplY3QgdG8gYSBxdWV1ZS5cblx0KlxuXHQqIEBwYXJhbSB7b2JqZWN0fSBvYmpcblx0KiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuXHQqIEBwYXJhbSB7YXJyYXl9IGRlcHMgXFxkZXBlbmRlbmNpZXNcblx0KiBAcmV0dXJucyB7b2JqZWN0fSBxdWV1ZSBvYmplY3Rcblx0Ki9cblx0X3ByaXZhdGUudXBncmFkZSA9IGZ1bmN0aW9uKG9iaixvcHRpb25zLGRlcHMpe1xuXG5cdFx0XHRpZihvYmouc2V0dGxlZCAhPT0gMCB8fCAob2JqLm1vZGVsICE9PSAncHJvbWlzZScgJiYgb2JqLm1vZGVsICE9PSAnZGVmZXJyZWQnKSl7XG5cdFx0XHRcdFx0cmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZygnQ2FuIG9ubHkgdXBncmFkZSB1bnNldHRsZWQgcHJvbWlzZSBvciBkZWZlcnJlZCBpbnRvIGEgcXVldWUuJyk7XG5cdFx0XHR9XG5cblx0XHQgLy9HRVQgQSBORVcgUVVFVUUgT0JKRUNUIEFORCBNRVJHRSBJTlxuXHRcdFx0dmFyIF9vID0gQ2xzLnByaXZhdGUuY29uZmlnLm5haXZlX2Nsb25lcihbX3B1YmxpY10sW29wdGlvbnNdKTtcblxuXHRcdFx0Zm9yKHZhciBpIGluIF9vKXtcblx0XHRcdFx0IG9ialtpXSA9IF9vW2ldO1xuXHRcdFx0fVxuXG5cdFx0XHQvL2RlbGV0ZSBfbztcblxuXHRcdFx0Ly9DUkVBVEUgTkVXIElOU1RBTkNFIE9GIFFVRVVFXG5cdFx0XHRvYmogPSB0aGlzLmFjdGl2YXRlKG9iaixvcHRpb25zLGRlcHMpO1xuXG5cdFx0XHQvL1JFVFVSTiBRVUVVRSBPQkpFQ1Rcblx0XHRcdHJldHVybiBvYmo7XG5cdH07XG5cblxuXG5cblx0dmFyIF9wdWJsaWMgPSB7fTtcblx0XG5cdF9wdWJsaWMubW9kZWwgPSAncXVldWUnO1xuXG5cdC8vU0VUIFRSVUUgQUZURVIgUkVTT0xWRVIgRklSRURcblx0X3B1YmxpYy5yZXNvbHZlcl9maXJlZCA9IDA7XG5cblx0Ly9QUkVWRU5UUyBBIFFVRVVFIEZST00gUkVTT0xWSU5HIEVWRU4gSUYgQUxMIERFUEVOREVOQ0lFUyBNRVRcblx0Ly9QVVJQT1NFOiBQUkVWRU5UUyBRVUVVRVMgQ1JFQVRFRCBCWSBBU1NJR05NRU5UIEZST00gUkVTT0xWSU5HXG5cdC8vQkVGT1JFIFRIRVkgQVJFIEZPUk1BTExZIElOU1RBTlRJQVRFRFxuXHRfcHVibGljLmhhbHRfcmVzb2x1dGlvbiA9IDA7XG5cblx0Ly9VU0VEIFRPIENIRUNLIFNUQVRFLCBFTlNVUkVTIE9ORSBDT1BZXG5cdF9wdWJsaWMudXBzdHJlYW0gPSB7fTtcblxuXHQvL1VTRUQgUkVUVVJOIFZBTFVFUywgRU5TVVJFUyBPUkRFUlxuXHRfcHVibGljLmRlcGVuZGVuY2llcyA9IFtdO1xuXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXHQvL1x0UVVFVUUgSU5TVEFOQ0UgTUVUSE9EU1xuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXHQvKipcblx0KiBBZGQgbGlzdCBvZiBkZXBlbmRlbmNpZXMgdG8gYSBxdWV1ZSdzIHVwc3RyZWFtIGFycmF5LlxuXHQqXG5cdCogVGhlIHF1ZXVlIHdpbGwgcmVzb2x2ZSBvbmNlIGFsbCB0aGUgcHJvbWlzZXMgaW4gaXRzXG5cdCogdXBzdHJlYW0gYXJyYXkgYXJlIHJlc29sdmVkLlxuXHQqXG5cdCogV2hlbiBfcHVibGljLkNscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyA9PSAxLCBtZXRob2Qgd2lsbCB0ZXN0IGVhY2hcblx0KiBkZXBlbmRlbmN5IGlzIG5vdCBwcmV2aW91c2x5IHNjaGVkdWxlZCB0byByZXNvbHZlXG5cdCogZG93bnN0cmVhbSBmcm9tIHRoZSB0YXJnZXQsIGluIHdoaWNoXG5cdCogY2FzZSBpdCB3b3VsZCBuZXZlciByZXNvbHZlIGJlY2F1c2UgaXRzIHVwc3RyZWFtIGRlcGVuZHMgb24gaXQuXG5cdCpcblx0KiBAcGFyYW0ge2FycmF5fSBhcnJcdC9hcnJheSBvZiBkZXBlbmRlbmNpZXMgdG8gYWRkXG5cdCogQHJldHVybnMge2FycmF5fSB1cHN0cmVhbVxuXHQqL1xuXHRfcHVibGljLmFkZCA9IGZ1bmN0aW9uKGFycil7XG5cblx0XHR0cnl7XG5cdFx0XHRcdGlmKGFyci5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy51cHN0cmVhbTtcblx0XHRcdFx0fVxuXHRcdH1cblx0XHRjYXRjaChlcnIpe1xuXHRcdFx0XHRDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoZXJyKTtcblx0XHR9XG5cblx0XHQvL0lGIE5PVCBQRU5ESU5HLCBETyBOT1QgQUxMT1cgVE8gQUREXG5cdFx0aWYodGhpcy5zdGF0ZSAhPT0gMCl7XG5cdFx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoW1xuXHRcdFx0XHRcdFwiQ2Fubm90IGFkZCBkZXBlbmRlbmN5IGxpc3QgdG8gcXVldWUgaWQ6J1wiK3RoaXMuaWRcblx0XHRcdFx0XHQrXCInLiBRdWV1ZSBzZXR0bGVkL2luIHRoZSBwcm9jZXNzIG9mIGJlaW5nIHNldHRsZWQuXCJcblx0XHRcdFx0XSxhcnIsdGhpcyk7XG5cdFx0fVxuXG5cdFx0Zm9yKHZhciBhIGluIGFycil7XG5cblx0XHRcdFx0c3dpdGNoKHRydWUpe1xuXG5cdFx0XHRcdFx0XHQvL0NIRUNLIElGIEVYSVNUU1xuXHRcdFx0XHRcdFx0Y2FzZSh0eXBlb2YgQ2xzLnByaXZhdGUuY29uZmlnLmxpc3RbYXJyW2FdLmlkXSA9PT0gJ29iamVjdCcpOlxuXHRcdFx0XHRcdFx0XHRcdGFyclthXSA9IENscy5wcml2YXRlLmNvbmZpZy5saXN0W2FyclthXS5pZF07XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdC8vSUYgTk9ULCBBVFRFTVBUIFRPIENPTlZFUlQgSVQgVE8gQU4gT1JHWSBQUk9NSVNFXG5cdFx0XHRcdFx0XHRjYXNlKHR5cGVvZiBhcnJbYV0gPT09ICdvYmplY3QnICYmICghYXJyW2FdLmlzX29yZ3kpKTpcblx0XHRcdFx0XHRcdFx0XHRhcnJbYV0gPSBDbHMucHJpdmF0ZS5kZWZlcnJlZC5jb252ZXJ0X3RvX3Byb21pc2UoYXJyW2FdLHtcblx0XHRcdFx0XHRcdFx0XHRcdHBhcmVudCA6IHRoaXNcblx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0Ly9SRUYgSVMgQSBQUk9NSVNFLlxuXHRcdFx0XHRcdFx0Y2FzZSh0eXBlb2YgYXJyW2FdLnRoZW4gPT09ICdmdW5jdGlvbicpOlxuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0XHRcdENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhbXG5cdFx0XHRcdFx0XHRcdFx0XHRcIk9iamVjdCBjb3VsZCBub3QgYmUgY29udmVydGVkIHRvIHByb21pc2UuXCIsXG5cdFx0XHRcdFx0XHRcdFx0XHRhcnJbYV1cblx0XHRcdFx0XHRcdFx0XHRdKTtcblx0XHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vbXVzdCBjaGVjayB0aGUgdGFyZ2V0IHRvIHNlZSBpZiB0aGUgZGVwZW5kZW5jeSBleGlzdHMgaW4gaXRzIGRvd25zdHJlYW1cblx0XHRcdFx0Zm9yKHZhciBiIGluIHRoaXMuZG93bnN0cmVhbSl7XG5cdFx0XHRcdFx0XHRpZihiID09PSBhcnJbYV0uaWQpe1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoW1xuXHRcdFx0XHRcdFx0XHRcdFx0XCJFcnJvciBhZGRpbmcgdXBzdHJlYW0gZGVwZW5kZW5jeSAnXCJcblx0XHRcdFx0XHRcdFx0XHRcdCthcnJbYV0uaWQrXCInIHRvIHF1ZXVlXCIrXCIgJ1wiXG5cdFx0XHRcdFx0XHRcdFx0XHQrdGhpcy5pZCtcIicuXFxuIFByb21pc2Ugb2JqZWN0IGZvciAnXCJcblx0XHRcdFx0XHRcdFx0XHRcdCthcnJbYV0uaWQrXCInIGlzIHNjaGVkdWxlZCB0byByZXNvbHZlIGRvd25zdHJlYW0gZnJvbSBxdWV1ZSAnXCJcblx0XHRcdFx0XHRcdFx0XHRcdCt0aGlzLmlkK1wiJyBzbyBpdCBjYW4ndCBiZSBhZGRlZCB1cHN0cmVhbS5cIlxuXHRcdFx0XHRcdFx0XHRcdF1cblx0XHRcdFx0XHRcdFx0XHQsdGhpcyk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvL0FERCBUTyBVUFNUUkVBTSwgRE9XTlNUUkVBTSwgREVQRU5ERU5DSUVTXG5cdFx0XHRcdHRoaXMudXBzdHJlYW1bYXJyW2FdLmlkXSA9IGFyclthXTtcblx0XHRcdFx0YXJyW2FdLmRvd25zdHJlYW1bdGhpcy5pZF0gPSB0aGlzO1xuXHRcdFx0XHR0aGlzLmRlcGVuZGVuY2llcy5wdXNoKGFyclthXSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMudXBzdHJlYW07XG5cdH07XG5cblx0LyoqXG5cdCogUmVtb3ZlIGxpc3QgZnJvbSBhIHF1ZXVlLlxuXHQqXG5cdCogQHBhcmFtIHthcnJheX0gYXJyXG5cdCogQHJldHVybnMge2FycmF5fSBhcnJheSBvZiBsaXN0IHRoZSBxdWV1ZSBpcyB1cHN0cmVhbVxuXHQqL1xuXHRfcHVibGljLnJlbW92ZSA9IGZ1bmN0aW9uKGFycil7XG5cblx0XHQvL0lGIE5PVCBQRU5ESU5HLCBETyBOT1QgQUxMT1cgUkVNT1ZBTFxuXHRcdGlmKHRoaXMuc3RhdGUgIT09IDApe1xuXHRcdFx0XHRyZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFwiQ2Fubm90IHJlbW92ZSBsaXN0IGZyb20gcXVldWUgaWQ6J1wiK3RoaXMuaWQrXCInLiBRdWV1ZSBzZXR0bGVkL2luIHRoZSBwcm9jZXNzIG9mIGJlaW5nIHNldHRsZWQuXCIpO1xuXHRcdH1cblxuXHRcdGZvcih2YXIgYSBpbiBhcnIpe1xuXHRcdFx0aWYodGhpcy51cHN0cmVhbVthcnJbYV0uaWRdKXtcblx0XHRcdFx0XHRkZWxldGUgdGhpcy51cHN0cmVhbVthcnJbYV0uaWRdO1xuXHRcdFx0XHRcdGRlbGV0ZSBhcnJbYV0uZG93bnN0cmVhbVt0aGlzLmlkXTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCogUmVzZXRzIGFuIGV4aXN0aW5nLHNldHRsZWQgcXVldWUgYmFjayB0byBPcmd5aW5nIHN0YXRlLlxuXHQqIENsZWFycyBvdXQgdGhlIGRvd25zdHJlYW0uXG5cdCogRmFpbHMgaWYgbm90IHNldHRsZWQuXG5cdCogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcblx0KiBAcmV0dXJucyB7Q2xzLnByaXZhdGUuZGVmZXJyZWQudHBsfEJvb2xlYW59XG5cdCovXG5cdF9wdWJsaWMucmVzZXQgPSBmdW5jdGlvbihvcHRpb25zKXtcblxuXHRcdGlmKHRoaXMuc2V0dGxlZCAhPT0gMSB8fCB0aGlzLnN0YXRlICE9PSAxKXtcblx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoXCJDYW4gb25seSByZXNldCBhIHF1ZXVlIHNldHRsZWQgd2l0aG91dCBlcnJvcnMuXCIpO1xuXHRcdH1cblxuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG5cdFx0dGhpcy5zZXR0bGVkID0gMDtcblx0XHR0aGlzLnN0YXRlID0gMDtcblx0XHR0aGlzLnJlc29sdmVyX2ZpcmVkID0gMDtcblx0XHR0aGlzLmRvbmVfZmlyZWQgPSAwO1xuXG5cdFx0Ly9SRU1PVkUgQVVUTyBUSU1FT1VUIFRJTUVSXG5cdFx0aWYodGhpcy50aW1lb3V0X2lkKXtcblx0XHRcdGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRfaWQpO1xuXHRcdH1cblxuXHRcdC8vQ0xFQVIgT1VUIFRIRSBET1dOU1RSRUFNXG5cdFx0dGhpcy5kb3duc3RyZWFtID0ge307XG5cdFx0dGhpcy5kZXBlbmRlbmNpZXMgPSBbXTtcblxuXHRcdC8vU0VUIE5FVyBBVVRPIFRJTUVPVVRcblx0XHRDbHMucHJpdmF0ZS5kZWZlcnJlZC5hdXRvX3RpbWVvdXQuY2FsbCh0aGlzLG9wdGlvbnMudGltZW91dCk7XG5cblx0XHQvL1BPSU5UTEVTUyAtIFdJTEwgSlVTVCBJTU1FRElBVEVMWSBSRVNPTFZFIFNFTEZcblx0XHQvL3RoaXMuY2hlY2tfc2VsZigpXG5cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXG5cdC8qKlxuXHQqIENhdWFlcyBhIHF1ZXVlIHRvIGxvb2sgb3ZlciBpdHMgZGVwZW5kZW5jaWVzIGFuZCBzZWUgaWYgaXRcblx0KiBjYW4gYmUgcmVzb2x2ZWQuXG5cdCpcblx0KiBUaGlzIGlzIGRvbmUgYXV0b21hdGljYWxseSBieSBlYWNoIGRlcGVuZGVuY3kgdGhhdCBsb2Fkcyxcblx0KiBzbyBpcyBub3QgbmVlZGVkIHVubGVzczpcblx0KlxuXHQqIC1kZWJ1Z2dpbmdcblx0KlxuXHQqIC10aGUgcXVldWUgaGFzIGJlZW4gcmVzZXQgYW5kIG5vIG5ld1xuXHQqIGRlcGVuZGVuY2llcyB3ZXJlIHNpbmNlIGFkZGVkLlxuXHQqXG5cdCogQHJldHVybnMge2ludH0gU3RhdGUgb2YgdGhlIHF1ZXVlLlxuXHQqL1xuXHRfcHVibGljLmNoZWNrX3NlbGYgPSBmdW5jdGlvbigpe1xuXHRcdENscy5wcml2YXRlLmRlZmVycmVkLnJlY2VpdmVfc2lnbmFsKHRoaXMsdGhpcy5pZCk7XG5cdFx0cmV0dXJuIHRoaXMuc3RhdGU7XG5cdH07XG5cblxuXHQvKipcblx0ICogQ3JlYXRlcyBhIG5ldyBxdWV1ZSBvYmplY3QuXG5cdCAqIElmIG5vIDxiPnJlc29sdmVyPC9iPiBvcHRpb24gaXMgc2V0LCByZXNvbHZlZCB3aGVuIGFsbCBkZXBlbmRlbmNpZXMgYXJlIHJlc29sdmVkLiBFbHNlLCByZXNvbHZlZCB3aGVuIHRoZSBkZWZlcnJlZCBwYXJhbSBwYXNzZWQgdG8gdGhlIHJlc29sdmVyIG9wdGlvblxuXHQgKiBpcyByZXNvbHZlZC5cblxuXHQgKiBAbWVtYmVyb2Ygb3JneVxuXHQgKiBAZnVuY3Rpb24gcXVldWVcblx0ICpcblx0ICogQHBhcmFtIHthcnJheX0gZGVwcyBBcnJheSBvZiBkZXBlbmRlbmNpZXMgdGhhdCBtdXN0IGJlIHJlc29sdmVkIGJlZm9yZSA8Yj5yZXNvbHZlcjwvYj4gb3B0aW9uIGlzIGNhbGxlZC5cblx0ICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcdExpc3Qgb2Ygb3B0aW9uczpcblxuXHQtIDxiPmlkPC9iPiB7c3RyaW5nfSBVbmlxdWUgaWQgb2YgdGhlIG9iamVjdC5cblx0XHQtIENhbiBiZSB1c2VkIHdpdGggT3JneS5nZXQoaWQpLlxuXHRcdC0gT3B0aW9uYWwuXG5cblxuXHQtIDxiPnRpbWVvdXQ8L2I+IHtudW1iZXJ9IFRpbWUgaW4gbXMgYWZ0ZXIgd2hpY2ggcmVqZWN0IGlzIGNhbGxlZC5cblx0XHQtIERlZmF1bHRzIHRvIE9yZ3kuY29uZmlnKCkudGltZW91dCBbNTAwMF0uXG5cdFx0LSBOb3RlIHRoZSB0aW1lb3V0IGlzIG9ubHkgYWZmZWN0ZWQgYnkgZGVwZW5kZW5jaWVzIGFuZC9vciB0aGUgcmVzb2x2ZXIgY2FsbGJhY2suXG5cdFx0LSBUaGVuLGRvbmUgZGVsYXlzIHdpbGwgbm90IGZsYWcgYSB0aW1lb3V0IGJlY2F1c2UgdGhleSBhcmUgY2FsbGVkIGFmdGVyIHRoZSBpbnN0YW5jZSBpcyBjb25zaWRlcmVkIHJlc29sdmVkLlxuXG5cblx0LSA8Yj5yZXNvbHZlcjwvYj4ge2Z1bmN0aW9uKDxpPnJlc3VsdDwvaT4sPGk+ZGVmZXJyZWQ8L2k+KX0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gZXhlY3V0ZSBhZnRlciBhbGwgZGVwZW5kZW5jaWVzIGhhdmUgcmVzb2x2ZWQuXG5cdFx0LSA8aT5yZXN1bHQ8L2k+IGlzIGFuIGFycmF5IG9mIHRoZSBxdWV1ZSdzIHJlc29sdmVkIGRlcGVuZGVuY3kgdmFsdWVzLlxuXHRcdC0gPGk+ZGVmZXJyZWQ8L2k+IGlzIHRoZSBxdWV1ZSBvYmplY3QuXG5cdFx0LSBUaGUgcXVldWUgd2lsbCBvbmx5IHJlc29sdmUgd2hlbiA8aT5kZWZlcnJlZDwvaT4ucmVzb2x2ZSgpIGlzIGNhbGxlZC4gSWYgbm90LCBpdCB3aWxsIHRpbWVvdXQgdG8gb3B0aW9ucy50aW1lb3V0IHx8IE9yZ3kuY29uZmlnKCkudGltZW91dC5cblxuXHRcdCogQHJldHVybnMge29iamVjdH0ge0BsaW5rIG9yZ3kvcXVldWV9XG5cdCAqXG5cdCAqL1xuXHRDbHMucHVibGljLnF1ZXVlID0gZnVuY3Rpb24oZGVwcyxvcHRpb25zKXtcblxuXHRcdHZhciBfbztcblx0XHRpZighKGRlcHMgaW5zdGFuY2VvZiBBcnJheSkpe1xuXHRcdFx0cmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcIlF1ZXVlIGRlcGVuZGVuY2llcyBtdXN0IGJlIGFuIGFycmF5LlwiKTtcblx0XHR9XG5cblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXHRcdC8vRE9FUyBOT1QgQUxSRUFEWSBFWElTVFxuXHRcdGlmKCFDbHMucHJpdmF0ZS5jb25maWcubGlzdFtvcHRpb25zLmlkXSl7XG5cblx0XHRcdC8vUGFzcyBhcnJheSBvZiBwcm90b3R5cGVzIHRvIHF1ZXVlIGZhY3Rvcnlcblx0XHRcdF9vID0gQ2xzLnByaXZhdGUuY29uZmlnLm5haXZlX2Nsb25lcihbQ2xzLnByaXZhdGUuZGVmZXJyZWQucHVibGljLF9wdWJsaWNdLFtvcHRpb25zXSk7XG5cblx0XHRcdC8vQWN0aXZhdGUgcXVldWVcblx0XHRcdF9vID0gX3ByaXZhdGUuYWN0aXZhdGUoX28sb3B0aW9ucyxkZXBzKTtcblxuXHRcdH1cblx0XHQvL0FMUkVBRFkgRVhJU1RTXG5cdFx0ZWxzZSB7XG5cblx0XHRcdF9vID0gQ2xzLnByaXZhdGUuY29uZmlnLmxpc3Rbb3B0aW9ucy5pZF07XG5cblx0XHRcdGlmKF9vLm1vZGVsICE9PSAncXVldWUnKXtcblx0XHRcdC8vTUFUQ0ggRk9VTkQgQlVUIE5PVCBBIFFVRVVFLCBVUEdSQURFIFRPIE9ORVxuXG5cdFx0XHRcdG9wdGlvbnMub3ZlcndyaXRhYmxlID0gMTtcblxuXHRcdFx0XHRfbyA9IF9wcml2YXRlLnVwZ3JhZGUoX28sb3B0aW9ucyxkZXBzKTtcblx0XHRcdH1cblx0XHRcdGVsc2V7XG5cblx0XHRcdFx0Ly9PVkVSV1JJVEUgQU5ZIEVYSVNUSU5HIE9QVElPTlNcblx0XHRcdFx0b3B0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLGtleSl7XG5cdFx0XHRcdFx0X29ba2V5XSA9IHZhbHVlOyBcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0Ly9BREQgQURESVRJT05BTCBERVBFTkRFTkNJRVMgSUYgTk9UIFJFU09MVkVEXG5cdFx0XHRcdGlmKGRlcHMubGVuZ3RoID4gMCl7XG5cdFx0XHRcdFx0X3ByaXZhdGUudHBsLmFkZC5jYWxsKF9vLGRlcHMpO1xuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdFx0Ly9SRVNVTUUgUkVTT0xVVElPTiBVTkxFU1MgU1BFQ0lGSUVEIE9USEVSV0lTRVxuXHRcdFx0X28uaGFsdF9yZXNvbHV0aW9uID0gKHR5cGVvZiBvcHRpb25zLmhhbHRfcmVzb2x1dGlvbiAhPT0gJ3VuZGVmaW5lZCcpID9cblx0XHRcdG9wdGlvbnMuaGFsdF9yZXNvbHV0aW9uIDogMDtcblx0XHR9XG5cblx0XHRyZXR1cm4gX287XG5cdH07XG5cblx0Ly9zYXZlIGZvciByZS11c2Vcblx0Q2xzLnByaXZhdGUucXVldWUgPSBfcHJpdmF0ZTtcblx0XHRcblx0cmV0dXJuIENscztcbn07XG4iLCJ2YXIgQ2xzID0gT2JqZWN0LmNyZWF0ZSh7XG5cdHByaXZhdGU6e30sXG5cdHB1YmxpYzp7fVxufSk7XG5cbnJlcXVpcmUoJy4vY29uZmlnLmpzJykoQ2xzKTtcbnJlcXVpcmUoJy4vZmlsZV9sb2FkZXIuanMnKShDbHMpO1xucmVxdWlyZSgnLi9kZWZlcnJlZC5qcycpKENscyk7XG5yZXF1aXJlKCcuL3F1ZXVlLmpzJykoQ2xzKTtcbnJlcXVpcmUoJy4vY2FzdC5qcycpKENscyk7XG5cbi8qKlxuICogQG5hbWVzcGFjZSBvcmd5XG4gKi9cblxuLyoqXG4qIENyZWF0ZXMgYSBuZXcgZGVmZXJyZWQgZnJvbSBhIHZhbHVlIGFuZCBhbiBpZCBhbmQgYXV0b21hdGljYWxseVxuKiByZXNvbHZlcyBpdC5cbipcbiogQG1lbWJlcm9mIG9yZ3lcbiogQGZ1bmN0aW9uIGRlZmluZVxuKlxuKiBAcGFyYW0ge3N0cmluZ30gaWQgQSB1bmlxdWUgaWQgeW91IGdpdmUgdG8gdGhlIG9iamVjdFxuKiBAcGFyYW0ge21peGVkfVx0ZGF0YSBUaGUgdmFsdWUgdGhhdCB0aGUgb2JqZWN0IGlzIGFzc2lnbmVkXG4qIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4tIDxiPmRlcGVuZGVuY2llczwvYj4ge2FycmF5fVxuLSA8Yj5yZXNvbHZlcjwvYj4ge2Z1bmN0aW9uKDxpPmFzc2lnbmVkVmFsdWU8L2k+LDxpPmRlZmVycmVkPC9pPn1cbiogQHJldHVybnMge29iamVjdH0gcmVzb2x2ZWQgZGVmZXJyZWRcbiovXG5DbHMucHVibGljLmRlZmluZSA9IGZ1bmN0aW9uKGlkLGRhdGEsb3B0aW9ucyl7XG5cblx0XHR2YXIgZGVmO1xuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXHRcdG9wdGlvbnMuZGVwZW5kZW5jaWVzID0gb3B0aW9ucy5kZXBlbmRlbmNpZXMgfHwgbnVsbDtcblx0XHRvcHRpb25zLnJlc29sdmVyID0gb3B0aW9ucy5yZXNvbHZlciB8fCBudWxsO1xuXG5cdFx0Ly90ZXN0IGZvciBhIHZhbGlkIGlkXG5cdFx0aWYodHlwZW9mIGlkICE9PSAnc3RyaW5nJyl7XG5cdFx0XHRDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoXCJNdXN0IHNldCBpZCB3aGVuIGRlZmluaW5nIGFuIGluc3RhbmNlLlwiKTtcblx0XHR9XG5cblx0XHQvL0NoZWNrIG5vIGV4aXN0aW5nIGluc3RhbmNlIGRlZmluZWQgd2l0aCBzYW1lIGlkXG5cdFx0aWYoQ2xzLnByaXZhdGUuY29uZmlnLmxpc3RbaWRdICYmIENscy5wcml2YXRlLmNvbmZpZy5saXN0W2lkXS5zZXR0bGVkID09PSAxKXtcblx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoXCJDYW4ndCBkZWZpbmUgXCIgKyBpZCArIFwiLiBBbHJlYWR5IHJlc29sdmVkLlwiKTtcblx0XHR9XG5cblx0XHRvcHRpb25zLmlkID0gaWQ7XG5cblx0XHRpZihvcHRpb25zLmRlcGVuZGVuY2llcyAhPT0gbnVsbFxuXHRcdFx0JiYgb3B0aW9ucy5kZXBlbmRlbmNpZXMgaW5zdGFuY2VvZiBBcnJheSl7XG5cdFx0XHQvL0RlZmluZSBhcyBhIHF1ZXVlIC0gY2FuJ3QgYXV0b3Jlc29sdmUgYmVjYXVzZSB3ZSBoYXZlIGRlcHNcblx0XHRcdHZhciBkZXBzID0gb3B0aW9ucy5kZXBlbmRlbmNpZXM7XG5cdFx0XHRkZWxldGUgb3B0aW9ucy5kZXBlbmRlbmNpZXM7XG5cdFx0XHRkZWYgPSBDbHMucHVibGljLnF1ZXVlKGRlcHMsb3B0aW9ucyk7XG5cdFx0fVxuXHRcdGVsc2V7XG5cdFx0XHQvL0RlZmluZSBhcyBhIGRlZmVycmVkXG5cdFx0XHRkZWYgPSBDbHMucHVibGljLmRlZmVycmVkKG9wdGlvbnMpO1xuXG5cdFx0XHQvL1RyeSB0byBpbW1lZGlhdGVseSBzZXR0bGUgW2RlZmluZV1cblx0XHRcdGlmKG9wdGlvbnMucmVzb2x2ZXIgPT09IG51bGxcblx0XHRcdFx0JiYgKHR5cGVvZiBvcHRpb25zLmF1dG9yZXNvbHZlICE9PSAnYm9vbGVhbidcblx0XHRcdFx0fHwgb3B0aW9ucy5hdXRvcmVzb2x2ZSA9PT0gdHJ1ZSkpe1xuXHRcdFx0XHQvL3ByZXZlbnQgZnV0dXJlIGF1dG9yZXNvdmUgYXR0ZW1wdHMgW2kuZS4gZnJvbSB4aHIgcmVzcG9uc2VdXG5cdFx0XHRcdGRlZi5hdXRvcmVzb2x2ZSA9IGZhbHNlO1xuXHRcdFx0XHRkZWYucmVzb2x2ZShkYXRhKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gZGVmO1xufTtcblxuXG4vKipcbiAqIEdldHMgYW4gZXhpc2l0aW5nIGRlZmVycmVkIC8gcXVldWUgb2JqZWN0IGZyb20gZ2xvYmFsIHN0b3JlLlxuICogUmV0dXJucyBudWxsIGlmIG5vbmUgZm91bmQuXG4gKlxuICogQG1lbWJlcm9mIG9yZ3lcbiAqIEBmdW5jdGlvbiBnZXRcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gaWQgSWQgb2YgZGVmZXJyZWQgb3IgcXVldWUgb2JqZWN0LlxuICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWQgfCBxdWV1ZSB8IG51bGxcbiAqL1xuQ2xzLnB1YmxpYy5nZXQgPSBmdW5jdGlvbihpZCl7XG5cdGlmKENscy5wcml2YXRlLmNvbmZpZy5saXN0W2lkXSl7XG5cdFx0cmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5saXN0W2lkXTtcblx0fVxuXHRlbHNle1xuXHRcdHJldHVybiBudWxsO1xuXHR9XG59O1xuXG5cbi8qKlxuICogQWRkL3JlbW92ZSBhbiB1cHN0cmVhbSBkZXBlbmRlbmN5IHRvL2Zyb20gYSBxdWV1ZS5cbiAqXG4gKiBDYW4gdXNlIGEgcXVldWUgaWQsIGV2ZW4gZm9yIGEgcXVldWUgdGhhdCBpcyB5ZXQgdG8gYmUgY3JlYXRlZC5cbiAqXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIGFzc2lnblxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gdGd0IENscy5wdWJsaWMucXVldWUgaWQgLyBxdWV1ZSBvYmplY3RcbiAqIEBwYXJhbSB7YXJyYXl9ICBhcnJcdEFycmF5IG9mIHByb21pc2UgaWRzIG9yIGRlcGVuZGVuY3kgb2JqZWN0c1xuICogQHBhcmFtIHtib29sZWFufSBhZGQgIElmIHRydWUgPGI+QUREPC9iPiBhcnJheSB0byBxdWV1ZSBkZXBlbmRlbmNpZXMsIElmIGZhbHNlIDxiPlJFTU9WRTwvYj4gYXJyYXkgZnJvbSBxdWV1ZSBkZXBlbmRlbmNpZXNcbiAqXG4gKiBAcmV0dXJuIHtvYmplY3R9IHF1ZXVlXG4gKi9cbkNscy5wdWJsaWMuYXNzaWduID0gZnVuY3Rpb24odGd0LGFycixhZGQpe1xuXG5cdFx0YWRkID0gKHR5cGVvZiBhZGQgPT09IFwiYm9vbGVhblwiKSA/IGFkZCA6IDE7XG5cblx0XHR2YXIgaWQscTtcblx0XHRzd2l0Y2godHJ1ZSl7XG5cdFx0XHRcdGNhc2UodHlwZW9mIHRndCA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHRndC50aGVuID09PSAnZnVuY3Rpb24nKTpcblx0XHRcdFx0XHRcdGlkID0gdGd0LmlkO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UodHlwZW9mIHRndCA9PT0gJ3N0cmluZycpOlxuXHRcdFx0XHRcdFx0aWQgPSB0Z3Q7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoXCJBc3NpZ24gdGFyZ2V0IG11c3QgYmUgYSBxdWV1ZSBvYmplY3Qgb3IgdGhlIGlkIG9mIGEgcXVldWUuXCIsdGhpcyk7XG5cdFx0fVxuXG5cdFx0Ly9JRiBUQVJHRVQgQUxSRUFEWSBMSVNURURcblx0XHRpZihDbHMucHJpdmF0ZS5jb25maWcubGlzdFtpZF0gJiYgQ2xzLnByaXZhdGUuY29uZmlnLmxpc3RbaWRdLm1vZGVsID09PSAncXVldWUnKXtcblx0XHRcdFx0cSA9IENscy5wcml2YXRlLmNvbmZpZy5saXN0W2lkXTtcblxuXHRcdFx0XHQvLz0+IEFERCBUTyBRVUVVRSdTIFVQU1RSRUFNXG5cdFx0XHRcdGlmKGFkZCl7XG5cdFx0XHRcdFx0XHRxLmFkZChhcnIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vPT4gUkVNT1ZFIEZST00gUVVFVUUnUyBVUFNUUkVBTVxuXHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0cS5yZW1vdmUoYXJyKTtcblx0XHRcdFx0fVxuXHRcdH1cblx0XHQvL0NSRUFURSBORVcgUVVFVUUgQU5EIEFERCBERVBFTkRFTkNJRVNcblx0XHRlbHNlIGlmKGFkZCl7XG5cdFx0XHRcdHEgPSBDbHMucHVibGljLnF1ZXVlKGFycix7XG5cdFx0XHRcdFx0XHRpZCA6IGlkXG5cdFx0XHRcdH0pO1xuXHRcdH1cblx0XHQvL0VSUk9SOiBDQU4nVCBSRU1PVkUgRlJPTSBBIFFVRVVFIFRIQVQgRE9FUyBOT1QgRVhJU1Rcblx0XHRlbHNle1xuXHRcdFx0XHRyZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFwiQ2Fubm90IHJlbW92ZSBkZXBlbmRlbmNpZXMgZnJvbSBhIHF1ZXVlIHRoYXQgZG9lcyBub3QgZXhpc3QuXCIsdGhpcyk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHE7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENscy5wdWJsaWM7XG4iXX0=
