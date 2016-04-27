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
			,timeout : -1 //no default timeout
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
	 * @param {object} options List of options:
	 *
 	 *  - <b>timeout</b> {number} default: -1   
	 *   - Setting this value to <b>-1</b> will result in no timeout.
 	 *   - Sets the global defaul for the number of milliseconds before all queues/deferreds automatically are rejected by timeout. 
 	 * 
	 *
 	 *  - <b>cwd</b> {string} 
 	 *   - Sets current working directory. Server side scripts only.
 	 * 
	 *
 	 *  - <b>debug_mode</b> {boolean} default: false 
 	 *   - When a queue or deferred is "rejected", shows stack trace and other debugging information if true.
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
							msgs.push(scope.id + ': rejected by auto timeout after '
											+ this.timeout + 'ms. To turn off timeouts set config option: "{timeout:1}"');
							msgs.push('Cause:');
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
	 *
	 * @memberof orgy
	 * @function queue
	 *
	 * @param {array} deps Array of dependencies that must be resolved before <b>resolver</b> option is called.
	 *
	 * @param {object} options	List of options:
 	 *
 	 *  - <b>id</b> {string} Unique id of the object.
 	 *	 - Can be used with Orgy.get(id).
 	 *	 - Optional.
 	 *
	 *
 	 *  - <b>timeout</b> {number} Time in ms after which reject is called.
 	 *	 - Defaults to Orgy.config().timeout [5000].
 	 *	 - Note the timeout is only affected by dependencies and/or the resolver callback.
 	 *	 - Then,done delays will not flag a timeout because they are called after the instance is considered resolved.
 	 *
	 *
 	 *  - <b>resolver</b> {function(<i>result</i>,<i>deferred</i>)} Callback function to execute after all dependencies have resolved.
 	 *	 - <i>result</i> is an array of the queue's resolved dependency values.
 	 *	 - <i>deferred</i> is the queue object.
 	 *	 - The queue will only resolve when <i>deferred</i>.resolve() is called. If not, it will timeout to options.timeout || Orgy.config().timeout.
	 *
	 * @returns {object} {@link orgy/queue}
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2hvbWUvYmFzZS8ubnZtL3ZlcnNpb25zL25vZGUvdjQuMy4xL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiLi4vLi4vLi4vaG9tZS9iYXNlLy5udm0vdmVyc2lvbnMvbm9kZS92NC4zLjEvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L2xpYi9fZW1wdHkuanMiLCIuLi8uLi8uLi9ob21lL2Jhc2UvLm52bS92ZXJzaW9ucy9ub2RlL3Y0LjMuMS9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsInNyYy9jYXN0LmpzIiwic3JjL2NvbmZpZy5qcyIsInNyYy9kZWZlcnJlZC5qcyIsInNyYy9maWxlX2xvYWRlci5qcyIsInNyYy9xdWV1ZS5qcyIsInNyYy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDekxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oQ2xzKXtcblxuXHQvKipcblx0ICogQ2FzdHMgYSB0aGVuYWJsZSBvYmplY3QgaW50byBhbiBPcmd5IGRlZmVycmVkIG9iamVjdC5cblx0ICpcblx0ICogPiBUbyBxdWFsaWZ5IGFzIGEgPGI+dGhlbmFibGU8L2I+LCB0aGUgb2JqZWN0IHRvIGJlIGNhc3RlZCBtdXN0IGhhdmUgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuXHQgKiA+XG5cdCAqID4gLSBpZFxuXHQgKiA+XG5cdCAqID4gLSB0aGVuKClcblx0ICogPlxuXHQgKiA+IC0gZXJyb3IoKVxuXHQgKlxuXHQgKiBAbWVtYmVyb2Ygb3JneVxuXHQgKiBAZnVuY3Rpb24gY2FzdFxuXHQgKlxuXHQgKiBAcGFyYW0ge29iamVjdH0gb2JqIEEgdGhlbmFibGUgd2l0aCB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG5cdCAqXHQtIHtzdHJpbmd9IDxiPmlkPC9iPlx0VW5pcXVlIGlkIG9mIHRoZSBvYmplY3QuXG5cdCAqXG5cdCAqXHQtIHtmdW5jdGlvbn0gPGI+dGhlbjwvYj5cblx0ICpcblx0ICpcdC0ge2Z1bmN0aW9ufSA8Yj5lcnJvcjwvYj5cblx0ICpcblx0ICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWRcblx0ICovXG5cdENscy5wdWJsaWMuY2FzdCA9IGZ1bmN0aW9uKG9iail7XG5cblx0XHRcdHZhciByZXF1aXJlZCA9IFtcInRoZW5cIixcImVycm9yXCIsXCJpZFwiXTtcblx0XHRcdGZvcih2YXIgaSBpbiByZXF1aXJlZCl7XG5cdFx0XHRcdGlmKCFvYmouaGFzT3duUHJvcGVydHkocmVxdWlyZWRbaV0pKXtcblx0XHRcdFx0XHRyZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFwiQ2FzdCBtZXRob2QgbWlzc2luZyBwcm9wZXJ0eSAnXCIgKyByZXF1aXJlZFtpXSArXCInXCIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHZhciBvcHRpb25zID0ge307XG5cdFx0XHRvcHRpb25zLmlkID0gb2JqLmlkO1xuXG5cdFx0XHQvL01ha2Ugc3VyZSBpZCBkb2VzIG5vdCBjb25mbGljdCB3aXRoIGV4aXN0aW5nXG5cdFx0XHRpZihDbHMucHJpdmF0ZS5jb25maWcubGlzdFtvcHRpb25zLmlkXSl7XG5cdFx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoXCJJZCBcIitvcHRpb25zLmlkK1wiIGNvbmZsaWN0cyB3aXRoIGV4aXN0aW5nIGlkLlwiKTtcblx0XHRcdH1cblxuXHRcdFx0Ly9DcmVhdGUgYSBkZWZlcnJlZFxuXHRcdFx0dmFyIGRlZiA9IENscy5wdWJsaWMuZGVmZXJyZWQob3B0aW9ucyk7XG5cblx0XHRcdC8vQ3JlYXRlIHJlc29sdmVyXG5cdFx0XHR2YXIgcmVzb2x2ZXIgPSBmdW5jdGlvbigpe1xuXHRcdFx0XHRkZWYucmVzb2x2ZS5jYWxsKGRlZixhcmd1bWVudHNbMF0pO1xuXHRcdFx0fTtcblxuXHRcdFx0Ly9TZXQgUmVzb2x2ZXJcblx0XHRcdG9iai50aGVuKHJlc29sdmVyKTtcblxuXHRcdFx0Ly9SZWplY3QgZGVmZXJyZWQgb24gLmVycm9yXG5cdFx0XHR2YXIgZXJyID0gZnVuY3Rpb24oZXJyKXtcblx0XHRcdFx0ZGVmLnJlamVjdChlcnIpO1xuXHRcdFx0fTtcblx0XHRcdG9iai5lcnJvcihlcnIpO1xuXG5cdFx0XHQvL1JldHVybiBkZWZlcnJlZFxuXHRcdFx0cmV0dXJuIGRlZjtcblx0fTtcblxuXHRyZXR1cm4gQ2xzO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihDbHMpe1xuXG5cdHZhciBfcHJpdmF0ZSA9IHt9O1xuXG5cblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXHQvL1x0X3ByaXZhdGUgVkFSSUFCTEVTXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG5cdC8qKlxuXHQgKiBBIGRpcmVjdG9yeSBvZiBhbGwgcHJvbWlzZXMsIGRlZmVycmVkcywgYW5kIHF1ZXVlcy5cblx0ICogQHR5cGUgb2JqZWN0XG5cdCAqL1xuXHRfcHJpdmF0ZS5saXN0ID0ge307XG5cblxuXHQvKipcblx0ICogaXRlcmF0b3IgZm9yIGlkc1xuXHQgKiBAdHlwZSBpbnRlZ2VyXG5cdCAqL1xuXHRfcHJpdmF0ZS5pID0gMDtcblxuXG5cdC8qKlxuXHQgKiBDb25maWd1cmF0aW9uIHZhbHVlcy5cblx0ICpcblx0ICogQHR5cGUgb2JqZWN0XG5cdCAqL1xuXHRfcHJpdmF0ZS5zZXR0aW5ncyA9IHtcblxuXHRcdFx0ZGVidWdfbW9kZSA6IGZhbHNlXG5cdFx0XHQvL3NldCB0aGUgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeSBvZiB0aGUgY2FsbGVlIHNjcmlwdCxcblx0XHRcdC8vYmVjYXVzZSBub2RlIGhhcyBubyBjb25zdGFudCBmb3IgdGhpc1xuXHRcdFx0LGN3ZCA6IGZhbHNlXG5cdFx0XHQsbW9kZSA6IChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdGlmKHR5cGVvZiBwcm9jZXNzID09PSAnb2JqZWN0JyAmJiBwcm9jZXNzICsgJycgPT09ICdbb2JqZWN0IHByb2Nlc3NdJyl7XG5cdFx0XHRcdFx0XHRcdC8vIGlzIG5vZGVcblx0XHRcdFx0XHRcdFx0cmV0dXJuIFwibmF0aXZlXCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0XHRcdC8vIG5vdCBub2RlXG5cdFx0XHRcdFx0XHRcdHJldHVybiBcImJyb3dzZXJcIjtcblx0XHRcdFx0XHR9XG5cdFx0XHR9KCkpXG5cdFx0XHQvKipcblx0XHRcdCAqIC0gb25BY3RpdmF0ZSAvd2hlbiBlYWNoIGluc3RhbmNlIGFjdGl2YXRlZFxuXHRcdFx0ICogLSBvblNldHRsZVx0XHQvd2hlbiBlYWNoIGluc3RhbmNlIHNldHRsZXNcblx0XHRcdCAqXG5cdFx0XHQgKiBAdHlwZSBvYmplY3Rcblx0XHRcdCAqL1xuXHRcdFx0LGhvb2tzIDoge1xuXHRcdFx0fVxuXHRcdFx0LHRpbWVvdXQgOiAtMSAvL25vIGRlZmF1bHQgdGltZW91dFxuXHR9O1xuXG5cblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXHQvL1x0X3ByaXZhdGUgVkFSSUFCTEVTXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblx0Ly9cdF9wcml2YXRlIE1FVEhPRFNcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cblx0LyoqXG5cdCAqIE9wdGlvbnMgeW91IHdpc2ggdG8gcGFzcyB0byBzZXQgdGhlIGdsb2JhbCBjb25maWd1cmF0aW9uXG5cdCAqXG5cdCAqIEBtZW1iZXJvZiBvcmd5XG5cdCAqIEBmdW5jdGlvbiBjb25maWdcblx0ICpcblx0ICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgTGlzdCBvZiBvcHRpb25zOlxuXHQgKlxuIFx0ICogIC0gPGI+dGltZW91dDwvYj4ge251bWJlcn0gZGVmYXVsdDogLTEgICBcblx0ICogICAtIFNldHRpbmcgdGhpcyB2YWx1ZSB0byA8Yj4tMTwvYj4gd2lsbCByZXN1bHQgaW4gbm8gdGltZW91dC5cbiBcdCAqICAgLSBTZXRzIHRoZSBnbG9iYWwgZGVmYXVsIGZvciB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBiZWZvcmUgYWxsIHF1ZXVlcy9kZWZlcnJlZHMgYXV0b21hdGljYWxseSBhcmUgcmVqZWN0ZWQgYnkgdGltZW91dC4gXG4gXHQgKiBcblx0ICpcbiBcdCAqICAtIDxiPmN3ZDwvYj4ge3N0cmluZ30gXG4gXHQgKiAgIC0gU2V0cyBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5LiBTZXJ2ZXIgc2lkZSBzY3JpcHRzIG9ubHkuXG4gXHQgKiBcblx0ICpcbiBcdCAqICAtIDxiPmRlYnVnX21vZGU8L2I+IHtib29sZWFufSBkZWZhdWx0OiBmYWxzZSBcbiBcdCAqICAgLSBXaGVuIGEgcXVldWUgb3IgZGVmZXJyZWQgaXMgXCJyZWplY3RlZFwiLCBzaG93cyBzdGFjayB0cmFjZSBhbmQgb3RoZXIgZGVidWdnaW5nIGluZm9ybWF0aW9uIGlmIHRydWUuXG5cdCAqIEByZXR1cm5zIHtvYmplY3R9IGNvbmZpZ3VyYXRpb24gc2V0dGluZ3Ncblx0ICovXG5cdENscy5wdWJsaWMuY29uZmlnID0gZnVuY3Rpb24ob2JqKXtcblxuXHRcdFx0aWYodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcpe1xuXHRcdFx0XHRcdGZvcih2YXIgaSBpbiBvYmope1xuXHRcdFx0XHRcdFx0X3ByaXZhdGUuc2V0dGluZ3NbaV0gPSBvYmpbaV07XG5cdFx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gX3ByaXZhdGUuc2V0dGluZ3M7XG5cdH07XG5cblxuXHQvKipcblx0ICogRGVidWdnaW5nIG1ldGhvZC5cblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd8YXJyYXl9IG1zZ1xuXHQgKiBAcGFyYW0ge29iamVjdH0gZGVmXG5cdCAqIEByZXR1cm5zIHtCb29sZWFufVxuXHQgKi9cblx0X3ByaXZhdGUuZGVidWcgPSBmdW5jdGlvbihtc2cpe1xuXG5cdFx0XHR2YXIgbXNncyA9IChtc2cgaW5zdGFuY2VvZiBBcnJheSkgPyBtc2cuam9pbihcIlxcblwiKSA6IFttc2ddO1xuXG5cdFx0XHR2YXIgZSA9IG5ldyBFcnJvcihtc2dzKTtcblx0XHRcdGNvbnNvbGUubG9nKGUuc3RhY2spO1xuXG5cdFx0XHRpZih0aGlzLnNldHRpbmdzLmRlYnVnX21vZGUpe1xuXHRcdFx0XHQvL3R1cm4gb2ZmIGRlYnVnX21vZGUgdG8gYXZvaWQgaGl0dGluZyBkZWJ1Z2dlclxuXHRcdFx0XHRkZWJ1Z2dlcjtcblx0XHRcdH1cblxuXHRcdFx0aWYoX3ByaXZhdGUuc2V0dGluZ3MubW9kZSA9PT0gJ2Jyb3dzZXInKXtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZXtcblx0XHRcdFx0cHJvY2Vzcy5leGl0KCk7XG5cdFx0XHR9XG5cdH07XG5cblxuXHQvKipcblx0ICogVGFrZSBhbiBhcnJheSBvZiBwcm90b3R5cGUgb2JqZWN0cyBhbmQgYW4gYXJyYXkgb2YgcHJvcGVydHkgb2JqZWN0cyxcblx0ICogbWVyZ2VzIGVhY2gsIGFuZCByZXR1cm5zIGEgc2hhbGxvdyBjb3B5LlxuXHQgKlxuXHQgKiBAcGFyYW0ge2FycmF5fSBwcm90b09iakFyciBBcnJheSBvZiBwcm90b3R5cGUgb2JqZWN0cyB3aGljaCBhcmUgb3ZlcndyaXR0ZW4gZnJvbSByaWdodCB0byBsZWZ0XG5cdCAqIEBwYXJhbSB7YXJyYXl9IHByb3BzT2JqQXJyIEFycmF5IG9mIGRlc2lyZWQgcHJvcGVydHkgb2JqZWN0cyB3aGljaCBhcmUgb3ZlcndyaXR0ZW4gZnJvbSByaWdodCB0byBsZWZ0XG5cdCAqIEByZXR1cm5zIHtvYmplY3R9IG9iamVjdFxuXHQgKi9cblx0X3ByaXZhdGUubmFpdmVfY2xvbmVyID0gZnVuY3Rpb24ocHJvdG9PYmpBcnIscHJvcHNPYmpBcnIpe1xuXG5cdFx0XHRmdW5jdGlvbiBtZXJnZShkb25vcnMpe1xuXHRcdFx0XHR2YXIgbyA9IHt9O1xuXHRcdFx0XHRmb3IodmFyIGEgaW4gZG9ub3JzKXtcblx0XHRcdFx0XHRcdGZvcih2YXIgYiBpbiBkb25vcnNbYV0pe1xuXHRcdFx0XHRcdFx0XHRcdGlmKGRvbm9yc1thXVtiXSBpbnN0YW5jZW9mIEFycmF5KXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0b1tiXSA9IGRvbm9yc1thXVtiXS5zbGljZSgwKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0ZWxzZSBpZih0eXBlb2YgZG9ub3JzW2FdW2JdID09PSAnb2JqZWN0Jyl7XG5cdFx0XHRcdFx0XHRcdFx0XHR0cnl7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdG9bYl0gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGRvbm9yc1thXVtiXSkpO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0Y2F0Y2goZSl7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGRlYnVnZ2VyO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRvW2JdID0gZG9ub3JzW2FdW2JdO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gbztcblx0XHRcdH1cblxuXHRcdFx0dmFyIHByb3RvID0gbWVyZ2UocHJvdG9PYmpBcnIpLFxuXHRcdFx0XHRcdHByb3BzID0gbWVyZ2UocHJvcHNPYmpBcnIpO1xuXG5cdFx0XHQvL0B0b2RvIGNvbnNpZGVyIG1hbnVhbGx5IHNldHRpbmcgdGhlIHByb3RvdHlwZSBpbnN0ZWFkXG5cdFx0XHR2YXIgZmluYWxPYmplY3QgPSBPYmplY3QuY3JlYXRlKHByb3RvKTtcblx0XHRcdGZvcih2YXIgaSBpbiBwcm9wcyl7XG5cdFx0XHRcdGZpbmFsT2JqZWN0W2ldID0gcHJvcHNbaV07XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBmaW5hbE9iamVjdDtcblx0fTtcblxuXG5cdF9wcml2YXRlLmdlbmVyYXRlX2lkID0gZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCkgKyAnLScgKyAoKyt0aGlzLmkpO1xuXHR9O1xuXHRcblx0XG5cdC8vU2F2ZSBmb3IgcmUtdXNlXG5cdENscy5wcml2YXRlLmNvbmZpZyA9IF9wcml2YXRlO1xuXG5cdHJldHVybiBDbHM7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKENscyl7XG5cblx0LyoqXG5cdCogQG5hbWVzcGFjZSBvcmd5L2RlZmVycmVkXG5cdCovXG5cblx0XG5cdHZhciBfcHJpdmF0ZSA9IHt9O1xuXG5cblx0X3ByaXZhdGUuYWN0aXZhdGUgPSBmdW5jdGlvbihvYmope1xuXG5cdFx0XHQgLy9pZiBubyBpZCwgZ2VuZXJhdGUgb25lXG5cdFx0XHRpZighb2JqLmlkKXtcblx0XHRcdFx0b2JqLmlkID0gQ2xzLnByaXZhdGUuY29uZmlnLmdlbmVyYXRlX2lkKCk7XG5cdFx0XHR9XG5cblx0XHRcdC8vTUFLRSBTVVJFIE5BTUlORyBDT05GTElDVCBET0VTIE5PVCBFWElTVFxuXHRcdFx0aWYoQ2xzLnByaXZhdGUuY29uZmlnLmxpc3Rbb2JqLmlkXSAmJiAhQ2xzLnByaXZhdGUuY29uZmlnLmxpc3Rbb2JqLmlkXS5vdmVyd3JpdGFibGUpe1xuXHRcdFx0XHRcdENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcIlRyaWVkIGlsbGVnYWwgb3ZlcndyaXRlIG9mIFwiK29iai5pZCtcIi5cIik7XG5cdFx0XHRcdFx0cmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5saXN0W29iai5pZF07XG5cdFx0XHR9XG5cblx0XHRcdC8vU0FWRSBUTyBNQVNURVIgTElTVFxuXHRcdFx0Ly9AdG9kbyBvbmx5IHNhdmUgaWYgd2FzIGFzc2lnbmVkIGFuIGlkLFxuXHRcdFx0Ly93aGljaCBpbXBsaWVzIHVzZXIgaW50ZW5kcyB0byBhY2Nlc3Mgc29tZXdoZXJlIGVsc2Ugb3V0c2lkZSBvZiBzY29wZVxuXHRcdFx0Q2xzLnByaXZhdGUuY29uZmlnLmxpc3Rbb2JqLmlkXSA9IG9iajtcblxuXHRcdFx0Ly9BVVRPIFRJTUVPVVRcblx0XHRcdF9wcml2YXRlLmF1dG9fdGltZW91dC5jYWxsKG9iaik7XG5cblx0XHRcdC8vQ2FsbCBob29rXG5cdFx0XHRpZihDbHMucHJpdmF0ZS5jb25maWcuc2V0dGluZ3MuaG9va3Mub25BY3RpdmF0ZSl7XG5cdFx0XHRcdENscy5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy5ob29rcy5vbkFjdGl2YXRlKG9iaik7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBvYmo7XG5cdH07XG5cblxuXHRfcHJpdmF0ZS5zZXR0bGUgPSBmdW5jdGlvbihkZWYpe1xuXG5cdFx0XHQvL1JFTU9WRSBBVVRPIFRJTUVPVVQgVElNRVJcblx0XHRcdGlmKGRlZi50aW1lb3V0X2lkKXtcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KGRlZi50aW1lb3V0X2lkKTtcblx0XHRcdH1cblxuXHRcdFx0Ly9TZXQgc3RhdGUgdG8gcmVzb2x2ZWRcblx0XHRcdF9wcml2YXRlLnNldF9zdGF0ZShkZWYsMSk7XG5cblx0XHRcdC8vQ2FsbCBob29rXG5cdFx0XHRpZihDbHMucHJpdmF0ZS5jb25maWcuc2V0dGluZ3MuaG9va3Mub25TZXR0bGUpe1xuXHRcdFx0XHRDbHMucHJpdmF0ZS5jb25maWcuc2V0dGluZ3MuaG9va3Mub25TZXR0bGUoZGVmKTtcblx0XHRcdH1cblxuXHRcdFx0Ly9BZGQgZG9uZSBhcyBhIGNhbGxiYWNrIHRvIHRoZW4gY2hhaW4gY29tcGxldGlvbi5cblx0XHRcdGRlZi5jYWxsYmFja3MudGhlbi5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnB1c2goZnVuY3Rpb24oZDIsaXRpbmVyYXJ5LGxhc3Qpe1xuXHRcdFx0XHRcdGRlZi5jYWJvb3NlID0gbGFzdDtcblxuXHRcdFx0XHRcdC8vUnVuIGRvbmVcblx0XHRcdFx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oXG5cdFx0XHRcdFx0XHRcdGRlZlxuXHRcdFx0XHRcdFx0XHQsZGVmLmNhbGxiYWNrcy5kb25lXG5cdFx0XHRcdFx0XHRcdCxkZWYuY2Fib29zZVxuXHRcdFx0XHRcdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG5cdFx0XHRcdFx0KTtcblx0XHRcdH0pO1xuXG5cdFx0XHQvL1J1biB0aGVuIHF1ZXVlXG5cdFx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oXG5cdFx0XHRcdFx0ZGVmXG5cdFx0XHRcdFx0LGRlZi5jYWxsYmFja3MudGhlblxuXHRcdFx0XHRcdCxkZWYudmFsdWVcblx0XHRcdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogdHJ1ZX1cblx0XHRcdCk7XG5cblx0XHRcdHJldHVybiBkZWY7XG5cdH07XG5cblxuXHQvKipcblx0ICogUnVucyBhbiBhcnJheSBvZiBmdW5jdGlvbnMgc2VxdWVudGlhbGx5IGFzIGEgcGFydGlhbCBmdW5jdGlvbi5cblx0ICogRWFjaCBmdW5jdGlvbidzIGFyZ3VtZW50IGlzIHRoZSByZXN1bHQgb2YgaXRzIHByZWRlY2Vzc29yIGZ1bmN0aW9uLlxuXHQgKlxuXHQgKiBCeSBkZWZhdWx0LCBleGVjdXRpb24gY2hhaW4gaXMgcGF1c2VkIHdoZW4gYW55IGZ1bmN0aW9uXG5cdCAqIHJldHVybnMgYW4gdW5yZXNvbHZlZCBkZWZlcnJlZC4gKHBhdXNlX29uX2RlZmVycmVkKSBbT1BUSU9OQUxdXG5cdCAqXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBkZWZcdC9kZWZlcnJlZCBvYmplY3Rcblx0ICogQHBhcmFtIHtvYmplY3R9IG9ialx0L2l0aW5lcmFyeVxuXHQgKlx0XHRcdHRyYWluXHRcdFx0XHR7YXJyYXl9XG5cdCAqXHRcdFx0aG9va3NcdFx0XHRcdHtvYmplY3R9XG5cdCAqXHRcdFx0XHRcdG9uQmVmb3JlXHRcdFx0XHR7YXJyYXl9XG5cdCAqXHRcdFx0XHRcdG9uQ29tcGxldGVcdFx0XHR7YXJyYXl9XG5cdCAqIEBwYXJhbSB7bWl4ZWR9IHBhcmFtIC9wYXJhbSB0byBwYXNzIHRvIGZpcnN0IGNhbGxiYWNrXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG5cdCAqXHRcdFx0cGF1c2Vfb25fZGVmZXJyZWRcdFx0e2Jvb2xlYW59XG5cdCAqXG5cdCAqIEByZXR1cm5zIHt2b2lkfVxuXHQgKi9cblx0X3ByaXZhdGUucnVuX3RyYWluID0gZnVuY3Rpb24oZGVmLG9iaixwYXJhbSxvcHRpb25zKXtcblxuXHRcdFx0Ly9hbGxvdyBwcmV2aW91cyByZXR1cm4gdmFsdWVzIHRvIGJlIHBhc3NlZCBkb3duIGNoYWluXG5cdFx0XHR2YXIgciA9IHBhcmFtIHx8IGRlZi5jYWJvb3NlIHx8IGRlZi52YWx1ZTtcblxuXHRcdFx0Ly9vbkJlZm9yZSBldmVudFxuXHRcdFx0aWYob2JqLmhvb2tzICYmIG9iai5ob29rcy5vbkJlZm9yZS50cmFpbi5sZW5ndGggPiAwKXtcblx0XHRcdFx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oXG5cdFx0XHRcdFx0XHRcdGRlZlxuXHRcdFx0XHRcdFx0XHQsb2JqLmhvb2tzLm9uQmVmb3JlXG5cdFx0XHRcdFx0XHRcdCxwYXJhbVxuXHRcdFx0XHRcdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG5cdFx0XHRcdFx0KTtcblx0XHRcdH1cblxuXHRcdFx0d2hpbGUob2JqLnRyYWluLmxlbmd0aCA+IDApe1xuXG5cdFx0XHRcdFx0Ly9yZW1vdmUgZm4gdG8gZXhlY3V0ZVxuXHRcdFx0XHRcdHZhciBsYXN0ID0gb2JqLnRyYWluLnNoaWZ0KCk7XG5cdFx0XHRcdFx0ZGVmLmV4ZWN1dGlvbl9oaXN0b3J5LnB1c2gobGFzdCk7XG5cblx0XHRcdFx0XHQvL2RlZi5jYWJvb3NlIG5lZWRlZCBmb3IgdGhlbiBjaGFpbiBkZWNsYXJlZCBhZnRlciByZXNvbHZlZCBpbnN0YW5jZVxuXHRcdFx0XHRcdHIgPSBkZWYuY2Fib29zZSA9IGxhc3QuY2FsbChkZWYsZGVmLnZhbHVlLGRlZixyKTtcblxuXHRcdFx0XHRcdC8vaWYgcmVzdWx0IGlzIGFuIHRoZW5hYmxlLCBoYWx0IGV4ZWN1dGlvblxuXHRcdFx0XHRcdC8vYW5kIHJ1biB1bmZpcmVkIGFyciB3aGVuIHRoZW5hYmxlIHNldHRsZXNcblx0XHRcdFx0XHRpZihvcHRpb25zLnBhdXNlX29uX2RlZmVycmVkKXtcblxuXHRcdFx0XHRcdFx0XHQvL0lmIHIgaXMgYW4gdW5zZXR0bGVkIHRoZW5hYmxlXG5cdFx0XHRcdFx0XHRcdGlmKHIgJiYgci50aGVuICYmIHIuc2V0dGxlZCAhPT0gMSl7XG5cblx0XHRcdFx0XHRcdFx0XHRcdC8vZXhlY3V0ZSByZXN0IG9mIHRoaXMgdHJhaW4gYWZ0ZXIgciByZXNvbHZlc1xuXHRcdFx0XHRcdFx0XHRcdFx0ci5jYWxsYmFja3MucmVzb2x2ZS5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnB1c2goZnVuY3Rpb24oKXtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdF9wcml2YXRlLnJ1bl90cmFpbihcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCxvYmpcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0LHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHQvL3Rlcm1pbmF0ZSBleGVjdXRpb25cblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdC8vSWYgaXMgYW4gYXJyYXkgdGhhbiBjb250YWlucyBhbiB1bnNldHRsZWQgdGhlbmFibGVcblx0XHRcdFx0XHRcdFx0ZWxzZSBpZihyIGluc3RhbmNlb2YgQXJyYXkpe1xuXG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgdGhlbmFibGVzID0gW107XG5cblx0XHRcdFx0XHRcdFx0XHRcdGZvcih2YXIgaSBpbiByKXtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmKHJbaV0udGhlbiAmJiByW2ldLnNldHRsZWQgIT09IDEpe1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRoZW5hYmxlcy5wdXNoKHJbaV0pO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHZhciBmbiA9IChmdW5jdGlvbih0LGRlZixvYmoscGFyYW0pe1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24oKXtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vQmFpbCBpZiBhbnkgdGhlbmFibGVzIHVuc2V0dGxlZFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGZvcih2YXIgaSBpbiB0KXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYodFtpXS5zZXR0bGVkICE9PSAxKXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdF9wcml2YXRlLnJ1bl90cmFpbihcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCxvYmpcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0LHBhcmFtXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiB0cnVlfVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0pKHRoZW5hYmxlcyxkZWYsb2JqLHBhcmFtKTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvL2V4ZWN1dGUgcmVzdCBvZiB0aGlzIHRyYWluIGFmdGVyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vYWxsIHRoZW5hYmxlcyBmb3VuZCBpbiByIHJlc29sdmVcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cltpXS5jYWxsYmFja3MucmVzb2x2ZS5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnB1c2goZm4pO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vdGVybWluYXRlIGV4ZWN1dGlvblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvL29uQ29tcGxldGUgZXZlbnRcblx0XHRcdGlmKG9iai5ob29rcyAmJiBvYmouaG9va3Mub25Db21wbGV0ZS50cmFpbi5sZW5ndGggPiAwKXtcblx0XHRcdFx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oZGVmLG9iai5ob29rcy5vbkNvbXBsZXRlLHIse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9KTtcblx0XHRcdH1cblx0fTtcblxuXG5cdC8qKlxuXHQgKiBTZXRzIHRoZSBzdGF0ZSBvZiBhbiBPcmd5IG9iamVjdC5cblx0ICpcblx0ICogQHBhcmFtIHtvYmplY3R9IGRlZlxuXHQgKiBAcGFyYW0ge251bWJlcn0gaW50XG5cdCAqIEByZXR1cm5zIHt2b2lkfVxuXHQgKi9cblx0X3ByaXZhdGUuc2V0X3N0YXRlID0gZnVuY3Rpb24oZGVmLGludCl7XG5cblx0XHRcdGRlZi5zdGF0ZSA9IGludDtcblxuXHRcdFx0Ly9JRiBSRVNPTFZFRCBPUiBSRUpFQ1RFRCwgU0VUVExFXG5cdFx0XHRpZihpbnQgPT09IDEgfHwgaW50ID09PSAyKXtcblx0XHRcdFx0XHRkZWYuc2V0dGxlZCA9IDE7XG5cdFx0XHR9XG5cblx0XHRcdGlmKGludCA9PT0gMSB8fCBpbnQgPT09IDIpe1xuXHRcdFx0XHRcdF9wcml2YXRlLnNpZ25hbF9kb3duc3RyZWFtKGRlZik7XG5cdFx0XHR9XG5cdH07XG5cblxuXHQvKipcblx0ICogR2V0cyB0aGUgc3RhdGUgb2YgYW4gT3JneSBvYmplY3Rcblx0ICpcblx0ICogQHBhcmFtIHtvYmplY3R9IGRlZlxuXHQgKiBAcmV0dXJucyB7bnVtYmVyfVxuXHQgKi9cblx0X3ByaXZhdGUuZ2V0X3N0YXRlID0gZnVuY3Rpb24oZGVmKXtcblx0XHRcdHJldHVybiBkZWYuc3RhdGU7XG5cdH07XG5cblxuXHQvKipcblx0ICogU2V0cyB0aGUgYXV0b21hdGljIHRpbWVvdXQgb24gYSBwcm9taXNlIG9iamVjdC5cblx0ICpcblx0ICogQHJldHVybnMge0Jvb2xlYW59XG5cdCAqL1xuXHRfcHJpdmF0ZS5hdXRvX3RpbWVvdXQgPSBmdW5jdGlvbigpe1xuXG5cdFx0XHR0aGlzLnRpbWVvdXQgPSAodHlwZW9mIHRoaXMudGltZW91dCAhPT0gJ3VuZGVmaW5lZCcpXG5cdFx0XHQ/IHRoaXMudGltZW91dCA6IENscy5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy50aW1lb3V0O1xuXG5cdFx0XHQvL0FVVE8gUkVKRUNUIE9OIHRpbWVvdXRcblx0XHRcdGlmKCF0aGlzLnR5cGUgfHwgdGhpcy50eXBlICE9PSAndGltZXInKXtcblxuXHRcdFx0XHRcdC8vREVMRVRFIFBSRVZJT1VTIFRJTUVPVVQgSUYgRVhJU1RTXG5cdFx0XHRcdFx0aWYodGhpcy50aW1lb3V0X2lkKXtcblx0XHRcdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMudGltZW91dF9pZCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmKHR5cGVvZiB0aGlzLnRpbWVvdXQgPT09ICd1bmRlZmluZWQnKXtcblx0XHRcdFx0XHRcdFx0Q2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFtcblx0XHRcdFx0XHRcdFx0XHRcIkF1dG8gdGltZW91dCB0aGlzLnRpbWVvdXQgY2Fubm90IGJlIHVuZGVmaW5lZC5cIlxuXHRcdFx0XHRcdFx0XHRcdCx0aGlzLmlkXG5cdFx0XHRcdFx0XHRcdF0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIGlmICh0aGlzLnRpbWVvdXQgPT09IC0xKXtcblx0XHRcdFx0XHRcdFx0Ly9OTyBBVVRPIFRJTUVPVVQgU0VUXG5cdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dmFyIHNjb3BlID0gdGhpcztcblxuXHRcdFx0XHRcdHRoaXMudGltZW91dF9pZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0X3ByaXZhdGUuYXV0b190aW1lb3V0X2NiLmNhbGwoc2NvcGUpO1xuXHRcdFx0XHRcdH0sIHRoaXMudGltZW91dCk7XG5cblx0XHRcdH1cblx0XHRcdC8vZWxzZXtcblx0XHRcdFx0XHQvL0B0b2RvIFdIRU4gQSBUSU1FUiwgQUREIERVUkFUSU9OIFRPIEFMTCBVUFNUUkVBTSBBTkQgTEFURVJBTD9cblx0XHRcdC8vfVxuXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBDYWxsYmFjayBmb3IgYXV0b3RpbWVvdXQuIERlY2xhcmF0aW9uIGhlcmUgYXZvaWRzIG1lbW9yeSBsZWFrLlxuXHQgKlxuXHQgKiBAcmV0dXJucyB7dm9pZH1cblx0ICovXG5cdF9wcml2YXRlLmF1dG9fdGltZW91dF9jYiA9IGZ1bmN0aW9uKCl7XG5cblx0XHRcdGlmKHRoaXMuc3RhdGUgIT09IDEpe1xuXG5cdFx0XHRcdFx0Ly9HRVQgVEhFIFVQU1RSRUFNIEVSUk9SIElEXG5cdFx0XHRcdFx0dmFyIG1zZ3MgPSBbXTtcblx0XHRcdFx0XHR2YXIgc2NvcGUgPSB0aGlzO1xuXG5cdFx0XHRcdFx0dmFyIGZuID0gZnVuY3Rpb24ob2JqKXtcblx0XHRcdFx0XHRcdFx0aWYob2JqLnN0YXRlICE9PSAxKXtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBvYmouaWQ7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHQvKipcblx0XHRcdFx0XHQgKiBSdW4gb3ZlciBhIGdpdmVuIG9iamVjdCBwcm9wZXJ0eSByZWN1cnNpdmVseSxcblx0XHRcdFx0XHQgKiBhcHBseWluZyBjYWxsYmFjayB1bnRpbFxuXHRcdFx0XHRcdCAqIGNhbGxiYWNrIHJldHVybnMgYSBub24tZmFsc2UgdmFsdWUuXG5cdFx0XHRcdFx0ICovXG5cdFx0XHRcdFx0aWYoQ2xzLnByaXZhdGUuY29uZmlnLnNldHRpbmdzLmRlYnVnX21vZGUpe1xuXHRcdFx0XHRcdFx0XHR2YXIgciA9IF9wcml2YXRlLnNlYXJjaF9vYmpfcmVjdXJzaXZlbHkodGhpcywndXBzdHJlYW0nLGZuKTtcblx0XHRcdFx0XHRcdFx0bXNncy5wdXNoKHNjb3BlLmlkICsgJzogcmVqZWN0ZWQgYnkgYXV0byB0aW1lb3V0IGFmdGVyICdcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQrIHRoaXMudGltZW91dCArICdtcy4gVG8gdHVybiBvZmYgdGltZW91dHMgc2V0IGNvbmZpZyBvcHRpb246IFwie3RpbWVvdXQ6MX1cIicpO1xuXHRcdFx0XHRcdFx0XHRtc2dzLnB1c2goJ0NhdXNlOicpO1xuXHRcdFx0XHRcdFx0XHRtc2dzLnB1c2gocik7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aGlzLnJlamVjdC5jYWxsKHRoaXMsbXNncyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aGlzLnJlamVjdC5jYWxsKHRoaXMpO1xuXHRcdFx0XHRcdH1cblx0XHRcdH1cblx0fTtcblxuXG5cdF9wcml2YXRlLmVycm9yID0gZnVuY3Rpb24oY2Ipe1xuXG5cdFx0XHQvL0lGIEVSUk9SIEFMUkVBRFkgVEhST1dOLCBFWEVDVVRFIENCIElNTUVESUFURUxZXG5cdFx0XHRpZih0aGlzLnN0YXRlID09PSAyKXtcblx0XHRcdFx0XHRjYigpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZXtcblx0XHRcdFx0XHR0aGlzLnJlamVjdF9xLnB1c2goY2IpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBTaWduYWxzIGFsbCBkb3duc3RyZWFtIHByb21pc2VzIHRoYXQgX3ByaXZhdGUgcHJvbWlzZSBvYmplY3Qnc1xuXHQgKiBzdGF0ZSBoYXMgY2hhbmdlZC5cblx0ICpcblx0ICogQHRvZG8gU2luY2UgdGhlIHNhbWUgcXVldWUgbWF5IGhhdmUgYmVlbiBhc3NpZ25lZCB0d2ljZSBkaXJlY3RseSBvclxuXHQgKiBpbmRpcmVjdGx5IHZpYSBzaGFyZWQgZGVwZW5kZW5jaWVzLCBtYWtlIHN1cmUgbm90IHRvIGRvdWJsZSByZXNvbHZlXG5cdCAqIC0gd2hpY2ggdGhyb3dzIGFuIGVycm9yLlxuXHQgKlxuXHQgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0IGRlZmVycmVkL3F1ZXVlXG5cdCAqIEByZXR1cm5zIHt2b2lkfVxuXHQgKi9cblx0X3ByaXZhdGUuc2lnbmFsX2Rvd25zdHJlYW0gPSBmdW5jdGlvbih0YXJnZXQpe1xuXG5cdFx0XHQvL01BS0UgU1VSRSBBTEwgRE9XTlNUUkVBTSBJUyBVTlNFVFRMRURcblx0XHRcdGZvcih2YXIgaSBpbiB0YXJnZXQuZG93bnN0cmVhbSl7XG5cdFx0XHRcdFx0aWYodGFyZ2V0LmRvd25zdHJlYW1baV0uc2V0dGxlZCA9PT0gMSl7XG5cblx0XHRcdFx0XHRcdGlmKHRhcmdldC5kb3duc3RyZWFtW2ldLnN0YXRlICE9PSAxKXtcblx0XHRcdFx0XHRcdFx0Ly90cmllZCB0byBzZXR0bGUgYSByZWplY3RlZCBkb3duc3RyZWFtXG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRcdFx0Ly90cmllZCB0byBzZXR0bGUgYSBzdWNjZXNzZnVsbHkgc2V0dGxlZCBkb3duc3RyZWFtXG5cdFx0XHRcdFx0XHRcdENscy5wcml2YXRlLmNvbmZpZy5kZWJ1Zyh0YXJnZXQuaWQgKyBcIiB0cmllZCB0byBzZXR0bGUgcHJvbWlzZSBcIitcIidcIit0YXJnZXQuZG93bnN0cmVhbVtpXS5pZCtcIicgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIHNldHRsZWQuXCIpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly9OT1cgVEhBVCBXRSBLTk9XIEFMTCBET1dOU1RSRUFNIElTIFVOU0VUVExFRCwgV0UgQ0FOIElHTk9SRSBBTllcblx0XHRcdC8vU0VUVExFRCBUSEFUIFJFU1VMVCBBUyBBIFNJREUgRUZGRUNUIFRPIEFOT1RIRVIgU0VUVExFTUVOVFxuXHRcdFx0Zm9yICh2YXIgaSBpbiB0YXJnZXQuZG93bnN0cmVhbSl7XG5cdFx0XHRcdFx0aWYodGFyZ2V0LmRvd25zdHJlYW1baV0uc2V0dGxlZCAhPT0gMSl7XG5cdFx0XHRcdFx0XHRcdF9wcml2YXRlLnJlY2VpdmVfc2lnbmFsKHRhcmdldC5kb3duc3RyZWFtW2ldLHRhcmdldC5pZCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0fVxuXHR9O1xuXG5cblx0LyoqXG5cdCogUnVuIG92ZXIgYSBnaXZlbiBvYmplY3QgcHJvcGVydHkgcmVjdXJzaXZlbHksIGFwcGx5aW5nIGNhbGxiYWNrIHVudGlsXG5cdCogY2FsbGJhY2sgcmV0dXJucyBhIG5vbi1mYWxzZSB2YWx1ZS5cblx0KlxuXHQqIEBwYXJhbSB7b2JqZWN0fSBvYmpcblx0KiBAcGFyYW0ge3N0cmluZ30gcHJvcE5hbWVcdFx0XHRcdFx0VGhlIHByb3BlcnR5IG5hbWUgb2YgdGhlIGFycmF5IHRvIGJ1YmJsZSB1cFxuXHQqIEBwYXJhbSB7ZnVuY3Rpb259IGZuXHRcdFx0XHRcdFx0XHRUaGUgdGVzdCBjYWxsYmFjayB0byBiZSBhcHBsaWVkIHRvIGVhY2ggb2JqZWN0XG5cdCogQHBhcmFtIHthcnJheX0gYnJlYWRjcnVtYlx0XHRcdFx0XHRUaGUgYnJlYWRjcnVtYiB0aHJvdWdoIHRoZSBjaGFpbiBvZiB0aGUgZmlyc3QgbWF0Y2hcblx0KiBAcmV0dXJucyB7bWl4ZWR9XG5cdCovXG5cdF9wcml2YXRlLnNlYXJjaF9vYmpfcmVjdXJzaXZlbHkgPSBmdW5jdGlvbihvYmoscHJvcE5hbWUsZm4sYnJlYWRjcnVtYil7XG5cblx0XHRcdGlmKHR5cGVvZiBicmVhZGNydW1iID09PSAndW5kZWZpbmVkJyl7XG5cdFx0XHRcdFx0YnJlYWRjcnVtYiA9IFtvYmouaWRdO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgcjE7XG5cblx0XHRcdGZvcih2YXIgaSBpbiBvYmpbcHJvcE5hbWVdKXtcblxuXHRcdFx0XHRcdC8vUlVOIFRFU1Rcblx0XHRcdFx0XHRyMSA9IGZuKG9ialtwcm9wTmFtZV1baV0pO1xuXG5cdFx0XHRcdFx0aWYocjEgIT09IGZhbHNlKXtcblx0XHRcdFx0XHQvL01BVENIIFJFVFVSTkVELiBSRUNVUlNFIElOVE8gTUFUQ0ggSUYgSEFTIFBST1BFUlRZIE9GIFNBTUUgTkFNRSBUTyBTRUFSQ0hcblx0XHRcdFx0XHRcdFx0Ly9DSEVDSyBUSEFUIFdFIEFSRU4nVCBDQVVHSFQgSU4gQSBDSVJDVUxBUiBMT09QXG5cdFx0XHRcdFx0XHRcdGlmKGJyZWFkY3J1bWIuaW5kZXhPZihyMSkgIT09IC0xKXtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoW1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFwiQ2lyY3VsYXIgY29uZGl0aW9uIGluIHJlY3Vyc2l2ZSBzZWFyY2ggb2Ygb2JqIHByb3BlcnR5ICdcIlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQrcHJvcE5hbWUrXCInIG9mIG9iamVjdCBcIlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQrKCh0eXBlb2Ygb2JqLmlkICE9PSAndW5kZWZpbmVkJykgPyBcIidcIitvYmouaWQrXCInXCIgOiAnJylcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0K1wiLiBPZmZlbmRpbmcgdmFsdWU6IFwiK3IxXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhZGNydW1iLnB1c2gocjEpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gYnJlYWRjcnVtYi5qb2luKFwiIFtkZXBlbmRzIG9uXT0+IFwiKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9KSgpXG5cdFx0XHRcdFx0XHRcdFx0XHRdKTtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdGJyZWFkY3J1bWIucHVzaChyMSk7XG5cblx0XHRcdFx0XHRcdFx0aWYob2JqW3Byb3BOYW1lXVtpXVtwcm9wTmFtZV0pe1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIF9wcml2YXRlLnNlYXJjaF9vYmpfcmVjdXJzaXZlbHkob2JqW3Byb3BOYW1lXVtpXSxwcm9wTmFtZSxmbixicmVhZGNydW1iKTtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gYnJlYWRjcnVtYjtcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIHByb21pc2UgZGVzY3JpcHRpb24gaW50byBhIHByb21pc2UuXG5cdCAqXG5cdCAqIEBwYXJhbSB7dHlwZX0gb2JqXG5cdCAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG5cdCAqL1xuXHRfcHJpdmF0ZS5jb252ZXJ0X3RvX3Byb21pc2UgPSBmdW5jdGlvbihvYmosb3B0aW9ucyl7XG5cblx0XHRcdG9iai5pZCA9IG9iai5pZCB8fCBvcHRpb25zLmlkO1xuXG5cdFx0XHQvL0F1dG9uYW1lXG5cdFx0XHRpZiAoIW9iai5pZCkge1xuXHRcdFx0XHRpZiAob2JqLnR5cGUgPT09ICd0aW1lcicpIHtcblx0XHRcdFx0XHRvYmouaWQgPSBcInRpbWVyLVwiICsgb2JqLnRpbWVvdXQgKyBcIi1cIiArICgrK0Nscy5wcml2YXRlLmNvbmZpZy5pKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmICh0eXBlb2Ygb2JqLnVybCA9PT0gJ3N0cmluZycpIHtcblx0XHRcdFx0XHRvYmouaWQgPSBvYmoudXJsLnNwbGl0KFwiL1wiKS5wb3AoKTtcblx0XHRcdFx0XHQvL1JFTU9WRSAuanMgRlJPTSBJRFxuXHRcdFx0XHRcdGlmIChvYmouaWQuc2VhcmNoKFwiLmpzXCIpICE9PSAtMSkge1xuXHRcdFx0XHRcdFx0b2JqLmlkID0gb2JqLmlkLnNwbGl0KFwiLlwiKTtcblx0XHRcdFx0XHRcdG9iai5pZC5wb3AoKTtcblx0XHRcdFx0XHRcdG9iai5pZCA9IG9iai5pZC5qb2luKFwiLlwiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly9SZXR1cm4gaWYgYWxyZWFkeSBleGlzdHNcblx0XHRcdGlmKENscy5wcml2YXRlLmNvbmZpZy5saXN0W29iai5pZF0gJiYgb2JqLnR5cGUgIT09ICd0aW1lcicpe1xuXHRcdFx0XHQvL0EgcHJldmlvdXMgcHJvbWlzZSBvZiB0aGUgc2FtZSBpZCBleGlzdHMuXG5cdFx0XHRcdC8vTWFrZSBzdXJlIHRoaXMgZGVwZW5kZW5jeSBvYmplY3QgZG9lc24ndCBoYXZlIGFcblx0XHRcdFx0Ly9yZXNvbHZlciAtIGlmIGl0IGRvZXMgZXJyb3Jcblx0XHRcdFx0aWYob2JqLnJlc29sdmVyKXtcblx0XHRcdFx0XHRDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoW1xuXHRcdFx0XHRcdFx0XCJZb3UgY2FuJ3Qgc2V0IGEgcmVzb2x2ZXIgb24gYSBxdWV1ZSB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gZGVjbGFyZWQuIFlvdSBjYW4gb25seSByZWZlcmVuY2UgdGhlIG9yaWdpbmFsLlwiXG5cdFx0XHRcdFx0XHQsXCJEZXRlY3RlZCByZS1pbml0IG9mICdcIiArIG9iai5pZCArIFwiJy5cIlxuXHRcdFx0XHRcdFx0LFwiQXR0ZW1wdGVkOlwiXG5cdFx0XHRcdFx0XHQsb2JqXG5cdFx0XHRcdFx0XHQsXCJFeGlzdGluZzpcIlxuXHRcdFx0XHRcdFx0LENscy5wcml2YXRlLmNvbmZpZy5saXN0W29iai5pZF1cblx0XHRcdFx0XHRdKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcubGlzdFtvYmouaWRdO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblxuXHRcdFx0Ly9Db252ZXJ0IGRlcGVuZGVuY3kgdG8gYW4gaW5zdGFuY2Vcblx0XHRcdHZhciBkZWY7XG5cdFx0XHRzd2l0Y2godHJ1ZSl7XG5cblx0XHRcdFx0XHQvL0V2ZW50XG5cdFx0XHRcdFx0Y2FzZShvYmoudHlwZSA9PT0gJ2V2ZW50Jyk6XG5cdFx0XHRcdFx0XHRcdGRlZiA9IF9wcml2YXRlLndyYXBfZXZlbnQob2JqKTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRjYXNlKG9iai50eXBlID09PSAncXVldWUnKTpcblx0XHRcdFx0XHRcdFx0ZGVmID0gQ2xzLnB1YmxpYy5xdWV1ZShvYmouZGVwZW5kZW5jaWVzLG9iaik7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0Ly9BbHJlYWR5IGEgdGhlbmFibGVcblx0XHRcdFx0XHRjYXNlKHR5cGVvZiBvYmoudGhlbiA9PT0gJ2Z1bmN0aW9uJyk6XG5cblx0XHRcdFx0XHRcdFx0c3dpdGNoKHRydWUpe1xuXG5cdFx0XHRcdFx0XHRcdFx0XHQvL1JlZmVyZW5jZSB0byBhbiBleGlzdGluZyBpbnN0YW5jZVxuXHRcdFx0XHRcdFx0XHRcdFx0Y2FzZSh0eXBlb2Ygb2JqLmlkID09PSAnc3RyaW5nJyk6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiJ1wiK29iai5pZCArXCInOiBkaWQgbm90IGV4aXN0LiBBdXRvIGNyZWF0aW5nIG5ldyBkZWZlcnJlZC5cIik7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmID0gX3ByaXZhdGUuZGVmZXJyZWQoe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpZCA6IG9iai5pZFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly9JZiBvYmplY3Qgd2FzIGEgdGhlbmFibGUsIHJlc29sdmUgdGhlIG5ldyBkZWZlcnJlZCB3aGVuIHRoZW4gY2FsbGVkXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYob2JqLnRoZW4pe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0b2JqLnRoZW4oZnVuY3Rpb24ocil7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGRlZi5yZXNvbHZlKHIpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHQvL09CSkVDVCBQUk9QRVJUWSAucHJvbWlzZSBFWFBFQ1RFRCBUTyBSRVRVUk4gQSBQUk9NSVNFXG5cdFx0XHRcdFx0XHRcdFx0XHRjYXNlKHR5cGVvZiBvYmoucHJvbWlzZSA9PT0gJ2Z1bmN0aW9uJyk6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYob2JqLnNjb3BlKXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmID0gb2JqLnByb21pc2UuY2FsbChvYmouc2NvcGUpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkZWYgPSBvYmoucHJvbWlzZSgpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0XHRcdFx0Ly9PYmplY3QgaXMgYSB0aGVuYWJsZVxuXHRcdFx0XHRcdFx0XHRcdFx0Y2FzZShvYmoudGhlbik6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmID0gb2JqO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRkZWZhdWx0OlxuXG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHQvL0NoZWNrIGlmIGlzIGEgdGhlbmFibGVcblx0XHRcdFx0XHRcdFx0aWYodHlwZW9mIGRlZiAhPT0gJ29iamVjdCcgfHwgIWRlZi50aGVuKXtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoXCJEZXBlbmRlbmN5IGxhYmVsZWQgYXMgYSBwcm9taXNlIGRpZCBub3QgcmV0dXJuIGEgcHJvbWlzZS5cIixvYmopO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0Y2FzZShvYmoudHlwZSA9PT0gJ3RpbWVyJyk6XG5cdFx0XHRcdFx0XHRcdGRlZiA9IF9wcml2YXRlLndyYXBfdGltZXIob2JqKTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHQvL0xvYWQgZmlsZVxuXHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRcdG9iai50eXBlID0gb2JqLnR5cGUgfHwgXCJkZWZhdWx0XCI7XG5cdFx0XHRcdFx0XHRcdC8vSW5oZXJpdCBwYXJlbnQncyBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5XG5cdFx0XHRcdFx0XHRcdGlmKG9wdGlvbnMucGFyZW50ICYmIG9wdGlvbnMucGFyZW50LmN3ZCl7XG5cdFx0XHRcdFx0XHRcdFx0b2JqLmN3ZCA9IG9wdGlvbnMucGFyZW50LmN3ZDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRkZWYgPSBfcHJpdmF0ZS53cmFwX3hocihvYmopO1xuXHRcdFx0fVxuXG5cdFx0XHQvL0luZGV4IHByb21pc2UgYnkgaWQgZm9yIGZ1dHVyZSByZWZlcmVuY2luZ1xuXHRcdFx0Q2xzLnByaXZhdGUuY29uZmlnLmxpc3Rbb2JqLmlkXSA9IGRlZjtcblxuXHRcdFx0cmV0dXJuIGRlZjtcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBAdG9kbzogcmVkbyB0aGlzXG5cdCAqXG5cdCAqIENvbnZlcnRzIGEgcmVmZXJlbmNlIHRvIGEgRE9NIGV2ZW50IHRvIGEgcHJvbWlzZS5cblx0ICogUmVzb2x2ZWQgb24gZmlyc3QgZXZlbnQgdHJpZ2dlci5cblx0ICpcblx0ICogQHRvZG8gcmVtb3ZlIGpxdWVyeSBkZXBlbmRlbmN5XG5cdCAqXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBvYmpcblx0ICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWQgb2JqZWN0XG5cdCAqL1xuXHRfcHJpdmF0ZS53cmFwX2V2ZW50ID0gZnVuY3Rpb24ob2JqKXtcblxuXHRcdFx0dmFyIGRlZiA9IENscy5wdWJsaWMuZGVmZXJyZWQoe1xuXHRcdFx0XHRcdGlkIDogb2JqLmlkXG5cdFx0XHR9KTtcblxuXG5cdFx0XHRpZih0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKXtcblxuXHRcdFx0XHRcdGlmKHR5cGVvZiAkICE9PSAnZnVuY3Rpb24nKXtcblx0XHRcdFx0XHRcdFx0dmFyIG1zZyA9ICd3aW5kb3cgYW5kIGRvY3VtZW50IGJhc2VkIGV2ZW50cyBkZXBlbmQgb24galF1ZXJ5Jztcblx0XHRcdFx0XHRcdFx0ZGVmLnJlamVjdChtc2cpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0Ly9Gb3Igbm93LCBkZXBlbmQgb24ganF1ZXJ5IGZvciBJRTggRE9NQ29udGVudExvYWRlZCBwb2x5ZmlsbFxuXHRcdFx0XHRcdFx0c3dpdGNoKHRydWUpe1xuXHRcdFx0XHRcdFx0XHRjYXNlKG9iai5pZCA9PT0gJ3JlYWR5JyB8fCBvYmouaWQgPT09ICdET01Db250ZW50TG9hZGVkJyk6XG5cdFx0XHRcdFx0XHRcdFx0JChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0XHRcdGRlZi5yZXNvbHZlKDEpO1xuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRjYXNlKG9iai5pZCA9PT0gJ2xvYWQnKTpcblx0XHRcdFx0XHRcdFx0XHQkKHdpbmRvdykubG9hZChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHRcdFx0ZGVmLnJlc29sdmUoMSk7XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRcdFx0JChkb2N1bWVudCkub24ob2JqLmlkLFwiYm9keVwiLGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdFx0XHRkZWYucmVzb2x2ZSgxKTtcblx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBkZWY7XG5cdH07XG5cblxuXHRfcHJpdmF0ZS53cmFwX3RpbWVyID0gZnVuY3Rpb24ob2JqKXtcblxuXHRcdFx0dmFyIGRlZiA9IENscy5wdWJsaWMuZGVmZXJyZWQoKTtcblxuXHRcdFx0KGZ1bmN0aW9uKGRlZil7XG5cdFx0XHRcdFx0dmFyIF9zdGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0dmFyIF9lbmQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0XHRcdFx0XHRcdFx0ZGVmLnJlc29sdmUoe1xuXHRcdFx0XHRcdFx0XHRcdFx0c3RhcnQgOiBfc3RhcnRcblx0XHRcdFx0XHRcdFx0XHRcdCxlbmQgOiBfZW5kXG5cdFx0XHRcdFx0XHRcdFx0XHQsZWxhcHNlZCA6IF9lbmQgLSBfc3RhcnRcblx0XHRcdFx0XHRcdFx0XHRcdCx0aW1lb3V0IDogb2JqLnRpbWVvdXRcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSxvYmoudGltZW91dCk7XG5cdFx0XHR9KGRlZikpO1xuXG5cdFx0XHRyZXR1cm4gZGVmO1xuXHR9O1xuXG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYSBkZWZlcnJlZCBvYmplY3QgdGhhdCBkZXBlbmRzIG9uIHRoZSBsb2FkaW5nIG9mIGEgZmlsZS5cblx0ICpcblx0ICogQHBhcmFtIHtvYmplY3R9IGRlcFxuXHQgKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZCBvYmplY3Rcblx0ICovXG5cdF9wcml2YXRlLndyYXBfeGhyID0gZnVuY3Rpb24oZGVwKXtcblxuXHRcdFx0dmFyIHJlcXVpcmVkID0gW1wiaWRcIixcInVybFwiXTtcblx0XHRcdGZvcih2YXIgaSBpbiByZXF1aXJlZCl7XG5cdFx0XHRcdGlmKCFkZXBbcmVxdWlyZWRbaV1dKXtcblx0XHRcdFx0XHRyZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFtcblx0XHRcdFx0XHRcdFwiRmlsZSByZXF1ZXN0cyBjb252ZXJ0ZWQgdG8gcHJvbWlzZXMgcmVxdWlyZTogXCIgKyByZXF1aXJlZFtpXVxuXHRcdFx0XHRcdFx0LFwiTWFrZSBzdXJlIHlvdSB3ZXJlbid0IGV4cGVjdGluZyBkZXBlbmRlbmN5IHRvIGFscmVhZHkgaGF2ZSBiZWVuIHJlc29sdmVkIHVwc3RyZWFtLlwiXG5cdFx0XHRcdFx0XHQsZGVwXG5cdFx0XHRcdFx0XSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly9JRiBQUk9NSVNFIEZPUiBUSElTIFVSTCBBTFJFQURZIEVYSVNUUywgUkVUVVJOIElUXG5cdFx0XHRpZihDbHMucHJpdmF0ZS5jb25maWcubGlzdFtkZXAuaWRdKXtcblx0XHRcdFx0cmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5saXN0W2RlcC5pZF07XG5cdFx0XHR9XG5cblx0XHRcdC8vQ09OVkVSVCBUTyBERUZFUlJFRDpcblx0XHRcdHZhciBkZWYgPSBDbHMucHVibGljLmRlZmVycmVkKGRlcCk7XG5cblx0XHRcdGlmKHR5cGVvZiBDbHMucHVibGljLmZpbGVfbG9hZGVyW0Nscy5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy5tb2RlXVtkZXAudHlwZV0gIT09ICd1bmRlZmluZWQnKXtcblx0XHRcdFx0Q2xzLnB1YmxpYy5maWxlX2xvYWRlcltDbHMucHJpdmF0ZS5jb25maWcuc2V0dGluZ3MubW9kZV1bZGVwLnR5cGVdKGRlcC51cmwsZGVmLGRlcCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNle1xuXHRcdFx0XHRDbHMucHVibGljLmZpbGVfbG9hZGVyW0Nscy5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy5tb2RlXVsnZGVmYXVsdCddKGRlcC51cmwsZGVmLGRlcCk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBkZWY7XG5cdH07XG5cblx0LyoqXG5cdCogQSBcInNpZ25hbFwiIGhlcmUgY2F1c2VzIGEgcXVldWUgdG8gbG9vayB0aHJvdWdoIGVhY2ggaXRlbVxuXHQqIGluIGl0cyB1cHN0cmVhbSBhbmQgY2hlY2sgdG8gc2VlIGlmIGFsbCBhcmUgcmVzb2x2ZWQuXG5cdCpcblx0KiBTaWduYWxzIGNhbiBvbmx5IGJlIHJlY2VpdmVkIGJ5IGEgcXVldWUgaXRzZWxmIG9yIGFuIGluc3RhbmNlXG5cdCogaW4gaXRzIHVwc3RyZWFtLlxuXHQqXG5cdCogQHBhcmFtIHtvYmplY3R9IHRhcmdldFxuXHQqIEBwYXJhbSB7c3RyaW5nfSBmcm9tX2lkXG5cdCogQHJldHVybnMge3ZvaWR9XG5cdCovXG5cdF9wcml2YXRlLnJlY2VpdmVfc2lnbmFsID0gZnVuY3Rpb24odGFyZ2V0LGZyb21faWQpe1xuXG5cdFx0aWYodGFyZ2V0LmhhbHRfcmVzb2x1dGlvbiA9PT0gMSkgcmV0dXJuO1xuXG5cdFx0Ly9NQUtFIFNVUkUgVEhFIFNJR05BTCBXQVMgRlJPTSBBIFBST01JU0UgQkVJTkcgTElTVEVORUQgVE9cblx0IC8vQlVUIEFMTE9XIFNFTEYgU1RBVFVTIENIRUNLXG5cdCB2YXIgc3RhdHVzO1xuXHQgaWYoZnJvbV9pZCAhPT0gdGFyZ2V0LmlkICYmICF0YXJnZXQudXBzdHJlYW1bZnJvbV9pZF0pe1xuXHRcdFx0IHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoZnJvbV9pZCArIFwiIGNhbid0IHNpZ25hbCBcIiArIHRhcmdldC5pZCArIFwiIGJlY2F1c2Ugbm90IGluIHVwc3RyZWFtLlwiKTtcblx0IH1cblx0IC8vUlVOIFRIUk9VR0ggUVVFVUUgT0YgT0JTRVJWSU5HIFBST01JU0VTIFRPIFNFRSBJRiBBTEwgRE9ORVxuXHQgZWxzZXtcblx0XHRcdCBzdGF0dXMgPSAxO1xuXHRcdFx0IGZvcih2YXIgaSBpbiB0YXJnZXQudXBzdHJlYW0pe1xuXHRcdFx0XHRcdCAvL1NFVFMgU1RBVFVTIFRPIDAgSUYgQU5ZIE9CU0VSVklORyBIQVZFIEZBSUxFRCwgQlVUIE5PVCBJRiBQRU5ESU5HIE9SIFJFU09MVkVEXG5cdFx0XHRcdFx0IGlmKHRhcmdldC51cHN0cmVhbVtpXS5zdGF0ZSAhPT0gMSkge1xuXHRcdFx0XHRcdFx0XHQgc3RhdHVzID0gdGFyZ2V0LnVwc3RyZWFtW2ldLnN0YXRlO1xuXHRcdFx0XHRcdFx0XHQgYnJlYWs7XG5cdFx0XHRcdFx0IH1cblx0XHRcdCB9XG5cdCB9XG5cblx0IC8vUkVTT0xWRSBRVUVVRSBJRiBVUFNUUkVBTSBGSU5JU0hFRFxuXHQgaWYoc3RhdHVzID09PSAxKXtcblxuXHRcdFx0Ly9HRVQgUkVUVVJOIFZBTFVFUyBQRVIgREVQRU5ERU5DSUVTLCBXSElDSCBTQVZFUyBPUkRFUiBBTkRcblx0XHRcdC8vUkVQT1JUUyBEVVBMSUNBVEVTXG5cdFx0XHR2YXIgdmFsdWVzID0gW107XG5cdFx0XHRmb3IodmFyIGkgaW4gdGFyZ2V0LmRlcGVuZGVuY2llcyl7XG5cdFx0XHRcdHZhbHVlcy5wdXNoKHRhcmdldC5kZXBlbmRlbmNpZXNbaV0udmFsdWUpO1xuXHRcdFx0fVxuXG5cdFx0XHR0YXJnZXQucmVzb2x2ZS5jYWxsKHRhcmdldCx2YWx1ZXMpO1xuXHQgfVxuXG5cdCBpZihzdGF0dXMgPT09IDIpe1xuXHRcdFx0IHZhciBlcnIgPSBbXG5cdFx0XHRcdFx0IHRhcmdldC5pZCtcIiBkZXBlbmRlbmN5ICdcIit0YXJnZXQudXBzdHJlYW1baV0uaWQgKyBcIicgd2FzIHJlamVjdGVkLlwiXG5cdFx0XHRcdFx0ICx0YXJnZXQudXBzdHJlYW1baV0uYXJndW1lbnRzXG5cdFx0XHQgXTtcblx0XHRcdCB0YXJnZXQucmVqZWN0LmFwcGx5KHRhcmdldCxlcnIpO1xuXHQgfVxuXHR9O1xuXG5cblxuXG5cdHZhciBfcHVibGljID0ge307XG5cblx0X3B1YmxpYy5pc19vcmd5ID0gdHJ1ZTtcblxuXHRfcHVibGljLmlkID0gbnVsbDtcblxuXHQvL0EgQ09VTlRFUiBGT1IgQVVUMC1HRU5FUkFURUQgUFJPTUlTRSBJRCdTXG5cdF9wdWJsaWMuc2V0dGxlZCA9IDA7XG5cblx0LyoqXG5cdCogU1RBVEUgQ09ERVM6XG5cdCogLS0tLS0tLS0tLS0tLS0tLS0tXG5cdCogLTFcdCA9PiBTRVRUTElORyBbRVhFQ1VUSU5HIENBTExCQUNLU11cblx0KiAgMFx0ID0+IFBFTkRJTkdcblx0KiAgMVx0ID0+IFJFU09MVkVEIC8gRlVMRklMTEVEXG5cdCogIDJcdCA9PiBSRUpFQ1RFRFxuXHQqL1xuXHRfcHVibGljLnN0YXRlID0gMDtcblxuXHRfcHVibGljLnZhbHVlID0gW107XG5cblx0Ly9UaGUgbW9zdCByZWNlbnQgdmFsdWUgZ2VuZXJhdGVkIGJ5IHRoZSB0aGVuLT5kb25lIGNoYWluLlxuXHRfcHVibGljLmNhYm9vc2UgPSBudWxsO1xuXG5cdF9wdWJsaWMubW9kZWwgPSBcImRlZmVycmVkXCI7XG5cblx0X3B1YmxpYy5kb25lX2ZpcmVkID0gMDtcblxuXHRfcHVibGljLnRpbWVvdXRfaWQgPSBudWxsO1xuXG5cdF9wdWJsaWMuY2FsbGJhY2tfc3RhdGVzID0ge1xuXHRcdHJlc29sdmUgOiAwXG5cdFx0LHRoZW4gOiAwXG5cdFx0LGRvbmUgOiAwXG5cdFx0LHJlamVjdCA6IDBcblx0fTtcblxuXHQvKipcblx0KiBTZWxmIGV4ZWN1dGluZyBmdW5jdGlvbiB0byBpbml0aWFsaXplIGNhbGxiYWNrIGV2ZW50XG5cdCogbGlzdC5cblx0KlxuXHQqIFJldHVybnMgYW4gb2JqZWN0IHdpdGggdGhlIHNhbWUgcHJvcGVydHlOYW1lcyBhc1xuXHQqIF9wdWJsaWMuY2FsbGJhY2tfc3RhdGVzOiBhZGRpbmcgYm9pbGVycGxhdGVcblx0KiBwcm9wZXJ0aWVzIGZvciBlYWNoXG5cdCpcblx0KiBAcmV0dXJucyB7b2JqZWN0fVxuXHQqL1xuXHRfcHVibGljLmNhbGxiYWNrcyA9IChmdW5jdGlvbigpe1xuXG5cdFx0dmFyIG8gPSB7fTtcblxuXHRcdGZvcih2YXIgaSBpbiBfcHVibGljLmNhbGxiYWNrX3N0YXRlcyl7XG5cdFx0XHRvW2ldID0ge1xuXHRcdFx0XHR0cmFpbiA6IFtdXG5cdFx0XHRcdCxob29rcyA6IHtcblx0XHRcdFx0XHRvbkJlZm9yZSA6IHtcblx0XHRcdFx0XHRcdHRyYWluIDogW11cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0LG9uQ29tcGxldGUgOiB7XG5cdFx0XHRcdFx0XHR0cmFpbiA6IFtdXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdHJldHVybiBvO1xuXHR9KSgpO1xuXG5cdC8vUFJPTUlTRSBIQVMgT0JTRVJWRVJTIEJVVCBET0VTIE5PVCBPQlNFUlZFIE9USEVSU1xuXHRfcHVibGljLmRvd25zdHJlYW0gPSB7fTtcblxuXHRfcHVibGljLmV4ZWN1dGlvbl9oaXN0b3J5ID0gW107XG5cblx0Ly9XSEVOIFRSVUUsIEFMTE9XUyBSRS1JTklUIFtGT1IgVVBHUkFERVMgVE8gQSBRVUVVRV1cblx0X3B1YmxpYy5vdmVyd3JpdGFibGUgPSAwO1xuXG5cdC8qKlxuXHQqIFJFTU9URVxuXHQqXG5cdCogUkVNT1RFID09IDEgID0+ICBbREVGQVVMVF0gTWFrZSBodHRwIHJlcXVlc3QgZm9yIGZpbGVcblx0KlxuXHQqIFJFTU9URSA9PSAwICA9PiAgUmVhZCBmaWxlIGRpcmVjdGx5IGZyb20gdGhlIGZpbGVzeXN0ZW1cblx0KlxuXHQqIE9OTFkgQVBQTElFUyBUTyBTQ1JJUFRTIFJVTiBVTkRFUiBOT0RFIEFTIEJST1dTRVIgSEFTIE5PXG5cdCogRklMRVNZU1RFTSBBQ0NFU1Ncblx0Ki9cblx0X3B1YmxpYy5yZW1vdGUgPSAxO1xuXG5cdC8vQUREUyBUTyBNQVNURVIgTElTVC4gQUxXQVlTIFRSVUUgVU5MRVNTIFVQR1JBRElORyBBIFBST01JU0UgVE8gQSBRVUVVRVxuXHRfcHVibGljLmxpc3QgPSAxO1xuXG5cblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cdC8vXHRfcHVibGljIE1FVEhPRFNcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuXHQvKipcblx0KiBSZXNvbHZlcyBhIGRlZmVycmVkL3F1ZXVlLlxuXHQqXG5cdCogQG1lbWJlcm9mIG9yZ3kvZGVmZXJyZWRcblx0KiBAZnVuY3Rpb24gb3JneS9kZWZlcnJlZCNyZXNvbHZlXG5cdCpcblx0KiBAcGFyYW0ge21peGVkfSB2YWx1ZSBSZXNvbHZlciB2YWx1ZS5cblx0KiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZC9xdWV1ZVxuXHQqL1xuXHRfcHVibGljLnJlc29sdmUgPSBmdW5jdGlvbih2YWx1ZSl7XG5cblx0XHRpZih0aGlzLnNldHRsZWQgPT09IDEpe1xuXHRcdFx0Q2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFtcblx0XHRcdFx0dGhpcy5pZCArIFwiIGNhbid0IHJlc29sdmUuXCJcblx0XHRcdFx0LFwiT25seSB1bnNldHRsZWQgZGVmZXJyZWRzIGFyZSByZXNvbHZhYmxlLlwiXG5cdFx0XHRdKTtcblx0XHR9XG5cblx0XHQvL1NFVCBTVEFURSBUTyBTRVRUTEVNRU5UIElOIFBST0dSRVNTXG5cdFx0X3ByaXZhdGUuc2V0X3N0YXRlKHRoaXMsLTEpO1xuXG5cdFx0Ly9TRVQgVkFMVUVcblx0XHR0aGlzLnZhbHVlID0gdmFsdWU7XG5cblx0XHQvL1JVTiBSRVNPTFZFUiBCRUZPUkUgUFJPQ0VFRElOR1xuXHRcdC8vRVZFTiBJRiBUSEVSRSBJUyBOTyBSRVNPTFZFUiwgU0VUIElUIFRPIEZJUkVEIFdIRU4gQ0FMTEVEXG5cdFx0aWYoIXRoaXMucmVzb2x2ZXJfZmlyZWQgJiYgdHlwZW9mIHRoaXMucmVzb2x2ZXIgPT09ICdmdW5jdGlvbicpe1xuXG5cdFx0XHR0aGlzLnJlc29sdmVyX2ZpcmVkID0gMTtcblxuXHRcdFx0Ly9BZGQgcmVzb2x2ZXIgdG8gcmVzb2x2ZSB0cmFpblxuXHRcdFx0dHJ5e1xuXHRcdFx0XHR0aGlzLmNhbGxiYWNrcy5yZXNvbHZlLnRyYWluLnB1c2goZnVuY3Rpb24oKXtcblx0XHRcdFx0XHR0aGlzLnJlc29sdmVyKHZhbHVlLHRoaXMpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGNhdGNoKGUpe1xuXHRcdFx0XHRDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGVsc2V7XG5cblx0XHRcdHRoaXMucmVzb2x2ZXJfZmlyZWQgPSAxO1xuXG5cdFx0XHQvL0FkZCBzZXR0bGUgdG8gcmVzb2x2ZSB0cmFpblxuXHRcdFx0Ly9BbHdheXMgc2V0dGxlIGJlZm9yZSBhbGwgb3RoZXIgY29tcGxldGUgY2FsbGJhY2tzXG5cdFx0XHR0aGlzLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4udW5zaGlmdChmdW5jdGlvbigpe1xuXHRcdFx0XHRfcHJpdmF0ZS5zZXR0bGUodGhpcyk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHQvL1J1biByZXNvbHZlXG5cdFx0X3ByaXZhdGUucnVuX3RyYWluKFxuXHRcdFx0dGhpc1xuXHRcdFx0LHRoaXMuY2FsbGJhY2tzLnJlc29sdmVcblx0XHRcdCx0aGlzLnZhbHVlXG5cdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG5cdFx0KTtcblxuXHRcdC8vcmVzb2x2ZXIgaXMgZXhwZWN0ZWQgdG8gY2FsbCByZXNvbHZlIGFnYWluXG5cdFx0Ly9hbmQgdGhhdCB3aWxsIGdldCB1cyBwYXN0IHRoaXMgcG9pbnRcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXG5cdC8qKlxuXHQqIFJlamVjdHMgYSBkZWZlcnJlZC9xdWV1ZVxuXHQqXG5cdCogQG1lbWJlcm9mIG9yZ3kvZGVmZXJyZWRcblx0KiBAZnVuY3Rpb24gb3JneS9kZWZlcnJlZCNyZWplY3Rcblx0KlxuXHQqIEBwYXJhbSB7c3RyaW5nfGFycmF5fSBlcnIgRXJyb3IgaW5mb3JtYXRpb24uXG5cdCogQHJldHVybiB7b2JqZWN0fSBkZWZlcnJlZC9xdWV1ZVxuXHQqL1xuXHRfcHVibGljLnJlamVjdCA9IGZ1bmN0aW9uKGVycil7XG5cblx0XHRpZighKGVyciBpbnN0YW5jZW9mIEFycmF5KSl7XG5cdFx0XHRlcnIgPSBbZXJyXTtcblx0XHR9XG5cblx0XHR2YXIgbXNnID0gXCJSZWplY3RlZCBcIit0aGlzLm1vZGVsK1wiOiAnXCIrdGhpcy5pZCtcIicuXCJcblxuXHRcdGlmKENscy5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy5kZWJ1Z19tb2RlKXtcblx0XHRcdGVyci51bnNoaWZ0KG1zZyk7XG5cdFx0XHRDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoZXJyLHRoaXMpO1xuXHRcdH1cblxuXHRcdC8vUmVtb3ZlIGF1dG8gdGltZW91dCB0aW1lclxuXHRcdGlmKHRoaXMudGltZW91dF9pZCl7XG5cdFx0XHRjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0X2lkKTtcblx0XHR9XG5cblx0XHQvL1NldCBzdGF0ZSB0byByZWplY3RlZFxuXHRcdF9wcml2YXRlLnNldF9zdGF0ZSh0aGlzLDIpO1xuXG5cdFx0Ly9FeGVjdXRlIHJlamVjdGlvbiBxdWV1ZVxuXHRcdF9wcml2YXRlLnJ1bl90cmFpbihcblx0XHRcdHRoaXNcblx0XHRcdCx0aGlzLmNhbGxiYWNrcy5yZWplY3Rcblx0XHRcdCxlcnJcblx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cblx0XHQpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblxuXHQvKipcblx0KiBDaGFpbiBtZXRob2RcblxuXHQ8Yj5Vc2FnZTo8L2I+XG5cdGBgYFxuXHR2YXIgT3JneSA9IHJlcXVpcmUoXCJvcmd5XCIpLFxuXHRcdFx0XHRcdHEgPSBPcmd5LmRlZmVycmVkKHtcblx0XHRcdFx0XHRcdGlkIDogXCJxMVwiXG5cdFx0XHRcdFx0fSk7XG5cblx0Ly9SZXNvbHZlIHRoZSBkZWZlcnJlZFxuXHRxLnJlc29sdmUoXCJTb21lIHZhbHVlLlwiKTtcblxuXHRxLnRoZW4oZnVuY3Rpb24ocil7XG5cdFx0Y29uc29sZS5sb2cocik7IC8vU29tZSB2YWx1ZS5cblx0fSlcblxuXHRgYGBcblxuXHQqIEBtZW1iZXJvZiBvcmd5L2RlZmVycmVkXG5cdCogQGZ1bmN0aW9uIG9yZ3kvZGVmZXJyZWQjdGhlblxuXHQqXG5cdCogQHBhcmFtIHtmdW5jdGlvbn0gZm4gQ2FsbGJhY2sgZnVuY3Rpb25cblx0KiBAcGFyYW0ge2Z1bmN0aW9ufSByZWplY3RvciBSZWplY3Rpb24gY2FsbGJhY2sgZnVuY3Rpb25cblx0KiBAcmV0dXJuIHtvYmplY3R9IGRlZmVycmVkL3F1ZXVlXG5cdCovXG5cdF9wdWJsaWMudGhlbiA9IGZ1bmN0aW9uKGZuLHJlamVjdG9yKXtcblxuXHRcdHN3aXRjaCh0cnVlKXtcblxuXHRcdFx0Ly9BbiBlcnJvciB3YXMgcHJldmlvdXNseSB0aHJvd24sIGFkZCByZWplY3RvciAmIGJhaWwgb3V0XG5cdFx0XHRjYXNlKHRoaXMuc3RhdGUgPT09IDIpOlxuXHRcdFx0XHRpZih0eXBlb2YgcmVqZWN0b3IgPT09ICdmdW5jdGlvbicpe1xuXHRcdFx0XHRcdHRoaXMuY2FsbGJhY2tzLnJlamVjdC50cmFpbi5wdXNoKHJlamVjdG9yKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Ly9FeGVjdXRpb24gY2hhaW4gYWxyZWFkeSBmaW5pc2hlZC4gQmFpbCBvdXQuXG5cdFx0XHRjYXNlKHRoaXMuZG9uZV9maXJlZCA9PT0gMSk6XG5cdFx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcodGhpcy5pZCtcIiBjYW4ndCBhdHRhY2ggLnRoZW4oKSBiZWNhdXNlIC5kb25lKCkgaGFzIGFscmVhZHkgZmlyZWQsIGFuZCB0aGF0IG1lYW5zIHRoZSBleGVjdXRpb24gY2hhaW4gaXMgY29tcGxldGUuXCIpO1xuXG5cdFx0XHRkZWZhdWx0OlxuXG5cdFx0XHRcdC8vUHVzaCBjYWxsYmFjayB0byB0aGVuIHF1ZXVlXG5cdFx0XHRcdHRoaXMuY2FsbGJhY2tzLnRoZW4udHJhaW4ucHVzaChmbik7XG5cblx0XHRcdFx0Ly9QdXNoIHJlamVjdCBjYWxsYmFjayB0byB0aGUgcmVqZWN0aW9uIHF1ZXVlXG5cdFx0XHRcdGlmKHR5cGVvZiByZWplY3RvciA9PT0gJ2Z1bmN0aW9uJyl7XG5cdFx0XHRcdFx0dGhpcy5jYWxsYmFja3MucmVqZWN0LnRyYWluLnB1c2gocmVqZWN0b3IpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly9TZXR0bGVkLCBydW4gdHJhaW4gbm93XG5cdFx0XHRcdGlmKHRoaXMuc2V0dGxlZCA9PT0gMSAmJiB0aGlzLnN0YXRlID09PSAxICYmICF0aGlzLmRvbmVfZmlyZWQpe1xuXHRcdFx0XHRcdF9wcml2YXRlLnJ1bl90cmFpbihcblx0XHRcdFx0XHRcdHRoaXNcblx0XHRcdFx0XHRcdCx0aGlzLmNhbGxiYWNrcy50aGVuXG5cdFx0XHRcdFx0XHQsdGhpcy5jYWJvb3NlXG5cdFx0XHRcdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogdHJ1ZX1cblx0XHRcdFx0XHQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vVW5zZXR0bGVkLCB0cmFpbiB3aWxsIGJlIHJ1biB3aGVuIHNldHRsZWRcblx0XHRcdFx0Ly9lbHNle31cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXG5cdC8qKlxuXHQqIERvbmUgY2FsbGJhY2suXG5cdCpcblx0KiBAbWVtYmVyb2Ygb3JneS9kZWZlcnJlZFxuXHQqIEBmdW5jdGlvbiBvcmd5L2RlZmVycmVkI2RvbmVcblx0KlxuXHQqIEBwYXJhbSB7ZnVuY3Rpb259IGZuIENhbGxiYWNrIGZ1bmN0aW9uXG5cdCogQHBhcmFtIHtmdW5jdGlvbn0gcmVqZWN0b3IgUmVqZWN0aW9uIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWQvcXVldWVcblx0Ki9cblx0X3B1YmxpYy5kb25lID0gZnVuY3Rpb24oZm4scmVqZWN0b3Ipe1xuXG5cdFx0aWYodGhpcy5jYWxsYmFja3MuZG9uZS50cmFpbi5sZW5ndGggPT09IDBcblx0XHRcdCYmIHRoaXMuZG9uZV9maXJlZCA9PT0gMCl7XG5cdFx0XHRcdGlmKHR5cGVvZiBmbiA9PT0gJ2Z1bmN0aW9uJyl7XG5cblx0XHRcdFx0XHQvL3dyYXAgY2FsbGJhY2sgd2l0aCBzb21lIG90aGVyIGNvbW1hbmRzXG5cdFx0XHRcdFx0dmFyIGZuMiA9IGZ1bmN0aW9uKHIsZGVmZXJyZWQsbGFzdCl7XG5cblx0XHRcdFx0XHRcdC8vRG9uZSBjYW4gb25seSBiZSBjYWxsZWQgb25jZSwgc28gbm90ZSB0aGF0IGl0IGhhcyBiZWVuXG5cdFx0XHRcdFx0XHRkZWZlcnJlZC5kb25lX2ZpcmVkID0gMTtcblxuXHRcdFx0XHRcdFx0Zm4ocixkZWZlcnJlZCxsYXN0KTtcblx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0dGhpcy5jYWxsYmFja3MuZG9uZS50cmFpbi5wdXNoKGZuMik7XG5cblx0XHRcdFx0XHQvL1B1c2ggcmVqZWN0IGNhbGxiYWNrIHRvIHRoZSByZWplY3Rpb24gcXVldWUgb25Db21wbGV0ZVxuXHRcdFx0XHRcdGlmKHR5cGVvZiByZWplY3RvciA9PT0gJ2Z1bmN0aW9uJyl7XG5cdFx0XHRcdFx0XHR0aGlzLmNhbGxiYWNrcy5yZWplY3QuaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKHJlamVjdG9yKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvL1NldHRsZWQsIHJ1biB0cmFpbiBub3dcblx0XHRcdFx0XHRpZih0aGlzLnNldHRsZWQgPT09IDEpe1xuXHRcdFx0XHRcdFx0aWYodGhpcy5zdGF0ZSA9PT0gMSl7XG5cdFx0XHRcdFx0XHRcdF9wcml2YXRlLnJ1bl90cmFpbihcblx0XHRcdFx0XHRcdFx0XHR0aGlzXG5cdFx0XHRcdFx0XHRcdFx0LHRoaXMuY2FsbGJhY2tzLmRvbmVcblx0XHRcdFx0XHRcdFx0XHQsdGhpcy5jYWJvb3NlXG5cdFx0XHRcdFx0XHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRcdFx0X3ByaXZhdGUucnVuX3RyYWluKFxuXHRcdFx0XHRcdFx0XHRcdHRoaXNcblx0XHRcdFx0XHRcdFx0XHQsdGhpcy5jYWxsYmFja3MucmVqZWN0XG5cdFx0XHRcdFx0XHRcdFx0LHRoaXMuY2Fib29zZVxuXHRcdFx0XHRcdFx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly9VbnNldHRsZWQsIHRyYWluIHdpbGwgYmUgcnVuIHdoZW4gc2V0dGxlZFxuXHRcdFx0XHRcdC8vZWxzZXt9XG5cdFx0XHR9XG5cdFx0XHRlbHNle1xuXHRcdFx0XHRyZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFwiZG9uZSgpIG11c3QgYmUgcGFzc2VkIGEgZnVuY3Rpb24uXCIpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNle1xuXHRcdFx0cmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcImRvbmUoKSBjYW4gb25seSBiZSBjYWxsZWQgb25jZS5cIik7XG5cdFx0fVxuXHRcdFxuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cblx0LyoqXG5cdCAqIEFsbG93cyBhIHByZXByb2Nlc3NvciB0byBzZXQgYmFja3JhY2UgZGF0YSBvbiBhbiBPcmd5IG9iamVjdC5cblx0ICogQHBhcmFtICB7c3RyaW5nfSBzdHIgZmlsZW5hbWU6bGluZSBudW1iZXJcblx0ICogQHJldHVybiB7b2JqZWN0fSBkZWZlcnJlZC9xdWV1ZVxuXHQgKi9cblx0X3B1YmxpYy5fYnRyYyA9IGZ1bmN0aW9uKHN0cil7XG5cdFx0dGhpcy5iYWNrdHJhY2UgPSBzdHI7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblxuXHQvKipcblx0KiBDcmVhdGVzIGEgbmV3IGRlZmVycmVkIG9iamVjdCBvciBpZiBvbmUgZXhpc3RzIGJ5IHRoZSBzYW1lIGlkLFxuXHQqIHJldHVybnMgaXQuXG5cblx0PGI+VXNhZ2U6PC9iPlxuXHRgYGBcblx0dmFyIE9yZ3kgPSByZXF1aXJlKFwib3JneVwiKSxcblx0cSA9IE9yZ3kuZGVmZXJyZWQoe1xuXHRpZCA6IFwicTFcIlxuXHR9KTtcblx0YGBgXG5cblx0KiBAbWVtYmVyb2Ygb3JneVxuXHQqIEBmdW5jdGlvbiBkZWZlcnJlZFxuXHQqXG5cdCogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgTGlzdCBvZiBvcHRpb25zOlxuXHQqXG5cdCogIC0gPGI+aWQ8L2I+IHtzdHJpbmd9IFVuaXF1ZSBpZCBvZiB0aGUgb2JqZWN0LlxuXHQqXHRcdC0gQ2FuIGJlIHVzZWQgd2l0aCBPcmd5LmdldChpZCkuXG5cdCpcdFx0LSBPcHRpb25hbC5cblx0KlxuXHQqXG5cdCogIC0gPGI+dGltZW91dDwvYj4ge251bWJlcn0gVGltZSBpbiBtcyBhZnRlciB3aGljaCByZWplY3QgaXMgY2FsbGVkIGlmIG5vdCB5ZXQgcmVzb2x2ZWQuXG5cdC0gRGVmYXVsdHMgdG8gT3JneS5jb25maWcoKS50aW1lb3V0LlxuXHQtIERlbGF5cyBpbiBvYmplY3QudGhlbigpIGFuZCBvYmplY3QuZG9uZSgpIHdvbid0IG5vdCB0cmlnZ2VyIHRoaXMsIGJlY2F1c2UgdGhvc2UgbWV0aG9kcyBydW4gYWZ0ZXIgcmVzb2x2ZS5cblx0KlxuXHQqIEByZXR1cm5zIHtvYmplY3R9IHtAbGluayBvcmd5L2RlZmVycmVkfVxuXHQqL1xuXHRDbHMucHVibGljLmRlZmVycmVkID0gZnVuY3Rpb24ob3B0aW9ucyl7XG5cblx0XHR2YXIgX287XG5cdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cblx0XHRpZihvcHRpb25zLmlkICYmIENscy5wcml2YXRlLmNvbmZpZy5saXN0W29wdGlvbnMuaWRdKXtcblx0XHRcdF9vID0gQ2xzLnByaXZhdGUuY29uZmlnLmxpc3Rbb3B0aW9ucy5pZF07XG5cdFx0fVxuXHRcdGVsc2V7XG5cblx0XHRcdC8vQ3JlYXRlIGEgbmV3IGRlZmVycmVkIG9iamVjdFxuXHRcdFx0X28gPSBDbHMucHJpdmF0ZS5jb25maWcubmFpdmVfY2xvbmVyKFtfcHVibGljXSxbb3B0aW9uc10pO1xuXG5cdFx0XHQvL0FDVElWQVRFIERFRkVSUkVEXG5cdFx0XHRfbyA9IF9wcml2YXRlLmFjdGl2YXRlKF9vKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gX287XG5cdH07XG5cblx0X3ByaXZhdGUucHVibGljID0gX3B1YmxpYztcblxuXHQvL1NhdmUgZm9yIHJlLXVzZVxuXHRDbHMucHJpdmF0ZS5kZWZlcnJlZCA9IF9wcml2YXRlOyBcblxuXHRyZXR1cm4gQ2xzO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihDbHMpe1xuXG5cdHZhciBfcHVibGljID0ge30sXG5cdFx0XHRfcHJpdmF0ZSA9IHt9O1xuXG5cdF9wdWJsaWMuYnJvd3NlciA9IHt9O1xuXHRfcHVibGljLm5hdGl2ZSA9IHt9O1xuXHRfcHJpdmF0ZS5uYXRpdmUgPSB7fTtcblxuXHQvL0Jyb3dzZXIgbG9hZFxuXG5cdF9wdWJsaWMuYnJvd3Nlci5jc3MgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblxuXHRcdHZhciBoZWFkID1cdGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaGVhZFwiKVswXSB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsXG5cdFx0ZWxlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaW5rXCIpO1xuXG5cdFx0ZWxlbS5zZXRBdHRyaWJ1dGUoXCJocmVmXCIscGF0aCk7XG5cdFx0ZWxlbS5zZXRBdHRyaWJ1dGUoXCJ0eXBlXCIsXCJ0ZXh0L2Nzc1wiKTtcblx0XHRlbGVtLnNldEF0dHJpYnV0ZShcInJlbFwiLFwic3R5bGVzaGVldFwiKTtcblxuXHRcdGlmKGVsZW0ub25sb2FkKXtcblx0XHRcdChmdW5jdGlvbihlbGVtKXtcblx0XHRcdFx0XHRlbGVtLm9ubG9hZCA9IGVsZW0ub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cdFx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKGVsZW0pO1xuXHRcdFx0XHQgfTtcblxuXHRcdFx0XHQgZWxlbS5vbmVycm9yID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cdFx0XHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoXCJGYWlsZWQgdG8gbG9hZCBwYXRoOiBcIiArIHBhdGgpO1xuXHRcdFx0XHQgfTtcblxuXHRcdFx0fShlbGVtLHBhdGgsZGVmZXJyZWQpKTtcblxuXHRcdFx0aGVhZC5hcHBlbmRDaGlsZChlbGVtKTtcblx0XHR9XG5cdFx0ZWxzZXtcblx0XHRcdC8vQUREIGVsZW0gQlVUIE1BS0UgWEhSIFJFUVVFU1QgVE8gQ0hFQ0sgRklMRSBSRUNFSVZFRFxuXHRcdFx0aGVhZC5hcHBlbmRDaGlsZChlbGVtKTtcblx0XHRcdGNvbnNvbGUud2FybihcIk5vIG9ubG9hZCBhdmFpbGFibGUgZm9yIGxpbmsgdGFnLCBhdXRvcmVzb2x2aW5nLlwiKTtcblx0XHRcdGRlZmVycmVkLnJlc29sdmUoZWxlbSk7XG5cdFx0fVxuXHR9O1xuXG5cdF9wdWJsaWMuYnJvd3Nlci5zY3JpcHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblxuXHRcdHZhciBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKTtcblx0XHRlbGVtLnR5cGUgPSAndGV4dC9qYXZhc2NyaXB0Jztcblx0XHRlbGVtLnNldEF0dHJpYnV0ZShcInNyY1wiLHBhdGgpO1xuXG5cdFx0KGZ1bmN0aW9uKGVsZW0scGF0aCxkZWZlcnJlZCl7XG5cdFx0XHRcdGVsZW0ub25sb2FkID0gZWxlbS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdC8vQXV0b3Jlc29sdmUgYnkgZGVmYXVsdFxuXHRcdFx0XHRcdGlmKHR5cGVvZiBkZWZlcnJlZC5hdXRvcmVzb2x2ZSAhPT0gJ2Jvb2xlYW4nXG5cdFx0XHRcdFx0fHwgZGVmZXJyZWQuYXV0b3Jlc29sdmUgPT09IHRydWUpe1xuXHRcdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSgodHlwZW9mIGVsZW0udmFsdWUgIT09ICd1bmRlZmluZWQnKSA/IGVsZW0udmFsdWUgOiBlbGVtKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cdFx0XHRcdGVsZW0ub25lcnJvciA9IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KFwiRXJyb3IgbG9hZGluZzogXCIgKyBwYXRoKTtcblx0XHRcdFx0fTtcblx0XHR9KGVsZW0scGF0aCxkZWZlcnJlZCkpO1xuXG5cdFx0dGhpcy5oZWFkLmFwcGVuZENoaWxkKGVsZW0pO1xuXHR9O1xuXG5cdF9wdWJsaWMuYnJvd3Nlci5odG1sID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCxkZXApe1xuXHRcdHRoaXMuZGVmYXVsdChwYXRoLGRlZmVycmVkLGRlcCk7XG5cdH07XG5cblx0X3B1YmxpYy5icm93c2VyLmRlZmF1bHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkLG9wdGlvbnMpe1xuXHRcdHZhciByLFxuXHRcdHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRcdHJlcS5vcGVuKCdHRVQnLCBwYXRoLCB0cnVlKTtcblxuXHRcdChmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblx0XHRcdHJlcS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKHJlcS5yZWFkeVN0YXRlID09PSA0KSB7XG5cdFx0XHRcdFx0aWYocmVxLnN0YXR1cyA9PT0gMjAwKXtcblx0XHRcdFx0XHRcdHIgPSByZXEucmVzcG9uc2VUZXh0O1xuXHRcdFx0XHRcdFx0aWYob3B0aW9ucy50eXBlICYmIG9wdGlvbnMudHlwZSA9PT0gJ2pzb24nKXtcblx0XHRcdFx0XHRcdFx0dHJ5e1xuXHRcdFx0XHRcdFx0XHRcdHIgPSBKU09OLnBhcnNlKHIpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGNhdGNoKGUpe1xuXHRcdFx0XHRcdFx0XHRcdF9wdWJsaWMuZGVidWcoW1xuXHRcdFx0XHRcdFx0XHRcdFx0XCJDb3VsZCBub3QgZGVjb2RlIEpTT05cIlxuXHRcdFx0XHRcdFx0XHRcdFx0LHBhdGhcblx0XHRcdFx0XHRcdFx0XHRcdCxyXG5cdFx0XHRcdFx0XHRcdFx0XSxkZWZlcnJlZCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmUocik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoXCJFcnJvciBsb2FkaW5nOiBcIiArIHBhdGgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHR9KHBhdGgsZGVmZXJyZWQpKTtcblxuXHRcdHJlcS5zZW5kKG51bGwpO1xuXHR9O1xuXG5cblxuXHQvL05hdGl2ZSBsb2FkXG5cblx0X3B1YmxpYy5uYXRpdmUuY3NzID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cdFx0X3B1YmxpYy5icm93c2VyLmNzcyhwYXRoLGRlZmVycmVkKTtcblx0fTtcblxuXHRfcHVibGljLm5hdGl2ZS5zY3JpcHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblx0XHQvL2xvY2FsIHBhY2thZ2Vcblx0XHRpZihwYXRoWzBdPT09Jy4nKXtcblx0XHRcdHBhdGggPSBfcHJpdmF0ZS5uYXRpdmUucHJlcGFyZV9wYXRoKHBhdGgsZGVmZXJyZWQpO1xuXHRcdFx0dmFyIHIgPSByZXF1aXJlKHBhdGgpO1xuXHRcdFx0Ly9BdXRvcmVzb2x2ZSBieSBkZWZhdWx0XG5cdFx0XHRpZih0eXBlb2YgZGVmZXJyZWQuYXV0b3Jlc29sdmUgIT09ICdib29sZWFuJ1xuXHRcdFx0fHwgZGVmZXJyZWQuYXV0b3Jlc29sdmUgPT09IHRydWUpe1xuXHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHIpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQvL3JlbW90ZSBzY3JpcHRcblx0XHRlbHNle1xuXHRcdFx0Ly9DaGVjayB0aGF0IHdlIGhhdmUgY29uZmlndXJlZCB0aGUgZW52aXJvbm1lbnQgdG8gYWxsb3cgdGhpcyxcblx0XHRcdC8vYXMgaXQgcmVwcmVzZW50cyBhIHNlY3VyaXR5IHRocmVhdCBhbmQgc2hvdWxkIG9ubHkgYmUgdXNlZCBmb3IgZGVidWdnaW5nXG5cdFx0XHRpZighQ2xzLnByaXZhdGUuY29uZmlnLnNldHRpbmdzLmRlYnVnX21vZGUpe1xuXHRcdFx0XHRDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoXCJTZXQgY29uZmlnLmRlYnVnX21vZGU9MSB0byBydW4gcmVtb3RlIHNjcmlwdHMgb3V0c2lkZSBvZiBkZWJ1ZyBtb2RlLlwiKTtcblx0XHRcdH1cblx0XHRcdGVsc2V7XG5cdFx0XHRcdF9wcml2YXRlLm5hdGl2ZS5nZXQocGF0aCxkZWZlcnJlZCxmdW5jdGlvbihkYXRhKXtcblx0XHRcdFx0XHR2YXIgVm0gPSByZXF1aXJlKCd2bScpO1xuXHRcdFx0XHRcdHIgPSBWbS5ydW5JblRoaXNDb250ZXh0KGRhdGEpO1xuXHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmUocik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHRfcHVibGljLm5hdGl2ZS5odG1sID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cdFx0X3B1YmxpYy5uYXRpdmUuZGVmYXVsdChwYXRoLGRlZmVycmVkKTtcblx0fTtcblxuXHRfcHVibGljLm5hdGl2ZS5kZWZhdWx0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cdFx0KGZ1bmN0aW9uKGRlZmVycmVkKXtcblx0XHRcdF9wcml2YXRlLm5hdGl2ZS5nZXQocGF0aCxkZWZlcnJlZCxmdW5jdGlvbihyKXtcblx0XHRcdFx0aWYoZGVmZXJyZWQudHlwZSA9PT0gJ2pzb24nKXtcblx0XHRcdFx0XHRyID0gSlNPTi5wYXJzZShyKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHIpO1xuXHRcdFx0fSk7XG5cdFx0fSkoZGVmZXJyZWQpO1xuXHR9O1xuXG5cdF9wcml2YXRlLm5hdGl2ZS5nZXQgPSBmdW5jdGlvbiAocGF0aCxkZWZlcnJlZCxjYWxsYmFjayl7XG5cdFx0cGF0aCA9IF9wcml2YXRlLm5hdGl2ZS5wcmVwYXJlX3BhdGgocGF0aCk7XG5cdFx0aWYocGF0aFswXSA9PT0gJy4nKXtcblx0XHRcdC8vZmlsZSBzeXN0ZW1cblx0XHRcdHZhciBGcyA9IHJlcXVpcmUoJ2ZzJyk7XG5cdFx0XHRGcy5yZWFkRmlsZShwYXRoLCBcInV0Zi04XCIsIGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcblx0XHRcdFx0aWYgKGVycil7XG5cdFx0XHRcdFx0dGhyb3cgZXJyO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0Y2FsbGJhY2soZGF0YSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblx0XHRlbHNle1xuXHRcdFx0Ly9odHRwXG5cdFx0XHR2YXIgcmVxdWVzdCA9IHJlcXVpcmUoJ3JlcXVlc3QnKTtcblx0XHRcdHJlcXVlc3QocGF0aCxmdW5jdGlvbihlcnJvcixyZXNwb25zZSxib2R5KXtcblx0XHRcdFx0aWYgKCFlcnJvciAmJiByZXNwb25zZS5zdGF0dXNDb2RlID09PSAyMDApIHtcblx0XHRcdFx0XHRjYWxsYmFjayhib2R5KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdHRocm93IGVycm9yO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdH07XG5cblx0X3ByaXZhdGUubmF0aXZlLnByZXBhcmVfcGF0aCA9IGZ1bmN0aW9uKHApe1xuXHRcdHAgPSAocFswXSAhPT0gJy8nICYmIHBbMF0gIT09ICcuJylcblx0XHQ/ICgocFswXS5pbmRleE9mKFwiaHR0cFwiKSE9PTApID8gJy4vJyArIHAgOiBwKSA6IHA7XG5cdFx0cmV0dXJuIHA7XG5cdH07XG5cblx0Q2xzLnB1YmxpYy5maWxlX2xvYWRlciA9IF9wdWJsaWM7XG5cblx0Q2xzLnByaXZhdGUuZmlsZV9sb2FkZXIgPSBfcHJpdmF0ZTtcblxuXHRyZXR1cm4gQ2xzO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihDbHMpe1xuXG5cblx0LyoqXG5cdCAqIEBuYW1lc3BhY2Ugb3JneS9xdWV1ZVxuXHQgKiBAYm9ycm93cyBvcmd5L2RlZmVycmVkI3RoZW4gYXMgI3RoZW5cblx0ICogQGJvcnJvd3Mgb3JneS9kZWZlcnJlZCNkb25lIGFzICNkb25lXG5cdCAqIEBib3Jyb3dzIG9yZ3kvZGVmZXJyZWQjcmVqZWN0IGFzICNyZWplY3Rcblx0ICogQGJvcnJvd3Mgb3JneS9kZWZlcnJlZCNyZXNvbHZlIGFzICNyZXNvbHZlXG5cdCAqXG5cdCovXG5cblx0dmFyIF9wcml2YXRlID0ge307XG5cblx0LyoqXG5cdCAqIEFjdGl2YXRlcyBhIHF1ZXVlIG9iamVjdC5cblx0ICpcblx0ICogQHBhcmFtIHtvYmplY3R9IG9cblx0ICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcblx0ICogQHBhcmFtIHthcnJheX0gZGVwc1xuXHQgKiBAcmV0dXJucyB7b2JqZWN0fSBxdWV1ZVxuXHQgKi9cblx0X3ByaXZhdGUuYWN0aXZhdGUgPSBmdW5jdGlvbihvLG9wdGlvbnMsZGVwcyl7XG5cblx0XHRcdC8vQUNUSVZBVEUgQVMgQSBERUZFUlJFRFxuXHRcdFx0Ly92YXIgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodGhpcyk7XG5cdFx0XHRvID0gQ2xzLnByaXZhdGUuZGVmZXJyZWQuYWN0aXZhdGUobyk7XG5cblx0XHRcdC8vQHRvZG8gcmV0aGluayB0aGlzXG5cdFx0XHQvL1RoaXMgdGltZW91dCBnaXZlcyBkZWZpbmVkIHByb21pc2VzIHRoYXQgYXJlIGRlZmluZWRcblx0XHRcdC8vZnVydGhlciBkb3duIHRoZSBzYW1lIHNjcmlwdCBhIGNoYW5jZSB0byBkZWZpbmUgdGhlbXNlbHZlc1xuXHRcdFx0Ly9hbmQgaW4gY2FzZSB0aGlzIHF1ZXVlIGlzIGFib3V0IHRvIHJlcXVlc3QgdGhlbSBmcm9tIGFcblx0XHRcdC8vcmVtb3RlIHNvdXJjZSBoZXJlLlxuXHRcdFx0Ly9UaGlzIGlzIGltcG9ydGFudCBpbiB0aGUgY2FzZSBvZiBjb21waWxlZCBqcyBmaWxlcyB0aGF0IGNvbnRhaW5cblx0XHRcdC8vbXVsdGlwbGUgbW9kdWxlcyB3aGVuIGRlcGVuZCBvbiBlYWNoIG90aGVyLlxuXG5cdFx0XHQvL3RlbXBvcmFyaWx5IGNoYW5nZSBzdGF0ZSB0byBwcmV2ZW50IG91dHNpZGUgcmVzb2x1dGlvblxuXHRcdFx0by5zdGF0ZSA9IC0xO1xuXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblxuXHRcdFx0XHQvL1Jlc3RvcmUgc3RhdGVcblx0XHRcdG8uc3RhdGUgPSAwO1xuXG5cdFx0XHRcdC8vQUREIERFUEVOREVOQ0lFUyBUTyBRVUVVRVxuXHRcdFx0XHRfcHVibGljLmFkZC5jYWxsKG8sZGVwcyk7XG5cblx0XHRcdFx0Ly9TRUUgSUYgQ0FOIEJFIElNTUVESUFURUxZIFJFU09MVkVEIEJZIENIRUNLSU5HIFVQU1RSRUFNXG5cdFx0XHRcdENscy5wcml2YXRlLmRlZmVycmVkLnJlY2VpdmVfc2lnbmFsKG8sby5pZCk7XG5cblx0XHRcdFx0Ly9BU1NJR04gVEhJUyBRVUVVRSBVUFNUUkVBTSBUTyBPVEhFUiBRVUVVRVNcblx0XHRcdFx0aWYoby5hc3NpZ24pe1xuXHRcdFx0XHRcdFx0Zm9yKHZhciBhIGluIG8uYXNzaWduKXtcblx0XHRcdFx0XHRcdFx0XHRzZWxmLmFzc2lnbihvLmFzc2lnblthXSxbb10sdHJ1ZSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0sMSk7XG5cblx0XHRcdHJldHVybiBvO1xuXHR9O1xuXG5cblx0LyoqXG5cdCogVXBncmFkZXMgYSBwcm9taXNlIG9iamVjdCB0byBhIHF1ZXVlLlxuXHQqXG5cdCogQHBhcmFtIHtvYmplY3R9IG9ialxuXHQqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG5cdCogQHBhcmFtIHthcnJheX0gZGVwcyBcXGRlcGVuZGVuY2llc1xuXHQqIEByZXR1cm5zIHtvYmplY3R9IHF1ZXVlIG9iamVjdFxuXHQqL1xuXHRfcHJpdmF0ZS51cGdyYWRlID0gZnVuY3Rpb24ob2JqLG9wdGlvbnMsZGVwcyl7XG5cblx0XHRcdGlmKG9iai5zZXR0bGVkICE9PSAwIHx8IChvYmoubW9kZWwgIT09ICdwcm9taXNlJyAmJiBvYmoubW9kZWwgIT09ICdkZWZlcnJlZCcpKXtcblx0XHRcdFx0XHRyZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKCdDYW4gb25seSB1cGdyYWRlIHVuc2V0dGxlZCBwcm9taXNlIG9yIGRlZmVycmVkIGludG8gYSBxdWV1ZS4nKTtcblx0XHRcdH1cblxuXHRcdCAvL0dFVCBBIE5FVyBRVUVVRSBPQkpFQ1QgQU5EIE1FUkdFIElOXG5cdFx0XHR2YXIgX28gPSBDbHMucHJpdmF0ZS5jb25maWcubmFpdmVfY2xvbmVyKFtfcHVibGljXSxbb3B0aW9uc10pO1xuXG5cdFx0XHRmb3IodmFyIGkgaW4gX28pe1xuXHRcdFx0XHQgb2JqW2ldID0gX29baV07XG5cdFx0XHR9XG5cblx0XHRcdC8vZGVsZXRlIF9vO1xuXG5cdFx0XHQvL0NSRUFURSBORVcgSU5TVEFOQ0UgT0YgUVVFVUVcblx0XHRcdG9iaiA9IHRoaXMuYWN0aXZhdGUob2JqLG9wdGlvbnMsZGVwcyk7XG5cblx0XHRcdC8vUkVUVVJOIFFVRVVFIE9CSkVDVFxuXHRcdFx0cmV0dXJuIG9iajtcblx0fTtcblxuXG5cblxuXHR2YXIgX3B1YmxpYyA9IHt9O1xuXHRcblx0X3B1YmxpYy5tb2RlbCA9ICdxdWV1ZSc7XG5cblx0Ly9TRVQgVFJVRSBBRlRFUiBSRVNPTFZFUiBGSVJFRFxuXHRfcHVibGljLnJlc29sdmVyX2ZpcmVkID0gMDtcblxuXHQvL1BSRVZFTlRTIEEgUVVFVUUgRlJPTSBSRVNPTFZJTkcgRVZFTiBJRiBBTEwgREVQRU5ERU5DSUVTIE1FVFxuXHQvL1BVUlBPU0U6IFBSRVZFTlRTIFFVRVVFUyBDUkVBVEVEIEJZIEFTU0lHTk1FTlQgRlJPTSBSRVNPTFZJTkdcblx0Ly9CRUZPUkUgVEhFWSBBUkUgRk9STUFMTFkgSU5TVEFOVElBVEVEXG5cdF9wdWJsaWMuaGFsdF9yZXNvbHV0aW9uID0gMDtcblxuXHQvL1VTRUQgVE8gQ0hFQ0sgU1RBVEUsIEVOU1VSRVMgT05FIENPUFlcblx0X3B1YmxpYy51cHN0cmVhbSA9IHt9O1xuXG5cdC8vVVNFRCBSRVRVUk4gVkFMVUVTLCBFTlNVUkVTIE9SREVSXG5cdF9wdWJsaWMuZGVwZW5kZW5jaWVzID0gW107XG5cblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cdC8vXHRRVUVVRSBJTlNUQU5DRSBNRVRIT0RTXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cdC8qKlxuXHQqIEFkZCBsaXN0IG9mIGRlcGVuZGVuY2llcyB0byBhIHF1ZXVlJ3MgdXBzdHJlYW0gYXJyYXkuXG5cdCpcblx0KiBUaGUgcXVldWUgd2lsbCByZXNvbHZlIG9uY2UgYWxsIHRoZSBwcm9taXNlcyBpbiBpdHNcblx0KiB1cHN0cmVhbSBhcnJheSBhcmUgcmVzb2x2ZWQuXG5cdCpcblx0KiBXaGVuIF9wdWJsaWMuQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnID09IDEsIG1ldGhvZCB3aWxsIHRlc3QgZWFjaFxuXHQqIGRlcGVuZGVuY3kgaXMgbm90IHByZXZpb3VzbHkgc2NoZWR1bGVkIHRvIHJlc29sdmVcblx0KiBkb3duc3RyZWFtIGZyb20gdGhlIHRhcmdldCwgaW4gd2hpY2hcblx0KiBjYXNlIGl0IHdvdWxkIG5ldmVyIHJlc29sdmUgYmVjYXVzZSBpdHMgdXBzdHJlYW0gZGVwZW5kcyBvbiBpdC5cblx0KlxuXHQqIEBwYXJhbSB7YXJyYXl9IGFyclx0L2FycmF5IG9mIGRlcGVuZGVuY2llcyB0byBhZGRcblx0KiBAcmV0dXJucyB7YXJyYXl9IHVwc3RyZWFtXG5cdCovXG5cdF9wdWJsaWMuYWRkID0gZnVuY3Rpb24oYXJyKXtcblxuXHRcdHRyeXtcblx0XHRcdFx0aWYoYXJyLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnVwc3RyZWFtO1xuXHRcdFx0XHR9XG5cdFx0fVxuXHRcdGNhdGNoKGVycil7XG5cdFx0XHRcdENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhlcnIpO1xuXHRcdH1cblxuXHRcdC8vSUYgTk9UIFBFTkRJTkcsIERPIE5PVCBBTExPVyBUTyBBRERcblx0XHRpZih0aGlzLnN0YXRlICE9PSAwKXtcblx0XHRcdFx0cmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhbXG5cdFx0XHRcdFx0XCJDYW5ub3QgYWRkIGRlcGVuZGVuY3kgbGlzdCB0byBxdWV1ZSBpZDonXCIrdGhpcy5pZFxuXHRcdFx0XHRcdCtcIicuIFF1ZXVlIHNldHRsZWQvaW4gdGhlIHByb2Nlc3Mgb2YgYmVpbmcgc2V0dGxlZC5cIlxuXHRcdFx0XHRdLGFycix0aGlzKTtcblx0XHR9XG5cblx0XHRmb3IodmFyIGEgaW4gYXJyKXtcblxuXHRcdFx0XHRzd2l0Y2godHJ1ZSl7XG5cblx0XHRcdFx0XHRcdC8vQ0hFQ0sgSUYgRVhJU1RTXG5cdFx0XHRcdFx0XHRjYXNlKHR5cGVvZiBDbHMucHJpdmF0ZS5jb25maWcubGlzdFthcnJbYV0uaWRdID09PSAnb2JqZWN0Jyk6XG5cdFx0XHRcdFx0XHRcdFx0YXJyW2FdID0gQ2xzLnByaXZhdGUuY29uZmlnLmxpc3RbYXJyW2FdLmlkXTtcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0Ly9JRiBOT1QsIEFUVEVNUFQgVE8gQ09OVkVSVCBJVCBUTyBBTiBPUkdZIFBST01JU0Vcblx0XHRcdFx0XHRcdGNhc2UodHlwZW9mIGFyclthXSA9PT0gJ29iamVjdCcgJiYgKCFhcnJbYV0uaXNfb3JneSkpOlxuXHRcdFx0XHRcdFx0XHRcdGFyclthXSA9IENscy5wcml2YXRlLmRlZmVycmVkLmNvbnZlcnRfdG9fcHJvbWlzZShhcnJbYV0se1xuXHRcdFx0XHRcdFx0XHRcdFx0cGFyZW50IDogdGhpc1xuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHQvL1JFRiBJUyBBIFBST01JU0UuXG5cdFx0XHRcdFx0XHRjYXNlKHR5cGVvZiBhcnJbYV0udGhlbiA9PT0gJ2Z1bmN0aW9uJyk6XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRcdFx0Q2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFtcblx0XHRcdFx0XHRcdFx0XHRcdFwiT2JqZWN0IGNvdWxkIG5vdCBiZSBjb252ZXJ0ZWQgdG8gcHJvbWlzZS5cIixcblx0XHRcdFx0XHRcdFx0XHRcdGFyclthXVxuXHRcdFx0XHRcdFx0XHRcdF0pO1xuXHRcdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly9tdXN0IGNoZWNrIHRoZSB0YXJnZXQgdG8gc2VlIGlmIHRoZSBkZXBlbmRlbmN5IGV4aXN0cyBpbiBpdHMgZG93bnN0cmVhbVxuXHRcdFx0XHRmb3IodmFyIGIgaW4gdGhpcy5kb3duc3RyZWFtKXtcblx0XHRcdFx0XHRcdGlmKGIgPT09IGFyclthXS5pZCl7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhbXG5cdFx0XHRcdFx0XHRcdFx0XHRcIkVycm9yIGFkZGluZyB1cHN0cmVhbSBkZXBlbmRlbmN5ICdcIlxuXHRcdFx0XHRcdFx0XHRcdFx0K2FyclthXS5pZCtcIicgdG8gcXVldWVcIitcIiAnXCJcblx0XHRcdFx0XHRcdFx0XHRcdCt0aGlzLmlkK1wiJy5cXG4gUHJvbWlzZSBvYmplY3QgZm9yICdcIlxuXHRcdFx0XHRcdFx0XHRcdFx0K2FyclthXS5pZCtcIicgaXMgc2NoZWR1bGVkIHRvIHJlc29sdmUgZG93bnN0cmVhbSBmcm9tIHF1ZXVlICdcIlxuXHRcdFx0XHRcdFx0XHRcdFx0K3RoaXMuaWQrXCInIHNvIGl0IGNhbid0IGJlIGFkZGVkIHVwc3RyZWFtLlwiXG5cdFx0XHRcdFx0XHRcdFx0XVxuXHRcdFx0XHRcdFx0XHRcdCx0aGlzKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vQUREIFRPIFVQU1RSRUFNLCBET1dOU1RSRUFNLCBERVBFTkRFTkNJRVNcblx0XHRcdFx0dGhpcy51cHN0cmVhbVthcnJbYV0uaWRdID0gYXJyW2FdO1xuXHRcdFx0XHRhcnJbYV0uZG93bnN0cmVhbVt0aGlzLmlkXSA9IHRoaXM7XG5cdFx0XHRcdHRoaXMuZGVwZW5kZW5jaWVzLnB1c2goYXJyW2FdKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy51cHN0cmVhbTtcblx0fTtcblxuXHQvKipcblx0KiBSZW1vdmUgbGlzdCBmcm9tIGEgcXVldWUuXG5cdCpcblx0KiBAcGFyYW0ge2FycmF5fSBhcnJcblx0KiBAcmV0dXJucyB7YXJyYXl9IGFycmF5IG9mIGxpc3QgdGhlIHF1ZXVlIGlzIHVwc3RyZWFtXG5cdCovXG5cdF9wdWJsaWMucmVtb3ZlID0gZnVuY3Rpb24oYXJyKXtcblxuXHRcdC8vSUYgTk9UIFBFTkRJTkcsIERPIE5PVCBBTExPVyBSRU1PVkFMXG5cdFx0aWYodGhpcy5zdGF0ZSAhPT0gMCl7XG5cdFx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoXCJDYW5ub3QgcmVtb3ZlIGxpc3QgZnJvbSBxdWV1ZSBpZDonXCIrdGhpcy5pZCtcIicuIFF1ZXVlIHNldHRsZWQvaW4gdGhlIHByb2Nlc3Mgb2YgYmVpbmcgc2V0dGxlZC5cIik7XG5cdFx0fVxuXG5cdFx0Zm9yKHZhciBhIGluIGFycil7XG5cdFx0XHRpZih0aGlzLnVwc3RyZWFtW2FyclthXS5pZF0pe1xuXHRcdFx0XHRcdGRlbGV0ZSB0aGlzLnVwc3RyZWFtW2FyclthXS5pZF07XG5cdFx0XHRcdFx0ZGVsZXRlIGFyclthXS5kb3duc3RyZWFtW3RoaXMuaWRdO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHQvKipcblx0KiBSZXNldHMgYW4gZXhpc3Rpbmcsc2V0dGxlZCBxdWV1ZSBiYWNrIHRvIE9yZ3lpbmcgc3RhdGUuXG5cdCogQ2xlYXJzIG91dCB0aGUgZG93bnN0cmVhbS5cblx0KiBGYWlscyBpZiBub3Qgc2V0dGxlZC5cblx0KiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuXHQqIEByZXR1cm5zIHtDbHMucHJpdmF0ZS5kZWZlcnJlZC50cGx8Qm9vbGVhbn1cblx0Ki9cblx0X3B1YmxpYy5yZXNldCA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuXG5cdFx0aWYodGhpcy5zZXR0bGVkICE9PSAxIHx8IHRoaXMuc3RhdGUgIT09IDEpe1xuXHRcdFx0cmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcIkNhbiBvbmx5IHJlc2V0IGEgcXVldWUgc2V0dGxlZCB3aXRob3V0IGVycm9ycy5cIik7XG5cdFx0fVxuXG5cdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cblx0XHR0aGlzLnNldHRsZWQgPSAwO1xuXHRcdHRoaXMuc3RhdGUgPSAwO1xuXHRcdHRoaXMucmVzb2x2ZXJfZmlyZWQgPSAwO1xuXHRcdHRoaXMuZG9uZV9maXJlZCA9IDA7XG5cblx0XHQvL1JFTU9WRSBBVVRPIFRJTUVPVVQgVElNRVJcblx0XHRpZih0aGlzLnRpbWVvdXRfaWQpe1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMudGltZW91dF9pZCk7XG5cdFx0fVxuXG5cdFx0Ly9DTEVBUiBPVVQgVEhFIERPV05TVFJFQU1cblx0XHR0aGlzLmRvd25zdHJlYW0gPSB7fTtcblx0XHR0aGlzLmRlcGVuZGVuY2llcyA9IFtdO1xuXG5cdFx0Ly9TRVQgTkVXIEFVVE8gVElNRU9VVFxuXHRcdENscy5wcml2YXRlLmRlZmVycmVkLmF1dG9fdGltZW91dC5jYWxsKHRoaXMsb3B0aW9ucy50aW1lb3V0KTtcblxuXHRcdC8vUE9JTlRMRVNTIC0gV0lMTCBKVVNUIElNTUVESUFURUxZIFJFU09MVkUgU0VMRlxuXHRcdC8vdGhpcy5jaGVja19zZWxmKClcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cblx0LyoqXG5cdCogQ2F1YWVzIGEgcXVldWUgdG8gbG9vayBvdmVyIGl0cyBkZXBlbmRlbmNpZXMgYW5kIHNlZSBpZiBpdFxuXHQqIGNhbiBiZSByZXNvbHZlZC5cblx0KlxuXHQqIFRoaXMgaXMgZG9uZSBhdXRvbWF0aWNhbGx5IGJ5IGVhY2ggZGVwZW5kZW5jeSB0aGF0IGxvYWRzLFxuXHQqIHNvIGlzIG5vdCBuZWVkZWQgdW5sZXNzOlxuXHQqXG5cdCogLWRlYnVnZ2luZ1xuXHQqXG5cdCogLXRoZSBxdWV1ZSBoYXMgYmVlbiByZXNldCBhbmQgbm8gbmV3XG5cdCogZGVwZW5kZW5jaWVzIHdlcmUgc2luY2UgYWRkZWQuXG5cdCpcblx0KiBAcmV0dXJucyB7aW50fSBTdGF0ZSBvZiB0aGUgcXVldWUuXG5cdCovXG5cdF9wdWJsaWMuY2hlY2tfc2VsZiA9IGZ1bmN0aW9uKCl7XG5cdFx0Q2xzLnByaXZhdGUuZGVmZXJyZWQucmVjZWl2ZV9zaWduYWwodGhpcyx0aGlzLmlkKTtcblx0XHRyZXR1cm4gdGhpcy5zdGF0ZTtcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGEgbmV3IHF1ZXVlIG9iamVjdC5cblx0ICogSWYgbm8gPGI+cmVzb2x2ZXI8L2I+IG9wdGlvbiBpcyBzZXQsIHJlc29sdmVkIHdoZW4gYWxsIGRlcGVuZGVuY2llcyBhcmUgcmVzb2x2ZWQuIEVsc2UsIHJlc29sdmVkIHdoZW4gdGhlIGRlZmVycmVkIHBhcmFtIHBhc3NlZCB0byB0aGUgcmVzb2x2ZXIgb3B0aW9uXG5cdCAqIGlzIHJlc29sdmVkLlxuXHQgKlxuXHQgKiBAbWVtYmVyb2Ygb3JneVxuXHQgKiBAZnVuY3Rpb24gcXVldWVcblx0ICpcblx0ICogQHBhcmFtIHthcnJheX0gZGVwcyBBcnJheSBvZiBkZXBlbmRlbmNpZXMgdGhhdCBtdXN0IGJlIHJlc29sdmVkIGJlZm9yZSA8Yj5yZXNvbHZlcjwvYj4gb3B0aW9uIGlzIGNhbGxlZC5cblx0ICpcblx0ICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcdExpc3Qgb2Ygb3B0aW9uczpcbiBcdCAqXG4gXHQgKiAgLSA8Yj5pZDwvYj4ge3N0cmluZ30gVW5pcXVlIGlkIG9mIHRoZSBvYmplY3QuXG4gXHQgKlx0IC0gQ2FuIGJlIHVzZWQgd2l0aCBPcmd5LmdldChpZCkuXG4gXHQgKlx0IC0gT3B0aW9uYWwuXG4gXHQgKlxuXHQgKlxuIFx0ICogIC0gPGI+dGltZW91dDwvYj4ge251bWJlcn0gVGltZSBpbiBtcyBhZnRlciB3aGljaCByZWplY3QgaXMgY2FsbGVkLlxuIFx0ICpcdCAtIERlZmF1bHRzIHRvIE9yZ3kuY29uZmlnKCkudGltZW91dCBbNTAwMF0uXG4gXHQgKlx0IC0gTm90ZSB0aGUgdGltZW91dCBpcyBvbmx5IGFmZmVjdGVkIGJ5IGRlcGVuZGVuY2llcyBhbmQvb3IgdGhlIHJlc29sdmVyIGNhbGxiYWNrLlxuIFx0ICpcdCAtIFRoZW4sZG9uZSBkZWxheXMgd2lsbCBub3QgZmxhZyBhIHRpbWVvdXQgYmVjYXVzZSB0aGV5IGFyZSBjYWxsZWQgYWZ0ZXIgdGhlIGluc3RhbmNlIGlzIGNvbnNpZGVyZWQgcmVzb2x2ZWQuXG4gXHQgKlxuXHQgKlxuIFx0ICogIC0gPGI+cmVzb2x2ZXI8L2I+IHtmdW5jdGlvbig8aT5yZXN1bHQ8L2k+LDxpPmRlZmVycmVkPC9pPil9IENhbGxiYWNrIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgYWZ0ZXIgYWxsIGRlcGVuZGVuY2llcyBoYXZlIHJlc29sdmVkLlxuIFx0ICpcdCAtIDxpPnJlc3VsdDwvaT4gaXMgYW4gYXJyYXkgb2YgdGhlIHF1ZXVlJ3MgcmVzb2x2ZWQgZGVwZW5kZW5jeSB2YWx1ZXMuXG4gXHQgKlx0IC0gPGk+ZGVmZXJyZWQ8L2k+IGlzIHRoZSBxdWV1ZSBvYmplY3QuXG4gXHQgKlx0IC0gVGhlIHF1ZXVlIHdpbGwgb25seSByZXNvbHZlIHdoZW4gPGk+ZGVmZXJyZWQ8L2k+LnJlc29sdmUoKSBpcyBjYWxsZWQuIElmIG5vdCwgaXQgd2lsbCB0aW1lb3V0IHRvIG9wdGlvbnMudGltZW91dCB8fCBPcmd5LmNvbmZpZygpLnRpbWVvdXQuXG5cdCAqXG5cdCAqIEByZXR1cm5zIHtvYmplY3R9IHtAbGluayBvcmd5L3F1ZXVlfVxuXHQgKi9cblx0Q2xzLnB1YmxpYy5xdWV1ZSA9IGZ1bmN0aW9uKGRlcHMsb3B0aW9ucyl7XG5cblx0XHR2YXIgX287XG5cdFx0aWYoIShkZXBzIGluc3RhbmNlb2YgQXJyYXkpKXtcblx0XHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoXCJRdWV1ZSBkZXBlbmRlbmNpZXMgbXVzdCBiZSBhbiBhcnJheS5cIik7XG5cdFx0fVxuXG5cdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cblx0XHQvL0RPRVMgTk9UIEFMUkVBRFkgRVhJU1Rcblx0XHRpZighQ2xzLnByaXZhdGUuY29uZmlnLmxpc3Rbb3B0aW9ucy5pZF0pe1xuXG5cdFx0XHQvL1Bhc3MgYXJyYXkgb2YgcHJvdG90eXBlcyB0byBxdWV1ZSBmYWN0b3J5XG5cdFx0XHRfbyA9IENscy5wcml2YXRlLmNvbmZpZy5uYWl2ZV9jbG9uZXIoW0Nscy5wcml2YXRlLmRlZmVycmVkLnB1YmxpYyxfcHVibGljXSxbb3B0aW9uc10pO1xuXG5cdFx0XHQvL0FjdGl2YXRlIHF1ZXVlXG5cdFx0XHRfbyA9IF9wcml2YXRlLmFjdGl2YXRlKF9vLG9wdGlvbnMsZGVwcyk7XG5cblx0XHR9XG5cdFx0Ly9BTFJFQURZIEVYSVNUU1xuXHRcdGVsc2Uge1xuXG5cdFx0XHRfbyA9IENscy5wcml2YXRlLmNvbmZpZy5saXN0W29wdGlvbnMuaWRdO1xuXG5cdFx0XHRpZihfby5tb2RlbCAhPT0gJ3F1ZXVlJyl7XG5cdFx0XHQvL01BVENIIEZPVU5EIEJVVCBOT1QgQSBRVUVVRSwgVVBHUkFERSBUTyBPTkVcblxuXHRcdFx0XHRvcHRpb25zLm92ZXJ3cml0YWJsZSA9IDE7XG5cblx0XHRcdFx0X28gPSBfcHJpdmF0ZS51cGdyYWRlKF9vLG9wdGlvbnMsZGVwcyk7XG5cdFx0XHR9XG5cdFx0XHRlbHNle1xuXG5cdFx0XHRcdC8vT1ZFUldSSVRFIEFOWSBFWElTVElORyBPUFRJT05TXG5cdFx0XHRcdG9wdGlvbnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSxrZXkpe1xuXHRcdFx0XHRcdF9vW2tleV0gPSB2YWx1ZTsgXG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdC8vQUREIEFERElUSU9OQUwgREVQRU5ERU5DSUVTIElGIE5PVCBSRVNPTFZFRFxuXHRcdFx0XHRpZihkZXBzLmxlbmd0aCA+IDApe1xuXHRcdFx0XHRcdF9wcml2YXRlLnRwbC5hZGQuY2FsbChfbyxkZXBzKTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cblx0XHRcdC8vUkVTVU1FIFJFU09MVVRJT04gVU5MRVNTIFNQRUNJRklFRCBPVEhFUldJU0Vcblx0XHRcdF9vLmhhbHRfcmVzb2x1dGlvbiA9ICh0eXBlb2Ygb3B0aW9ucy5oYWx0X3Jlc29sdXRpb24gIT09ICd1bmRlZmluZWQnKSA/XG5cdFx0XHRvcHRpb25zLmhhbHRfcmVzb2x1dGlvbiA6IDA7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIF9vO1xuXHR9O1xuXG5cdC8vc2F2ZSBmb3IgcmUtdXNlXG5cdENscy5wcml2YXRlLnF1ZXVlID0gX3ByaXZhdGU7XG5cdFx0XG5cdHJldHVybiBDbHM7XG59O1xuIiwidmFyIENscyA9IE9iamVjdC5jcmVhdGUoe1xuXHRwcml2YXRlOnt9LFxuXHRwdWJsaWM6e31cbn0pO1xuXG5yZXF1aXJlKCcuL2NvbmZpZy5qcycpKENscyk7XG5yZXF1aXJlKCcuL2ZpbGVfbG9hZGVyLmpzJykoQ2xzKTtcbnJlcXVpcmUoJy4vZGVmZXJyZWQuanMnKShDbHMpO1xucmVxdWlyZSgnLi9xdWV1ZS5qcycpKENscyk7XG5yZXF1aXJlKCcuL2Nhc3QuanMnKShDbHMpO1xuXG4vKipcbiAqIEBuYW1lc3BhY2Ugb3JneVxuICovXG5cbi8qKlxuKiBDcmVhdGVzIGEgbmV3IGRlZmVycmVkIGZyb20gYSB2YWx1ZSBhbmQgYW4gaWQgYW5kIGF1dG9tYXRpY2FsbHlcbiogcmVzb2x2ZXMgaXQuXG4qXG4qIEBtZW1iZXJvZiBvcmd5XG4qIEBmdW5jdGlvbiBkZWZpbmVcbipcbiogQHBhcmFtIHtzdHJpbmd9IGlkIEEgdW5pcXVlIGlkIHlvdSBnaXZlIHRvIHRoZSBvYmplY3RcbiogQHBhcmFtIHttaXhlZH1cdGRhdGEgVGhlIHZhbHVlIHRoYXQgdGhlIG9iamVjdCBpcyBhc3NpZ25lZFxuKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuLSA8Yj5kZXBlbmRlbmNpZXM8L2I+IHthcnJheX1cbi0gPGI+cmVzb2x2ZXI8L2I+IHtmdW5jdGlvbig8aT5hc3NpZ25lZFZhbHVlPC9pPiw8aT5kZWZlcnJlZDwvaT59XG4qIEByZXR1cm5zIHtvYmplY3R9IHJlc29sdmVkIGRlZmVycmVkXG4qL1xuQ2xzLnB1YmxpYy5kZWZpbmUgPSBmdW5jdGlvbihpZCxkYXRhLG9wdGlvbnMpe1xuXG5cdFx0dmFyIGRlZjtcblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0XHRvcHRpb25zLmRlcGVuZGVuY2llcyA9IG9wdGlvbnMuZGVwZW5kZW5jaWVzIHx8IG51bGw7XG5cdFx0b3B0aW9ucy5yZXNvbHZlciA9IG9wdGlvbnMucmVzb2x2ZXIgfHwgbnVsbDtcblxuXHRcdC8vdGVzdCBmb3IgYSB2YWxpZCBpZFxuXHRcdGlmKHR5cGVvZiBpZCAhPT0gJ3N0cmluZycpe1xuXHRcdFx0Q2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFwiTXVzdCBzZXQgaWQgd2hlbiBkZWZpbmluZyBhbiBpbnN0YW5jZS5cIik7XG5cdFx0fVxuXG5cdFx0Ly9DaGVjayBubyBleGlzdGluZyBpbnN0YW5jZSBkZWZpbmVkIHdpdGggc2FtZSBpZFxuXHRcdGlmKENscy5wcml2YXRlLmNvbmZpZy5saXN0W2lkXSAmJiBDbHMucHJpdmF0ZS5jb25maWcubGlzdFtpZF0uc2V0dGxlZCA9PT0gMSl7XG5cdFx0XHRyZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFwiQ2FuJ3QgZGVmaW5lIFwiICsgaWQgKyBcIi4gQWxyZWFkeSByZXNvbHZlZC5cIik7XG5cdFx0fVxuXG5cdFx0b3B0aW9ucy5pZCA9IGlkO1xuXG5cdFx0aWYob3B0aW9ucy5kZXBlbmRlbmNpZXMgIT09IG51bGxcblx0XHRcdCYmIG9wdGlvbnMuZGVwZW5kZW5jaWVzIGluc3RhbmNlb2YgQXJyYXkpe1xuXHRcdFx0Ly9EZWZpbmUgYXMgYSBxdWV1ZSAtIGNhbid0IGF1dG9yZXNvbHZlIGJlY2F1c2Ugd2UgaGF2ZSBkZXBzXG5cdFx0XHR2YXIgZGVwcyA9IG9wdGlvbnMuZGVwZW5kZW5jaWVzO1xuXHRcdFx0ZGVsZXRlIG9wdGlvbnMuZGVwZW5kZW5jaWVzO1xuXHRcdFx0ZGVmID0gQ2xzLnB1YmxpYy5xdWV1ZShkZXBzLG9wdGlvbnMpO1xuXHRcdH1cblx0XHRlbHNle1xuXHRcdFx0Ly9EZWZpbmUgYXMgYSBkZWZlcnJlZFxuXHRcdFx0ZGVmID0gQ2xzLnB1YmxpYy5kZWZlcnJlZChvcHRpb25zKTtcblxuXHRcdFx0Ly9UcnkgdG8gaW1tZWRpYXRlbHkgc2V0dGxlIFtkZWZpbmVdXG5cdFx0XHRpZihvcHRpb25zLnJlc29sdmVyID09PSBudWxsXG5cdFx0XHRcdCYmICh0eXBlb2Ygb3B0aW9ucy5hdXRvcmVzb2x2ZSAhPT0gJ2Jvb2xlYW4nXG5cdFx0XHRcdHx8IG9wdGlvbnMuYXV0b3Jlc29sdmUgPT09IHRydWUpKXtcblx0XHRcdFx0Ly9wcmV2ZW50IGZ1dHVyZSBhdXRvcmVzb3ZlIGF0dGVtcHRzIFtpLmUuIGZyb20geGhyIHJlc3BvbnNlXVxuXHRcdFx0XHRkZWYuYXV0b3Jlc29sdmUgPSBmYWxzZTtcblx0XHRcdFx0ZGVmLnJlc29sdmUoZGF0YSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGRlZjtcbn07XG5cblxuLyoqXG4gKiBHZXRzIGFuIGV4aXNpdGluZyBkZWZlcnJlZCAvIHF1ZXVlIG9iamVjdCBmcm9tIGdsb2JhbCBzdG9yZS5cbiAqIFJldHVybnMgbnVsbCBpZiBub25lIGZvdW5kLlxuICpcbiAqIEBtZW1iZXJvZiBvcmd5XG4gKiBAZnVuY3Rpb24gZ2V0XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGlkIElkIG9mIGRlZmVycmVkIG9yIHF1ZXVlIG9iamVjdC5cbiAqIEByZXR1cm5zIHtvYmplY3R9IGRlZmVycmVkIHwgcXVldWUgfCBudWxsXG4gKi9cbkNscy5wdWJsaWMuZ2V0ID0gZnVuY3Rpb24oaWQpe1xuXHRpZihDbHMucHJpdmF0ZS5jb25maWcubGlzdFtpZF0pe1xuXHRcdHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcubGlzdFtpZF07XG5cdH1cblx0ZWxzZXtcblx0XHRyZXR1cm4gbnVsbDtcblx0fVxufTtcblxuXG4vKipcbiAqIEFkZC9yZW1vdmUgYW4gdXBzdHJlYW0gZGVwZW5kZW5jeSB0by9mcm9tIGEgcXVldWUuXG4gKlxuICogQ2FuIHVzZSBhIHF1ZXVlIGlkLCBldmVuIGZvciBhIHF1ZXVlIHRoYXQgaXMgeWV0IHRvIGJlIGNyZWF0ZWQuXG4gKlxuICogQG1lbWJlcm9mIG9yZ3lcbiAqIEBmdW5jdGlvbiBhc3NpZ25cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHRndCBDbHMucHVibGljLnF1ZXVlIGlkIC8gcXVldWUgb2JqZWN0XG4gKiBAcGFyYW0ge2FycmF5fSAgYXJyXHRBcnJheSBvZiBwcm9taXNlIGlkcyBvciBkZXBlbmRlbmN5IG9iamVjdHNcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gYWRkICBJZiB0cnVlIDxiPkFERDwvYj4gYXJyYXkgdG8gcXVldWUgZGVwZW5kZW5jaWVzLCBJZiBmYWxzZSA8Yj5SRU1PVkU8L2I+IGFycmF5IGZyb20gcXVldWUgZGVwZW5kZW5jaWVzXG4gKlxuICogQHJldHVybiB7b2JqZWN0fSBxdWV1ZVxuICovXG5DbHMucHVibGljLmFzc2lnbiA9IGZ1bmN0aW9uKHRndCxhcnIsYWRkKXtcblxuXHRcdGFkZCA9ICh0eXBlb2YgYWRkID09PSBcImJvb2xlYW5cIikgPyBhZGQgOiAxO1xuXG5cdFx0dmFyIGlkLHE7XG5cdFx0c3dpdGNoKHRydWUpe1xuXHRcdFx0XHRjYXNlKHR5cGVvZiB0Z3QgPT09ICdvYmplY3QnICYmIHR5cGVvZiB0Z3QudGhlbiA9PT0gJ2Z1bmN0aW9uJyk6XG5cdFx0XHRcdFx0XHRpZCA9IHRndC5pZDtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlKHR5cGVvZiB0Z3QgPT09ICdzdHJpbmcnKTpcblx0XHRcdFx0XHRcdGlkID0gdGd0O1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRyZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFwiQXNzaWduIHRhcmdldCBtdXN0IGJlIGEgcXVldWUgb2JqZWN0IG9yIHRoZSBpZCBvZiBhIHF1ZXVlLlwiLHRoaXMpO1xuXHRcdH1cblxuXHRcdC8vSUYgVEFSR0VUIEFMUkVBRFkgTElTVEVEXG5cdFx0aWYoQ2xzLnByaXZhdGUuY29uZmlnLmxpc3RbaWRdICYmIENscy5wcml2YXRlLmNvbmZpZy5saXN0W2lkXS5tb2RlbCA9PT0gJ3F1ZXVlJyl7XG5cdFx0XHRcdHEgPSBDbHMucHJpdmF0ZS5jb25maWcubGlzdFtpZF07XG5cblx0XHRcdFx0Ly89PiBBREQgVE8gUVVFVUUnUyBVUFNUUkVBTVxuXHRcdFx0XHRpZihhZGQpe1xuXHRcdFx0XHRcdFx0cS5hZGQoYXJyKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLz0+IFJFTU9WRSBGUk9NIFFVRVVFJ1MgVVBTVFJFQU1cblx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRcdHEucmVtb3ZlKGFycik7XG5cdFx0XHRcdH1cblx0XHR9XG5cdFx0Ly9DUkVBVEUgTkVXIFFVRVVFIEFORCBBREQgREVQRU5ERU5DSUVTXG5cdFx0ZWxzZSBpZihhZGQpe1xuXHRcdFx0XHRxID0gQ2xzLnB1YmxpYy5xdWV1ZShhcnIse1xuXHRcdFx0XHRcdFx0aWQgOiBpZFxuXHRcdFx0XHR9KTtcblx0XHR9XG5cdFx0Ly9FUlJPUjogQ0FOJ1QgUkVNT1ZFIEZST00gQSBRVUVVRSBUSEFUIERPRVMgTk9UIEVYSVNUXG5cdFx0ZWxzZXtcblx0XHRcdFx0cmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcIkNhbm5vdCByZW1vdmUgZGVwZW5kZW5jaWVzIGZyb20gYSBxdWV1ZSB0aGF0IGRvZXMgbm90IGV4aXN0LlwiLHRoaXMpO1xuXHRcdH1cblxuXHRcdHJldHVybiBxO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDbHMucHVibGljO1xuIl19
