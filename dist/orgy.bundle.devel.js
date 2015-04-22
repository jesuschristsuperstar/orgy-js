require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

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
var Config = require('./config.js'),
		Deferred = require('./deferred.js');

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
 *  - {string} <b>id</b>  Unique id of the object.
 *
 *  - {function} <b>then</b>
 *
 *  - {function} <b>error</b>
 *
 * @returns {object} deferred
 */
module.exports = function(obj){

		var required = ["then","error","id"];
		for(var i in required){
			if(!obj[required[i]]){
				return Config.debug("Cast method missing property '" + required[i] +"'");
			}
		}

		var options = {};
		options.id = obj.id;

		//Make sure id does not conflict with existing
		if(Config.list[options.id]){
			return Config.debug("Id "+options.id+" conflicts with existing id.");
		}

		//Create a deferred
		var def = Deferred(options);

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

},{"./config.js":4,"./deferred.js":5}],4:[function(require,module,exports){
(function (process){
var _public = {};


////////////////////////////////////////
//  _public VARIABLES
////////////////////////////////////////


/**
 * A directory of all promises, deferreds, and queues.
 * @type object
 */
_public.list = {};


/**
 * iterator for ids
 * @type integer
 */
_public.i = 0;


/**
 * Configuration values.
 *
 * @type object
 */
_public.settings = {

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
		 * - onSettle   /when each instance settles
		 *
		 * @type object
		 */
		,hooks : {
		}
		,timeout : 5000 //default timeout
};


////////////////////////////////////////
//  _private VARIABLES
////////////////////////////////////////


////////////////////////////////////////
//  _public METHODS
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
_public.config = function(obj){

		if(typeof obj === 'object'){
				for(var i in obj){
					_public.settings[i] = obj[i];
				}
		}

		return _public.settings;
};


/**
 * Debugging method.
 *
 * @param {string|array} msg
 * @param {object} def
 * @returns {Boolean}
 */
_public.debug = function(msg,def){

		var msgs = (msg instanceof Array) ? msg.join("\n") : [msg];

		var e = new Error(msgs);
		console.log(e.stack);


		if(this.settings.debug_mode){
			//turn off debug_mode to avoid hitting debugger
			debugger;
		}

		if(_public.settings.mode === 'browser'){
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
_public.naive_cloner = function(protoObjArr,propsObjArr){

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


_public.generate_id = function(){
	return new Date().getTime() + '-' + (++this.i);
};


module.exports = _public;

}).call(this,require('_process'))

},{"_process":2}],5:[function(require,module,exports){
var Config = require('./config.js');
var _private = require('./deferred.private.js');

/**
* @namespace orgy/deferred
*/

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
*   - Can be used with Orgy.get(id).
*   - Optional.
*
*
*  - <b>timeout</b> {number} Time in ms after which reject is called if not yet resolved.
- Defaults to Orgy.config().timeout.
- Delays in object.then() and object.done() won't not trigger this, because those methods run after resolve.
*
* @returns {object} {@link orgy/deferred}
*/
module.exports = function(options){

	var _o;
	options = options || {};

	if(options.id && Config.list[options.id]){
		_o = Config.list[options.id];
	}
	else{
		//Create a new deferred class instance
		var DeferredSchema = require('./deferred.schema.js')();
		_o = _private.factory([DeferredSchema],[options]);

		//ACTIVATE DEFERRED
		_o = _private.activate(_o);
	}

	return _o;
};

},{"./config.js":4,"./deferred.private.js":6,"./deferred.schema.js":7}],6:[function(require,module,exports){
var Config = require('./config.js');
var File_loader = require('./file_loader.js');


var _public = {};


/**
 * @param array options Prototype objects
**/
_public.factory = function(protoObjArr,optionsObjArr){

		//Merge array of objects into a single, shallow clone
		var _o = Config.naive_cloner(protoObjArr,optionsObjArr);

		//if no id, generate one
		if(!_o.id){
			_o.id = Config.generate_id();
		}

		return _o;
};


_public.activate = function(obj){

		//MAKE SURE NAMING CONFLICT DOES NOT EXIST
		if(Config.list[obj.id] && !Config.list[obj.id].overwritable){
				Config.debug("Tried illegal overwrite of "+obj.id+".");
				return Config.list[obj.id];
		}

		//SAVE TO MASTER LIST
		//@todo only save if was assigned an id,
		//which implies user intends to access somewhere else outside of scope
		Config.list[obj.id] = obj;

		//AUTO TIMEOUT
		_public.auto_timeout.call(obj);

		//Call hook
		if(Config.settings.hooks.onActivate){
			Config.settings.hooks.onActivate(obj);
		}

		return obj;
};


_public.settle = function(def){

		//REMOVE AUTO TIMEOUT TIMER
		if(def.timeout_id){
			clearTimeout(def.timeout_id);
		}

		//Set state to resolved
		_public.set_state(def,1);

		//Call hook
		if(Config.settings.hooks.onSettle){
			Config.settings.hooks.onSettle(def);
		}

		//Add done as a callback to then chain completion.
		def.callbacks.then.hooks.onComplete.train.push(function(d2,itinerary,last){
				def.caboose = last;

				//Run done
				_public.run_train(
						def
						,def.callbacks.done
						,def.caboose
						,{pause_on_deferred : false}
				);
		});

		//Run then queue
		_public.run_train(
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
 * @param {object} def  /deferred object
 * @param {object} obj  /itinerary
 *      train       {array}
 *      hooks       {object}
 *          onBefore        {array}
 *          onComplete      {array}
 * @param {mixed} param /param to pass to first callback
 * @param {object} options
 *      pause_on_deferred   {boolean}
 *
 * @returns {void}
 */
_public.run_train = function(def,obj,param,options){

		//allow previous return values to be passed down chain
		var r = param || def.caboose || def.value;

		//onBefore event
		if(obj.hooks && obj.hooks.onBefore.train.length > 0){
				_public.run_train(
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

										_public.run_train(
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

																_public.run_train(
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
				_public.run_train(def,obj.hooks.onComplete,r,{pause_on_deferred : false});
		}
};


/**
 * Sets the state of an Orgy object.
 *
 * @param {object} def
 * @param {number} int
 * @returns {void}
 */
_public.set_state = function(def,int){

		def.state = int;

		//IF RESOLVED OR REJECTED, SETTLE
		if(int === 1 || int === 2){
				def.settled = 1;
		}

		if(int === 1 || int === 2){
				_public.signal_downstream(def);
		}
};


/**
 * Gets the state of an Orgy object
 *
 * @param {object} def
 * @returns {number}
 */
_public.get_state = function(def){
		return def.state;
};


/**
 * Sets the automatic timeout on a promise object.
 *
 * @param {integer} timeout (optional)
 * @returns {Boolean}
 */
_public.auto_timeout = function(timeout){

		this.timeout = (typeof timeout === 'undefined')
		? this.timeout : timeout;

		//AUTO REJECT ON timeout
		if(!this.type || this.type !== 'timer'){

				//DELETE PREVIOUS TIMEOUT IF EXISTS
				if(this.timeout_id){
						clearTimeout(this.timeout_id);
				}

				if(typeof this.timeout === 'undefined'){
						Config.debug([
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
						_public.auto_timeout_cb.call(scope);
				}, this.timeout);

		}
		else{
				//@todo WHEN A TIMER, ADD DURATION TO ALL UPSTREAM AND LATERAL?
		}

		return true;
};


/**
 * Callback for autotimeout. Declaration here avoids memory leak.
 *
 * @returns {void}
 */
_public.auto_timeout_cb = function(){

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
				if(Config.settings.debug_mode){
						var r = _public.search_obj_recursively(this,'upstream',fn);
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


_public.error = function(cb){

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
 * Signals all downstream promises that _public promise object's
 * state has changed.
 *
 * @todo Since the same queue may have been assigned twice directly or
 * indirectly via shared dependencies, make sure not to double resolve
 * - which throws an error.
 *
 * @param {object} target deferred/queue
 * @returns {void}
 */
_public.signal_downstream = function(target){

		//MAKE SURE ALL DOWNSTREAM IS UNSETTLED
		for(var i in target.downstream){
				if(target.downstream[i].settled === 1){

					if(target.downstream[i].state !== 1){
						//tried to settle a rejected downstream
						continue;
					}
					else{
						//tried to settle a successfully settled downstream
						Config.debug(target.id + " tried to settle promise "+"'"+target.downstream[i].id+"' that has already been settled.");
					}
				}
		}

		//NOW THAT WE KNOW ALL DOWNSTREAM IS UNSETTLED, WE CAN IGNORE ANY
		//SETTLED THAT RESULT AS A SIDE EFFECT TO ANOTHER SETTLEMENT
		for (var i in target.downstream){
				if(target.downstream[i].settled !== 1){
						_public.receive_signal(target.downstream[i],target.id);
				}
		}
};


/**
* Run over a given object property recursively, applying callback until
* callback returns a non-false value.
*
* @param {object} obj
* @param {string} propName          The property name of the array to bubble up
* @param {function} fn              The test callback to be applied to each object
* @param {array} breadcrumb         The breadcrumb through the chain of the first match
* @returns {mixed}
*/
_public.search_obj_recursively = function(obj,propName,fn,breadcrumb){

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
								return Config.debug([
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
								return _public.search_obj_recursively(obj[propName][i],propName,fn,breadcrumb);
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
_public.convert_to_promise = function(obj,options){

		obj.id = obj.id || options.id;

		//Autoname
		if (!obj.id) {
			if (obj.type === 'timer') {
				obj.id = "timer-" + obj.timeout + "-" + (++Config.i);
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
		if(Config.list[obj.id] && obj.type !== 'timer'){
			//A previous promise of the same id exists.
			//Make sure this dependency object doesn't have a
			//resolver - if it does error
			if(obj.resolver){
				Config.debug([
					"You can't set a resolver on a queue that has already been declared. You can only reference the original."
					,"Detected re-init of '" + obj.id + "'."
					,"Attempted:"
					,obj
					,"Existing:"
					,Config.list[obj.id]
				]);
			}
			else{
				return Config.list[obj.id];
			}
		}


		//Convert dependency to an instance
		var def;
		switch(true){

				//Event
				case(obj.type === 'event'):
						def = _public.wrap_event(obj);
						break;

				case(obj.type === 'queue'):
						var Queue = require('./queue.js');
						def = Queue(obj.dependencies,obj);
						break;

				//Already a thenable
				case(typeof obj.then === 'function'):

						switch(true){

								//Reference to an existing instance
								case(typeof obj.id === 'string'):
										console.warn("'"+obj.id +"': did not exist. Auto creating new deferred.");
										def = _public.deferred({
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
								return Config.debug("Dependency labeled as a promise did not return a promise.",obj);
						}
						break;

				case(obj.type === 'timer'):
						def = _public.wrap_timer(obj);
						break;

				//Load file
				default:
						obj.type = obj.type || "default";
						//Inherit parent's current working directory
						if(options.parent && options.parent.cwd){
							obj.cwd = options.parent.cwd;
						}
						def = _public.wrap_xhr(obj);
		}

		//Index promise by id for future referencing
		Config.list[obj.id] = def;

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
_public.wrap_event = function(obj){

		var Deferred = require('./deferred.js');
		var def = Deferred({
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


_public.wrap_timer = function(obj){

		var Deferred = require('./deferred.js');
		var def = Deferred();

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
_public.wrap_xhr = function(dep){

		var Deferred = require('./deferred.js');

		var required = ["id","url"];
		for(var i in required){
			if(!dep[required[i]]){
				return Config.debug([
					"File requests converted to promises require: " + required[i]
					,"Make sure you weren't expecting dependency to already have been resolved upstream."
					,dep
				]);
			}
		}

		//IF PROMISE FOR THIS URL ALREADY EXISTS, RETURN IT
		if(Config.list[dep.id]){
			return Config.list[dep.id];
		}

		//CONVERT TO DEFERRED:
		var def = Deferred(dep);

		if(typeof File_loader[Config.settings.mode][dep.type] !== 'undefined'){
			File_loader[Config.settings.mode][dep.type](dep.url,def,dep);
		}
		else{
			File_loader[Config.settings.mode]['default'](dep.url,def,dep);
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
_public.receive_signal = function(target,from_id){

		if(target.halt_resolution === 1) return;

	 //MAKE SURE THE SIGNAL WAS FROM A PROMISE BEING LISTENED TO
	 //BUT ALLOW SELF STATUS CHECK
	 var status;
	 if(from_id !== target.id && !target.upstream[from_id]){
			 return Config.debug(from_id + " can't signal " + target.id + " because not in upstream.");
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

module.exports = _public;

},{"./config.js":4,"./deferred.js":5,"./file_loader.js":8,"./queue.js":9}],7:[function(require,module,exports){
/**
 * Default properties for all deferred objects.
 * @ignore
 */
var schema = function(){

	var Config = require('./config.js'),
			_public = {};

	this.get = function(){
		return _public;
	};

	_public.is_orgy = true;

	_public.id = null;

	//A COUNTER FOR AUT0-GENERATED PROMISE ID'S
	_public.settled = 0;

	/**
	* STATE CODES:
	* ------------------
	* -1   => SETTLING [EXECUTING CALLBACKS]
	*  0   => PENDING
	*  1   => RESOLVED / FULFILLED
	*  2   => REJECTED
	*/
	_public.state = 0;

	_public.value = [];

	//The most recent value generated by the then->done chain.
	_public.caboose = null;

	_public.model = "deferred";

	_public.done_fired = 0;

	_public.timeout_id = null;

	/**
	* Default timeout for a deferred
	* @type number
	*/
	_public.timeout = (function(){
		return Config.config().timeout;
	}());

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
	//  _public METHODS
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

		var _private = require('./deferred.private.js');

		if(this.settled === 1){
			Config.debug([
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
				debugger;
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

		var _private = require('./deferred.private.js');

		if(!(err instanceof Array)){
			err = [err];
		}

		var msg = "Rejected "+this.model+": '"+this.id+"'."

		if(Config.settings.debug_mode){
			err.unshift(msg);
			Config.debug(err,this);
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

		var _private = require('./deferred.private.js');

		switch(true){

			//An error was previously thrown, add rejector & bail out
			case(this.state === 2):
				if(typeof rejector === 'function'){
					this.callbacks.reject.train.push(rejector);
				}
				break;

			//Execution chain already finished. Bail out.
			case(this.done_fired === 1):
				return Config.debug(this.id+" can't attach .then() because .done() has already fired, and that means the execution chain is complete.");

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
				else{}
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

		var _private = require('./deferred.private.js');

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
					else{}
			}
			else{
				return Config.debug("done() must be passed a function.");
			}
		}
		else{
			return Config.debug("done() can only be called once.");
		}
	};
};

var factory = function(){
	var o = new schema();
	return o.get();
};

module.exports = factory;

},{"./config.js":4,"./deferred.private.js":6}],8:[function(require,module,exports){
var Config = require('./config.js');
var _public = {},
		_private = {};

_public.browser = {};
_public.native = {};
_private.native = {};

//Browser load

_public.browser.css = function(path,deferred){

	var head =  document.getElementsByTagName("head")[0] || document.documentElement,
	elem = document.createElement("link");

	elem.setAttribute("href",path);
	elem.setAttribute("type","text/css");
	elem.setAttribute("rel","stylesheet");

	if(elem.onload){
		(function(elem,path,deferred){
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

_public.browser.html = function(path,deferred){
	this.default(path,deferred);
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
		if(!Config.settings.debug_mode){_
			Config.debug("Set config.debug_mode=1 to run remote scripts outside of debug mode.");
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
			if (err) throw err;
			callback(data);
		});
	}
	else{
		//http
		var request = require('request');
		request(path,function(error,response,body){
			if (!error && response.statusCode == 200) {
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

module.exports = _public;

},{"./config.js":4,"fs":1,"request":1,"vm":1}],9:[function(require,module,exports){
var Config = require('./config.js');
var _private = require('./queue.private.js');

/**
 * @namespace orgy/queue
 * @borrows orgy/deferred#then as #then
 * @borrows orgy/deferred#done as #done
 * @borrows orgy/deferred#reject as #reject
 * @borrows orgy/deferred#resolve as #resolve
 *
*/

/**
 * Creates a new queue object.
 * If no <b>resolver</b> option is set, resolved when all dependencies are resolved. Else, resolved when the deferred param passed to the resolver option
 * is resolved.

 <b>Usage:</b>
 ```
 var Orgy = require("orgy"),
				q = Orgy.queue([
					 {
						 comment : "This is a nested queue created on the fly."
						 ,type : "json"
						 ,url : "/api/json/somnums"
						 ,resolver : function(r,deferred){
							 //Filter out even numbers
							 var odd = arr.filter(function(val) {
								 return 0 != val % 2;
							 });
							 deferred.resolve(odd);
						 }
					 }
				 ],{
					 id : "q1",
					 resolver : function(r,deferred){
						 var primes = r[0].filter(function(val) {
							 high = Math.floor(Math.sqrt(val)) + 1;
							 for (var div = 2; div <= high; div++) {
								 if (value % div == 0) {
									 return false;
								 }
							 }
							 return true;
						 });
						 deferred.resolve(primes);
					 })
				 });

 ```
 * @memberof orgy
 * @function queue
 *
 * @param {array} deps Array of dependencies that must be resolved before <b>resolver</b> option is called.
 * @param {object} options  List of options:

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
module.exports = function(deps,options){

	var _o;
	if(!(deps instanceof Array)){
		return Config.debug("Queue dependencies must be an array.");
	}

	options = options || {};

	//DOES NOT ALREADY EXIST
	if(!Config.list[options.id]){

		var DeferredSchema = require('./deferred.schema.js')();
		var QueueSchema = require('./queue.schema.js')();

		//Pass array of prototypes to queue factory
		_o = _private.factory([DeferredSchema,QueueSchema],[options]);

		//Activate queue
		_o = _private.activate(_o,options,deps);

	}
	//ALREADY EXISTS
	else {

		_o = Config.list[options.id];

		if(_o.model !== 'queue'){
		//MATCH FOUND BUT NOT A QUEUE, UPGRADE TO ONE

			options.overwritable = 1;

			_o = _private.upgrade(_o,options,deps);
		}
		else{

			//OVERWRITE ANY EXISTING OPTIONS
			for(var i in options){
				_o[i] = options[i];
			}

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

},{"./config.js":4,"./deferred.schema.js":7,"./queue.private.js":10,"./queue.schema.js":11}],10:[function(require,module,exports){
var Config = require('./config.js');
var QueueSchema = require('./queue.schema.js')();
var _proto = require('./deferred.private.js');
var _public = Object.create(_proto,{});


/**
 * Activates a queue object.
 *
 * @param {object} o
 * @param {object} options
 * @param {array} deps
 * @returns {object} queue
 */
_public.activate = function(o,options,deps){

		//ACTIVATE AS A DEFERRED
		//var proto = Object.getPrototypeOf(this);
		o = _proto.activate(o);

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
			QueueSchema.add.call(o,deps);

			//SEE IF CAN BE IMMEDIATELY RESOLVED BY CHECKING UPSTREAM
			self.receive_signal(o,o.id);

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
_public.upgrade = function(obj,options,deps){

		if(obj.settled !== 0 || (obj.model !== 'promise' && obj.model !== 'deferred')){
				return Config.debug('Can only upgrade unsettled promise or deferred into a queue.');
		}

	 //GET A NEW QUEUE OBJECT AND MERGE IN
		var _o = Config.naive_cloner([
				QueueSchema
				,options
		]);

		for(var i in _o){
			 obj[i] = _o[i];
		}

		//delete _o;

		//CREATE NEW INSTANCE OF QUEUE
		obj = this.activate(obj,options,deps);

		//RETURN QUEUE OBJECT
		return obj;
};


module.exports = _public;

},{"./config.js":4,"./deferred.private.js":6,"./queue.schema.js":11}],11:[function(require,module,exports){
var schema = function(){

	var _private = this,
			_public = {};

	_private.config = require('./config.js'),

	this.get = function(){
		return _public;
	};

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
	* When _public._private.config.debug == 1, method will test each
	* dependency is not previously scheduled to resolve
	* downstream from the target, in which
	* case it would never resolve because its upstream depends on it.
	*
	* @param {array} arr  /array of dependencies to add
	* @returns {array} upstream
	*/
	_public.add = function(arr){

		var _deferred_private = require('./queue.private.js');

		try{
				if(arr.length === 0) return this.upstream;
		}
		catch(err){
				_private.config.debug(err);
		}

		//IF NOT PENDING, DO NOT ALLOW TO ADD
		if(this.state !== 0){
				return _private.config.debug([
					"Cannot add dependency list to queue id:'"+this.id
					+"'. Queue settled/in the process of being settled."
				],arr,this);
		}

		for(var a in arr){

				switch(true){

						//CHECK IF EXISTS
						case(typeof _private.config.list[arr[a].id] === 'object'):
								arr[a] = _private.config.list[arr[a].id];
								break;

						//IF NOT, ATTEMPT TO CONVERT IT TO AN ORGY PROMISE
						case(typeof arr[a] === 'object' && (!arr[a].is_orgy)):
								arr[a] = _deferred_private.convert_to_promise(arr[a],{
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
								return _private.config.debug([
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
				return _private.config.debug("Cannot remove list from queue id:'"+this.id+"'. Queue settled/in the process of being settled.");
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
	* @returns {_deferred_private.tpl|Boolean}
	*/
	_public.reset = function(options){

		var _deferred_private = require('./deferred.private.js');

		if(this.settled !== 1 || this.state !== 1){
			return _private.config.debug("Can only reset a queue settled without errors.");
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
		_deferred_private.auto_timeout.call(this,options.timeout);

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
		var _deferred_private = require('./deferred.private.js');
		_deferred_private.receive_signal(this,this.id);
		return this.state;
	};
};

var factory = function(){
	var o = new schema();
	return o.get();
};

module.exports = factory;

},{"./config.js":4,"./deferred.private.js":6,"./queue.private.js":10}],"orgy":[function(require,module,exports){
var Deferred = require('./deferred.js'),
    Queue = require('./queue.js'),
    Cast = require('./cast.js'),
    Config = require('./config.js');

module.exports = {

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
* @param {mixed}  data The value that the object is assigned
* @param {object} options 
- <b>dependencies</b> {array}
- <b>resolver</b> {function(<i>assignedValue</i>,<i>deferred</i>}
* @returns {object} resolved deferred
*/
define : function(id,data,options){

    var def;
    options = options || {};
    options.dependencies = options.dependencies || null;
    options.resolver = options.resolver || null;

    //test for a valid id
    if(typeof id !== 'string'){
      Config.debug("Must set id when defining an instance.");
    }

    //Check no existing instance defined with same id
    if(Config.list[id] && Config.list[id].settled === 1){
      return Config.debug("Can't define " + id + ". Already resolved.");
    }

    options.id = id;

    if(options.dependencies !== null
      && options.dependencies instanceof Array){
      //Define as a queue - can't autoresolve because we have deps
      var deps = options.dependencies;
      delete options.dependencies;
      def = Queue(deps,options);
    }
    else{
      //Define as a deferred
      def = Deferred(options);

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
},


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
get : function(id){
  if(Config.list[id]){
    return Config.list[id];
  }
  else{
    return null;
  }
},


/**
 * Add/remove an upstream dependency to/from a queue.
 *
 * Can use a queue id, even for a queue that is yet to be created.
 *
 * @memberof orgy
 * @function assign
 *
 * @param {string|object} tgt Queue id / queue object
 * @param {array}  arr  Array of promise ids or dependency objects
 * @param {boolean} add  If true <b>ADD</b> array to queue dependencies, If false <b>REMOVE</b> array from queue dependencies
 *
 * @return {object} queue
 */
assign : function(tgt,arr,add){

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
            return Config.debug("Assign target must be a queue object or the id of a queue.",this);
    }

    //IF TARGET ALREADY LISTED
    if(Config.list[id] && Config.list[id].model === 'queue'){
        q = Config.list[id];

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
        q = Queue(arr,{
            id : id
        });
    }
    //ERROR: CAN'T REMOVE FROM A QUEUE THAT DOES NOT EXIST
    else{
        return Config.debug("Cannot remove dependencies from a queue that does not exist.",this);
    }

    return q;
},

/**
* Documented in required file.
* @ignore
*/
deferred : Deferred,

/**
* Documented in required file.
* @ignore
*/
queue : Queue,

/**
* Documented in required file.
* @ignore
*/
cast : Cast,

/**
* Documented in required file.
* @ignore
*/
config : Config.config

};

},{"./cast.js":3,"./config.js":4,"./deferred.js":5,"./queue.js":9}]},{},[])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbGliL19lbXB0eS5qcyIsIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsInNyYy9jYXN0LmpzIiwic3JjL2NvbmZpZy5qcyIsInNyYy9kZWZlcnJlZC5qcyIsInNyYy9kZWZlcnJlZC5wcml2YXRlLmpzIiwic3JjL2RlZmVycmVkLnNjaGVtYS5qcyIsInNyYy9maWxlX2xvYWRlci5qcyIsInNyYy9xdWV1ZS5qcyIsInNyYy9xdWV1ZS5wcml2YXRlLmpzIiwic3JjL3F1ZXVlLnNjaGVtYS5qcyIsInNyYy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQy9LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdHRCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLG51bGwsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gdHJ1ZTtcbiAgICB2YXIgY3VycmVudFF1ZXVlO1xuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB2YXIgaSA9IC0xO1xuICAgICAgICB3aGlsZSAoKytpIDwgbGVuKSB7XG4gICAgICAgICAgICBjdXJyZW50UXVldWVbaV0oKTtcbiAgICAgICAgfVxuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG59XG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHF1ZXVlLnB1c2goZnVuKTtcbiAgICBpZiAoIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJ2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKSxcblx0XHREZWZlcnJlZCA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuanMnKTtcblxuLyoqXG4gKiBDYXN0cyBhIHRoZW5hYmxlIG9iamVjdCBpbnRvIGFuIE9yZ3kgZGVmZXJyZWQgb2JqZWN0LlxuICpcbiAqID4gVG8gcXVhbGlmeSBhcyBhIDxiPnRoZW5hYmxlPC9iPiwgdGhlIG9iamVjdCB0byBiZSBjYXN0ZWQgbXVzdCBoYXZlIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczpcbiAqID5cbiAqID4gLSBpZFxuICogPlxuICogPiAtIHRoZW4oKVxuICogPlxuICogPiAtIGVycm9yKClcbiAqXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIGNhc3RcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqIEEgdGhlbmFibGUgd2l0aCB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG4gKiAgLSB7c3RyaW5nfSA8Yj5pZDwvYj4gIFVuaXF1ZSBpZCBvZiB0aGUgb2JqZWN0LlxuICpcbiAqICAtIHtmdW5jdGlvbn0gPGI+dGhlbjwvYj5cbiAqXG4gKiAgLSB7ZnVuY3Rpb259IDxiPmVycm9yPC9iPlxuICpcbiAqIEByZXR1cm5zIHtvYmplY3R9IGRlZmVycmVkXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob2JqKXtcblxuXHRcdHZhciByZXF1aXJlZCA9IFtcInRoZW5cIixcImVycm9yXCIsXCJpZFwiXTtcblx0XHRmb3IodmFyIGkgaW4gcmVxdWlyZWQpe1xuXHRcdFx0aWYoIW9ialtyZXF1aXJlZFtpXV0pe1xuXHRcdFx0XHRyZXR1cm4gQ29uZmlnLmRlYnVnKFwiQ2FzdCBtZXRob2QgbWlzc2luZyBwcm9wZXJ0eSAnXCIgKyByZXF1aXJlZFtpXSArXCInXCIpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHZhciBvcHRpb25zID0ge307XG5cdFx0b3B0aW9ucy5pZCA9IG9iai5pZDtcblxuXHRcdC8vTWFrZSBzdXJlIGlkIGRvZXMgbm90IGNvbmZsaWN0IHdpdGggZXhpc3Rpbmdcblx0XHRpZihDb25maWcubGlzdFtvcHRpb25zLmlkXSl7XG5cdFx0XHRyZXR1cm4gQ29uZmlnLmRlYnVnKFwiSWQgXCIrb3B0aW9ucy5pZCtcIiBjb25mbGljdHMgd2l0aCBleGlzdGluZyBpZC5cIik7XG5cdFx0fVxuXG5cdFx0Ly9DcmVhdGUgYSBkZWZlcnJlZFxuXHRcdHZhciBkZWYgPSBEZWZlcnJlZChvcHRpb25zKTtcblxuXHRcdC8vQ3JlYXRlIHJlc29sdmVyXG5cdFx0dmFyIHJlc29sdmVyID0gZnVuY3Rpb24oKXtcblx0XHRcdGRlZi5yZXNvbHZlLmNhbGwoZGVmLGFyZ3VtZW50c1swXSk7XG5cdFx0fTtcblxuXHRcdC8vU2V0IFJlc29sdmVyXG5cdFx0b2JqLnRoZW4ocmVzb2x2ZXIpO1xuXG5cdFx0Ly9SZWplY3QgZGVmZXJyZWQgb24gLmVycm9yXG5cdFx0dmFyIGVyciA9IGZ1bmN0aW9uKGVycil7XG5cdFx0XHRkZWYucmVqZWN0KGVycik7XG5cdFx0fTtcblx0XHRvYmouZXJyb3IoZXJyKTtcblxuXHRcdC8vUmV0dXJuIGRlZmVycmVkXG5cdFx0cmV0dXJuIGRlZjtcbn07XG4iLCJ2YXIgX3B1YmxpYyA9IHt9O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHVibGljIFZBUklBQkxFU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8qKlxuICogQSBkaXJlY3Rvcnkgb2YgYWxsIHByb21pc2VzLCBkZWZlcnJlZHMsIGFuZCBxdWV1ZXMuXG4gKiBAdHlwZSBvYmplY3RcbiAqL1xuX3B1YmxpYy5saXN0ID0ge307XG5cblxuLyoqXG4gKiBpdGVyYXRvciBmb3IgaWRzXG4gKiBAdHlwZSBpbnRlZ2VyXG4gKi9cbl9wdWJsaWMuaSA9IDA7XG5cblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIHZhbHVlcy5cbiAqXG4gKiBAdHlwZSBvYmplY3RcbiAqL1xuX3B1YmxpYy5zZXR0aW5ncyA9IHtcblxuXHRcdGRlYnVnX21vZGUgOiAxXG5cdFx0Ly9zZXQgdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3Rvcnkgb2YgdGhlIGNhbGxlZSBzY3JpcHQsXG5cdFx0Ly9iZWNhdXNlIG5vZGUgaGFzIG5vIGNvbnN0YW50IGZvciB0aGlzXG5cdFx0LGN3ZCA6IGZhbHNlXG5cdFx0LG1vZGUgOiAoZnVuY3Rpb24oKXtcblx0XHRcdFx0aWYodHlwZW9mIHByb2Nlc3MgPT09ICdvYmplY3QnICYmIHByb2Nlc3MgKyAnJyA9PT0gJ1tvYmplY3QgcHJvY2Vzc10nKXtcblx0XHRcdFx0XHRcdC8vIGlzIG5vZGVcblx0XHRcdFx0XHRcdHJldHVybiBcIm5hdGl2ZVwiO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0XHQvLyBub3Qgbm9kZVxuXHRcdFx0XHRcdFx0cmV0dXJuIFwiYnJvd3NlclwiO1xuXHRcdFx0XHR9XG5cdFx0fSgpKVxuXHRcdC8qKlxuXHRcdCAqIC0gb25BY3RpdmF0ZSAvd2hlbiBlYWNoIGluc3RhbmNlIGFjdGl2YXRlZFxuXHRcdCAqIC0gb25TZXR0bGUgICAvd2hlbiBlYWNoIGluc3RhbmNlIHNldHRsZXNcblx0XHQgKlxuXHRcdCAqIEB0eXBlIG9iamVjdFxuXHRcdCAqL1xuXHRcdCxob29rcyA6IHtcblx0XHR9XG5cdFx0LHRpbWVvdXQgOiA1MDAwIC8vZGVmYXVsdCB0aW1lb3V0XG59O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHJpdmF0ZSBWQVJJQUJMRVNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3B1YmxpYyBNRVRIT0RTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLyoqXG4gKiBPcHRpb25zIHlvdSB3aXNoIHRvIHBhc3MgdG8gc2V0IHRoZSBnbG9iYWwgY29uZmlndXJhdGlvblxuICpcbiAqIEBtZW1iZXJvZiBvcmd5XG4gKiBAZnVuY3Rpb24gY29uZmlnXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9iaiBMaXN0IG9mIG9wdGlvbnM6XG5cblx0LSB7bnVtYmVyfSA8Yj50aW1lb3V0PC9iPlxuXG5cdC0ge3N0cmluZ30gPGI+Y3dkPC9iPiBTZXRzIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkuIFNlcnZlciBzaWRlIHNjcmlwdHMgb25seS5cblxuXHQtIHtib29sZWFufSA8Yj5kZWJ1Z19tb2RlPC9iPlxuXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBjb25maWd1cmF0aW9uIHNldHRpbmdzXG4gKi9cbl9wdWJsaWMuY29uZmlnID0gZnVuY3Rpb24ob2JqKXtcblxuXHRcdGlmKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKXtcblx0XHRcdFx0Zm9yKHZhciBpIGluIG9iail7XG5cdFx0XHRcdFx0X3B1YmxpYy5zZXR0aW5nc1tpXSA9IG9ialtpXTtcblx0XHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBfcHVibGljLnNldHRpbmdzO1xufTtcblxuXG4vKipcbiAqIERlYnVnZ2luZyBtZXRob2QuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd8YXJyYXl9IG1zZ1xuICogQHBhcmFtIHtvYmplY3R9IGRlZlxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbl9wdWJsaWMuZGVidWcgPSBmdW5jdGlvbihtc2csZGVmKXtcblxuXHRcdHZhciBtc2dzID0gKG1zZyBpbnN0YW5jZW9mIEFycmF5KSA/IG1zZy5qb2luKFwiXFxuXCIpIDogW21zZ107XG5cblx0XHR2YXIgZSA9IG5ldyBFcnJvcihtc2dzKTtcblx0XHRjb25zb2xlLmxvZyhlLnN0YWNrKTtcblxuXG5cdFx0aWYodGhpcy5zZXR0aW5ncy5kZWJ1Z19tb2RlKXtcblx0XHRcdC8vdHVybiBvZmYgZGVidWdfbW9kZSB0byBhdm9pZCBoaXR0aW5nIGRlYnVnZ2VyXG5cdFx0XHRkZWJ1Z2dlcjtcblx0XHR9XG5cblx0XHRpZihfcHVibGljLnNldHRpbmdzLm1vZGUgPT09ICdicm93c2VyJyl7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0ZWxzZXtcblx0XHRcdFx0cHJvY2Vzcy5leGl0KCk7XG5cdFx0fVxufTtcblxuXG4vKipcbiAqIFRha2UgYW4gYXJyYXkgb2YgcHJvdG90eXBlIG9iamVjdHMgYW5kIGFuIGFycmF5IG9mIHByb3BlcnR5IG9iamVjdHMsXG4gKiBtZXJnZXMgZWFjaCwgYW5kIHJldHVybnMgYSBzaGFsbG93IGNvcHkuXG4gKlxuICogQHBhcmFtIHthcnJheX0gcHJvdG9PYmpBcnIgQXJyYXkgb2YgcHJvdG90eXBlIG9iamVjdHMgd2hpY2ggYXJlIG92ZXJ3cml0dGVuIGZyb20gcmlnaHQgdG8gbGVmdFxuICogQHBhcmFtIHthcnJheX0gcHJvcHNPYmpBcnIgQXJyYXkgb2YgZGVzaXJlZCBwcm9wZXJ0eSBvYmplY3RzIHdoaWNoIGFyZSBvdmVyd3JpdHRlbiBmcm9tIHJpZ2h0IHRvIGxlZnRcbiAqIEByZXR1cm5zIHtvYmplY3R9IG9iamVjdFxuICovXG5fcHVibGljLm5haXZlX2Nsb25lciA9IGZ1bmN0aW9uKHByb3RvT2JqQXJyLHByb3BzT2JqQXJyKXtcblxuXHRcdGZ1bmN0aW9uIG1lcmdlKGRvbm9ycyl7XG5cdFx0XHR2YXIgbyA9IHt9O1xuXHRcdFx0Zm9yKHZhciBhIGluIGRvbm9ycyl7XG5cdFx0XHRcdFx0Zm9yKHZhciBiIGluIGRvbm9yc1thXSl7XG5cdFx0XHRcdFx0XHRcdGlmKGRvbm9yc1thXVtiXSBpbnN0YW5jZW9mIEFycmF5KXtcblx0XHRcdFx0XHRcdFx0XHRcdG9bYl0gPSBkb25vcnNbYV1bYl0uc2xpY2UoMCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0ZWxzZSBpZih0eXBlb2YgZG9ub3JzW2FdW2JdID09PSAnb2JqZWN0Jyl7XG5cdFx0XHRcdFx0XHRcdFx0dHJ5e1xuXHRcdFx0XHRcdFx0XHRcdFx0b1tiXSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZG9ub3JzW2FdW2JdKSk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdGNhdGNoKGUpe1xuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihlKTtcblx0XHRcdFx0XHRcdFx0XHRcdGRlYnVnZ2VyO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0XHRcdFx0b1tiXSA9IGRvbm9yc1thXVtiXTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBvO1xuXHRcdH1cblxuXHRcdHZhciBwcm90byA9IG1lcmdlKHByb3RvT2JqQXJyKSxcblx0XHRcdFx0cHJvcHMgPSBtZXJnZShwcm9wc09iakFycik7XG5cblx0XHQvL0B0b2RvIGNvbnNpZGVyIG1hbnVhbGx5IHNldHRpbmcgdGhlIHByb3RvdHlwZSBpbnN0ZWFkXG5cdFx0dmFyIGZpbmFsT2JqZWN0ID0gT2JqZWN0LmNyZWF0ZShwcm90byk7XG5cdFx0Zm9yKHZhciBpIGluIHByb3BzKXtcblx0XHRcdGZpbmFsT2JqZWN0W2ldID0gcHJvcHNbaV07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZpbmFsT2JqZWN0O1xufTtcblxuXG5fcHVibGljLmdlbmVyYXRlX2lkID0gZnVuY3Rpb24oKXtcblx0cmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpICsgJy0nICsgKCsrdGhpcy5pKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBfcHVibGljO1xuIiwidmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG52YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcblxuLyoqXG4qIEBuYW1lc3BhY2Ugb3JneS9kZWZlcnJlZFxuKi9cblxuLyoqXG4qIENyZWF0ZXMgYSBuZXcgZGVmZXJyZWQgb2JqZWN0IG9yIGlmIG9uZSBleGlzdHMgYnkgdGhlIHNhbWUgaWQsXG4qIHJldHVybnMgaXQuXG5cbjxiPlVzYWdlOjwvYj5cbmBgYFxudmFyIE9yZ3kgPSByZXF1aXJlKFwib3JneVwiKSxcbnEgPSBPcmd5LmRlZmVycmVkKHtcbmlkIDogXCJxMVwiXG59KTtcbmBgYFxuXG4qIEBtZW1iZXJvZiBvcmd5XG4qIEBmdW5jdGlvbiBkZWZlcnJlZFxuKlxuKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBMaXN0IG9mIG9wdGlvbnM6XG4qXG4qICAtIDxiPmlkPC9iPiB7c3RyaW5nfSBVbmlxdWUgaWQgb2YgdGhlIG9iamVjdC5cbiogICAtIENhbiBiZSB1c2VkIHdpdGggT3JneS5nZXQoaWQpLlxuKiAgIC0gT3B0aW9uYWwuXG4qXG4qXG4qICAtIDxiPnRpbWVvdXQ8L2I+IHtudW1iZXJ9IFRpbWUgaW4gbXMgYWZ0ZXIgd2hpY2ggcmVqZWN0IGlzIGNhbGxlZCBpZiBub3QgeWV0IHJlc29sdmVkLlxuLSBEZWZhdWx0cyB0byBPcmd5LmNvbmZpZygpLnRpbWVvdXQuXG4tIERlbGF5cyBpbiBvYmplY3QudGhlbigpIGFuZCBvYmplY3QuZG9uZSgpIHdvbid0IG5vdCB0cmlnZ2VyIHRoaXMsIGJlY2F1c2UgdGhvc2UgbWV0aG9kcyBydW4gYWZ0ZXIgcmVzb2x2ZS5cbipcbiogQHJldHVybnMge29iamVjdH0ge0BsaW5rIG9yZ3kvZGVmZXJyZWR9XG4qL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvcHRpb25zKXtcblxuXHR2YXIgX287XG5cdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG5cdGlmKG9wdGlvbnMuaWQgJiYgQ29uZmlnLmxpc3Rbb3B0aW9ucy5pZF0pe1xuXHRcdF9vID0gQ29uZmlnLmxpc3Rbb3B0aW9ucy5pZF07XG5cdH1cblx0ZWxzZXtcblx0XHQvL0NyZWF0ZSBhIG5ldyBkZWZlcnJlZCBjbGFzcyBpbnN0YW5jZVxuXHRcdHZhciBEZWZlcnJlZFNjaGVtYSA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuc2NoZW1hLmpzJykoKTtcblx0XHRfbyA9IF9wcml2YXRlLmZhY3RvcnkoW0RlZmVycmVkU2NoZW1hXSxbb3B0aW9uc10pO1xuXG5cdFx0Ly9BQ1RJVkFURSBERUZFUlJFRFxuXHRcdF9vID0gX3ByaXZhdGUuYWN0aXZhdGUoX28pO1xuXHR9XG5cblx0cmV0dXJuIF9vO1xufTtcbiIsInZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xudmFyIEZpbGVfbG9hZGVyID0gcmVxdWlyZSgnLi9maWxlX2xvYWRlci5qcycpO1xuXG5cbnZhciBfcHVibGljID0ge307XG5cblxuLyoqXG4gKiBAcGFyYW0gYXJyYXkgb3B0aW9ucyBQcm90b3R5cGUgb2JqZWN0c1xuKiovXG5fcHVibGljLmZhY3RvcnkgPSBmdW5jdGlvbihwcm90b09iakFycixvcHRpb25zT2JqQXJyKXtcblxuXHRcdC8vTWVyZ2UgYXJyYXkgb2Ygb2JqZWN0cyBpbnRvIGEgc2luZ2xlLCBzaGFsbG93IGNsb25lXG5cdFx0dmFyIF9vID0gQ29uZmlnLm5haXZlX2Nsb25lcihwcm90b09iakFycixvcHRpb25zT2JqQXJyKTtcblxuXHRcdC8vaWYgbm8gaWQsIGdlbmVyYXRlIG9uZVxuXHRcdGlmKCFfby5pZCl7XG5cdFx0XHRfby5pZCA9IENvbmZpZy5nZW5lcmF0ZV9pZCgpO1xuXHRcdH1cblxuXHRcdHJldHVybiBfbztcbn07XG5cblxuX3B1YmxpYy5hY3RpdmF0ZSA9IGZ1bmN0aW9uKG9iail7XG5cblx0XHQvL01BS0UgU1VSRSBOQU1JTkcgQ09ORkxJQ1QgRE9FUyBOT1QgRVhJU1Rcblx0XHRpZihDb25maWcubGlzdFtvYmouaWRdICYmICFDb25maWcubGlzdFtvYmouaWRdLm92ZXJ3cml0YWJsZSl7XG5cdFx0XHRcdENvbmZpZy5kZWJ1ZyhcIlRyaWVkIGlsbGVnYWwgb3ZlcndyaXRlIG9mIFwiK29iai5pZCtcIi5cIik7XG5cdFx0XHRcdHJldHVybiBDb25maWcubGlzdFtvYmouaWRdO1xuXHRcdH1cblxuXHRcdC8vU0FWRSBUTyBNQVNURVIgTElTVFxuXHRcdC8vQHRvZG8gb25seSBzYXZlIGlmIHdhcyBhc3NpZ25lZCBhbiBpZCxcblx0XHQvL3doaWNoIGltcGxpZXMgdXNlciBpbnRlbmRzIHRvIGFjY2VzcyBzb21ld2hlcmUgZWxzZSBvdXRzaWRlIG9mIHNjb3BlXG5cdFx0Q29uZmlnLmxpc3Rbb2JqLmlkXSA9IG9iajtcblxuXHRcdC8vQVVUTyBUSU1FT1VUXG5cdFx0X3B1YmxpYy5hdXRvX3RpbWVvdXQuY2FsbChvYmopO1xuXG5cdFx0Ly9DYWxsIGhvb2tcblx0XHRpZihDb25maWcuc2V0dGluZ3MuaG9va3Mub25BY3RpdmF0ZSl7XG5cdFx0XHRDb25maWcuc2V0dGluZ3MuaG9va3Mub25BY3RpdmF0ZShvYmopO1xuXHRcdH1cblxuXHRcdHJldHVybiBvYmo7XG59O1xuXG5cbl9wdWJsaWMuc2V0dGxlID0gZnVuY3Rpb24oZGVmKXtcblxuXHRcdC8vUkVNT1ZFIEFVVE8gVElNRU9VVCBUSU1FUlxuXHRcdGlmKGRlZi50aW1lb3V0X2lkKXtcblx0XHRcdGNsZWFyVGltZW91dChkZWYudGltZW91dF9pZCk7XG5cdFx0fVxuXG5cdFx0Ly9TZXQgc3RhdGUgdG8gcmVzb2x2ZWRcblx0XHRfcHVibGljLnNldF9zdGF0ZShkZWYsMSk7XG5cblx0XHQvL0NhbGwgaG9va1xuXHRcdGlmKENvbmZpZy5zZXR0aW5ncy5ob29rcy5vblNldHRsZSl7XG5cdFx0XHRDb25maWcuc2V0dGluZ3MuaG9va3Mub25TZXR0bGUoZGVmKTtcblx0XHR9XG5cblx0XHQvL0FkZCBkb25lIGFzIGEgY2FsbGJhY2sgdG8gdGhlbiBjaGFpbiBjb21wbGV0aW9uLlxuXHRcdGRlZi5jYWxsYmFja3MudGhlbi5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnB1c2goZnVuY3Rpb24oZDIsaXRpbmVyYXJ5LGxhc3Qpe1xuXHRcdFx0XHRkZWYuY2Fib29zZSA9IGxhc3Q7XG5cblx0XHRcdFx0Ly9SdW4gZG9uZVxuXHRcdFx0XHRfcHVibGljLnJ1bl90cmFpbihcblx0XHRcdFx0XHRcdGRlZlxuXHRcdFx0XHRcdFx0LGRlZi5jYWxsYmFja3MuZG9uZVxuXHRcdFx0XHRcdFx0LGRlZi5jYWJvb3NlXG5cdFx0XHRcdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG5cdFx0XHRcdCk7XG5cdFx0fSk7XG5cblx0XHQvL1J1biB0aGVuIHF1ZXVlXG5cdFx0X3B1YmxpYy5ydW5fdHJhaW4oXG5cdFx0XHRcdGRlZlxuXHRcdFx0XHQsZGVmLmNhbGxiYWNrcy50aGVuXG5cdFx0XHRcdCxkZWYudmFsdWVcblx0XHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG5cdFx0KTtcblxuXHRcdHJldHVybiBkZWY7XG59O1xuXG5cbi8qKlxuICogUnVucyBhbiBhcnJheSBvZiBmdW5jdGlvbnMgc2VxdWVudGlhbGx5IGFzIGEgcGFydGlhbCBmdW5jdGlvbi5cbiAqIEVhY2ggZnVuY3Rpb24ncyBhcmd1bWVudCBpcyB0aGUgcmVzdWx0IG9mIGl0cyBwcmVkZWNlc3NvciBmdW5jdGlvbi5cbiAqXG4gKiBCeSBkZWZhdWx0LCBleGVjdXRpb24gY2hhaW4gaXMgcGF1c2VkIHdoZW4gYW55IGZ1bmN0aW9uXG4gKiByZXR1cm5zIGFuIHVucmVzb2x2ZWQgZGVmZXJyZWQuIChwYXVzZV9vbl9kZWZlcnJlZCkgW09QVElPTkFMXVxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkZWYgIC9kZWZlcnJlZCBvYmplY3RcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogIC9pdGluZXJhcnlcbiAqICAgICAgdHJhaW4gICAgICAge2FycmF5fVxuICogICAgICBob29rcyAgICAgICB7b2JqZWN0fVxuICogICAgICAgICAgb25CZWZvcmUgICAgICAgIHthcnJheX1cbiAqICAgICAgICAgIG9uQ29tcGxldGUgICAgICB7YXJyYXl9XG4gKiBAcGFyYW0ge21peGVkfSBwYXJhbSAvcGFyYW0gdG8gcGFzcyB0byBmaXJzdCBjYWxsYmFja1xuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiAqICAgICAgcGF1c2Vfb25fZGVmZXJyZWQgICB7Ym9vbGVhbn1cbiAqXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuX3B1YmxpYy5ydW5fdHJhaW4gPSBmdW5jdGlvbihkZWYsb2JqLHBhcmFtLG9wdGlvbnMpe1xuXG5cdFx0Ly9hbGxvdyBwcmV2aW91cyByZXR1cm4gdmFsdWVzIHRvIGJlIHBhc3NlZCBkb3duIGNoYWluXG5cdFx0dmFyIHIgPSBwYXJhbSB8fCBkZWYuY2Fib29zZSB8fCBkZWYudmFsdWU7XG5cblx0XHQvL29uQmVmb3JlIGV2ZW50XG5cdFx0aWYob2JqLmhvb2tzICYmIG9iai5ob29rcy5vbkJlZm9yZS50cmFpbi5sZW5ndGggPiAwKXtcblx0XHRcdFx0X3B1YmxpYy5ydW5fdHJhaW4oXG5cdFx0XHRcdFx0XHRkZWZcblx0XHRcdFx0XHRcdCxvYmouaG9va3Mub25CZWZvcmVcblx0XHRcdFx0XHRcdCxwYXJhbVxuXHRcdFx0XHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuXHRcdFx0XHQpO1xuXHRcdH1cblxuXHRcdHdoaWxlKG9iai50cmFpbi5sZW5ndGggPiAwKXtcblxuXHRcdFx0XHQvL3JlbW92ZSBmbiB0byBleGVjdXRlXG5cdFx0XHRcdHZhciBsYXN0ID0gb2JqLnRyYWluLnNoaWZ0KCk7XG5cdFx0XHRcdGRlZi5leGVjdXRpb25faGlzdG9yeS5wdXNoKGxhc3QpO1xuXG5cdFx0XHRcdC8vZGVmLmNhYm9vc2UgbmVlZGVkIGZvciB0aGVuIGNoYWluIGRlY2xhcmVkIGFmdGVyIHJlc29sdmVkIGluc3RhbmNlXG5cdFx0XHRcdHIgPSBkZWYuY2Fib29zZSA9IGxhc3QuY2FsbChkZWYsZGVmLnZhbHVlLGRlZixyKTtcblxuXHRcdFx0XHQvL2lmIHJlc3VsdCBpcyBhbiB0aGVuYWJsZSwgaGFsdCBleGVjdXRpb25cblx0XHRcdFx0Ly9hbmQgcnVuIHVuZmlyZWQgYXJyIHdoZW4gdGhlbmFibGUgc2V0dGxlc1xuXHRcdFx0XHRpZihvcHRpb25zLnBhdXNlX29uX2RlZmVycmVkKXtcblxuXHRcdFx0XHRcdFx0Ly9JZiByIGlzIGFuIHVuc2V0dGxlZCB0aGVuYWJsZVxuXHRcdFx0XHRcdFx0aWYociAmJiByLnRoZW4gJiYgci5zZXR0bGVkICE9PSAxKXtcblxuXHRcdFx0XHRcdFx0XHRcdC8vZXhlY3V0ZSByZXN0IG9mIHRoaXMgdHJhaW4gYWZ0ZXIgciByZXNvbHZlc1xuXHRcdFx0XHRcdFx0XHRcdHIuY2FsbGJhY2tzLnJlc29sdmUuaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKGZ1bmN0aW9uKCl7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0X3B1YmxpYy5ydW5fdHJhaW4oXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkZWZcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCxvYmpcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogdHJ1ZX1cblx0XHRcdFx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0XHRcdC8vdGVybWluYXRlIGV4ZWN1dGlvblxuXHRcdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Ly9JZiBpcyBhbiBhcnJheSB0aGFuIGNvbnRhaW5zIGFuIHVuc2V0dGxlZCB0aGVuYWJsZVxuXHRcdFx0XHRcdFx0ZWxzZSBpZihyIGluc3RhbmNlb2YgQXJyYXkpe1xuXG5cdFx0XHRcdFx0XHRcdFx0dmFyIHRoZW5hYmxlcyA9IFtdO1xuXG5cdFx0XHRcdFx0XHRcdFx0Zm9yKHZhciBpIGluIHIpe1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlmKHJbaV0udGhlbiAmJiByW2ldLnNldHRsZWQgIT09IDEpe1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aGVuYWJsZXMucHVzaChyW2ldKTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dmFyIGZuID0gKGZ1bmN0aW9uKHQsZGVmLG9iaixwYXJhbSl7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24oKXtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvL0JhaWwgaWYgYW55IHRoZW5hYmxlcyB1bnNldHRsZWRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Zm9yKHZhciBpIGluIHQpe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYodFtpXS5zZXR0bGVkICE9PSAxKXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRfcHVibGljLnJ1bl90cmFpbihcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGRlZlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0LG9ialxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0LHBhcmFtXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogdHJ1ZX1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9KSh0aGVuYWJsZXMsZGVmLG9iaixwYXJhbSk7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vZXhlY3V0ZSByZXN0IG9mIHRoaXMgdHJhaW4gYWZ0ZXJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vYWxsIHRoZW5hYmxlcyBmb3VuZCBpbiByIHJlc29sdmVcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHJbaV0uY2FsbGJhY2tzLnJlc29sdmUuaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKGZuKTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly90ZXJtaW5hdGUgZXhlY3V0aW9uXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHR9XG5cblx0XHQvL29uQ29tcGxldGUgZXZlbnRcblx0XHRpZihvYmouaG9va3MgJiYgb2JqLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ubGVuZ3RoID4gMCl7XG5cdFx0XHRcdF9wdWJsaWMucnVuX3RyYWluKGRlZixvYmouaG9va3Mub25Db21wbGV0ZSxyLHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfSk7XG5cdFx0fVxufTtcblxuXG4vKipcbiAqIFNldHMgdGhlIHN0YXRlIG9mIGFuIE9yZ3kgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkZWZcbiAqIEBwYXJhbSB7bnVtYmVyfSBpbnRcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5fcHVibGljLnNldF9zdGF0ZSA9IGZ1bmN0aW9uKGRlZixpbnQpe1xuXG5cdFx0ZGVmLnN0YXRlID0gaW50O1xuXG5cdFx0Ly9JRiBSRVNPTFZFRCBPUiBSRUpFQ1RFRCwgU0VUVExFXG5cdFx0aWYoaW50ID09PSAxIHx8IGludCA9PT0gMil7XG5cdFx0XHRcdGRlZi5zZXR0bGVkID0gMTtcblx0XHR9XG5cblx0XHRpZihpbnQgPT09IDEgfHwgaW50ID09PSAyKXtcblx0XHRcdFx0X3B1YmxpYy5zaWduYWxfZG93bnN0cmVhbShkZWYpO1xuXHRcdH1cbn07XG5cblxuLyoqXG4gKiBHZXRzIHRoZSBzdGF0ZSBvZiBhbiBPcmd5IG9iamVjdFxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkZWZcbiAqIEByZXR1cm5zIHtudW1iZXJ9XG4gKi9cbl9wdWJsaWMuZ2V0X3N0YXRlID0gZnVuY3Rpb24oZGVmKXtcblx0XHRyZXR1cm4gZGVmLnN0YXRlO1xufTtcblxuXG4vKipcbiAqIFNldHMgdGhlIGF1dG9tYXRpYyB0aW1lb3V0IG9uIGEgcHJvbWlzZSBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtpbnRlZ2VyfSB0aW1lb3V0IChvcHRpb25hbClcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5fcHVibGljLmF1dG9fdGltZW91dCA9IGZ1bmN0aW9uKHRpbWVvdXQpe1xuXG5cdFx0dGhpcy50aW1lb3V0ID0gKHR5cGVvZiB0aW1lb3V0ID09PSAndW5kZWZpbmVkJylcblx0XHQ/IHRoaXMudGltZW91dCA6IHRpbWVvdXQ7XG5cblx0XHQvL0FVVE8gUkVKRUNUIE9OIHRpbWVvdXRcblx0XHRpZighdGhpcy50eXBlIHx8IHRoaXMudHlwZSAhPT0gJ3RpbWVyJyl7XG5cblx0XHRcdFx0Ly9ERUxFVEUgUFJFVklPVVMgVElNRU9VVCBJRiBFWElTVFNcblx0XHRcdFx0aWYodGhpcy50aW1lb3V0X2lkKXtcblx0XHRcdFx0XHRcdGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRfaWQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYodHlwZW9mIHRoaXMudGltZW91dCA9PT0gJ3VuZGVmaW5lZCcpe1xuXHRcdFx0XHRcdFx0Q29uZmlnLmRlYnVnKFtcblx0XHRcdFx0XHRcdFx0XCJBdXRvIHRpbWVvdXQgdGhpcy50aW1lb3V0IGNhbm5vdCBiZSB1bmRlZmluZWQuXCJcblx0XHRcdFx0XHRcdFx0LHRoaXMuaWRcblx0XHRcdFx0XHRcdF0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKHRoaXMudGltZW91dCA9PT0gLTEpe1xuXHRcdFx0XHRcdFx0Ly9OTyBBVVRPIFRJTUVPVVQgU0VUXG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIHNjb3BlID0gdGhpcztcblxuXHRcdFx0XHR0aGlzLnRpbWVvdXRfaWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRfcHVibGljLmF1dG9fdGltZW91dF9jYi5jYWxsKHNjb3BlKTtcblx0XHRcdFx0fSwgdGhpcy50aW1lb3V0KTtcblxuXHRcdH1cblx0XHRlbHNle1xuXHRcdFx0XHQvL0B0b2RvIFdIRU4gQSBUSU1FUiwgQUREIERVUkFUSU9OIFRPIEFMTCBVUFNUUkVBTSBBTkQgTEFURVJBTD9cblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcbn07XG5cblxuLyoqXG4gKiBDYWxsYmFjayBmb3IgYXV0b3RpbWVvdXQuIERlY2xhcmF0aW9uIGhlcmUgYXZvaWRzIG1lbW9yeSBsZWFrLlxuICpcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5fcHVibGljLmF1dG9fdGltZW91dF9jYiA9IGZ1bmN0aW9uKCl7XG5cblx0XHRpZih0aGlzLnN0YXRlICE9PSAxKXtcblxuXHRcdFx0XHQvL0dFVCBUSEUgVVBTVFJFQU0gRVJST1IgSURcblx0XHRcdFx0dmFyIG1zZ3MgPSBbXTtcblx0XHRcdFx0dmFyIHNjb3BlID0gdGhpcztcblxuXHRcdFx0XHR2YXIgZm4gPSBmdW5jdGlvbihvYmope1xuXHRcdFx0XHRcdFx0aWYob2JqLnN0YXRlICE9PSAxKXtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gb2JqLmlkO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0LyoqXG5cdFx0XHRcdCAqIFJ1biBvdmVyIGEgZ2l2ZW4gb2JqZWN0IHByb3BlcnR5IHJlY3Vyc2l2ZWx5LFxuXHRcdFx0XHQgKiBhcHBseWluZyBjYWxsYmFjayB1bnRpbFxuXHRcdFx0XHQgKiBjYWxsYmFjayByZXR1cm5zIGEgbm9uLWZhbHNlIHZhbHVlLlxuXHRcdFx0XHQgKi9cblx0XHRcdFx0aWYoQ29uZmlnLnNldHRpbmdzLmRlYnVnX21vZGUpe1xuXHRcdFx0XHRcdFx0dmFyIHIgPSBfcHVibGljLnNlYXJjaF9vYmpfcmVjdXJzaXZlbHkodGhpcywndXBzdHJlYW0nLGZuKTtcblx0XHRcdFx0XHRcdG1zZ3MucHVzaChzY29wZS5pZCArIFwiOiByZWplY3RlZCBieSBhdXRvIHRpbWVvdXQgYWZ0ZXIgXCJcblx0XHRcdFx0XHRcdFx0XHRcdFx0KyB0aGlzLnRpbWVvdXQgKyBcIm1zXCIpO1xuXHRcdFx0XHRcdFx0bXNncy5wdXNoKFwiQ2F1c2U6XCIpO1xuXHRcdFx0XHRcdFx0bXNncy5wdXNoKHIpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMucmVqZWN0LmNhbGwodGhpcyxtc2dzKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMucmVqZWN0LmNhbGwodGhpcyk7XG5cdFx0XHRcdH1cblx0XHR9XG59O1xuXG5cbl9wdWJsaWMuZXJyb3IgPSBmdW5jdGlvbihjYil7XG5cblx0XHQvL0lGIEVSUk9SIEFMUkVBRFkgVEhST1dOLCBFWEVDVVRFIENCIElNTUVESUFURUxZXG5cdFx0aWYodGhpcy5zdGF0ZSA9PT0gMil7XG5cdFx0XHRcdGNiKCk7XG5cdFx0fVxuXHRcdGVsc2V7XG5cdFx0XHRcdHRoaXMucmVqZWN0X3EucHVzaChjYik7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogU2lnbmFscyBhbGwgZG93bnN0cmVhbSBwcm9taXNlcyB0aGF0IF9wdWJsaWMgcHJvbWlzZSBvYmplY3Qnc1xuICogc3RhdGUgaGFzIGNoYW5nZWQuXG4gKlxuICogQHRvZG8gU2luY2UgdGhlIHNhbWUgcXVldWUgbWF5IGhhdmUgYmVlbiBhc3NpZ25lZCB0d2ljZSBkaXJlY3RseSBvclxuICogaW5kaXJlY3RseSB2aWEgc2hhcmVkIGRlcGVuZGVuY2llcywgbWFrZSBzdXJlIG5vdCB0byBkb3VibGUgcmVzb2x2ZVxuICogLSB3aGljaCB0aHJvd3MgYW4gZXJyb3IuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IHRhcmdldCBkZWZlcnJlZC9xdWV1ZVxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbl9wdWJsaWMuc2lnbmFsX2Rvd25zdHJlYW0gPSBmdW5jdGlvbih0YXJnZXQpe1xuXG5cdFx0Ly9NQUtFIFNVUkUgQUxMIERPV05TVFJFQU0gSVMgVU5TRVRUTEVEXG5cdFx0Zm9yKHZhciBpIGluIHRhcmdldC5kb3duc3RyZWFtKXtcblx0XHRcdFx0aWYodGFyZ2V0LmRvd25zdHJlYW1baV0uc2V0dGxlZCA9PT0gMSl7XG5cblx0XHRcdFx0XHRpZih0YXJnZXQuZG93bnN0cmVhbVtpXS5zdGF0ZSAhPT0gMSl7XG5cdFx0XHRcdFx0XHQvL3RyaWVkIHRvIHNldHRsZSBhIHJlamVjdGVkIGRvd25zdHJlYW1cblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0Ly90cmllZCB0byBzZXR0bGUgYSBzdWNjZXNzZnVsbHkgc2V0dGxlZCBkb3duc3RyZWFtXG5cdFx0XHRcdFx0XHRDb25maWcuZGVidWcodGFyZ2V0LmlkICsgXCIgdHJpZWQgdG8gc2V0dGxlIHByb21pc2UgXCIrXCInXCIrdGFyZ2V0LmRvd25zdHJlYW1baV0uaWQrXCInIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBzZXR0bGVkLlwiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHR9XG5cblx0XHQvL05PVyBUSEFUIFdFIEtOT1cgQUxMIERPV05TVFJFQU0gSVMgVU5TRVRUTEVELCBXRSBDQU4gSUdOT1JFIEFOWVxuXHRcdC8vU0VUVExFRCBUSEFUIFJFU1VMVCBBUyBBIFNJREUgRUZGRUNUIFRPIEFOT1RIRVIgU0VUVExFTUVOVFxuXHRcdGZvciAodmFyIGkgaW4gdGFyZ2V0LmRvd25zdHJlYW0pe1xuXHRcdFx0XHRpZih0YXJnZXQuZG93bnN0cmVhbVtpXS5zZXR0bGVkICE9PSAxKXtcblx0XHRcdFx0XHRcdF9wdWJsaWMucmVjZWl2ZV9zaWduYWwodGFyZ2V0LmRvd25zdHJlYW1baV0sdGFyZ2V0LmlkKTtcblx0XHRcdFx0fVxuXHRcdH1cbn07XG5cblxuLyoqXG4qIFJ1biBvdmVyIGEgZ2l2ZW4gb2JqZWN0IHByb3BlcnR5IHJlY3Vyc2l2ZWx5LCBhcHBseWluZyBjYWxsYmFjayB1bnRpbFxuKiBjYWxsYmFjayByZXR1cm5zIGEgbm9uLWZhbHNlIHZhbHVlLlxuKlxuKiBAcGFyYW0ge29iamVjdH0gb2JqXG4qIEBwYXJhbSB7c3RyaW5nfSBwcm9wTmFtZSAgICAgICAgICBUaGUgcHJvcGVydHkgbmFtZSBvZiB0aGUgYXJyYXkgdG8gYnViYmxlIHVwXG4qIEBwYXJhbSB7ZnVuY3Rpb259IGZuICAgICAgICAgICAgICBUaGUgdGVzdCBjYWxsYmFjayB0byBiZSBhcHBsaWVkIHRvIGVhY2ggb2JqZWN0XG4qIEBwYXJhbSB7YXJyYXl9IGJyZWFkY3J1bWIgICAgICAgICBUaGUgYnJlYWRjcnVtYiB0aHJvdWdoIHRoZSBjaGFpbiBvZiB0aGUgZmlyc3QgbWF0Y2hcbiogQHJldHVybnMge21peGVkfVxuKi9cbl9wdWJsaWMuc2VhcmNoX29ial9yZWN1cnNpdmVseSA9IGZ1bmN0aW9uKG9iaixwcm9wTmFtZSxmbixicmVhZGNydW1iKXtcblxuXHRcdGlmKHR5cGVvZiBicmVhZGNydW1iID09PSAndW5kZWZpbmVkJyl7XG5cdFx0XHRcdGJyZWFkY3J1bWIgPSBbb2JqLmlkXTtcblx0XHR9XG5cblx0XHR2YXIgcjE7XG5cblx0XHRmb3IodmFyIGkgaW4gb2JqW3Byb3BOYW1lXSl7XG5cblx0XHRcdFx0Ly9SVU4gVEVTVFxuXHRcdFx0XHRyMSA9IGZuKG9ialtwcm9wTmFtZV1baV0pO1xuXG5cdFx0XHRcdGlmKHIxICE9PSBmYWxzZSl7XG5cdFx0XHRcdC8vTUFUQ0ggUkVUVVJORUQuIFJFQ1VSU0UgSU5UTyBNQVRDSCBJRiBIQVMgUFJPUEVSVFkgT0YgU0FNRSBOQU1FIFRPIFNFQVJDSFxuXHRcdFx0XHRcdFx0Ly9DSEVDSyBUSEFUIFdFIEFSRU4nVCBDQVVHSFQgSU4gQSBDSVJDVUxBUiBMT09QXG5cdFx0XHRcdFx0XHRpZihicmVhZGNydW1iLmluZGV4T2YocjEpICE9PSAtMSl7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIENvbmZpZy5kZWJ1ZyhbXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFwiQ2lyY3VsYXIgY29uZGl0aW9uIGluIHJlY3Vyc2l2ZSBzZWFyY2ggb2Ygb2JqIHByb3BlcnR5ICdcIlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0K3Byb3BOYW1lK1wiJyBvZiBvYmplY3QgXCJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCsoKHR5cGVvZiBvYmouaWQgIT09ICd1bmRlZmluZWQnKSA/IFwiJ1wiK29iai5pZCtcIidcIiA6ICcnKVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0K1wiLiBPZmZlbmRpbmcgdmFsdWU6IFwiK3IxXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCwoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFkY3J1bWIucHVzaChyMSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gYnJlYWRjcnVtYi5qb2luKFwiIFtkZXBlbmRzIG9uXT0+IFwiKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0fSkoKVxuXHRcdFx0XHRcdFx0XHRcdF0pO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRicmVhZGNydW1iLnB1c2gocjEpO1xuXG5cdFx0XHRcdFx0XHRpZihvYmpbcHJvcE5hbWVdW2ldW3Byb3BOYW1lXSl7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIF9wdWJsaWMuc2VhcmNoX29ial9yZWN1cnNpdmVseShvYmpbcHJvcE5hbWVdW2ldLHByb3BOYW1lLGZuLGJyZWFkY3J1bWIpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIGJyZWFkY3J1bWI7XG59O1xuXG5cbi8qKlxuICogQ29udmVydHMgYSBwcm9taXNlIGRlc2NyaXB0aW9uIGludG8gYSBwcm9taXNlLlxuICpcbiAqIEBwYXJhbSB7dHlwZX0gb2JqXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG5fcHVibGljLmNvbnZlcnRfdG9fcHJvbWlzZSA9IGZ1bmN0aW9uKG9iaixvcHRpb25zKXtcblxuXHRcdG9iai5pZCA9IG9iai5pZCB8fCBvcHRpb25zLmlkO1xuXG5cdFx0Ly9BdXRvbmFtZVxuXHRcdGlmICghb2JqLmlkKSB7XG5cdFx0XHRpZiAob2JqLnR5cGUgPT09ICd0aW1lcicpIHtcblx0XHRcdFx0b2JqLmlkID0gXCJ0aW1lci1cIiArIG9iai50aW1lb3V0ICsgXCItXCIgKyAoKytDb25maWcuaSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICh0eXBlb2Ygb2JqLnVybCA9PT0gJ3N0cmluZycpIHtcblx0XHRcdFx0b2JqLmlkID0gb2JqLnVybC5zcGxpdChcIi9cIikucG9wKCk7XG5cdFx0XHRcdC8vUkVNT1ZFIC5qcyBGUk9NIElEXG5cdFx0XHRcdGlmIChvYmouaWQuc2VhcmNoKFwiLmpzXCIpICE9PSAtMSkge1xuXHRcdFx0XHRcdG9iai5pZCA9IG9iai5pZC5zcGxpdChcIi5cIik7XG5cdFx0XHRcdFx0b2JqLmlkLnBvcCgpO1xuXHRcdFx0XHRcdG9iai5pZCA9IG9iai5pZC5qb2luKFwiLlwiKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vUmV0dXJuIGlmIGFscmVhZHkgZXhpc3RzXG5cdFx0aWYoQ29uZmlnLmxpc3Rbb2JqLmlkXSAmJiBvYmoudHlwZSAhPT0gJ3RpbWVyJyl7XG5cdFx0XHQvL0EgcHJldmlvdXMgcHJvbWlzZSBvZiB0aGUgc2FtZSBpZCBleGlzdHMuXG5cdFx0XHQvL01ha2Ugc3VyZSB0aGlzIGRlcGVuZGVuY3kgb2JqZWN0IGRvZXNuJ3QgaGF2ZSBhXG5cdFx0XHQvL3Jlc29sdmVyIC0gaWYgaXQgZG9lcyBlcnJvclxuXHRcdFx0aWYob2JqLnJlc29sdmVyKXtcblx0XHRcdFx0Q29uZmlnLmRlYnVnKFtcblx0XHRcdFx0XHRcIllvdSBjYW4ndCBzZXQgYSByZXNvbHZlciBvbiBhIHF1ZXVlIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBkZWNsYXJlZC4gWW91IGNhbiBvbmx5IHJlZmVyZW5jZSB0aGUgb3JpZ2luYWwuXCJcblx0XHRcdFx0XHQsXCJEZXRlY3RlZCByZS1pbml0IG9mICdcIiArIG9iai5pZCArIFwiJy5cIlxuXHRcdFx0XHRcdCxcIkF0dGVtcHRlZDpcIlxuXHRcdFx0XHRcdCxvYmpcblx0XHRcdFx0XHQsXCJFeGlzdGluZzpcIlxuXHRcdFx0XHRcdCxDb25maWcubGlzdFtvYmouaWRdXG5cdFx0XHRcdF0pO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZXtcblx0XHRcdFx0cmV0dXJuIENvbmZpZy5saXN0W29iai5pZF07XG5cdFx0XHR9XG5cdFx0fVxuXG5cblx0XHQvL0NvbnZlcnQgZGVwZW5kZW5jeSB0byBhbiBpbnN0YW5jZVxuXHRcdHZhciBkZWY7XG5cdFx0c3dpdGNoKHRydWUpe1xuXG5cdFx0XHRcdC8vRXZlbnRcblx0XHRcdFx0Y2FzZShvYmoudHlwZSA9PT0gJ2V2ZW50Jyk6XG5cdFx0XHRcdFx0XHRkZWYgPSBfcHVibGljLndyYXBfZXZlbnQob2JqKTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdGNhc2Uob2JqLnR5cGUgPT09ICdxdWV1ZScpOlxuXHRcdFx0XHRcdFx0dmFyIFF1ZXVlID0gcmVxdWlyZSgnLi9xdWV1ZS5qcycpO1xuXHRcdFx0XHRcdFx0ZGVmID0gUXVldWUob2JqLmRlcGVuZGVuY2llcyxvYmopO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Ly9BbHJlYWR5IGEgdGhlbmFibGVcblx0XHRcdFx0Y2FzZSh0eXBlb2Ygb2JqLnRoZW4gPT09ICdmdW5jdGlvbicpOlxuXG5cdFx0XHRcdFx0XHRzd2l0Y2godHJ1ZSl7XG5cblx0XHRcdFx0XHRcdFx0XHQvL1JlZmVyZW5jZSB0byBhbiBleGlzdGluZyBpbnN0YW5jZVxuXHRcdFx0XHRcdFx0XHRcdGNhc2UodHlwZW9mIG9iai5pZCA9PT0gJ3N0cmluZycpOlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLndhcm4oXCInXCIrb2JqLmlkICtcIic6IGRpZCBub3QgZXhpc3QuIEF1dG8gY3JlYXRpbmcgbmV3IGRlZmVycmVkLlwiKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmID0gX3B1YmxpYy5kZWZlcnJlZCh7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpZCA6IG9iai5pZFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHQvL0lmIG9iamVjdCB3YXMgYSB0aGVuYWJsZSwgcmVzb2x2ZSB0aGUgbmV3IGRlZmVycmVkIHdoZW4gdGhlbiBjYWxsZWRcblx0XHRcdFx0XHRcdFx0XHRcdFx0aWYob2JqLnRoZW4pe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdG9iai50aGVuKGZ1bmN0aW9uKHIpe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmLnJlc29sdmUocik7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdFx0XHQvL09CSkVDVCBQUk9QRVJUWSAucHJvbWlzZSBFWFBFQ1RFRCBUTyBSRVRVUk4gQSBQUk9NSVNFXG5cdFx0XHRcdFx0XHRcdFx0Y2FzZSh0eXBlb2Ygb2JqLnByb21pc2UgPT09ICdmdW5jdGlvbicpOlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZihvYmouc2NvcGUpe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmID0gb2JqLnByb21pc2UuY2FsbChvYmouc2NvcGUpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkZWYgPSBvYmoucHJvbWlzZSgpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRcdFx0Ly9PYmplY3QgaXMgYSB0aGVuYWJsZVxuXHRcdFx0XHRcdFx0XHRcdGNhc2Uob2JqLnRoZW4pOlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRkZWYgPSBvYmo7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRcdFx0ZGVmYXVsdDpcblxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHQvL0NoZWNrIGlmIGlzIGEgdGhlbmFibGVcblx0XHRcdFx0XHRcdGlmKHR5cGVvZiBkZWYgIT09ICdvYmplY3QnIHx8ICFkZWYudGhlbil7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkRlcGVuZGVuY3kgbGFiZWxlZCBhcyBhIHByb21pc2UgZGlkIG5vdCByZXR1cm4gYSBwcm9taXNlLlwiLG9iaik7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRjYXNlKG9iai50eXBlID09PSAndGltZXInKTpcblx0XHRcdFx0XHRcdGRlZiA9IF9wdWJsaWMud3JhcF90aW1lcihvYmopO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Ly9Mb2FkIGZpbGVcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdG9iai50eXBlID0gb2JqLnR5cGUgfHwgXCJkZWZhdWx0XCI7XG5cdFx0XHRcdFx0XHQvL0luaGVyaXQgcGFyZW50J3MgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeVxuXHRcdFx0XHRcdFx0aWYob3B0aW9ucy5wYXJlbnQgJiYgb3B0aW9ucy5wYXJlbnQuY3dkKXtcblx0XHRcdFx0XHRcdFx0b2JqLmN3ZCA9IG9wdGlvbnMucGFyZW50LmN3ZDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGRlZiA9IF9wdWJsaWMud3JhcF94aHIob2JqKTtcblx0XHR9XG5cblx0XHQvL0luZGV4IHByb21pc2UgYnkgaWQgZm9yIGZ1dHVyZSByZWZlcmVuY2luZ1xuXHRcdENvbmZpZy5saXN0W29iai5pZF0gPSBkZWY7XG5cblx0XHRyZXR1cm4gZGVmO1xufTtcblxuXG4vKipcbiAqIEB0b2RvOiByZWRvIHRoaXNcbiAqXG4gKiBDb252ZXJ0cyBhIHJlZmVyZW5jZSB0byBhIERPTSBldmVudCB0byBhIHByb21pc2UuXG4gKiBSZXNvbHZlZCBvbiBmaXJzdCBldmVudCB0cmlnZ2VyLlxuICpcbiAqIEB0b2RvIHJlbW92ZSBqcXVlcnkgZGVwZW5kZW5jeVxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiAqIEByZXR1cm5zIHtvYmplY3R9IGRlZmVycmVkIG9iamVjdFxuICovXG5fcHVibGljLndyYXBfZXZlbnQgPSBmdW5jdGlvbihvYmope1xuXG5cdFx0dmFyIERlZmVycmVkID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5qcycpO1xuXHRcdHZhciBkZWYgPSBEZWZlcnJlZCh7XG5cdFx0XHRcdGlkIDogb2JqLmlkXG5cdFx0fSk7XG5cblxuXHRcdGlmKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpe1xuXG5cdFx0XHRcdGlmKHR5cGVvZiAkICE9PSAnZnVuY3Rpb24nKXtcblx0XHRcdFx0XHRcdHZhciBtc2cgPSAnd2luZG93IGFuZCBkb2N1bWVudCBiYXNlZCBldmVudHMgZGVwZW5kIG9uIGpRdWVyeSc7XG5cdFx0XHRcdFx0XHRkZWYucmVqZWN0KG1zZyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHQvL0ZvciBub3csIGRlcGVuZCBvbiBqcXVlcnkgZm9yIElFOCBET01Db250ZW50TG9hZGVkIHBvbHlmaWxsXG5cdFx0XHRcdFx0c3dpdGNoKHRydWUpe1xuXHRcdFx0XHRcdFx0Y2FzZShvYmouaWQgPT09ICdyZWFkeScgfHwgb2JqLmlkID09PSAnRE9NQ29udGVudExvYWRlZCcpOlxuXHRcdFx0XHRcdFx0XHQkKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHRcdGRlZi5yZXNvbHZlKDEpO1xuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRjYXNlKG9iai5pZCA9PT0gJ2xvYWQnKTpcblx0XHRcdFx0XHRcdFx0JCh3aW5kb3cpLmxvYWQoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0XHRkZWYucmVzb2x2ZSgxKTtcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdFx0JChkb2N1bWVudCkub24ob2JqLmlkLFwiYm9keVwiLGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdFx0ZGVmLnJlc29sdmUoMSk7XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBkZWY7XG59O1xuXG5cbl9wdWJsaWMud3JhcF90aW1lciA9IGZ1bmN0aW9uKG9iail7XG5cblx0XHR2YXIgRGVmZXJyZWQgPSByZXF1aXJlKCcuL2RlZmVycmVkLmpzJyk7XG5cdFx0dmFyIGRlZiA9IERlZmVycmVkKCk7XG5cblx0XHQoZnVuY3Rpb24oZGVmKXtcblxuXHRcdFx0XHR2YXIgX3N0YXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdHZhciBfZW5kID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdFx0XHRcdFx0XHRkZWYucmVzb2x2ZSh7XG5cdFx0XHRcdFx0XHRcdFx0c3RhcnQgOiBfc3RhcnRcblx0XHRcdFx0XHRcdFx0XHQsZW5kIDogX2VuZFxuXHRcdFx0XHRcdFx0XHRcdCxlbGFwc2VkIDogX2VuZCAtIF9zdGFydFxuXHRcdFx0XHRcdFx0XHRcdCx0aW1lb3V0IDogb2JqLnRpbWVvdXRcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9LG9iai50aW1lb3V0KTtcblxuXHRcdH0oZGVmKSk7XG5cblx0XHRyZXR1cm4gZGVmO1xufTtcblxuXG4vKipcbiAqIENyZWF0ZXMgYSBkZWZlcnJlZCBvYmplY3QgdGhhdCBkZXBlbmRzIG9uIHRoZSBsb2FkaW5nIG9mIGEgZmlsZS5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGVwXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZCBvYmplY3RcbiAqL1xuX3B1YmxpYy53cmFwX3hociA9IGZ1bmN0aW9uKGRlcCl7XG5cblx0XHR2YXIgRGVmZXJyZWQgPSByZXF1aXJlKCcuL2RlZmVycmVkLmpzJyk7XG5cblx0XHR2YXIgcmVxdWlyZWQgPSBbXCJpZFwiLFwidXJsXCJdO1xuXHRcdGZvcih2YXIgaSBpbiByZXF1aXJlZCl7XG5cdFx0XHRpZighZGVwW3JlcXVpcmVkW2ldXSl7XG5cdFx0XHRcdHJldHVybiBDb25maWcuZGVidWcoW1xuXHRcdFx0XHRcdFwiRmlsZSByZXF1ZXN0cyBjb252ZXJ0ZWQgdG8gcHJvbWlzZXMgcmVxdWlyZTogXCIgKyByZXF1aXJlZFtpXVxuXHRcdFx0XHRcdCxcIk1ha2Ugc3VyZSB5b3Ugd2VyZW4ndCBleHBlY3RpbmcgZGVwZW5kZW5jeSB0byBhbHJlYWR5IGhhdmUgYmVlbiByZXNvbHZlZCB1cHN0cmVhbS5cIlxuXHRcdFx0XHRcdCxkZXBcblx0XHRcdFx0XSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly9JRiBQUk9NSVNFIEZPUiBUSElTIFVSTCBBTFJFQURZIEVYSVNUUywgUkVUVVJOIElUXG5cdFx0aWYoQ29uZmlnLmxpc3RbZGVwLmlkXSl7XG5cdFx0XHRyZXR1cm4gQ29uZmlnLmxpc3RbZGVwLmlkXTtcblx0XHR9XG5cblx0XHQvL0NPTlZFUlQgVE8gREVGRVJSRUQ6XG5cdFx0dmFyIGRlZiA9IERlZmVycmVkKGRlcCk7XG5cblx0XHRpZih0eXBlb2YgRmlsZV9sb2FkZXJbQ29uZmlnLnNldHRpbmdzLm1vZGVdW2RlcC50eXBlXSAhPT0gJ3VuZGVmaW5lZCcpe1xuXHRcdFx0RmlsZV9sb2FkZXJbQ29uZmlnLnNldHRpbmdzLm1vZGVdW2RlcC50eXBlXShkZXAudXJsLGRlZixkZXApO1xuXHRcdH1cblx0XHRlbHNle1xuXHRcdFx0RmlsZV9sb2FkZXJbQ29uZmlnLnNldHRpbmdzLm1vZGVdWydkZWZhdWx0J10oZGVwLnVybCxkZWYsZGVwKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZGVmO1xufTtcblxuLyoqXG4qIEEgXCJzaWduYWxcIiBoZXJlIGNhdXNlcyBhIHF1ZXVlIHRvIGxvb2sgdGhyb3VnaCBlYWNoIGl0ZW1cbiogaW4gaXRzIHVwc3RyZWFtIGFuZCBjaGVjayB0byBzZWUgaWYgYWxsIGFyZSByZXNvbHZlZC5cbipcbiogU2lnbmFscyBjYW4gb25seSBiZSByZWNlaXZlZCBieSBhIHF1ZXVlIGl0c2VsZiBvciBhbiBpbnN0YW5jZVxuKiBpbiBpdHMgdXBzdHJlYW0uXG4qXG4qIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXRcbiogQHBhcmFtIHtzdHJpbmd9IGZyb21faWRcbiogQHJldHVybnMge3ZvaWR9XG4qL1xuX3B1YmxpYy5yZWNlaXZlX3NpZ25hbCA9IGZ1bmN0aW9uKHRhcmdldCxmcm9tX2lkKXtcblxuXHRcdGlmKHRhcmdldC5oYWx0X3Jlc29sdXRpb24gPT09IDEpIHJldHVybjtcblxuXHQgLy9NQUtFIFNVUkUgVEhFIFNJR05BTCBXQVMgRlJPTSBBIFBST01JU0UgQkVJTkcgTElTVEVORUQgVE9cblx0IC8vQlVUIEFMTE9XIFNFTEYgU1RBVFVTIENIRUNLXG5cdCB2YXIgc3RhdHVzO1xuXHQgaWYoZnJvbV9pZCAhPT0gdGFyZ2V0LmlkICYmICF0YXJnZXQudXBzdHJlYW1bZnJvbV9pZF0pe1xuXHRcdFx0IHJldHVybiBDb25maWcuZGVidWcoZnJvbV9pZCArIFwiIGNhbid0IHNpZ25hbCBcIiArIHRhcmdldC5pZCArIFwiIGJlY2F1c2Ugbm90IGluIHVwc3RyZWFtLlwiKTtcblx0IH1cblx0IC8vUlVOIFRIUk9VR0ggUVVFVUUgT0YgT0JTRVJWSU5HIFBST01JU0VTIFRPIFNFRSBJRiBBTEwgRE9ORVxuXHQgZWxzZXtcblx0XHRcdCBzdGF0dXMgPSAxO1xuXHRcdFx0IGZvcih2YXIgaSBpbiB0YXJnZXQudXBzdHJlYW0pe1xuXHRcdFx0XHRcdCAvL1NFVFMgU1RBVFVTIFRPIDAgSUYgQU5ZIE9CU0VSVklORyBIQVZFIEZBSUxFRCwgQlVUIE5PVCBJRiBQRU5ESU5HIE9SIFJFU09MVkVEXG5cdFx0XHRcdFx0IGlmKHRhcmdldC51cHN0cmVhbVtpXS5zdGF0ZSAhPT0gMSkge1xuXHRcdFx0XHRcdFx0XHQgc3RhdHVzID0gdGFyZ2V0LnVwc3RyZWFtW2ldLnN0YXRlO1xuXHRcdFx0XHRcdFx0XHQgYnJlYWs7XG5cdFx0XHRcdFx0IH1cblx0XHRcdCB9XG5cdCB9XG5cblx0IC8vUkVTT0xWRSBRVUVVRSBJRiBVUFNUUkVBTSBGSU5JU0hFRFxuXHQgaWYoc3RhdHVzID09PSAxKXtcblxuXHRcdFx0Ly9HRVQgUkVUVVJOIFZBTFVFUyBQRVIgREVQRU5ERU5DSUVTLCBXSElDSCBTQVZFUyBPUkRFUiBBTkRcblx0XHRcdC8vUkVQT1JUUyBEVVBMSUNBVEVTXG5cdFx0XHR2YXIgdmFsdWVzID0gW107XG5cdFx0XHRmb3IodmFyIGkgaW4gdGFyZ2V0LmRlcGVuZGVuY2llcyl7XG5cdFx0XHRcdHZhbHVlcy5wdXNoKHRhcmdldC5kZXBlbmRlbmNpZXNbaV0udmFsdWUpO1xuXHRcdFx0fVxuXG5cdFx0XHR0YXJnZXQucmVzb2x2ZS5jYWxsKHRhcmdldCx2YWx1ZXMpO1xuXHQgfVxuXG5cdCBpZihzdGF0dXMgPT09IDIpe1xuXHRcdFx0IHZhciBlcnIgPSBbXG5cdFx0XHRcdFx0IHRhcmdldC5pZCtcIiBkZXBlbmRlbmN5ICdcIit0YXJnZXQudXBzdHJlYW1baV0uaWQgKyBcIicgd2FzIHJlamVjdGVkLlwiXG5cdFx0XHRcdFx0ICx0YXJnZXQudXBzdHJlYW1baV0uYXJndW1lbnRzXG5cdFx0XHQgXTtcblx0XHRcdCB0YXJnZXQucmVqZWN0LmFwcGx5KHRhcmdldCxlcnIpO1xuXHQgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcHVibGljO1xuIiwiLyoqXG4gKiBEZWZhdWx0IHByb3BlcnRpZXMgZm9yIGFsbCBkZWZlcnJlZCBvYmplY3RzLlxuICogQGlnbm9yZVxuICovXG52YXIgc2NoZW1hID0gZnVuY3Rpb24oKXtcblxuXHR2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKSxcblx0XHRcdF9wdWJsaWMgPSB7fTtcblxuXHR0aGlzLmdldCA9IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuIF9wdWJsaWM7XG5cdH07XG5cblx0X3B1YmxpYy5pc19vcmd5ID0gdHJ1ZTtcblxuXHRfcHVibGljLmlkID0gbnVsbDtcblxuXHQvL0EgQ09VTlRFUiBGT1IgQVVUMC1HRU5FUkFURUQgUFJPTUlTRSBJRCdTXG5cdF9wdWJsaWMuc2V0dGxlZCA9IDA7XG5cblx0LyoqXG5cdCogU1RBVEUgQ09ERVM6XG5cdCogLS0tLS0tLS0tLS0tLS0tLS0tXG5cdCogLTEgICA9PiBTRVRUTElORyBbRVhFQ1VUSU5HIENBTExCQUNLU11cblx0KiAgMCAgID0+IFBFTkRJTkdcblx0KiAgMSAgID0+IFJFU09MVkVEIC8gRlVMRklMTEVEXG5cdCogIDIgICA9PiBSRUpFQ1RFRFxuXHQqL1xuXHRfcHVibGljLnN0YXRlID0gMDtcblxuXHRfcHVibGljLnZhbHVlID0gW107XG5cblx0Ly9UaGUgbW9zdCByZWNlbnQgdmFsdWUgZ2VuZXJhdGVkIGJ5IHRoZSB0aGVuLT5kb25lIGNoYWluLlxuXHRfcHVibGljLmNhYm9vc2UgPSBudWxsO1xuXG5cdF9wdWJsaWMubW9kZWwgPSBcImRlZmVycmVkXCI7XG5cblx0X3B1YmxpYy5kb25lX2ZpcmVkID0gMDtcblxuXHRfcHVibGljLnRpbWVvdXRfaWQgPSBudWxsO1xuXG5cdC8qKlxuXHQqIERlZmF1bHQgdGltZW91dCBmb3IgYSBkZWZlcnJlZFxuXHQqIEB0eXBlIG51bWJlclxuXHQqL1xuXHRfcHVibGljLnRpbWVvdXQgPSAoZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4gQ29uZmlnLmNvbmZpZygpLnRpbWVvdXQ7XG5cdH0oKSk7XG5cblx0X3B1YmxpYy5jYWxsYmFja19zdGF0ZXMgPSB7XG5cdFx0cmVzb2x2ZSA6IDBcblx0XHQsdGhlbiA6IDBcblx0XHQsZG9uZSA6IDBcblx0XHQscmVqZWN0IDogMFxuXHR9O1xuXG5cdC8qKlxuXHQqIFNlbGYgZXhlY3V0aW5nIGZ1bmN0aW9uIHRvIGluaXRpYWxpemUgY2FsbGJhY2sgZXZlbnRcblx0KiBsaXN0LlxuXHQqXG5cdCogUmV0dXJucyBhbiBvYmplY3Qgd2l0aCB0aGUgc2FtZSBwcm9wZXJ0eU5hbWVzIGFzXG5cdCogX3B1YmxpYy5jYWxsYmFja19zdGF0ZXM6IGFkZGluZyBib2lsZXJwbGF0ZVxuXHQqIHByb3BlcnRpZXMgZm9yIGVhY2hcblx0KlxuXHQqIEByZXR1cm5zIHtvYmplY3R9XG5cdCovXG5cdF9wdWJsaWMuY2FsbGJhY2tzID0gKGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgbyA9IHt9O1xuXG5cdFx0Zm9yKHZhciBpIGluIF9wdWJsaWMuY2FsbGJhY2tfc3RhdGVzKXtcblx0XHRcdG9baV0gPSB7XG5cdFx0XHRcdHRyYWluIDogW11cblx0XHRcdFx0LGhvb2tzIDoge1xuXHRcdFx0XHRcdG9uQmVmb3JlIDoge1xuXHRcdFx0XHRcdFx0dHJhaW4gOiBbXVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQsb25Db21wbGV0ZSA6IHtcblx0XHRcdFx0XHRcdHRyYWluIDogW11cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG87XG5cdH0pKCk7XG5cblx0Ly9QUk9NSVNFIEhBUyBPQlNFUlZFUlMgQlVUIERPRVMgTk9UIE9CU0VSVkUgT1RIRVJTXG5cdF9wdWJsaWMuZG93bnN0cmVhbSA9IHt9O1xuXG5cdF9wdWJsaWMuZXhlY3V0aW9uX2hpc3RvcnkgPSBbXTtcblxuXHQvL1dIRU4gVFJVRSwgQUxMT1dTIFJFLUlOSVQgW0ZPUiBVUEdSQURFUyBUTyBBIFFVRVVFXVxuXHRfcHVibGljLm92ZXJ3cml0YWJsZSA9IDA7XG5cblx0LyoqXG5cdCogUkVNT1RFXG5cdCpcblx0KiBSRU1PVEUgPT0gMSAgPT4gIFtERUZBVUxUXSBNYWtlIGh0dHAgcmVxdWVzdCBmb3IgZmlsZVxuXHQqXG5cdCogUkVNT1RFID09IDAgID0+ICBSZWFkIGZpbGUgZGlyZWN0bHkgZnJvbSB0aGUgZmlsZXN5c3RlbVxuXHQqXG5cdCogT05MWSBBUFBMSUVTIFRPIFNDUklQVFMgUlVOIFVOREVSIE5PREUgQVMgQlJPV1NFUiBIQVMgTk9cblx0KiBGSUxFU1lTVEVNIEFDQ0VTU1xuXHQqL1xuXHRfcHVibGljLnJlbW90ZSA9IDE7XG5cblx0Ly9BRERTIFRPIE1BU1RFUiBMSVNULiBBTFdBWVMgVFJVRSBVTkxFU1MgVVBHUkFESU5HIEEgUFJPTUlTRSBUTyBBIFFVRVVFXG5cdF9wdWJsaWMubGlzdCA9IDE7XG5cblxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblx0Ly8gIF9wdWJsaWMgTUVUSE9EU1xuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG5cdC8qKlxuXHQqIFJlc29sdmVzIGEgZGVmZXJyZWQvcXVldWUuXG5cdCpcblx0KiBAbWVtYmVyb2Ygb3JneS9kZWZlcnJlZFxuXHQqIEBmdW5jdGlvbiBvcmd5L2RlZmVycmVkI3Jlc29sdmVcblx0KlxuXHQqIEBwYXJhbSB7bWl4ZWR9IHZhbHVlIFJlc29sdmVyIHZhbHVlLlxuXHQqIEByZXR1cm5zIHtvYmplY3R9IGRlZmVycmVkL3F1ZXVlXG5cdCovXG5cdF9wdWJsaWMucmVzb2x2ZSA9IGZ1bmN0aW9uKHZhbHVlKXtcblxuXHRcdHZhciBfcHJpdmF0ZSA9IHJlcXVpcmUoJy4vZGVmZXJyZWQucHJpdmF0ZS5qcycpO1xuXG5cdFx0aWYodGhpcy5zZXR0bGVkID09PSAxKXtcblx0XHRcdENvbmZpZy5kZWJ1ZyhbXG5cdFx0XHRcdHRoaXMuaWQgKyBcIiBjYW4ndCByZXNvbHZlLlwiXG5cdFx0XHRcdCxcIk9ubHkgdW5zZXR0bGVkIGRlZmVycmVkcyBhcmUgcmVzb2x2YWJsZS5cIlxuXHRcdFx0XSk7XG5cdFx0fVxuXG5cdFx0Ly9TRVQgU1RBVEUgVE8gU0VUVExFTUVOVCBJTiBQUk9HUkVTU1xuXHRcdF9wcml2YXRlLnNldF9zdGF0ZSh0aGlzLC0xKTtcblxuXHRcdC8vU0VUIFZBTFVFXG5cdFx0dGhpcy52YWx1ZSA9IHZhbHVlO1xuXG5cdFx0Ly9SVU4gUkVTT0xWRVIgQkVGT1JFIFBST0NFRURJTkdcblx0XHQvL0VWRU4gSUYgVEhFUkUgSVMgTk8gUkVTT0xWRVIsIFNFVCBJVCBUTyBGSVJFRCBXSEVOIENBTExFRFxuXHRcdGlmKCF0aGlzLnJlc29sdmVyX2ZpcmVkICYmIHR5cGVvZiB0aGlzLnJlc29sdmVyID09PSAnZnVuY3Rpb24nKXtcblxuXHRcdFx0dGhpcy5yZXNvbHZlcl9maXJlZCA9IDE7XG5cblx0XHRcdC8vQWRkIHJlc29sdmVyIHRvIHJlc29sdmUgdHJhaW5cblx0XHRcdHRyeXtcblx0XHRcdFx0dGhpcy5jYWxsYmFja3MucmVzb2x2ZS50cmFpbi5wdXNoKGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0dGhpcy5yZXNvbHZlcih2YWx1ZSx0aGlzKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRjYXRjaChlKXtcblx0XHRcdFx0ZGVidWdnZXI7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGVsc2V7XG5cblx0XHRcdHRoaXMucmVzb2x2ZXJfZmlyZWQgPSAxO1xuXG5cdFx0XHQvL0FkZCBzZXR0bGUgdG8gcmVzb2x2ZSB0cmFpblxuXHRcdFx0Ly9BbHdheXMgc2V0dGxlIGJlZm9yZSBhbGwgb3RoZXIgY29tcGxldGUgY2FsbGJhY2tzXG5cdFx0XHR0aGlzLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4udW5zaGlmdChmdW5jdGlvbigpe1xuXHRcdFx0XHRfcHJpdmF0ZS5zZXR0bGUodGhpcyk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHQvL1J1biByZXNvbHZlXG5cdFx0X3ByaXZhdGUucnVuX3RyYWluKFxuXHRcdFx0dGhpc1xuXHRcdFx0LHRoaXMuY2FsbGJhY2tzLnJlc29sdmVcblx0XHRcdCx0aGlzLnZhbHVlXG5cdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG5cdFx0KTtcblxuXHRcdC8vcmVzb2x2ZXIgaXMgZXhwZWN0ZWQgdG8gY2FsbCByZXNvbHZlIGFnYWluXG5cdFx0Ly9hbmQgdGhhdCB3aWxsIGdldCB1cyBwYXN0IHRoaXMgcG9pbnRcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXG5cdC8qKlxuXHQqIFJlamVjdHMgYSBkZWZlcnJlZC9xdWV1ZVxuXHQqXG5cdCogQG1lbWJlcm9mIG9yZ3kvZGVmZXJyZWRcblx0KiBAZnVuY3Rpb24gb3JneS9kZWZlcnJlZCNyZWplY3Rcblx0KlxuXHQqIEBwYXJhbSB7c3RyaW5nfGFycmF5fSBlcnIgRXJyb3IgaW5mb3JtYXRpb24uXG5cdCogQHJldHVybiB7b2JqZWN0fSBkZWZlcnJlZC9xdWV1ZVxuXHQqL1xuXHRfcHVibGljLnJlamVjdCA9IGZ1bmN0aW9uKGVycil7XG5cblx0XHR2YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcblxuXHRcdGlmKCEoZXJyIGluc3RhbmNlb2YgQXJyYXkpKXtcblx0XHRcdGVyciA9IFtlcnJdO1xuXHRcdH1cblxuXHRcdHZhciBtc2cgPSBcIlJlamVjdGVkIFwiK3RoaXMubW9kZWwrXCI6ICdcIit0aGlzLmlkK1wiJy5cIlxuXG5cdFx0aWYoQ29uZmlnLnNldHRpbmdzLmRlYnVnX21vZGUpe1xuXHRcdFx0ZXJyLnVuc2hpZnQobXNnKTtcblx0XHRcdENvbmZpZy5kZWJ1ZyhlcnIsdGhpcyk7XG5cdFx0fVxuXHRcdGVsc2V7XG5cdFx0XHRtc2cgPSBtc2cgKyBcIiBUdXJuIG9uIGRlYnVnIG1vZGUgZm9yIG1vcmUgaW5mby5cIjtcblx0XHRcdGNvbnNvbGUud2Fybihtc2cpO1xuXHRcdH1cblxuXHRcdC8vUmVtb3ZlIGF1dG8gdGltZW91dCB0aW1lclxuXHRcdGlmKHRoaXMudGltZW91dF9pZCl7XG5cdFx0XHRjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0X2lkKTtcblx0XHR9XG5cblx0XHQvL1NldCBzdGF0ZSB0byByZWplY3RlZFxuXHRcdF9wcml2YXRlLnNldF9zdGF0ZSh0aGlzLDIpO1xuXG5cdFx0Ly9FeGVjdXRlIHJlamVjdGlvbiBxdWV1ZVxuXHRcdF9wcml2YXRlLnJ1bl90cmFpbihcblx0XHRcdHRoaXNcblx0XHRcdCx0aGlzLmNhbGxiYWNrcy5yZWplY3Rcblx0XHRcdCxlcnJcblx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cblx0XHQpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblxuXHQvKipcblx0KiBDaGFpbiBtZXRob2RcblxuXHQ8Yj5Vc2FnZTo8L2I+XG5cdGBgYFxuXHR2YXIgT3JneSA9IHJlcXVpcmUoXCJvcmd5XCIpLFxuXHRcdFx0XHRcdHEgPSBPcmd5LmRlZmVycmVkKHtcblx0XHRcdFx0XHRcdGlkIDogXCJxMVwiXG5cdFx0XHRcdFx0fSk7XG5cblx0Ly9SZXNvbHZlIHRoZSBkZWZlcnJlZFxuXHRxLnJlc29sdmUoXCJTb21lIHZhbHVlLlwiKTtcblxuXHRxLnRoZW4oZnVuY3Rpb24ocil7XG5cdFx0Y29uc29sZS5sb2cocik7IC8vU29tZSB2YWx1ZS5cblx0fSlcblxuXHRgYGBcblxuXHQqIEBtZW1iZXJvZiBvcmd5L2RlZmVycmVkXG5cdCogQGZ1bmN0aW9uIG9yZ3kvZGVmZXJyZWQjdGhlblxuXHQqXG5cdCogQHBhcmFtIHtmdW5jdGlvbn0gZm4gQ2FsbGJhY2sgZnVuY3Rpb25cblx0KiBAcGFyYW0ge2Z1bmN0aW9ufSByZWplY3RvciBSZWplY3Rpb24gY2FsbGJhY2sgZnVuY3Rpb25cblx0KiBAcmV0dXJuIHtvYmplY3R9IGRlZmVycmVkL3F1ZXVlXG5cdCovXG5cdF9wdWJsaWMudGhlbiA9IGZ1bmN0aW9uKGZuLHJlamVjdG9yKXtcblxuXHRcdHZhciBfcHJpdmF0ZSA9IHJlcXVpcmUoJy4vZGVmZXJyZWQucHJpdmF0ZS5qcycpO1xuXG5cdFx0c3dpdGNoKHRydWUpe1xuXG5cdFx0XHQvL0FuIGVycm9yIHdhcyBwcmV2aW91c2x5IHRocm93biwgYWRkIHJlamVjdG9yICYgYmFpbCBvdXRcblx0XHRcdGNhc2UodGhpcy5zdGF0ZSA9PT0gMik6XG5cdFx0XHRcdGlmKHR5cGVvZiByZWplY3RvciA9PT0gJ2Z1bmN0aW9uJyl7XG5cdFx0XHRcdFx0dGhpcy5jYWxsYmFja3MucmVqZWN0LnRyYWluLnB1c2gocmVqZWN0b3IpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHQvL0V4ZWN1dGlvbiBjaGFpbiBhbHJlYWR5IGZpbmlzaGVkLiBCYWlsIG91dC5cblx0XHRcdGNhc2UodGhpcy5kb25lX2ZpcmVkID09PSAxKTpcblx0XHRcdFx0cmV0dXJuIENvbmZpZy5kZWJ1Zyh0aGlzLmlkK1wiIGNhbid0IGF0dGFjaCAudGhlbigpIGJlY2F1c2UgLmRvbmUoKSBoYXMgYWxyZWFkeSBmaXJlZCwgYW5kIHRoYXQgbWVhbnMgdGhlIGV4ZWN1dGlvbiBjaGFpbiBpcyBjb21wbGV0ZS5cIik7XG5cblx0XHRcdGRlZmF1bHQ6XG5cblx0XHRcdFx0Ly9QdXNoIGNhbGxiYWNrIHRvIHRoZW4gcXVldWVcblx0XHRcdFx0dGhpcy5jYWxsYmFja3MudGhlbi50cmFpbi5wdXNoKGZuKTtcblxuXHRcdFx0XHQvL1B1c2ggcmVqZWN0IGNhbGxiYWNrIHRvIHRoZSByZWplY3Rpb24gcXVldWVcblx0XHRcdFx0aWYodHlwZW9mIHJlamVjdG9yID09PSAnZnVuY3Rpb24nKXtcblx0XHRcdFx0XHR0aGlzLmNhbGxiYWNrcy5yZWplY3QudHJhaW4ucHVzaChyZWplY3Rvcik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvL1NldHRsZWQsIHJ1biB0cmFpbiBub3dcblx0XHRcdFx0aWYodGhpcy5zZXR0bGVkID09PSAxICYmIHRoaXMuc3RhdGUgPT09IDEgJiYgIXRoaXMuZG9uZV9maXJlZCl7XG5cdFx0XHRcdFx0X3ByaXZhdGUucnVuX3RyYWluKFxuXHRcdFx0XHRcdFx0dGhpc1xuXHRcdFx0XHRcdFx0LHRoaXMuY2FsbGJhY2tzLnRoZW5cblx0XHRcdFx0XHRcdCx0aGlzLmNhYm9vc2Vcblx0XHRcdFx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiB0cnVlfVxuXHRcdFx0XHRcdCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly9VbnNldHRsZWQsIHRyYWluIHdpbGwgYmUgcnVuIHdoZW4gc2V0dGxlZFxuXHRcdFx0XHRlbHNle31cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXG5cdC8qKlxuXHQqIERvbmUgY2FsbGJhY2suXG5cdCpcblx0KiBAbWVtYmVyb2Ygb3JneS9kZWZlcnJlZFxuXHQqIEBmdW5jdGlvbiBvcmd5L2RlZmVycmVkI2RvbmVcblx0KlxuXHQqIEBwYXJhbSB7ZnVuY3Rpb259IGZuIENhbGxiYWNrIGZ1bmN0aW9uXG5cdCogQHBhcmFtIHtmdW5jdGlvbn0gcmVqZWN0b3IgUmVqZWN0aW9uIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWQvcXVldWVcblx0Ki9cblx0X3B1YmxpYy5kb25lID0gZnVuY3Rpb24oZm4scmVqZWN0b3Ipe1xuXG5cdFx0dmFyIF9wcml2YXRlID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5wcml2YXRlLmpzJyk7XG5cblx0XHRpZih0aGlzLmNhbGxiYWNrcy5kb25lLnRyYWluLmxlbmd0aCA9PT0gMFxuXHRcdFx0JiYgdGhpcy5kb25lX2ZpcmVkID09PSAwKXtcblx0XHRcdFx0aWYodHlwZW9mIGZuID09PSAnZnVuY3Rpb24nKXtcblxuXHRcdFx0XHRcdC8vd3JhcCBjYWxsYmFjayB3aXRoIHNvbWUgb3RoZXIgY29tbWFuZHNcblx0XHRcdFx0XHR2YXIgZm4yID0gZnVuY3Rpb24ocixkZWZlcnJlZCxsYXN0KXtcblxuXHRcdFx0XHRcdFx0Ly9Eb25lIGNhbiBvbmx5IGJlIGNhbGxlZCBvbmNlLCBzbyBub3RlIHRoYXQgaXQgaGFzIGJlZW5cblx0XHRcdFx0XHRcdGRlZmVycmVkLmRvbmVfZmlyZWQgPSAxO1xuXG5cdFx0XHRcdFx0XHRmbihyLGRlZmVycmVkLGxhc3QpO1xuXHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHR0aGlzLmNhbGxiYWNrcy5kb25lLnRyYWluLnB1c2goZm4yKTtcblxuXHRcdFx0XHRcdC8vUHVzaCByZWplY3QgY2FsbGJhY2sgdG8gdGhlIHJlamVjdGlvbiBxdWV1ZSBvbkNvbXBsZXRlXG5cdFx0XHRcdFx0aWYodHlwZW9mIHJlamVjdG9yID09PSAnZnVuY3Rpb24nKXtcblx0XHRcdFx0XHRcdHRoaXMuY2FsbGJhY2tzLnJlamVjdC5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnB1c2gocmVqZWN0b3IpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vU2V0dGxlZCwgcnVuIHRyYWluIG5vd1xuXHRcdFx0XHRcdGlmKHRoaXMuc2V0dGxlZCA9PT0gMSl7XG5cdFx0XHRcdFx0XHRpZih0aGlzLnN0YXRlID09PSAxKXtcblx0XHRcdFx0XHRcdFx0X3ByaXZhdGUucnVuX3RyYWluKFxuXHRcdFx0XHRcdFx0XHRcdHRoaXNcblx0XHRcdFx0XHRcdFx0XHQsdGhpcy5jYWxsYmFja3MuZG9uZVxuXHRcdFx0XHRcdFx0XHRcdCx0aGlzLmNhYm9vc2Vcblx0XHRcdFx0XHRcdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oXG5cdFx0XHRcdFx0XHRcdFx0dGhpc1xuXHRcdFx0XHRcdFx0XHRcdCx0aGlzLmNhbGxiYWNrcy5yZWplY3Rcblx0XHRcdFx0XHRcdFx0XHQsdGhpcy5jYWJvb3NlXG5cdFx0XHRcdFx0XHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvL1Vuc2V0dGxlZCwgdHJhaW4gd2lsbCBiZSBydW4gd2hlbiBzZXR0bGVkXG5cdFx0XHRcdFx0ZWxzZXt9XG5cdFx0XHR9XG5cdFx0XHRlbHNle1xuXHRcdFx0XHRyZXR1cm4gQ29uZmlnLmRlYnVnKFwiZG9uZSgpIG11c3QgYmUgcGFzc2VkIGEgZnVuY3Rpb24uXCIpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNle1xuXHRcdFx0cmV0dXJuIENvbmZpZy5kZWJ1ZyhcImRvbmUoKSBjYW4gb25seSBiZSBjYWxsZWQgb25jZS5cIik7XG5cdFx0fVxuXHR9O1xufTtcblxudmFyIGZhY3RvcnkgPSBmdW5jdGlvbigpe1xuXHR2YXIgbyA9IG5ldyBzY2hlbWEoKTtcblx0cmV0dXJuIG8uZ2V0KCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZhY3Rvcnk7XG4iLCJ2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcbnZhciBfcHVibGljID0ge30sXG5cdFx0X3ByaXZhdGUgPSB7fTtcblxuX3B1YmxpYy5icm93c2VyID0ge307XG5fcHVibGljLm5hdGl2ZSA9IHt9O1xuX3ByaXZhdGUubmF0aXZlID0ge307XG5cbi8vQnJvd3NlciBsb2FkXG5cbl9wdWJsaWMuYnJvd3Nlci5jc3MgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblxuXHR2YXIgaGVhZCA9ICBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImhlYWRcIilbMF0gfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuXHRlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpbmtcIik7XG5cblx0ZWxlbS5zZXRBdHRyaWJ1dGUoXCJocmVmXCIscGF0aCk7XG5cdGVsZW0uc2V0QXR0cmlidXRlKFwidHlwZVwiLFwidGV4dC9jc3NcIik7XG5cdGVsZW0uc2V0QXR0cmlidXRlKFwicmVsXCIsXCJzdHlsZXNoZWV0XCIpO1xuXG5cdGlmKGVsZW0ub25sb2FkKXtcblx0XHQoZnVuY3Rpb24oZWxlbSxwYXRoLGRlZmVycmVkKXtcblx0XHRcdFx0ZWxlbS5vbmxvYWQgPSBlbGVtLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoZWxlbSk7XG5cdFx0XHQgfTtcblxuXHRcdFx0IGVsZW0ub25lcnJvciA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXHRcdFx0XHRcdGRlZmVycmVkLnJlamVjdChcIkZhaWxlZCB0byBsb2FkIHBhdGg6IFwiICsgcGF0aCk7XG5cdFx0XHQgfTtcblxuXHRcdH0oZWxlbSxwYXRoLGRlZmVycmVkKSk7XG5cblx0XHRoZWFkLmFwcGVuZENoaWxkKGVsZW0pO1xuXHR9XG5cdGVsc2V7XG5cdFx0Ly9BREQgZWxlbSBCVVQgTUFLRSBYSFIgUkVRVUVTVCBUTyBDSEVDSyBGSUxFIFJFQ0VJVkVEXG5cdFx0aGVhZC5hcHBlbmRDaGlsZChlbGVtKTtcblx0XHRjb25zb2xlLndhcm4oXCJObyBvbmxvYWQgYXZhaWxhYmxlIGZvciBsaW5rIHRhZywgYXV0b3Jlc29sdmluZy5cIik7XG5cdFx0ZGVmZXJyZWQucmVzb2x2ZShlbGVtKTtcblx0fVxufTtcblxuX3B1YmxpYy5icm93c2VyLnNjcmlwdCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXG5cdHZhciBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKTtcblx0ZWxlbS50eXBlID0gJ3RleHQvamF2YXNjcmlwdCc7XG5cdGVsZW0uc2V0QXR0cmlidXRlKFwic3JjXCIscGF0aCk7XG5cblx0KGZ1bmN0aW9uKGVsZW0scGF0aCxkZWZlcnJlZCl7XG5cdFx0XHRlbGVtLm9ubG9hZCA9IGVsZW0ub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKXtcblx0XHRcdFx0Ly9BdXRvcmVzb2x2ZSBieSBkZWZhdWx0XG5cdFx0XHRcdGlmKHR5cGVvZiBkZWZlcnJlZC5hdXRvcmVzb2x2ZSAhPT0gJ2Jvb2xlYW4nXG5cdFx0XHRcdHx8IGRlZmVycmVkLmF1dG9yZXNvbHZlID09PSB0cnVlKXtcblx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKCh0eXBlb2YgZWxlbS52YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpID8gZWxlbS52YWx1ZSA6IGVsZW0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0ZWxlbS5vbmVycm9yID0gZnVuY3Rpb24oKXtcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KFwiRXJyb3IgbG9hZGluZzogXCIgKyBwYXRoKTtcblx0XHRcdH07XG5cdH0oZWxlbSxwYXRoLGRlZmVycmVkKSk7XG5cblx0dGhpcy5oZWFkLmFwcGVuZENoaWxkKGVsZW0pO1xufTtcblxuX3B1YmxpYy5icm93c2VyLmh0bWwgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblx0dGhpcy5kZWZhdWx0KHBhdGgsZGVmZXJyZWQpO1xufTtcblxuX3B1YmxpYy5icm93c2VyLmRlZmF1bHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkLG9wdGlvbnMpe1xuXHR2YXIgcixcblx0cmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdHJlcS5vcGVuKCdHRVQnLCBwYXRoLCB0cnVlKTtcblxuXHQoZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cdFx0cmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKHJlcS5yZWFkeVN0YXRlID09PSA0KSB7XG5cdFx0XHRcdGlmKHJlcS5zdGF0dXMgPT09IDIwMCl7XG5cdFx0XHRcdFx0ciA9IHJlcS5yZXNwb25zZVRleHQ7XG5cdFx0XHRcdFx0aWYob3B0aW9ucy50eXBlICYmIG9wdGlvbnMudHlwZSA9PT0gJ2pzb24nKXtcblx0XHRcdFx0XHRcdHRyeXtcblx0XHRcdFx0XHRcdFx0ciA9IEpTT04ucGFyc2Uocik7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRjYXRjaChlKXtcblx0XHRcdFx0XHRcdFx0X3B1YmxpYy5kZWJ1ZyhbXG5cdFx0XHRcdFx0XHRcdFx0XCJDb3VsZCBub3QgZGVjb2RlIEpTT05cIlxuXHRcdFx0XHRcdFx0XHRcdCxwYXRoXG5cdFx0XHRcdFx0XHRcdFx0LHJcblx0XHRcdFx0XHRcdFx0XSxkZWZlcnJlZCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmUocik7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoXCJFcnJvciBsb2FkaW5nOiBcIiArIHBhdGgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblx0fShwYXRoLGRlZmVycmVkKSk7XG5cblx0cmVxLnNlbmQobnVsbCk7XG59O1xuXG5cblxuLy9OYXRpdmUgbG9hZFxuXG5fcHVibGljLm5hdGl2ZS5jc3MgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblx0X3B1YmxpYy5icm93c2VyLmNzcyhwYXRoLGRlZmVycmVkKTtcbn07XG5cbl9wdWJsaWMubmF0aXZlLnNjcmlwdCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXHQvL2xvY2FsIHBhY2thZ2Vcblx0aWYocGF0aFswXT09PScuJyl7XG5cdFx0cGF0aCA9IF9wcml2YXRlLm5hdGl2ZS5wcmVwYXJlX3BhdGgocGF0aCxkZWZlcnJlZCk7XG5cdFx0dmFyIHIgPSByZXF1aXJlKHBhdGgpO1xuXHRcdC8vQXV0b3Jlc29sdmUgYnkgZGVmYXVsdFxuXHRcdGlmKHR5cGVvZiBkZWZlcnJlZC5hdXRvcmVzb2x2ZSAhPT0gJ2Jvb2xlYW4nXG5cdFx0fHwgZGVmZXJyZWQuYXV0b3Jlc29sdmUgPT09IHRydWUpe1xuXHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShyKTtcblx0XHR9XG5cdH1cblx0Ly9yZW1vdGUgc2NyaXB0XG5cdGVsc2V7XG5cdFx0Ly9DaGVjayB0aGF0IHdlIGhhdmUgY29uZmlndXJlZCB0aGUgZW52aXJvbm1lbnQgdG8gYWxsb3cgdGhpcyxcblx0XHQvL2FzIGl0IHJlcHJlc2VudHMgYSBzZWN1cml0eSB0aHJlYXQgYW5kIHNob3VsZCBvbmx5IGJlIHVzZWQgZm9yIGRlYnVnZ2luZ1xuXHRcdGlmKCFDb25maWcuc2V0dGluZ3MuZGVidWdfbW9kZSl7X1xuXHRcdFx0Q29uZmlnLmRlYnVnKFwiU2V0IGNvbmZpZy5kZWJ1Z19tb2RlPTEgdG8gcnVuIHJlbW90ZSBzY3JpcHRzIG91dHNpZGUgb2YgZGVidWcgbW9kZS5cIik7XG5cdFx0fVxuXHRcdGVsc2V7XG5cdFx0XHRfcHJpdmF0ZS5uYXRpdmUuZ2V0KHBhdGgsZGVmZXJyZWQsZnVuY3Rpb24oZGF0YSl7XG5cdFx0XHRcdHZhciBWbSA9IHJlcXVpcmUoJ3ZtJyk7XG5cdFx0XHRcdHIgPSBWbS5ydW5JblRoaXNDb250ZXh0KGRhdGEpO1xuXHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHIpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG59O1xuXG5fcHVibGljLm5hdGl2ZS5odG1sID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cdF9wdWJsaWMubmF0aXZlLmRlZmF1bHQocGF0aCxkZWZlcnJlZCk7XG59O1xuXG5fcHVibGljLm5hdGl2ZS5kZWZhdWx0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cdChmdW5jdGlvbihkZWZlcnJlZCl7XG5cdFx0X3ByaXZhdGUubmF0aXZlLmdldChwYXRoLGRlZmVycmVkLGZ1bmN0aW9uKHIpe1xuXHRcdFx0aWYoZGVmZXJyZWQudHlwZSA9PT0gJ2pzb24nKXtcblx0XHRcdFx0ciA9IEpTT04ucGFyc2Uocik7XG5cdFx0XHR9XG5cdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHIpO1xuXHRcdH0pO1xuXHR9KShkZWZlcnJlZCk7XG59O1xuXG5fcHJpdmF0ZS5uYXRpdmUuZ2V0ID0gZnVuY3Rpb24gKHBhdGgsZGVmZXJyZWQsY2FsbGJhY2spe1xuXHRwYXRoID0gX3ByaXZhdGUubmF0aXZlLnByZXBhcmVfcGF0aChwYXRoKTtcblx0aWYocGF0aFswXSA9PT0gJy4nKXtcblx0XHQvL2ZpbGUgc3lzdGVtXG5cdFx0dmFyIEZzID0gcmVxdWlyZSgnZnMnKTtcblx0XHRGcy5yZWFkRmlsZShwYXRoLCBcInV0Zi04XCIsIGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcblx0XHRcdGlmIChlcnIpIHRocm93IGVycjtcblx0XHRcdGNhbGxiYWNrKGRhdGEpO1xuXHRcdH0pO1xuXHR9XG5cdGVsc2V7XG5cdFx0Ly9odHRwXG5cdFx0dmFyIHJlcXVlc3QgPSByZXF1aXJlKCdyZXF1ZXN0Jyk7XG5cdFx0cmVxdWVzdChwYXRoLGZ1bmN0aW9uKGVycm9yLHJlc3BvbnNlLGJvZHkpe1xuXHRcdFx0aWYgKCFlcnJvciAmJiByZXNwb25zZS5zdGF0dXNDb2RlID09IDIwMCkge1xuXHRcdFx0XHRjYWxsYmFjayhib2R5KTtcblx0XHRcdH1cblx0XHRcdGVsc2V7XG5cdFx0XHRcdHRocm93IGVycm9yO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59O1xuXG5fcHJpdmF0ZS5uYXRpdmUucHJlcGFyZV9wYXRoID0gZnVuY3Rpb24ocCl7XG5cdHAgPSAocFswXSAhPT0gJy8nICYmIHBbMF0gIT09ICcuJylcblx0PyAoKHBbMF0uaW5kZXhPZihcImh0dHBcIikhPT0wKSA/ICcuLycgKyBwIDogcCkgOiBwO1xuXHRyZXR1cm4gcDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gX3B1YmxpYztcbiIsInZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xudmFyIF9wcml2YXRlID0gcmVxdWlyZSgnLi9xdWV1ZS5wcml2YXRlLmpzJyk7XG5cbi8qKlxuICogQG5hbWVzcGFjZSBvcmd5L3F1ZXVlXG4gKiBAYm9ycm93cyBvcmd5L2RlZmVycmVkI3RoZW4gYXMgI3RoZW5cbiAqIEBib3Jyb3dzIG9yZ3kvZGVmZXJyZWQjZG9uZSBhcyAjZG9uZVxuICogQGJvcnJvd3Mgb3JneS9kZWZlcnJlZCNyZWplY3QgYXMgI3JlamVjdFxuICogQGJvcnJvd3Mgb3JneS9kZWZlcnJlZCNyZXNvbHZlIGFzICNyZXNvbHZlXG4gKlxuKi9cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IHF1ZXVlIG9iamVjdC5cbiAqIElmIG5vIDxiPnJlc29sdmVyPC9iPiBvcHRpb24gaXMgc2V0LCByZXNvbHZlZCB3aGVuIGFsbCBkZXBlbmRlbmNpZXMgYXJlIHJlc29sdmVkLiBFbHNlLCByZXNvbHZlZCB3aGVuIHRoZSBkZWZlcnJlZCBwYXJhbSBwYXNzZWQgdG8gdGhlIHJlc29sdmVyIG9wdGlvblxuICogaXMgcmVzb2x2ZWQuXG5cbiA8Yj5Vc2FnZTo8L2I+XG4gYGBgXG4gdmFyIE9yZ3kgPSByZXF1aXJlKFwib3JneVwiKSxcblx0XHRcdFx0cSA9IE9yZ3kucXVldWUoW1xuXHRcdFx0XHRcdCB7XG5cdFx0XHRcdFx0XHQgY29tbWVudCA6IFwiVGhpcyBpcyBhIG5lc3RlZCBxdWV1ZSBjcmVhdGVkIG9uIHRoZSBmbHkuXCJcblx0XHRcdFx0XHRcdCAsdHlwZSA6IFwianNvblwiXG5cdFx0XHRcdFx0XHQgLHVybCA6IFwiL2FwaS9qc29uL3NvbW51bXNcIlxuXHRcdFx0XHRcdFx0ICxyZXNvbHZlciA6IGZ1bmN0aW9uKHIsZGVmZXJyZWQpe1xuXHRcdFx0XHRcdFx0XHQgLy9GaWx0ZXIgb3V0IGV2ZW4gbnVtYmVyc1xuXHRcdFx0XHRcdFx0XHQgdmFyIG9kZCA9IGFyci5maWx0ZXIoZnVuY3Rpb24odmFsKSB7XG5cdFx0XHRcdFx0XHRcdFx0IHJldHVybiAwICE9IHZhbCAlIDI7XG5cdFx0XHRcdFx0XHRcdCB9KTtcblx0XHRcdFx0XHRcdFx0IGRlZmVycmVkLnJlc29sdmUob2RkKTtcblx0XHRcdFx0XHRcdCB9XG5cdFx0XHRcdFx0IH1cblx0XHRcdFx0IF0se1xuXHRcdFx0XHRcdCBpZCA6IFwicTFcIixcblx0XHRcdFx0XHQgcmVzb2x2ZXIgOiBmdW5jdGlvbihyLGRlZmVycmVkKXtcblx0XHRcdFx0XHRcdCB2YXIgcHJpbWVzID0gclswXS5maWx0ZXIoZnVuY3Rpb24odmFsKSB7XG5cdFx0XHRcdFx0XHRcdCBoaWdoID0gTWF0aC5mbG9vcihNYXRoLnNxcnQodmFsKSkgKyAxO1xuXHRcdFx0XHRcdFx0XHQgZm9yICh2YXIgZGl2ID0gMjsgZGl2IDw9IGhpZ2g7IGRpdisrKSB7XG5cdFx0XHRcdFx0XHRcdFx0IGlmICh2YWx1ZSAlIGRpdiA9PSAwKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHQgcmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRcdCB9XG5cdFx0XHRcdFx0XHRcdCB9XG5cdFx0XHRcdFx0XHRcdCByZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdCB9KTtcblx0XHRcdFx0XHRcdCBkZWZlcnJlZC5yZXNvbHZlKHByaW1lcyk7XG5cdFx0XHRcdFx0IH0pXG5cdFx0XHRcdCB9KTtcblxuIGBgYFxuICogQG1lbWJlcm9mIG9yZ3lcbiAqIEBmdW5jdGlvbiBxdWV1ZVxuICpcbiAqIEBwYXJhbSB7YXJyYXl9IGRlcHMgQXJyYXkgb2YgZGVwZW5kZW5jaWVzIHRoYXQgbXVzdCBiZSByZXNvbHZlZCBiZWZvcmUgPGI+cmVzb2x2ZXI8L2I+IG9wdGlvbiBpcyBjYWxsZWQuXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAgTGlzdCBvZiBvcHRpb25zOlxuXG4tIDxiPmlkPC9iPiB7c3RyaW5nfSBVbmlxdWUgaWQgb2YgdGhlIG9iamVjdC5cblx0LSBDYW4gYmUgdXNlZCB3aXRoIE9yZ3kuZ2V0KGlkKS5cblx0LSBPcHRpb25hbC5cblxuXG4tIDxiPnRpbWVvdXQ8L2I+IHtudW1iZXJ9IFRpbWUgaW4gbXMgYWZ0ZXIgd2hpY2ggcmVqZWN0IGlzIGNhbGxlZC5cblx0LSBEZWZhdWx0cyB0byBPcmd5LmNvbmZpZygpLnRpbWVvdXQgWzUwMDBdLlxuXHQtIE5vdGUgdGhlIHRpbWVvdXQgaXMgb25seSBhZmZlY3RlZCBieSBkZXBlbmRlbmNpZXMgYW5kL29yIHRoZSByZXNvbHZlciBjYWxsYmFjay5cblx0LSBUaGVuLGRvbmUgZGVsYXlzIHdpbGwgbm90IGZsYWcgYSB0aW1lb3V0IGJlY2F1c2UgdGhleSBhcmUgY2FsbGVkIGFmdGVyIHRoZSBpbnN0YW5jZSBpcyBjb25zaWRlcmVkIHJlc29sdmVkLlxuXG5cbi0gPGI+cmVzb2x2ZXI8L2I+IHtmdW5jdGlvbig8aT5yZXN1bHQ8L2k+LDxpPmRlZmVycmVkPC9pPil9IENhbGxiYWNrIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgYWZ0ZXIgYWxsIGRlcGVuZGVuY2llcyBoYXZlIHJlc29sdmVkLlxuXHQtIDxpPnJlc3VsdDwvaT4gaXMgYW4gYXJyYXkgb2YgdGhlIHF1ZXVlJ3MgcmVzb2x2ZWQgZGVwZW5kZW5jeSB2YWx1ZXMuXG5cdC0gPGk+ZGVmZXJyZWQ8L2k+IGlzIHRoZSBxdWV1ZSBvYmplY3QuXG5cdC0gVGhlIHF1ZXVlIHdpbGwgb25seSByZXNvbHZlIHdoZW4gPGk+ZGVmZXJyZWQ8L2k+LnJlc29sdmUoKSBpcyBjYWxsZWQuIElmIG5vdCwgaXQgd2lsbCB0aW1lb3V0IHRvIG9wdGlvbnMudGltZW91dCB8fCBPcmd5LmNvbmZpZygpLnRpbWVvdXQuXG5cblx0KiBAcmV0dXJucyB7b2JqZWN0fSB7QGxpbmsgb3JneS9xdWV1ZX1cbiAqXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZGVwcyxvcHRpb25zKXtcblxuXHR2YXIgX287XG5cdGlmKCEoZGVwcyBpbnN0YW5jZW9mIEFycmF5KSl7XG5cdFx0cmV0dXJuIENvbmZpZy5kZWJ1ZyhcIlF1ZXVlIGRlcGVuZGVuY2llcyBtdXN0IGJlIGFuIGFycmF5LlwiKTtcblx0fVxuXG5cdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG5cdC8vRE9FUyBOT1QgQUxSRUFEWSBFWElTVFxuXHRpZighQ29uZmlnLmxpc3Rbb3B0aW9ucy5pZF0pe1xuXG5cdFx0dmFyIERlZmVycmVkU2NoZW1hID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5zY2hlbWEuanMnKSgpO1xuXHRcdHZhciBRdWV1ZVNjaGVtYSA9IHJlcXVpcmUoJy4vcXVldWUuc2NoZW1hLmpzJykoKTtcblxuXHRcdC8vUGFzcyBhcnJheSBvZiBwcm90b3R5cGVzIHRvIHF1ZXVlIGZhY3Rvcnlcblx0XHRfbyA9IF9wcml2YXRlLmZhY3RvcnkoW0RlZmVycmVkU2NoZW1hLFF1ZXVlU2NoZW1hXSxbb3B0aW9uc10pO1xuXG5cdFx0Ly9BY3RpdmF0ZSBxdWV1ZVxuXHRcdF9vID0gX3ByaXZhdGUuYWN0aXZhdGUoX28sb3B0aW9ucyxkZXBzKTtcblxuXHR9XG5cdC8vQUxSRUFEWSBFWElTVFNcblx0ZWxzZSB7XG5cblx0XHRfbyA9IENvbmZpZy5saXN0W29wdGlvbnMuaWRdO1xuXG5cdFx0aWYoX28ubW9kZWwgIT09ICdxdWV1ZScpe1xuXHRcdC8vTUFUQ0ggRk9VTkQgQlVUIE5PVCBBIFFVRVVFLCBVUEdSQURFIFRPIE9ORVxuXG5cdFx0XHRvcHRpb25zLm92ZXJ3cml0YWJsZSA9IDE7XG5cblx0XHRcdF9vID0gX3ByaXZhdGUudXBncmFkZShfbyxvcHRpb25zLGRlcHMpO1xuXHRcdH1cblx0XHRlbHNle1xuXG5cdFx0XHQvL09WRVJXUklURSBBTlkgRVhJU1RJTkcgT1BUSU9OU1xuXHRcdFx0Zm9yKHZhciBpIGluIG9wdGlvbnMpe1xuXHRcdFx0XHRfb1tpXSA9IG9wdGlvbnNbaV07XG5cdFx0XHR9XG5cblx0XHRcdC8vQUREIEFERElUSU9OQUwgREVQRU5ERU5DSUVTIElGIE5PVCBSRVNPTFZFRFxuXHRcdFx0aWYoZGVwcy5sZW5ndGggPiAwKXtcblx0XHRcdFx0X3ByaXZhdGUudHBsLmFkZC5jYWxsKF9vLGRlcHMpO1xuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0Ly9SRVNVTUUgUkVTT0xVVElPTiBVTkxFU1MgU1BFQ0lGSUVEIE9USEVSV0lTRVxuXHRcdF9vLmhhbHRfcmVzb2x1dGlvbiA9ICh0eXBlb2Ygb3B0aW9ucy5oYWx0X3Jlc29sdXRpb24gIT09ICd1bmRlZmluZWQnKSA/XG5cdFx0b3B0aW9ucy5oYWx0X3Jlc29sdXRpb24gOiAwO1xuXHR9XG5cblx0cmV0dXJuIF9vO1xufTtcbiIsInZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xudmFyIFF1ZXVlU2NoZW1hID0gcmVxdWlyZSgnLi9xdWV1ZS5zY2hlbWEuanMnKSgpO1xudmFyIF9wcm90byA9IHJlcXVpcmUoJy4vZGVmZXJyZWQucHJpdmF0ZS5qcycpO1xudmFyIF9wdWJsaWMgPSBPYmplY3QuY3JlYXRlKF9wcm90byx7fSk7XG5cblxuLyoqXG4gKiBBY3RpdmF0ZXMgYSBxdWV1ZSBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9cbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gKiBAcGFyYW0ge2FycmF5fSBkZXBzXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBxdWV1ZVxuICovXG5fcHVibGljLmFjdGl2YXRlID0gZnVuY3Rpb24obyxvcHRpb25zLGRlcHMpe1xuXG5cdFx0Ly9BQ1RJVkFURSBBUyBBIERFRkVSUkVEXG5cdFx0Ly92YXIgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodGhpcyk7XG5cdFx0byA9IF9wcm90by5hY3RpdmF0ZShvKTtcblxuXHRcdC8vQHRvZG8gcmV0aGluayB0aGlzXG5cdFx0Ly9UaGlzIHRpbWVvdXQgZ2l2ZXMgZGVmaW5lZCBwcm9taXNlcyB0aGF0IGFyZSBkZWZpbmVkXG5cdFx0Ly9mdXJ0aGVyIGRvd24gdGhlIHNhbWUgc2NyaXB0IGEgY2hhbmNlIHRvIGRlZmluZSB0aGVtc2VsdmVzXG5cdFx0Ly9hbmQgaW4gY2FzZSB0aGlzIHF1ZXVlIGlzIGFib3V0IHRvIHJlcXVlc3QgdGhlbSBmcm9tIGFcblx0XHQvL3JlbW90ZSBzb3VyY2UgaGVyZS5cblx0XHQvL1RoaXMgaXMgaW1wb3J0YW50IGluIHRoZSBjYXNlIG9mIGNvbXBpbGVkIGpzIGZpbGVzIHRoYXQgY29udGFpblxuXHRcdC8vbXVsdGlwbGUgbW9kdWxlcyB3aGVuIGRlcGVuZCBvbiBlYWNoIG90aGVyLlxuXG5cdFx0Ly90ZW1wb3JhcmlseSBjaGFuZ2Ugc3RhdGUgdG8gcHJldmVudCBvdXRzaWRlIHJlc29sdXRpb25cblx0XHRvLnN0YXRlID0gLTE7XG5cblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cblx0XHRcdC8vUmVzdG9yZSBzdGF0ZVxuXHRcdFx0by5zdGF0ZSA9IDA7XG5cblx0XHRcdC8vQUREIERFUEVOREVOQ0lFUyBUTyBRVUVVRVxuXHRcdFx0UXVldWVTY2hlbWEuYWRkLmNhbGwobyxkZXBzKTtcblxuXHRcdFx0Ly9TRUUgSUYgQ0FOIEJFIElNTUVESUFURUxZIFJFU09MVkVEIEJZIENIRUNLSU5HIFVQU1RSRUFNXG5cdFx0XHRzZWxmLnJlY2VpdmVfc2lnbmFsKG8sby5pZCk7XG5cblx0XHRcdC8vQVNTSUdOIFRISVMgUVVFVUUgVVBTVFJFQU0gVE8gT1RIRVIgUVVFVUVTXG5cdFx0XHRpZihvLmFzc2lnbil7XG5cdFx0XHRcdFx0Zm9yKHZhciBhIGluIG8uYXNzaWduKXtcblx0XHRcdFx0XHRcdFx0c2VsZi5hc3NpZ24oby5hc3NpZ25bYV0sW29dLHRydWUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LDEpO1xuXG5cdFx0cmV0dXJuIG87XG59O1xuXG5cbi8qKlxuKiBVcGdyYWRlcyBhIHByb21pc2Ugb2JqZWN0IHRvIGEgcXVldWUuXG4qXG4qIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiogQHBhcmFtIHthcnJheX0gZGVwcyBcXGRlcGVuZGVuY2llc1xuKiBAcmV0dXJucyB7b2JqZWN0fSBxdWV1ZSBvYmplY3RcbiovXG5fcHVibGljLnVwZ3JhZGUgPSBmdW5jdGlvbihvYmosb3B0aW9ucyxkZXBzKXtcblxuXHRcdGlmKG9iai5zZXR0bGVkICE9PSAwIHx8IChvYmoubW9kZWwgIT09ICdwcm9taXNlJyAmJiBvYmoubW9kZWwgIT09ICdkZWZlcnJlZCcpKXtcblx0XHRcdFx0cmV0dXJuIENvbmZpZy5kZWJ1ZygnQ2FuIG9ubHkgdXBncmFkZSB1bnNldHRsZWQgcHJvbWlzZSBvciBkZWZlcnJlZCBpbnRvIGEgcXVldWUuJyk7XG5cdFx0fVxuXG5cdCAvL0dFVCBBIE5FVyBRVUVVRSBPQkpFQ1QgQU5EIE1FUkdFIElOXG5cdFx0dmFyIF9vID0gQ29uZmlnLm5haXZlX2Nsb25lcihbXG5cdFx0XHRcdFF1ZXVlU2NoZW1hXG5cdFx0XHRcdCxvcHRpb25zXG5cdFx0XSk7XG5cblx0XHRmb3IodmFyIGkgaW4gX28pe1xuXHRcdFx0IG9ialtpXSA9IF9vW2ldO1xuXHRcdH1cblxuXHRcdC8vZGVsZXRlIF9vO1xuXG5cdFx0Ly9DUkVBVEUgTkVXIElOU1RBTkNFIE9GIFFVRVVFXG5cdFx0b2JqID0gdGhpcy5hY3RpdmF0ZShvYmosb3B0aW9ucyxkZXBzKTtcblxuXHRcdC8vUkVUVVJOIFFVRVVFIE9CSkVDVFxuXHRcdHJldHVybiBvYmo7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gX3B1YmxpYztcbiIsInZhciBzY2hlbWEgPSBmdW5jdGlvbigpe1xuXG5cdHZhciBfcHJpdmF0ZSA9IHRoaXMsXG5cdFx0XHRfcHVibGljID0ge307XG5cblx0X3ByaXZhdGUuY29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKSxcblxuXHR0aGlzLmdldCA9IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuIF9wdWJsaWM7XG5cdH07XG5cblx0X3B1YmxpYy5tb2RlbCA9ICdxdWV1ZSc7XG5cblx0Ly9TRVQgVFJVRSBBRlRFUiBSRVNPTFZFUiBGSVJFRFxuXHRfcHVibGljLnJlc29sdmVyX2ZpcmVkID0gMDtcblxuXHQvL1BSRVZFTlRTIEEgUVVFVUUgRlJPTSBSRVNPTFZJTkcgRVZFTiBJRiBBTEwgREVQRU5ERU5DSUVTIE1FVFxuXHQvL1BVUlBPU0U6IFBSRVZFTlRTIFFVRVVFUyBDUkVBVEVEIEJZIEFTU0lHTk1FTlQgRlJPTSBSRVNPTFZJTkdcblx0Ly9CRUZPUkUgVEhFWSBBUkUgRk9STUFMTFkgSU5TVEFOVElBVEVEXG5cdF9wdWJsaWMuaGFsdF9yZXNvbHV0aW9uID0gMDtcblxuXHQvL1VTRUQgVE8gQ0hFQ0sgU1RBVEUsIEVOU1VSRVMgT05FIENPUFlcblx0X3B1YmxpYy51cHN0cmVhbSA9IHt9O1xuXG5cdC8vVVNFRCBSRVRVUk4gVkFMVUVTLCBFTlNVUkVTIE9SREVSXG5cdF9wdWJsaWMuZGVwZW5kZW5jaWVzID0gW107XG5cblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cdC8vICBRVUVVRSBJTlNUQU5DRSBNRVRIT0RTXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cdC8qKlxuXHQqIEFkZCBsaXN0IG9mIGRlcGVuZGVuY2llcyB0byBhIHF1ZXVlJ3MgdXBzdHJlYW0gYXJyYXkuXG5cdCpcblx0KiBUaGUgcXVldWUgd2lsbCByZXNvbHZlIG9uY2UgYWxsIHRoZSBwcm9taXNlcyBpbiBpdHNcblx0KiB1cHN0cmVhbSBhcnJheSBhcmUgcmVzb2x2ZWQuXG5cdCpcblx0KiBXaGVuIF9wdWJsaWMuX3ByaXZhdGUuY29uZmlnLmRlYnVnID09IDEsIG1ldGhvZCB3aWxsIHRlc3QgZWFjaFxuXHQqIGRlcGVuZGVuY3kgaXMgbm90IHByZXZpb3VzbHkgc2NoZWR1bGVkIHRvIHJlc29sdmVcblx0KiBkb3duc3RyZWFtIGZyb20gdGhlIHRhcmdldCwgaW4gd2hpY2hcblx0KiBjYXNlIGl0IHdvdWxkIG5ldmVyIHJlc29sdmUgYmVjYXVzZSBpdHMgdXBzdHJlYW0gZGVwZW5kcyBvbiBpdC5cblx0KlxuXHQqIEBwYXJhbSB7YXJyYXl9IGFyciAgL2FycmF5IG9mIGRlcGVuZGVuY2llcyB0byBhZGRcblx0KiBAcmV0dXJucyB7YXJyYXl9IHVwc3RyZWFtXG5cdCovXG5cdF9wdWJsaWMuYWRkID0gZnVuY3Rpb24oYXJyKXtcblxuXHRcdHZhciBfZGVmZXJyZWRfcHJpdmF0ZSA9IHJlcXVpcmUoJy4vcXVldWUucHJpdmF0ZS5qcycpO1xuXG5cdFx0dHJ5e1xuXHRcdFx0XHRpZihhcnIubGVuZ3RoID09PSAwKSByZXR1cm4gdGhpcy51cHN0cmVhbTtcblx0XHR9XG5cdFx0Y2F0Y2goZXJyKXtcblx0XHRcdFx0X3ByaXZhdGUuY29uZmlnLmRlYnVnKGVycik7XG5cdFx0fVxuXG5cdFx0Ly9JRiBOT1QgUEVORElORywgRE8gTk9UIEFMTE9XIFRPIEFERFxuXHRcdGlmKHRoaXMuc3RhdGUgIT09IDApe1xuXHRcdFx0XHRyZXR1cm4gX3ByaXZhdGUuY29uZmlnLmRlYnVnKFtcblx0XHRcdFx0XHRcIkNhbm5vdCBhZGQgZGVwZW5kZW5jeSBsaXN0IHRvIHF1ZXVlIGlkOidcIit0aGlzLmlkXG5cdFx0XHRcdFx0K1wiJy4gUXVldWUgc2V0dGxlZC9pbiB0aGUgcHJvY2VzcyBvZiBiZWluZyBzZXR0bGVkLlwiXG5cdFx0XHRcdF0sYXJyLHRoaXMpO1xuXHRcdH1cblxuXHRcdGZvcih2YXIgYSBpbiBhcnIpe1xuXG5cdFx0XHRcdHN3aXRjaCh0cnVlKXtcblxuXHRcdFx0XHRcdFx0Ly9DSEVDSyBJRiBFWElTVFNcblx0XHRcdFx0XHRcdGNhc2UodHlwZW9mIF9wcml2YXRlLmNvbmZpZy5saXN0W2FyclthXS5pZF0gPT09ICdvYmplY3QnKTpcblx0XHRcdFx0XHRcdFx0XHRhcnJbYV0gPSBfcHJpdmF0ZS5jb25maWcubGlzdFthcnJbYV0uaWRdO1xuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHQvL0lGIE5PVCwgQVRURU1QVCBUTyBDT05WRVJUIElUIFRPIEFOIE9SR1kgUFJPTUlTRVxuXHRcdFx0XHRcdFx0Y2FzZSh0eXBlb2YgYXJyW2FdID09PSAnb2JqZWN0JyAmJiAoIWFyclthXS5pc19vcmd5KSk6XG5cdFx0XHRcdFx0XHRcdFx0YXJyW2FdID0gX2RlZmVycmVkX3ByaXZhdGUuY29udmVydF90b19wcm9taXNlKGFyclthXSx7XG5cdFx0XHRcdFx0XHRcdFx0XHRwYXJlbnQgOiB0aGlzXG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdC8vUkVGIElTIEEgUFJPTUlTRS5cblx0XHRcdFx0XHRcdGNhc2UodHlwZW9mIGFyclthXS50aGVuID09PSAnZnVuY3Rpb24nKTpcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFwiT2JqZWN0IGNvdWxkIG5vdCBiZSBjb252ZXJ0ZWQgdG8gcHJvbWlzZS5cIik7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihhcnJbYV0pO1xuXHRcdFx0XHRcdFx0XHRcdGRlYnVnZ2VyO1xuXHRcdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly9tdXN0IGNoZWNrIHRoZSB0YXJnZXQgdG8gc2VlIGlmIHRoZSBkZXBlbmRlbmN5IGV4aXN0cyBpbiBpdHMgZG93bnN0cmVhbVxuXHRcdFx0XHRmb3IodmFyIGIgaW4gdGhpcy5kb3duc3RyZWFtKXtcblx0XHRcdFx0XHRcdGlmKGIgPT09IGFyclthXS5pZCl7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIF9wcml2YXRlLmNvbmZpZy5kZWJ1ZyhbXG5cdFx0XHRcdFx0XHRcdFx0XHRcIkVycm9yIGFkZGluZyB1cHN0cmVhbSBkZXBlbmRlbmN5ICdcIlxuXHRcdFx0XHRcdFx0XHRcdFx0K2FyclthXS5pZCtcIicgdG8gcXVldWVcIitcIiAnXCJcblx0XHRcdFx0XHRcdFx0XHRcdCt0aGlzLmlkK1wiJy5cXG4gUHJvbWlzZSBvYmplY3QgZm9yICdcIlxuXHRcdFx0XHRcdFx0XHRcdFx0K2FyclthXS5pZCtcIicgaXMgc2NoZWR1bGVkIHRvIHJlc29sdmUgZG93bnN0cmVhbSBmcm9tIHF1ZXVlICdcIlxuXHRcdFx0XHRcdFx0XHRcdFx0K3RoaXMuaWQrXCInIHNvIGl0IGNhbid0IGJlIGFkZGVkIHVwc3RyZWFtLlwiXG5cdFx0XHRcdFx0XHRcdFx0XVxuXHRcdFx0XHRcdFx0XHRcdCx0aGlzKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vQUREIFRPIFVQU1RSRUFNLCBET1dOU1RSRUFNLCBERVBFTkRFTkNJRVNcblx0XHRcdFx0dGhpcy51cHN0cmVhbVthcnJbYV0uaWRdID0gYXJyW2FdO1xuXHRcdFx0XHRhcnJbYV0uZG93bnN0cmVhbVt0aGlzLmlkXSA9IHRoaXM7XG5cdFx0XHRcdHRoaXMuZGVwZW5kZW5jaWVzLnB1c2goYXJyW2FdKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy51cHN0cmVhbTtcblx0fTtcblxuXHQvKipcblx0KiBSZW1vdmUgbGlzdCBmcm9tIGEgcXVldWUuXG5cdCpcblx0KiBAcGFyYW0ge2FycmF5fSBhcnJcblx0KiBAcmV0dXJucyB7YXJyYXl9IGFycmF5IG9mIGxpc3QgdGhlIHF1ZXVlIGlzIHVwc3RyZWFtXG5cdCovXG5cdF9wdWJsaWMucmVtb3ZlID0gZnVuY3Rpb24oYXJyKXtcblxuXHRcdC8vSUYgTk9UIFBFTkRJTkcsIERPIE5PVCBBTExPVyBSRU1PVkFMXG5cdFx0aWYodGhpcy5zdGF0ZSAhPT0gMCl7XG5cdFx0XHRcdHJldHVybiBfcHJpdmF0ZS5jb25maWcuZGVidWcoXCJDYW5ub3QgcmVtb3ZlIGxpc3QgZnJvbSBxdWV1ZSBpZDonXCIrdGhpcy5pZCtcIicuIFF1ZXVlIHNldHRsZWQvaW4gdGhlIHByb2Nlc3Mgb2YgYmVpbmcgc2V0dGxlZC5cIik7XG5cdFx0fVxuXG5cdFx0Zm9yKHZhciBhIGluIGFycil7XG5cdFx0XHRpZih0aGlzLnVwc3RyZWFtW2FyclthXS5pZF0pe1xuXHRcdFx0XHRcdGRlbGV0ZSB0aGlzLnVwc3RyZWFtW2FyclthXS5pZF07XG5cdFx0XHRcdFx0ZGVsZXRlIGFyclthXS5kb3duc3RyZWFtW3RoaXMuaWRdO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHQvKipcblx0KiBSZXNldHMgYW4gZXhpc3Rpbmcsc2V0dGxlZCBxdWV1ZSBiYWNrIHRvIE9yZ3lpbmcgc3RhdGUuXG5cdCogQ2xlYXJzIG91dCB0aGUgZG93bnN0cmVhbS5cblx0KiBGYWlscyBpZiBub3Qgc2V0dGxlZC5cblx0KiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuXHQqIEByZXR1cm5zIHtfZGVmZXJyZWRfcHJpdmF0ZS50cGx8Qm9vbGVhbn1cblx0Ki9cblx0X3B1YmxpYy5yZXNldCA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuXG5cdFx0dmFyIF9kZWZlcnJlZF9wcml2YXRlID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5wcml2YXRlLmpzJyk7XG5cblx0XHRpZih0aGlzLnNldHRsZWQgIT09IDEgfHwgdGhpcy5zdGF0ZSAhPT0gMSl7XG5cdFx0XHRyZXR1cm4gX3ByaXZhdGUuY29uZmlnLmRlYnVnKFwiQ2FuIG9ubHkgcmVzZXQgYSBxdWV1ZSBzZXR0bGVkIHdpdGhvdXQgZXJyb3JzLlwiKTtcblx0XHR9XG5cblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXHRcdHRoaXMuc2V0dGxlZCA9IDA7XG5cdFx0dGhpcy5zdGF0ZSA9IDA7XG5cdFx0dGhpcy5yZXNvbHZlcl9maXJlZCA9IDA7XG5cdFx0dGhpcy5kb25lX2ZpcmVkID0gMDtcblxuXHRcdC8vUkVNT1ZFIEFVVE8gVElNRU9VVCBUSU1FUlxuXHRcdGlmKHRoaXMudGltZW91dF9pZCl7XG5cdFx0XHRjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0X2lkKTtcblx0XHR9XG5cblx0XHQvL0NMRUFSIE9VVCBUSEUgRE9XTlNUUkVBTVxuXHRcdHRoaXMuZG93bnN0cmVhbSA9IHt9O1xuXHRcdHRoaXMuZGVwZW5kZW5jaWVzID0gW107XG5cblx0XHQvL1NFVCBORVcgQVVUTyBUSU1FT1VUXG5cdFx0X2RlZmVycmVkX3ByaXZhdGUuYXV0b190aW1lb3V0LmNhbGwodGhpcyxvcHRpb25zLnRpbWVvdXQpO1xuXG5cdFx0Ly9QT0lOVExFU1MgLSBXSUxMIEpVU1QgSU1NRURJQVRFTFkgUkVTT0xWRSBTRUxGXG5cdFx0Ly90aGlzLmNoZWNrX3NlbGYoKVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblxuXHQvKipcblx0KiBDYXVhZXMgYSBxdWV1ZSB0byBsb29rIG92ZXIgaXRzIGRlcGVuZGVuY2llcyBhbmQgc2VlIGlmIGl0XG5cdCogY2FuIGJlIHJlc29sdmVkLlxuXHQqXG5cdCogVGhpcyBpcyBkb25lIGF1dG9tYXRpY2FsbHkgYnkgZWFjaCBkZXBlbmRlbmN5IHRoYXQgbG9hZHMsXG5cdCogc28gaXMgbm90IG5lZWRlZCB1bmxlc3M6XG5cdCpcblx0KiAtZGVidWdnaW5nXG5cdCpcblx0KiAtdGhlIHF1ZXVlIGhhcyBiZWVuIHJlc2V0IGFuZCBubyBuZXdcblx0KiBkZXBlbmRlbmNpZXMgd2VyZSBzaW5jZSBhZGRlZC5cblx0KlxuXHQqIEByZXR1cm5zIHtpbnR9IFN0YXRlIG9mIHRoZSBxdWV1ZS5cblx0Ki9cblx0X3B1YmxpYy5jaGVja19zZWxmID0gZnVuY3Rpb24oKXtcblx0XHR2YXIgX2RlZmVycmVkX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcblx0XHRfZGVmZXJyZWRfcHJpdmF0ZS5yZWNlaXZlX3NpZ25hbCh0aGlzLHRoaXMuaWQpO1xuXHRcdHJldHVybiB0aGlzLnN0YXRlO1xuXHR9O1xufTtcblxudmFyIGZhY3RvcnkgPSBmdW5jdGlvbigpe1xuXHR2YXIgbyA9IG5ldyBzY2hlbWEoKTtcblx0cmV0dXJuIG8uZ2V0KCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZhY3Rvcnk7XG4iLCJ2YXIgRGVmZXJyZWQgPSByZXF1aXJlKCcuL2RlZmVycmVkLmpzJyksXG4gICAgUXVldWUgPSByZXF1aXJlKCcuL3F1ZXVlLmpzJyksXG4gICAgQ2FzdCA9IHJlcXVpcmUoJy4vY2FzdC5qcycpLFxuICAgIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4vKipcbiAqIEBuYW1lc3BhY2Ugb3JneVxuICovXG5cbi8qKlxuKiBDcmVhdGVzIGEgbmV3IGRlZmVycmVkIGZyb20gYSB2YWx1ZSBhbmQgYW4gaWQgYW5kIGF1dG9tYXRpY2FsbHlcbiogcmVzb2x2ZXMgaXQuXG4qXG4qIEBtZW1iZXJvZiBvcmd5XG4qIEBmdW5jdGlvbiBkZWZpbmVcbipcbiogQHBhcmFtIHtzdHJpbmd9IGlkIEEgdW5pcXVlIGlkIHlvdSBnaXZlIHRvIHRoZSBvYmplY3RcbiogQHBhcmFtIHttaXhlZH0gIGRhdGEgVGhlIHZhbHVlIHRoYXQgdGhlIG9iamVjdCBpcyBhc3NpZ25lZFxuKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBcbi0gPGI+ZGVwZW5kZW5jaWVzPC9iPiB7YXJyYXl9XG4tIDxiPnJlc29sdmVyPC9iPiB7ZnVuY3Rpb24oPGk+YXNzaWduZWRWYWx1ZTwvaT4sPGk+ZGVmZXJyZWQ8L2k+fVxuKiBAcmV0dXJucyB7b2JqZWN0fSByZXNvbHZlZCBkZWZlcnJlZFxuKi9cbmRlZmluZSA6IGZ1bmN0aW9uKGlkLGRhdGEsb3B0aW9ucyl7XG5cbiAgICB2YXIgZGVmO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIG9wdGlvbnMuZGVwZW5kZW5jaWVzID0gb3B0aW9ucy5kZXBlbmRlbmNpZXMgfHwgbnVsbDtcbiAgICBvcHRpb25zLnJlc29sdmVyID0gb3B0aW9ucy5yZXNvbHZlciB8fCBudWxsO1xuXG4gICAgLy90ZXN0IGZvciBhIHZhbGlkIGlkXG4gICAgaWYodHlwZW9mIGlkICE9PSAnc3RyaW5nJyl7XG4gICAgICBDb25maWcuZGVidWcoXCJNdXN0IHNldCBpZCB3aGVuIGRlZmluaW5nIGFuIGluc3RhbmNlLlwiKTtcbiAgICB9XG5cbiAgICAvL0NoZWNrIG5vIGV4aXN0aW5nIGluc3RhbmNlIGRlZmluZWQgd2l0aCBzYW1lIGlkXG4gICAgaWYoQ29uZmlnLmxpc3RbaWRdICYmIENvbmZpZy5saXN0W2lkXS5zZXR0bGVkID09PSAxKXtcbiAgICAgIHJldHVybiBDb25maWcuZGVidWcoXCJDYW4ndCBkZWZpbmUgXCIgKyBpZCArIFwiLiBBbHJlYWR5IHJlc29sdmVkLlwiKTtcbiAgICB9XG5cbiAgICBvcHRpb25zLmlkID0gaWQ7XG5cbiAgICBpZihvcHRpb25zLmRlcGVuZGVuY2llcyAhPT0gbnVsbFxuICAgICAgJiYgb3B0aW9ucy5kZXBlbmRlbmNpZXMgaW5zdGFuY2VvZiBBcnJheSl7XG4gICAgICAvL0RlZmluZSBhcyBhIHF1ZXVlIC0gY2FuJ3QgYXV0b3Jlc29sdmUgYmVjYXVzZSB3ZSBoYXZlIGRlcHNcbiAgICAgIHZhciBkZXBzID0gb3B0aW9ucy5kZXBlbmRlbmNpZXM7XG4gICAgICBkZWxldGUgb3B0aW9ucy5kZXBlbmRlbmNpZXM7XG4gICAgICBkZWYgPSBRdWV1ZShkZXBzLG9wdGlvbnMpO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgLy9EZWZpbmUgYXMgYSBkZWZlcnJlZFxuICAgICAgZGVmID0gRGVmZXJyZWQob3B0aW9ucyk7XG5cbiAgICAgIC8vVHJ5IHRvIGltbWVkaWF0ZWx5IHNldHRsZSBbZGVmaW5lXVxuICAgICAgaWYob3B0aW9ucy5yZXNvbHZlciA9PT0gbnVsbFxuICAgICAgICAmJiAodHlwZW9mIG9wdGlvbnMuYXV0b3Jlc29sdmUgIT09ICdib29sZWFuJ1xuICAgICAgICB8fCBvcHRpb25zLmF1dG9yZXNvbHZlID09PSB0cnVlKSl7XG4gICAgICAgIC8vcHJldmVudCBmdXR1cmUgYXV0b3Jlc292ZSBhdHRlbXB0cyBbaS5lLiBmcm9tIHhociByZXNwb25zZV1cbiAgICAgICAgZGVmLmF1dG9yZXNvbHZlID0gZmFsc2U7XG4gICAgICAgIGRlZi5yZXNvbHZlKGRhdGEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkZWY7XG59LFxuXG5cbi8qKlxuICogR2V0cyBhbiBleGlzaXRpbmcgZGVmZXJyZWQgLyBxdWV1ZSBvYmplY3QgZnJvbSBnbG9iYWwgc3RvcmUuXG4gKiBSZXR1cm5zIG51bGwgaWYgbm9uZSBmb3VuZC5cbiAqXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIGdldFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBpZCBJZCBvZiBkZWZlcnJlZCBvciBxdWV1ZSBvYmplY3QuXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZCB8IHF1ZXVlIHwgbnVsbFxuICovXG5nZXQgOiBmdW5jdGlvbihpZCl7XG4gIGlmKENvbmZpZy5saXN0W2lkXSl7XG4gICAgcmV0dXJuIENvbmZpZy5saXN0W2lkXTtcbiAgfVxuICBlbHNle1xuICAgIHJldHVybiBudWxsO1xuICB9XG59LFxuXG5cbi8qKlxuICogQWRkL3JlbW92ZSBhbiB1cHN0cmVhbSBkZXBlbmRlbmN5IHRvL2Zyb20gYSBxdWV1ZS5cbiAqXG4gKiBDYW4gdXNlIGEgcXVldWUgaWQsIGV2ZW4gZm9yIGEgcXVldWUgdGhhdCBpcyB5ZXQgdG8gYmUgY3JlYXRlZC5cbiAqXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIGFzc2lnblxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gdGd0IFF1ZXVlIGlkIC8gcXVldWUgb2JqZWN0XG4gKiBAcGFyYW0ge2FycmF5fSAgYXJyICBBcnJheSBvZiBwcm9taXNlIGlkcyBvciBkZXBlbmRlbmN5IG9iamVjdHNcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gYWRkICBJZiB0cnVlIDxiPkFERDwvYj4gYXJyYXkgdG8gcXVldWUgZGVwZW5kZW5jaWVzLCBJZiBmYWxzZSA8Yj5SRU1PVkU8L2I+IGFycmF5IGZyb20gcXVldWUgZGVwZW5kZW5jaWVzXG4gKlxuICogQHJldHVybiB7b2JqZWN0fSBxdWV1ZVxuICovXG5hc3NpZ24gOiBmdW5jdGlvbih0Z3QsYXJyLGFkZCl7XG5cbiAgICBhZGQgPSAodHlwZW9mIGFkZCA9PT0gXCJib29sZWFuXCIpID8gYWRkIDogMTtcblxuICAgIHZhciBpZCxxO1xuICAgIHN3aXRjaCh0cnVlKXtcbiAgICAgICAgY2FzZSh0eXBlb2YgdGd0ID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgdGd0LnRoZW4gPT09ICdmdW5jdGlvbicpOlxuICAgICAgICAgICAgaWQgPSB0Z3QuaWQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSh0eXBlb2YgdGd0ID09PSAnc3RyaW5nJyk6XG4gICAgICAgICAgICBpZCA9IHRndDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkFzc2lnbiB0YXJnZXQgbXVzdCBiZSBhIHF1ZXVlIG9iamVjdCBvciB0aGUgaWQgb2YgYSBxdWV1ZS5cIix0aGlzKTtcbiAgICB9XG5cbiAgICAvL0lGIFRBUkdFVCBBTFJFQURZIExJU1RFRFxuICAgIGlmKENvbmZpZy5saXN0W2lkXSAmJiBDb25maWcubGlzdFtpZF0ubW9kZWwgPT09ICdxdWV1ZScpe1xuICAgICAgICBxID0gQ29uZmlnLmxpc3RbaWRdO1xuXG4gICAgICAgIC8vPT4gQUREIFRPIFFVRVVFJ1MgVVBTVFJFQU1cbiAgICAgICAgaWYoYWRkKXtcbiAgICAgICAgICAgIHEuYWRkKGFycik7XG4gICAgICAgIH1cbiAgICAgICAgLy89PiBSRU1PVkUgRlJPTSBRVUVVRSdTIFVQU1RSRUFNXG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICBxLnJlbW92ZShhcnIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vQ1JFQVRFIE5FVyBRVUVVRSBBTkQgQUREIERFUEVOREVOQ0lFU1xuICAgIGVsc2UgaWYoYWRkKXtcbiAgICAgICAgcSA9IFF1ZXVlKGFycix7XG4gICAgICAgICAgICBpZCA6IGlkXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvL0VSUk9SOiBDQU4nVCBSRU1PVkUgRlJPTSBBIFFVRVVFIFRIQVQgRE9FUyBOT1QgRVhJU1RcbiAgICBlbHNle1xuICAgICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFwiQ2Fubm90IHJlbW92ZSBkZXBlbmRlbmNpZXMgZnJvbSBhIHF1ZXVlIHRoYXQgZG9lcyBub3QgZXhpc3QuXCIsdGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHE7XG59LFxuXG4vKipcbiogRG9jdW1lbnRlZCBpbiByZXF1aXJlZCBmaWxlLlxuKiBAaWdub3JlXG4qL1xuZGVmZXJyZWQgOiBEZWZlcnJlZCxcblxuLyoqXG4qIERvY3VtZW50ZWQgaW4gcmVxdWlyZWQgZmlsZS5cbiogQGlnbm9yZVxuKi9cbnF1ZXVlIDogUXVldWUsXG5cbi8qKlxuKiBEb2N1bWVudGVkIGluIHJlcXVpcmVkIGZpbGUuXG4qIEBpZ25vcmVcbiovXG5jYXN0IDogQ2FzdCxcblxuLyoqXG4qIERvY3VtZW50ZWQgaW4gcmVxdWlyZWQgZmlsZS5cbiogQGlnbm9yZVxuKi9cbmNvbmZpZyA6IENvbmZpZy5jb25maWdcblxufTtcbiJdfQ==
