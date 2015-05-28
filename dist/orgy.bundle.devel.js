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
			if(!obj.hasOwnProperty(required[i])){
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
		if(!Config.settings.debug_mode){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbGliL19lbXB0eS5qcyIsIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsInNyYy9jYXN0LmpzIiwic3JjL2NvbmZpZy5qcyIsInNyYy9kZWZlcnJlZC5qcyIsInNyYy9kZWZlcnJlZC5wcml2YXRlLmpzIiwic3JjL2RlZmVycmVkLnNjaGVtYS5qcyIsInNyYy9maWxlX2xvYWRlci5qcyIsInNyYy9xdWV1ZS5qcyIsInNyYy9xdWV1ZS5wcml2YXRlLmpzIiwic3JjL3F1ZXVlLnNjaGVtYS5qcyIsInNyYy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQy9LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdHRCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIixudWxsLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IHRydWU7XG4gICAgdmFyIGN1cnJlbnRRdWV1ZTtcbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgdmFyIGkgPSAtMTtcbiAgICAgICAgd2hpbGUgKCsraSA8IGxlbikge1xuICAgICAgICAgICAgY3VycmVudFF1ZXVlW2ldKCk7XG4gICAgICAgIH1cbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xufVxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICBxdWV1ZS5wdXNoKGZ1bik7XG4gICAgaWYgKCFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwidmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyksXG5cdFx0RGVmZXJyZWQgPSByZXF1aXJlKCcuL2RlZmVycmVkLmpzJyk7XG5cbi8qKlxuICogQ2FzdHMgYSB0aGVuYWJsZSBvYmplY3QgaW50byBhbiBPcmd5IGRlZmVycmVkIG9iamVjdC5cbiAqXG4gKiA+IFRvIHF1YWxpZnkgYXMgYSA8Yj50aGVuYWJsZTwvYj4sIHRoZSBvYmplY3QgdG8gYmUgY2FzdGVkIG11c3QgaGF2ZSB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG4gKiA+XG4gKiA+IC0gaWRcbiAqID5cbiAqID4gLSB0aGVuKClcbiAqID5cbiAqID4gLSBlcnJvcigpXG4gKlxuICogQG1lbWJlcm9mIG9yZ3lcbiAqIEBmdW5jdGlvbiBjYXN0XG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9iaiBBIHRoZW5hYmxlIHdpdGggdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICogIC0ge3N0cmluZ30gPGI+aWQ8L2I+ICBVbmlxdWUgaWQgb2YgdGhlIG9iamVjdC5cbiAqXG4gKiAgLSB7ZnVuY3Rpb259IDxiPnRoZW48L2I+XG4gKlxuICogIC0ge2Z1bmN0aW9ufSA8Yj5lcnJvcjwvYj5cbiAqXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9iail7XG5cblx0XHR2YXIgcmVxdWlyZWQgPSBbXCJ0aGVuXCIsXCJlcnJvclwiLFwiaWRcIl07XG5cdFx0Zm9yKHZhciBpIGluIHJlcXVpcmVkKXtcblx0XHRcdGlmKCFvYmouaGFzT3duUHJvcGVydHkocmVxdWlyZWRbaV0pKXtcblx0XHRcdFx0cmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkNhc3QgbWV0aG9kIG1pc3NpbmcgcHJvcGVydHkgJ1wiICsgcmVxdWlyZWRbaV0gK1wiJ1wiKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR2YXIgb3B0aW9ucyA9IHt9O1xuXHRcdG9wdGlvbnMuaWQgPSBvYmouaWQ7XG5cblx0XHQvL01ha2Ugc3VyZSBpZCBkb2VzIG5vdCBjb25mbGljdCB3aXRoIGV4aXN0aW5nXG5cdFx0aWYoQ29uZmlnLmxpc3Rbb3B0aW9ucy5pZF0pe1xuXHRcdFx0cmV0dXJuIENvbmZpZy5kZWJ1ZyhcIklkIFwiK29wdGlvbnMuaWQrXCIgY29uZmxpY3RzIHdpdGggZXhpc3RpbmcgaWQuXCIpO1xuXHRcdH1cblxuXHRcdC8vQ3JlYXRlIGEgZGVmZXJyZWRcblx0XHR2YXIgZGVmID0gRGVmZXJyZWQob3B0aW9ucyk7XG5cblx0XHQvL0NyZWF0ZSByZXNvbHZlclxuXHRcdHZhciByZXNvbHZlciA9IGZ1bmN0aW9uKCl7XG5cdFx0XHRkZWYucmVzb2x2ZS5jYWxsKGRlZixhcmd1bWVudHNbMF0pO1xuXHRcdH07XG5cblx0XHQvL1NldCBSZXNvbHZlclxuXHRcdG9iai50aGVuKHJlc29sdmVyKTtcblxuXHRcdC8vUmVqZWN0IGRlZmVycmVkIG9uIC5lcnJvclxuXHRcdHZhciBlcnIgPSBmdW5jdGlvbihlcnIpe1xuXHRcdFx0ZGVmLnJlamVjdChlcnIpO1xuXHRcdH07XG5cdFx0b2JqLmVycm9yKGVycik7XG5cblx0XHQvL1JldHVybiBkZWZlcnJlZFxuXHRcdHJldHVybiBkZWY7XG59O1xuIiwidmFyIF9wdWJsaWMgPSB7fTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3B1YmxpYyBWQVJJQUJMRVNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4vKipcbiAqIEEgZGlyZWN0b3J5IG9mIGFsbCBwcm9taXNlcywgZGVmZXJyZWRzLCBhbmQgcXVldWVzLlxuICogQHR5cGUgb2JqZWN0XG4gKi9cbl9wdWJsaWMubGlzdCA9IHt9O1xuXG5cbi8qKlxuICogaXRlcmF0b3IgZm9yIGlkc1xuICogQHR5cGUgaW50ZWdlclxuICovXG5fcHVibGljLmkgPSAwO1xuXG5cbi8qKlxuICogQ29uZmlndXJhdGlvbiB2YWx1ZXMuXG4gKlxuICogQHR5cGUgb2JqZWN0XG4gKi9cbl9wdWJsaWMuc2V0dGluZ3MgPSB7XG5cblx0XHRkZWJ1Z19tb2RlIDogMVxuXHRcdC8vc2V0IHRoZSBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5IG9mIHRoZSBjYWxsZWUgc2NyaXB0LFxuXHRcdC8vYmVjYXVzZSBub2RlIGhhcyBubyBjb25zdGFudCBmb3IgdGhpc1xuXHRcdCxjd2QgOiBmYWxzZVxuXHRcdCxtb2RlIDogKGZ1bmN0aW9uKCl7XG5cdFx0XHRcdGlmKHR5cGVvZiBwcm9jZXNzID09PSAnb2JqZWN0JyAmJiBwcm9jZXNzICsgJycgPT09ICdbb2JqZWN0IHByb2Nlc3NdJyl7XG5cdFx0XHRcdFx0XHQvLyBpcyBub2RlXG5cdFx0XHRcdFx0XHRyZXR1cm4gXCJuYXRpdmVcIjtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0Ly8gbm90IG5vZGVcblx0XHRcdFx0XHRcdHJldHVybiBcImJyb3dzZXJcIjtcblx0XHRcdFx0fVxuXHRcdH0oKSlcblx0XHQvKipcblx0XHQgKiAtIG9uQWN0aXZhdGUgL3doZW4gZWFjaCBpbnN0YW5jZSBhY3RpdmF0ZWRcblx0XHQgKiAtIG9uU2V0dGxlICAgL3doZW4gZWFjaCBpbnN0YW5jZSBzZXR0bGVzXG5cdFx0ICpcblx0XHQgKiBAdHlwZSBvYmplY3Rcblx0XHQgKi9cblx0XHQsaG9va3MgOiB7XG5cdFx0fVxuXHRcdCx0aW1lb3V0IDogNTAwMCAvL2RlZmF1bHQgdGltZW91dFxufTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3ByaXZhdGUgVkFSSUFCTEVTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wdWJsaWMgTUVUSE9EU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8qKlxuICogT3B0aW9ucyB5b3Ugd2lzaCB0byBwYXNzIHRvIHNldCB0aGUgZ2xvYmFsIGNvbmZpZ3VyYXRpb25cbiAqXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIGNvbmZpZ1xuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogTGlzdCBvZiBvcHRpb25zOlxuXG5cdC0ge251bWJlcn0gPGI+dGltZW91dDwvYj5cblxuXHQtIHtzdHJpbmd9IDxiPmN3ZDwvYj4gU2V0cyBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5LiBTZXJ2ZXIgc2lkZSBzY3JpcHRzIG9ubHkuXG5cblx0LSB7Ym9vbGVhbn0gPGI+ZGVidWdfbW9kZTwvYj5cblxuICogQHJldHVybnMge29iamVjdH0gY29uZmlndXJhdGlvbiBzZXR0aW5nc1xuICovXG5fcHVibGljLmNvbmZpZyA9IGZ1bmN0aW9uKG9iail7XG5cblx0XHRpZih0eXBlb2Ygb2JqID09PSAnb2JqZWN0Jyl7XG5cdFx0XHRcdGZvcih2YXIgaSBpbiBvYmope1xuXHRcdFx0XHRcdF9wdWJsaWMuc2V0dGluZ3NbaV0gPSBvYmpbaV07XG5cdFx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gX3B1YmxpYy5zZXR0aW5ncztcbn07XG5cblxuLyoqXG4gKiBEZWJ1Z2dpbmcgbWV0aG9kLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfGFycmF5fSBtc2dcbiAqIEBwYXJhbSB7b2JqZWN0fSBkZWZcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5fcHVibGljLmRlYnVnID0gZnVuY3Rpb24obXNnLGRlZil7XG5cblx0XHR2YXIgbXNncyA9IChtc2cgaW5zdGFuY2VvZiBBcnJheSkgPyBtc2cuam9pbihcIlxcblwiKSA6IFttc2ddO1xuXG5cdFx0dmFyIGUgPSBuZXcgRXJyb3IobXNncyk7XG5cdFx0Y29uc29sZS5sb2coZS5zdGFjayk7XG5cblxuXHRcdGlmKHRoaXMuc2V0dGluZ3MuZGVidWdfbW9kZSl7XG5cdFx0XHQvL3R1cm4gb2ZmIGRlYnVnX21vZGUgdG8gYXZvaWQgaGl0dGluZyBkZWJ1Z2dlclxuXHRcdFx0ZGVidWdnZXI7XG5cdFx0fVxuXG5cdFx0aWYoX3B1YmxpYy5zZXR0aW5ncy5tb2RlID09PSAnYnJvd3Nlcicpe1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdGVsc2V7XG5cdFx0XHRcdHByb2Nlc3MuZXhpdCgpO1xuXHRcdH1cbn07XG5cblxuLyoqXG4gKiBUYWtlIGFuIGFycmF5IG9mIHByb3RvdHlwZSBvYmplY3RzIGFuZCBhbiBhcnJheSBvZiBwcm9wZXJ0eSBvYmplY3RzLFxuICogbWVyZ2VzIGVhY2gsIGFuZCByZXR1cm5zIGEgc2hhbGxvdyBjb3B5LlxuICpcbiAqIEBwYXJhbSB7YXJyYXl9IHByb3RvT2JqQXJyIEFycmF5IG9mIHByb3RvdHlwZSBvYmplY3RzIHdoaWNoIGFyZSBvdmVyd3JpdHRlbiBmcm9tIHJpZ2h0IHRvIGxlZnRcbiAqIEBwYXJhbSB7YXJyYXl9IHByb3BzT2JqQXJyIEFycmF5IG9mIGRlc2lyZWQgcHJvcGVydHkgb2JqZWN0cyB3aGljaCBhcmUgb3ZlcndyaXR0ZW4gZnJvbSByaWdodCB0byBsZWZ0XG4gKiBAcmV0dXJucyB7b2JqZWN0fSBvYmplY3RcbiAqL1xuX3B1YmxpYy5uYWl2ZV9jbG9uZXIgPSBmdW5jdGlvbihwcm90b09iakFycixwcm9wc09iakFycil7XG5cblx0XHRmdW5jdGlvbiBtZXJnZShkb25vcnMpe1xuXHRcdFx0dmFyIG8gPSB7fTtcblx0XHRcdGZvcih2YXIgYSBpbiBkb25vcnMpe1xuXHRcdFx0XHRcdGZvcih2YXIgYiBpbiBkb25vcnNbYV0pe1xuXHRcdFx0XHRcdFx0XHRpZihkb25vcnNbYV1bYl0gaW5zdGFuY2VvZiBBcnJheSl7XG5cdFx0XHRcdFx0XHRcdFx0XHRvW2JdID0gZG9ub3JzW2FdW2JdLnNsaWNlKDApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGVsc2UgaWYodHlwZW9mIGRvbm9yc1thXVtiXSA9PT0gJ29iamVjdCcpe1xuXHRcdFx0XHRcdFx0XHRcdHRyeXtcblx0XHRcdFx0XHRcdFx0XHRcdG9bYl0gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGRvbm9yc1thXVtiXSkpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRjYXRjaChlKXtcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRkZWJ1Z2dlcjtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRcdFx0XHRcdG9bYl0gPSBkb25vcnNbYV1bYl07XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbztcblx0XHR9XG5cblx0XHR2YXIgcHJvdG8gPSBtZXJnZShwcm90b09iakFyciksXG5cdFx0XHRcdHByb3BzID0gbWVyZ2UocHJvcHNPYmpBcnIpO1xuXG5cdFx0Ly9AdG9kbyBjb25zaWRlciBtYW51YWxseSBzZXR0aW5nIHRoZSBwcm90b3R5cGUgaW5zdGVhZFxuXHRcdHZhciBmaW5hbE9iamVjdCA9IE9iamVjdC5jcmVhdGUocHJvdG8pO1xuXHRcdGZvcih2YXIgaSBpbiBwcm9wcyl7XG5cdFx0XHRmaW5hbE9iamVjdFtpXSA9IHByb3BzW2ldO1xuXHRcdH1cblxuXHRcdHJldHVybiBmaW5hbE9iamVjdDtcbn07XG5cblxuX3B1YmxpYy5nZW5lcmF0ZV9pZCA9IGZ1bmN0aW9uKCl7XG5cdHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKSArICctJyArICgrK3RoaXMuaSk7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gX3B1YmxpYztcbiIsInZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xudmFyIF9wcml2YXRlID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5wcml2YXRlLmpzJyk7XG5cbi8qKlxuKiBAbmFtZXNwYWNlIG9yZ3kvZGVmZXJyZWRcbiovXG5cbi8qKlxuKiBDcmVhdGVzIGEgbmV3IGRlZmVycmVkIG9iamVjdCBvciBpZiBvbmUgZXhpc3RzIGJ5IHRoZSBzYW1lIGlkLFxuKiByZXR1cm5zIGl0LlxuXG48Yj5Vc2FnZTo8L2I+XG5gYGBcbnZhciBPcmd5ID0gcmVxdWlyZShcIm9yZ3lcIiksXG5xID0gT3JneS5kZWZlcnJlZCh7XG5pZCA6IFwicTFcIlxufSk7XG5gYGBcblxuKiBAbWVtYmVyb2Ygb3JneVxuKiBAZnVuY3Rpb24gZGVmZXJyZWRcbipcbiogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgTGlzdCBvZiBvcHRpb25zOlxuKlxuKiAgLSA8Yj5pZDwvYj4ge3N0cmluZ30gVW5pcXVlIGlkIG9mIHRoZSBvYmplY3QuXG4qICAgLSBDYW4gYmUgdXNlZCB3aXRoIE9yZ3kuZ2V0KGlkKS5cbiogICAtIE9wdGlvbmFsLlxuKlxuKlxuKiAgLSA8Yj50aW1lb3V0PC9iPiB7bnVtYmVyfSBUaW1lIGluIG1zIGFmdGVyIHdoaWNoIHJlamVjdCBpcyBjYWxsZWQgaWYgbm90IHlldCByZXNvbHZlZC5cbi0gRGVmYXVsdHMgdG8gT3JneS5jb25maWcoKS50aW1lb3V0LlxuLSBEZWxheXMgaW4gb2JqZWN0LnRoZW4oKSBhbmQgb2JqZWN0LmRvbmUoKSB3b24ndCBub3QgdHJpZ2dlciB0aGlzLCBiZWNhdXNlIHRob3NlIG1ldGhvZHMgcnVuIGFmdGVyIHJlc29sdmUuXG4qXG4qIEByZXR1cm5zIHtvYmplY3R9IHtAbGluayBvcmd5L2RlZmVycmVkfVxuKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob3B0aW9ucyl7XG5cblx0dmFyIF9vO1xuXHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXHRpZihvcHRpb25zLmlkICYmIENvbmZpZy5saXN0W29wdGlvbnMuaWRdKXtcblx0XHRfbyA9IENvbmZpZy5saXN0W29wdGlvbnMuaWRdO1xuXHR9XG5cdGVsc2V7XG5cdFx0Ly9DcmVhdGUgYSBuZXcgZGVmZXJyZWQgY2xhc3MgaW5zdGFuY2Vcblx0XHR2YXIgRGVmZXJyZWRTY2hlbWEgPSByZXF1aXJlKCcuL2RlZmVycmVkLnNjaGVtYS5qcycpKCk7XG5cdFx0X28gPSBfcHJpdmF0ZS5mYWN0b3J5KFtEZWZlcnJlZFNjaGVtYV0sW29wdGlvbnNdKTtcblxuXHRcdC8vQUNUSVZBVEUgREVGRVJSRURcblx0XHRfbyA9IF9wcml2YXRlLmFjdGl2YXRlKF9vKTtcblx0fVxuXG5cdHJldHVybiBfbztcbn07XG4iLCJ2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcbnZhciBGaWxlX2xvYWRlciA9IHJlcXVpcmUoJy4vZmlsZV9sb2FkZXIuanMnKTtcblxuXG52YXIgX3B1YmxpYyA9IHt9O1xuXG5cbi8qKlxuICogQHBhcmFtIGFycmF5IG9wdGlvbnMgUHJvdG90eXBlIG9iamVjdHNcbioqL1xuX3B1YmxpYy5mYWN0b3J5ID0gZnVuY3Rpb24ocHJvdG9PYmpBcnIsb3B0aW9uc09iakFycil7XG5cblx0XHQvL01lcmdlIGFycmF5IG9mIG9iamVjdHMgaW50byBhIHNpbmdsZSwgc2hhbGxvdyBjbG9uZVxuXHRcdHZhciBfbyA9IENvbmZpZy5uYWl2ZV9jbG9uZXIocHJvdG9PYmpBcnIsb3B0aW9uc09iakFycik7XG5cblx0XHQvL2lmIG5vIGlkLCBnZW5lcmF0ZSBvbmVcblx0XHRpZighX28uaWQpe1xuXHRcdFx0X28uaWQgPSBDb25maWcuZ2VuZXJhdGVfaWQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gX287XG59O1xuXG5cbl9wdWJsaWMuYWN0aXZhdGUgPSBmdW5jdGlvbihvYmope1xuXG5cdFx0Ly9NQUtFIFNVUkUgTkFNSU5HIENPTkZMSUNUIERPRVMgTk9UIEVYSVNUXG5cdFx0aWYoQ29uZmlnLmxpc3Rbb2JqLmlkXSAmJiAhQ29uZmlnLmxpc3Rbb2JqLmlkXS5vdmVyd3JpdGFibGUpe1xuXHRcdFx0XHRDb25maWcuZGVidWcoXCJUcmllZCBpbGxlZ2FsIG92ZXJ3cml0ZSBvZiBcIitvYmouaWQrXCIuXCIpO1xuXHRcdFx0XHRyZXR1cm4gQ29uZmlnLmxpc3Rbb2JqLmlkXTtcblx0XHR9XG5cblx0XHQvL1NBVkUgVE8gTUFTVEVSIExJU1Rcblx0XHQvL0B0b2RvIG9ubHkgc2F2ZSBpZiB3YXMgYXNzaWduZWQgYW4gaWQsXG5cdFx0Ly93aGljaCBpbXBsaWVzIHVzZXIgaW50ZW5kcyB0byBhY2Nlc3Mgc29tZXdoZXJlIGVsc2Ugb3V0c2lkZSBvZiBzY29wZVxuXHRcdENvbmZpZy5saXN0W29iai5pZF0gPSBvYmo7XG5cblx0XHQvL0FVVE8gVElNRU9VVFxuXHRcdF9wdWJsaWMuYXV0b190aW1lb3V0LmNhbGwob2JqKTtcblxuXHRcdC8vQ2FsbCBob29rXG5cdFx0aWYoQ29uZmlnLnNldHRpbmdzLmhvb2tzLm9uQWN0aXZhdGUpe1xuXHRcdFx0Q29uZmlnLnNldHRpbmdzLmhvb2tzLm9uQWN0aXZhdGUob2JqKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gb2JqO1xufTtcblxuXG5fcHVibGljLnNldHRsZSA9IGZ1bmN0aW9uKGRlZil7XG5cblx0XHQvL1JFTU9WRSBBVVRPIFRJTUVPVVQgVElNRVJcblx0XHRpZihkZWYudGltZW91dF9pZCl7XG5cdFx0XHRjbGVhclRpbWVvdXQoZGVmLnRpbWVvdXRfaWQpO1xuXHRcdH1cblxuXHRcdC8vU2V0IHN0YXRlIHRvIHJlc29sdmVkXG5cdFx0X3B1YmxpYy5zZXRfc3RhdGUoZGVmLDEpO1xuXG5cdFx0Ly9DYWxsIGhvb2tcblx0XHRpZihDb25maWcuc2V0dGluZ3MuaG9va3Mub25TZXR0bGUpe1xuXHRcdFx0Q29uZmlnLnNldHRpbmdzLmhvb2tzLm9uU2V0dGxlKGRlZik7XG5cdFx0fVxuXG5cdFx0Ly9BZGQgZG9uZSBhcyBhIGNhbGxiYWNrIHRvIHRoZW4gY2hhaW4gY29tcGxldGlvbi5cblx0XHRkZWYuY2FsbGJhY2tzLnRoZW4uaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKGZ1bmN0aW9uKGQyLGl0aW5lcmFyeSxsYXN0KXtcblx0XHRcdFx0ZGVmLmNhYm9vc2UgPSBsYXN0O1xuXG5cdFx0XHRcdC8vUnVuIGRvbmVcblx0XHRcdFx0X3B1YmxpYy5ydW5fdHJhaW4oXG5cdFx0XHRcdFx0XHRkZWZcblx0XHRcdFx0XHRcdCxkZWYuY2FsbGJhY2tzLmRvbmVcblx0XHRcdFx0XHRcdCxkZWYuY2Fib29zZVxuXHRcdFx0XHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuXHRcdFx0XHQpO1xuXHRcdH0pO1xuXG5cdFx0Ly9SdW4gdGhlbiBxdWV1ZVxuXHRcdF9wdWJsaWMucnVuX3RyYWluKFxuXHRcdFx0XHRkZWZcblx0XHRcdFx0LGRlZi5jYWxsYmFja3MudGhlblxuXHRcdFx0XHQsZGVmLnZhbHVlXG5cdFx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiB0cnVlfVxuXHRcdCk7XG5cblx0XHRyZXR1cm4gZGVmO1xufTtcblxuXG4vKipcbiAqIFJ1bnMgYW4gYXJyYXkgb2YgZnVuY3Rpb25zIHNlcXVlbnRpYWxseSBhcyBhIHBhcnRpYWwgZnVuY3Rpb24uXG4gKiBFYWNoIGZ1bmN0aW9uJ3MgYXJndW1lbnQgaXMgdGhlIHJlc3VsdCBvZiBpdHMgcHJlZGVjZXNzb3IgZnVuY3Rpb24uXG4gKlxuICogQnkgZGVmYXVsdCwgZXhlY3V0aW9uIGNoYWluIGlzIHBhdXNlZCB3aGVuIGFueSBmdW5jdGlvblxuICogcmV0dXJucyBhbiB1bnJlc29sdmVkIGRlZmVycmVkLiAocGF1c2Vfb25fZGVmZXJyZWQpIFtPUFRJT05BTF1cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmICAvZGVmZXJyZWQgb2JqZWN0XG4gKiBAcGFyYW0ge29iamVjdH0gb2JqICAvaXRpbmVyYXJ5XG4gKiAgICAgIHRyYWluICAgICAgIHthcnJheX1cbiAqICAgICAgaG9va3MgICAgICAge29iamVjdH1cbiAqICAgICAgICAgIG9uQmVmb3JlICAgICAgICB7YXJyYXl9XG4gKiAgICAgICAgICBvbkNvbXBsZXRlICAgICAge2FycmF5fVxuICogQHBhcmFtIHttaXhlZH0gcGFyYW0gL3BhcmFtIHRvIHBhc3MgdG8gZmlyc3QgY2FsbGJhY2tcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gKiAgICAgIHBhdXNlX29uX2RlZmVycmVkICAge2Jvb2xlYW59XG4gKlxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbl9wdWJsaWMucnVuX3RyYWluID0gZnVuY3Rpb24oZGVmLG9iaixwYXJhbSxvcHRpb25zKXtcblxuXHRcdC8vYWxsb3cgcHJldmlvdXMgcmV0dXJuIHZhbHVlcyB0byBiZSBwYXNzZWQgZG93biBjaGFpblxuXHRcdHZhciByID0gcGFyYW0gfHwgZGVmLmNhYm9vc2UgfHwgZGVmLnZhbHVlO1xuXG5cdFx0Ly9vbkJlZm9yZSBldmVudFxuXHRcdGlmKG9iai5ob29rcyAmJiBvYmouaG9va3Mub25CZWZvcmUudHJhaW4ubGVuZ3RoID4gMCl7XG5cdFx0XHRcdF9wdWJsaWMucnVuX3RyYWluKFxuXHRcdFx0XHRcdFx0ZGVmXG5cdFx0XHRcdFx0XHQsb2JqLmhvb2tzLm9uQmVmb3JlXG5cdFx0XHRcdFx0XHQscGFyYW1cblx0XHRcdFx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cblx0XHRcdFx0KTtcblx0XHR9XG5cblx0XHR3aGlsZShvYmoudHJhaW4ubGVuZ3RoID4gMCl7XG5cblx0XHRcdFx0Ly9yZW1vdmUgZm4gdG8gZXhlY3V0ZVxuXHRcdFx0XHR2YXIgbGFzdCA9IG9iai50cmFpbi5zaGlmdCgpO1xuXHRcdFx0XHRkZWYuZXhlY3V0aW9uX2hpc3RvcnkucHVzaChsYXN0KTtcblxuXHRcdFx0XHQvL2RlZi5jYWJvb3NlIG5lZWRlZCBmb3IgdGhlbiBjaGFpbiBkZWNsYXJlZCBhZnRlciByZXNvbHZlZCBpbnN0YW5jZVxuXHRcdFx0XHRyID0gZGVmLmNhYm9vc2UgPSBsYXN0LmNhbGwoZGVmLGRlZi52YWx1ZSxkZWYscik7XG5cblx0XHRcdFx0Ly9pZiByZXN1bHQgaXMgYW4gdGhlbmFibGUsIGhhbHQgZXhlY3V0aW9uXG5cdFx0XHRcdC8vYW5kIHJ1biB1bmZpcmVkIGFyciB3aGVuIHRoZW5hYmxlIHNldHRsZXNcblx0XHRcdFx0aWYob3B0aW9ucy5wYXVzZV9vbl9kZWZlcnJlZCl7XG5cblx0XHRcdFx0XHRcdC8vSWYgciBpcyBhbiB1bnNldHRsZWQgdGhlbmFibGVcblx0XHRcdFx0XHRcdGlmKHIgJiYgci50aGVuICYmIHIuc2V0dGxlZCAhPT0gMSl7XG5cblx0XHRcdFx0XHRcdFx0XHQvL2V4ZWN1dGUgcmVzdCBvZiB0aGlzIHRyYWluIGFmdGVyIHIgcmVzb2x2ZXNcblx0XHRcdFx0XHRcdFx0XHRyLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChmdW5jdGlvbigpe1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdF9wdWJsaWMucnVuX3RyYWluKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQsb2JqXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQsclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRcdFx0XHQvL3Rlcm1pbmF0ZSBleGVjdXRpb25cblx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdC8vSWYgaXMgYW4gYXJyYXkgdGhhbiBjb250YWlucyBhbiB1bnNldHRsZWQgdGhlbmFibGVcblx0XHRcdFx0XHRcdGVsc2UgaWYociBpbnN0YW5jZW9mIEFycmF5KXtcblxuXHRcdFx0XHRcdFx0XHRcdHZhciB0aGVuYWJsZXMgPSBbXTtcblxuXHRcdFx0XHRcdFx0XHRcdGZvcih2YXIgaSBpbiByKXtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZihyW2ldLnRoZW4gJiYgcltpXS5zZXR0bGVkICE9PSAxKXtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGhlbmFibGVzLnB1c2gocltpXSk7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHZhciBmbiA9IChmdW5jdGlvbih0LGRlZixvYmoscGFyYW0pe1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCl7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly9CYWlsIGlmIGFueSB0aGVuYWJsZXMgdW5zZXR0bGVkXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGZvcih2YXIgaSBpbiB0KXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmKHRbaV0uc2V0dGxlZCAhPT0gMSl7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0X3B1YmxpYy5ydW5fdHJhaW4oXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkZWZcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCxvYmpcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCxwYXJhbVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSkodGhlbmFibGVzLGRlZixvYmoscGFyYW0pO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvL2V4ZWN1dGUgcmVzdCBvZiB0aGlzIHRyYWluIGFmdGVyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvL2FsbCB0aGVuYWJsZXMgZm91bmQgaW4gciByZXNvbHZlXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyW2ldLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChmbik7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vdGVybWluYXRlIGV4ZWN1dGlvblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly9vbkNvbXBsZXRlIGV2ZW50XG5cdFx0aWYob2JqLmhvb2tzICYmIG9iai5ob29rcy5vbkNvbXBsZXRlLnRyYWluLmxlbmd0aCA+IDApe1xuXHRcdFx0XHRfcHVibGljLnJ1bl90cmFpbihkZWYsb2JqLmhvb2tzLm9uQ29tcGxldGUscix7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX0pO1xuXHRcdH1cbn07XG5cblxuLyoqXG4gKiBTZXRzIHRoZSBzdGF0ZSBvZiBhbiBPcmd5IG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmXG4gKiBAcGFyYW0ge251bWJlcn0gaW50XG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuX3B1YmxpYy5zZXRfc3RhdGUgPSBmdW5jdGlvbihkZWYsaW50KXtcblxuXHRcdGRlZi5zdGF0ZSA9IGludDtcblxuXHRcdC8vSUYgUkVTT0xWRUQgT1IgUkVKRUNURUQsIFNFVFRMRVxuXHRcdGlmKGludCA9PT0gMSB8fCBpbnQgPT09IDIpe1xuXHRcdFx0XHRkZWYuc2V0dGxlZCA9IDE7XG5cdFx0fVxuXG5cdFx0aWYoaW50ID09PSAxIHx8IGludCA9PT0gMil7XG5cdFx0XHRcdF9wdWJsaWMuc2lnbmFsX2Rvd25zdHJlYW0oZGVmKTtcblx0XHR9XG59O1xuXG5cbi8qKlxuICogR2V0cyB0aGUgc3RhdGUgb2YgYW4gT3JneSBvYmplY3RcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmXG4gKiBAcmV0dXJucyB7bnVtYmVyfVxuICovXG5fcHVibGljLmdldF9zdGF0ZSA9IGZ1bmN0aW9uKGRlZil7XG5cdFx0cmV0dXJuIGRlZi5zdGF0ZTtcbn07XG5cblxuLyoqXG4gKiBTZXRzIHRoZSBhdXRvbWF0aWMgdGltZW91dCBvbiBhIHByb21pc2Ugb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7aW50ZWdlcn0gdGltZW91dCAob3B0aW9uYWwpXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuX3B1YmxpYy5hdXRvX3RpbWVvdXQgPSBmdW5jdGlvbih0aW1lb3V0KXtcblxuXHRcdHRoaXMudGltZW91dCA9ICh0eXBlb2YgdGltZW91dCA9PT0gJ3VuZGVmaW5lZCcpXG5cdFx0PyB0aGlzLnRpbWVvdXQgOiB0aW1lb3V0O1xuXG5cdFx0Ly9BVVRPIFJFSkVDVCBPTiB0aW1lb3V0XG5cdFx0aWYoIXRoaXMudHlwZSB8fCB0aGlzLnR5cGUgIT09ICd0aW1lcicpe1xuXG5cdFx0XHRcdC8vREVMRVRFIFBSRVZJT1VTIFRJTUVPVVQgSUYgRVhJU1RTXG5cdFx0XHRcdGlmKHRoaXMudGltZW91dF9pZCl7XG5cdFx0XHRcdFx0XHRjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0X2lkKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmKHR5cGVvZiB0aGlzLnRpbWVvdXQgPT09ICd1bmRlZmluZWQnKXtcblx0XHRcdFx0XHRcdENvbmZpZy5kZWJ1ZyhbXG5cdFx0XHRcdFx0XHRcdFwiQXV0byB0aW1lb3V0IHRoaXMudGltZW91dCBjYW5ub3QgYmUgdW5kZWZpbmVkLlwiXG5cdFx0XHRcdFx0XHRcdCx0aGlzLmlkXG5cdFx0XHRcdFx0XHRdKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmICh0aGlzLnRpbWVvdXQgPT09IC0xKXtcblx0XHRcdFx0XHRcdC8vTk8gQVVUTyBUSU1FT1VUIFNFVFxuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBzY29wZSA9IHRoaXM7XG5cblx0XHRcdFx0dGhpcy50aW1lb3V0X2lkID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0X3B1YmxpYy5hdXRvX3RpbWVvdXRfY2IuY2FsbChzY29wZSk7XG5cdFx0XHRcdH0sIHRoaXMudGltZW91dCk7XG5cblx0XHR9XG5cdFx0ZWxzZXtcblx0XHRcdFx0Ly9AdG9kbyBXSEVOIEEgVElNRVIsIEFERCBEVVJBVElPTiBUTyBBTEwgVVBTVFJFQU0gQU5EIExBVEVSQUw/XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRydWU7XG59O1xuXG5cbi8qKlxuICogQ2FsbGJhY2sgZm9yIGF1dG90aW1lb3V0LiBEZWNsYXJhdGlvbiBoZXJlIGF2b2lkcyBtZW1vcnkgbGVhay5cbiAqXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuX3B1YmxpYy5hdXRvX3RpbWVvdXRfY2IgPSBmdW5jdGlvbigpe1xuXG5cdFx0aWYodGhpcy5zdGF0ZSAhPT0gMSl7XG5cblx0XHRcdFx0Ly9HRVQgVEhFIFVQU1RSRUFNIEVSUk9SIElEXG5cdFx0XHRcdHZhciBtc2dzID0gW107XG5cdFx0XHRcdHZhciBzY29wZSA9IHRoaXM7XG5cblx0XHRcdFx0dmFyIGZuID0gZnVuY3Rpb24ob2JqKXtcblx0XHRcdFx0XHRcdGlmKG9iai5zdGF0ZSAhPT0gMSl7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIG9iai5pZDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBSdW4gb3ZlciBhIGdpdmVuIG9iamVjdCBwcm9wZXJ0eSByZWN1cnNpdmVseSxcblx0XHRcdFx0ICogYXBwbHlpbmcgY2FsbGJhY2sgdW50aWxcblx0XHRcdFx0ICogY2FsbGJhY2sgcmV0dXJucyBhIG5vbi1mYWxzZSB2YWx1ZS5cblx0XHRcdFx0ICovXG5cdFx0XHRcdGlmKENvbmZpZy5zZXR0aW5ncy5kZWJ1Z19tb2RlKXtcblx0XHRcdFx0XHRcdHZhciByID0gX3B1YmxpYy5zZWFyY2hfb2JqX3JlY3Vyc2l2ZWx5KHRoaXMsJ3Vwc3RyZWFtJyxmbik7XG5cdFx0XHRcdFx0XHRtc2dzLnB1c2goc2NvcGUuaWQgKyBcIjogcmVqZWN0ZWQgYnkgYXV0byB0aW1lb3V0IGFmdGVyIFwiXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCsgdGhpcy50aW1lb3V0ICsgXCJtc1wiKTtcblx0XHRcdFx0XHRcdG1zZ3MucHVzaChcIkNhdXNlOlwiKTtcblx0XHRcdFx0XHRcdG1zZ3MucHVzaChyKTtcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLnJlamVjdC5jYWxsKHRoaXMsbXNncyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLnJlamVjdC5jYWxsKHRoaXMpO1xuXHRcdFx0XHR9XG5cdFx0fVxufTtcblxuXG5fcHVibGljLmVycm9yID0gZnVuY3Rpb24oY2Ipe1xuXG5cdFx0Ly9JRiBFUlJPUiBBTFJFQURZIFRIUk9XTiwgRVhFQ1VURSBDQiBJTU1FRElBVEVMWVxuXHRcdGlmKHRoaXMuc3RhdGUgPT09IDIpe1xuXHRcdFx0XHRjYigpO1xuXHRcdH1cblx0XHRlbHNle1xuXHRcdFx0XHR0aGlzLnJlamVjdF9xLnB1c2goY2IpO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xufTtcblxuXG4vKipcbiAqIFNpZ25hbHMgYWxsIGRvd25zdHJlYW0gcHJvbWlzZXMgdGhhdCBfcHVibGljIHByb21pc2Ugb2JqZWN0J3NcbiAqIHN0YXRlIGhhcyBjaGFuZ2VkLlxuICpcbiAqIEB0b2RvIFNpbmNlIHRoZSBzYW1lIHF1ZXVlIG1heSBoYXZlIGJlZW4gYXNzaWduZWQgdHdpY2UgZGlyZWN0bHkgb3JcbiAqIGluZGlyZWN0bHkgdmlhIHNoYXJlZCBkZXBlbmRlbmNpZXMsIG1ha2Ugc3VyZSBub3QgdG8gZG91YmxlIHJlc29sdmVcbiAqIC0gd2hpY2ggdGhyb3dzIGFuIGVycm9yLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXQgZGVmZXJyZWQvcXVldWVcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5fcHVibGljLnNpZ25hbF9kb3duc3RyZWFtID0gZnVuY3Rpb24odGFyZ2V0KXtcblxuXHRcdC8vTUFLRSBTVVJFIEFMTCBET1dOU1RSRUFNIElTIFVOU0VUVExFRFxuXHRcdGZvcih2YXIgaSBpbiB0YXJnZXQuZG93bnN0cmVhbSl7XG5cdFx0XHRcdGlmKHRhcmdldC5kb3duc3RyZWFtW2ldLnNldHRsZWQgPT09IDEpe1xuXG5cdFx0XHRcdFx0aWYodGFyZ2V0LmRvd25zdHJlYW1baV0uc3RhdGUgIT09IDEpe1xuXHRcdFx0XHRcdFx0Ly90cmllZCB0byBzZXR0bGUgYSByZWplY3RlZCBkb3duc3RyZWFtXG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRcdC8vdHJpZWQgdG8gc2V0dGxlIGEgc3VjY2Vzc2Z1bGx5IHNldHRsZWQgZG93bnN0cmVhbVxuXHRcdFx0XHRcdFx0Q29uZmlnLmRlYnVnKHRhcmdldC5pZCArIFwiIHRyaWVkIHRvIHNldHRsZSBwcm9taXNlIFwiK1wiJ1wiK3RhcmdldC5kb3duc3RyZWFtW2ldLmlkK1wiJyB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gc2V0dGxlZC5cIik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly9OT1cgVEhBVCBXRSBLTk9XIEFMTCBET1dOU1RSRUFNIElTIFVOU0VUVExFRCwgV0UgQ0FOIElHTk9SRSBBTllcblx0XHQvL1NFVFRMRUQgVEhBVCBSRVNVTFQgQVMgQSBTSURFIEVGRkVDVCBUTyBBTk9USEVSIFNFVFRMRU1FTlRcblx0XHRmb3IgKHZhciBpIGluIHRhcmdldC5kb3duc3RyZWFtKXtcblx0XHRcdFx0aWYodGFyZ2V0LmRvd25zdHJlYW1baV0uc2V0dGxlZCAhPT0gMSl7XG5cdFx0XHRcdFx0XHRfcHVibGljLnJlY2VpdmVfc2lnbmFsKHRhcmdldC5kb3duc3RyZWFtW2ldLHRhcmdldC5pZCk7XG5cdFx0XHRcdH1cblx0XHR9XG59O1xuXG5cbi8qKlxuKiBSdW4gb3ZlciBhIGdpdmVuIG9iamVjdCBwcm9wZXJ0eSByZWN1cnNpdmVseSwgYXBwbHlpbmcgY2FsbGJhY2sgdW50aWxcbiogY2FsbGJhY2sgcmV0dXJucyBhIG5vbi1mYWxzZSB2YWx1ZS5cbipcbiogQHBhcmFtIHtvYmplY3R9IG9ialxuKiBAcGFyYW0ge3N0cmluZ30gcHJvcE5hbWUgICAgICAgICAgVGhlIHByb3BlcnR5IG5hbWUgb2YgdGhlIGFycmF5IHRvIGJ1YmJsZSB1cFxuKiBAcGFyYW0ge2Z1bmN0aW9ufSBmbiAgICAgICAgICAgICAgVGhlIHRlc3QgY2FsbGJhY2sgdG8gYmUgYXBwbGllZCB0byBlYWNoIG9iamVjdFxuKiBAcGFyYW0ge2FycmF5fSBicmVhZGNydW1iICAgICAgICAgVGhlIGJyZWFkY3J1bWIgdGhyb3VnaCB0aGUgY2hhaW4gb2YgdGhlIGZpcnN0IG1hdGNoXG4qIEByZXR1cm5zIHttaXhlZH1cbiovXG5fcHVibGljLnNlYXJjaF9vYmpfcmVjdXJzaXZlbHkgPSBmdW5jdGlvbihvYmoscHJvcE5hbWUsZm4sYnJlYWRjcnVtYil7XG5cblx0XHRpZih0eXBlb2YgYnJlYWRjcnVtYiA9PT0gJ3VuZGVmaW5lZCcpe1xuXHRcdFx0XHRicmVhZGNydW1iID0gW29iai5pZF07XG5cdFx0fVxuXG5cdFx0dmFyIHIxO1xuXG5cdFx0Zm9yKHZhciBpIGluIG9ialtwcm9wTmFtZV0pe1xuXG5cdFx0XHRcdC8vUlVOIFRFU1Rcblx0XHRcdFx0cjEgPSBmbihvYmpbcHJvcE5hbWVdW2ldKTtcblxuXHRcdFx0XHRpZihyMSAhPT0gZmFsc2Upe1xuXHRcdFx0XHQvL01BVENIIFJFVFVSTkVELiBSRUNVUlNFIElOVE8gTUFUQ0ggSUYgSEFTIFBST1BFUlRZIE9GIFNBTUUgTkFNRSBUTyBTRUFSQ0hcblx0XHRcdFx0XHRcdC8vQ0hFQ0sgVEhBVCBXRSBBUkVOJ1QgQ0FVR0hUIElOIEEgQ0lSQ1VMQVIgTE9PUFxuXHRcdFx0XHRcdFx0aWYoYnJlYWRjcnVtYi5pbmRleE9mKHIxKSAhPT0gLTEpe1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBDb25maWcuZGVidWcoW1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcIkNpcmN1bGFyIGNvbmRpdGlvbiBpbiByZWN1cnNpdmUgc2VhcmNoIG9mIG9iaiBwcm9wZXJ0eSAnXCJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCtwcm9wTmFtZStcIicgb2Ygb2JqZWN0IFwiXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQrKCh0eXBlb2Ygb2JqLmlkICE9PSAndW5kZWZpbmVkJykgPyBcIidcIitvYmouaWQrXCInXCIgOiAnJylcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCtcIi4gT2ZmZW5kaW5nIHZhbHVlOiBcIityMVxuXHRcdFx0XHRcdFx0XHRcdFx0XHQsKGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhZGNydW1iLnB1c2gocjEpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGJyZWFkY3J1bWIuam9pbihcIiBbZGVwZW5kcyBvbl09PiBcIik7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0pKClcblx0XHRcdFx0XHRcdFx0XHRdKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0YnJlYWRjcnVtYi5wdXNoKHIxKTtcblxuXHRcdFx0XHRcdFx0aWYob2JqW3Byb3BOYW1lXVtpXVtwcm9wTmFtZV0pe1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBfcHVibGljLnNlYXJjaF9vYmpfcmVjdXJzaXZlbHkob2JqW3Byb3BOYW1lXVtpXSxwcm9wTmFtZSxmbixicmVhZGNydW1iKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblxuXHRcdH1cblxuXHRcdHJldHVybiBicmVhZGNydW1iO1xufTtcblxuXG4vKipcbiAqIENvbnZlcnRzIGEgcHJvbWlzZSBkZXNjcmlwdGlvbiBpbnRvIGEgcHJvbWlzZS5cbiAqXG4gKiBAcGFyYW0ge3R5cGV9IG9ialxuICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuX3B1YmxpYy5jb252ZXJ0X3RvX3Byb21pc2UgPSBmdW5jdGlvbihvYmosb3B0aW9ucyl7XG5cblx0XHRvYmouaWQgPSBvYmouaWQgfHwgb3B0aW9ucy5pZDtcblxuXHRcdC8vQXV0b25hbWVcblx0XHRpZiAoIW9iai5pZCkge1xuXHRcdFx0aWYgKG9iai50eXBlID09PSAndGltZXInKSB7XG5cdFx0XHRcdG9iai5pZCA9IFwidGltZXItXCIgKyBvYmoudGltZW91dCArIFwiLVwiICsgKCsrQ29uZmlnLmkpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAodHlwZW9mIG9iai51cmwgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdG9iai5pZCA9IG9iai51cmwuc3BsaXQoXCIvXCIpLnBvcCgpO1xuXHRcdFx0XHQvL1JFTU9WRSAuanMgRlJPTSBJRFxuXHRcdFx0XHRpZiAob2JqLmlkLnNlYXJjaChcIi5qc1wiKSAhPT0gLTEpIHtcblx0XHRcdFx0XHRvYmouaWQgPSBvYmouaWQuc3BsaXQoXCIuXCIpO1xuXHRcdFx0XHRcdG9iai5pZC5wb3AoKTtcblx0XHRcdFx0XHRvYmouaWQgPSBvYmouaWQuam9pbihcIi5cIik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvL1JldHVybiBpZiBhbHJlYWR5IGV4aXN0c1xuXHRcdGlmKENvbmZpZy5saXN0W29iai5pZF0gJiYgb2JqLnR5cGUgIT09ICd0aW1lcicpe1xuXHRcdFx0Ly9BIHByZXZpb3VzIHByb21pc2Ugb2YgdGhlIHNhbWUgaWQgZXhpc3RzLlxuXHRcdFx0Ly9NYWtlIHN1cmUgdGhpcyBkZXBlbmRlbmN5IG9iamVjdCBkb2Vzbid0IGhhdmUgYVxuXHRcdFx0Ly9yZXNvbHZlciAtIGlmIGl0IGRvZXMgZXJyb3Jcblx0XHRcdGlmKG9iai5yZXNvbHZlcil7XG5cdFx0XHRcdENvbmZpZy5kZWJ1ZyhbXG5cdFx0XHRcdFx0XCJZb3UgY2FuJ3Qgc2V0IGEgcmVzb2x2ZXIgb24gYSBxdWV1ZSB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gZGVjbGFyZWQuIFlvdSBjYW4gb25seSByZWZlcmVuY2UgdGhlIG9yaWdpbmFsLlwiXG5cdFx0XHRcdFx0LFwiRGV0ZWN0ZWQgcmUtaW5pdCBvZiAnXCIgKyBvYmouaWQgKyBcIicuXCJcblx0XHRcdFx0XHQsXCJBdHRlbXB0ZWQ6XCJcblx0XHRcdFx0XHQsb2JqXG5cdFx0XHRcdFx0LFwiRXhpc3Rpbmc6XCJcblx0XHRcdFx0XHQsQ29uZmlnLmxpc3Rbb2JqLmlkXVxuXHRcdFx0XHRdKTtcblx0XHRcdH1cblx0XHRcdGVsc2V7XG5cdFx0XHRcdHJldHVybiBDb25maWcubGlzdFtvYmouaWRdO1xuXHRcdFx0fVxuXHRcdH1cblxuXG5cdFx0Ly9Db252ZXJ0IGRlcGVuZGVuY3kgdG8gYW4gaW5zdGFuY2Vcblx0XHR2YXIgZGVmO1xuXHRcdHN3aXRjaCh0cnVlKXtcblxuXHRcdFx0XHQvL0V2ZW50XG5cdFx0XHRcdGNhc2Uob2JqLnR5cGUgPT09ICdldmVudCcpOlxuXHRcdFx0XHRcdFx0ZGVmID0gX3B1YmxpYy53cmFwX2V2ZW50KG9iaik7XG5cdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRjYXNlKG9iai50eXBlID09PSAncXVldWUnKTpcblx0XHRcdFx0XHRcdHZhciBRdWV1ZSA9IHJlcXVpcmUoJy4vcXVldWUuanMnKTtcblx0XHRcdFx0XHRcdGRlZiA9IFF1ZXVlKG9iai5kZXBlbmRlbmNpZXMsb2JqKTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdC8vQWxyZWFkeSBhIHRoZW5hYmxlXG5cdFx0XHRcdGNhc2UodHlwZW9mIG9iai50aGVuID09PSAnZnVuY3Rpb24nKTpcblxuXHRcdFx0XHRcdFx0c3dpdGNoKHRydWUpe1xuXG5cdFx0XHRcdFx0XHRcdFx0Ly9SZWZlcmVuY2UgdG8gYW4gZXhpc3RpbmcgaW5zdGFuY2Vcblx0XHRcdFx0XHRcdFx0XHRjYXNlKHR5cGVvZiBvYmouaWQgPT09ICdzdHJpbmcnKTpcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiJ1wiK29iai5pZCArXCInOiBkaWQgbm90IGV4aXN0LiBBdXRvIGNyZWF0aW5nIG5ldyBkZWZlcnJlZC5cIik7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGRlZiA9IF9wdWJsaWMuZGVmZXJyZWQoe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWQgOiBvYmouaWRcblx0XHRcdFx0XHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly9JZiBvYmplY3Qgd2FzIGEgdGhlbmFibGUsIHJlc29sdmUgdGhlIG5ldyBkZWZlcnJlZCB3aGVuIHRoZW4gY2FsbGVkXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlmKG9iai50aGVuKXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRvYmoudGhlbihmdW5jdGlvbihyKXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGRlZi5yZXNvbHZlKHIpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRcdFx0Ly9PQkpFQ1QgUFJPUEVSVFkgLnByb21pc2UgRVhQRUNURUQgVE8gUkVUVVJOIEEgUFJPTUlTRVxuXHRcdFx0XHRcdFx0XHRcdGNhc2UodHlwZW9mIG9iai5wcm9taXNlID09PSAnZnVuY3Rpb24nKTpcblx0XHRcdFx0XHRcdFx0XHRcdFx0aWYob2JqLnNjb3BlKXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGRlZiA9IG9iai5wcm9taXNlLmNhbGwob2JqLnNjb3BlKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmID0gb2JqLnByb21pc2UoKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0XHRcdC8vT2JqZWN0IGlzIGEgdGhlbmFibGVcblx0XHRcdFx0XHRcdFx0XHRjYXNlKG9iai50aGVuKTpcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmID0gb2JqO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0XHRcdGRlZmF1bHQ6XG5cblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Ly9DaGVjayBpZiBpcyBhIHRoZW5hYmxlXG5cdFx0XHRcdFx0XHRpZih0eXBlb2YgZGVmICE9PSAnb2JqZWN0JyB8fCAhZGVmLnRoZW4pe1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBDb25maWcuZGVidWcoXCJEZXBlbmRlbmN5IGxhYmVsZWQgYXMgYSBwcm9taXNlIGRpZCBub3QgcmV0dXJuIGEgcHJvbWlzZS5cIixvYmopO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZShvYmoudHlwZSA9PT0gJ3RpbWVyJyk6XG5cdFx0XHRcdFx0XHRkZWYgPSBfcHVibGljLndyYXBfdGltZXIob2JqKTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdC8vTG9hZCBmaWxlXG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRvYmoudHlwZSA9IG9iai50eXBlIHx8IFwiZGVmYXVsdFwiO1xuXHRcdFx0XHRcdFx0Ly9Jbmhlcml0IHBhcmVudCdzIGN1cnJlbnQgd29ya2luZyBkaXJlY3Rvcnlcblx0XHRcdFx0XHRcdGlmKG9wdGlvbnMucGFyZW50ICYmIG9wdGlvbnMucGFyZW50LmN3ZCl7XG5cdFx0XHRcdFx0XHRcdG9iai5jd2QgPSBvcHRpb25zLnBhcmVudC5jd2Q7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRkZWYgPSBfcHVibGljLndyYXBfeGhyKG9iaik7XG5cdFx0fVxuXG5cdFx0Ly9JbmRleCBwcm9taXNlIGJ5IGlkIGZvciBmdXR1cmUgcmVmZXJlbmNpbmdcblx0XHRDb25maWcubGlzdFtvYmouaWRdID0gZGVmO1xuXG5cdFx0cmV0dXJuIGRlZjtcbn07XG5cblxuLyoqXG4gKiBAdG9kbzogcmVkbyB0aGlzXG4gKlxuICogQ29udmVydHMgYSByZWZlcmVuY2UgdG8gYSBET00gZXZlbnQgdG8gYSBwcm9taXNlLlxuICogUmVzb2x2ZWQgb24gZmlyc3QgZXZlbnQgdHJpZ2dlci5cbiAqXG4gKiBAdG9kbyByZW1vdmUganF1ZXJ5IGRlcGVuZGVuY3lcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZCBvYmplY3RcbiAqL1xuX3B1YmxpYy53cmFwX2V2ZW50ID0gZnVuY3Rpb24ob2JqKXtcblxuXHRcdHZhciBEZWZlcnJlZCA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuanMnKTtcblx0XHR2YXIgZGVmID0gRGVmZXJyZWQoe1xuXHRcdFx0XHRpZCA6IG9iai5pZFxuXHRcdH0pO1xuXG5cblx0XHRpZih0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKXtcblxuXHRcdFx0XHRpZih0eXBlb2YgJCAhPT0gJ2Z1bmN0aW9uJyl7XG5cdFx0XHRcdFx0XHR2YXIgbXNnID0gJ3dpbmRvdyBhbmQgZG9jdW1lbnQgYmFzZWQgZXZlbnRzIGRlcGVuZCBvbiBqUXVlcnknO1xuXHRcdFx0XHRcdFx0ZGVmLnJlamVjdChtc2cpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0Ly9Gb3Igbm93LCBkZXBlbmQgb24ganF1ZXJ5IGZvciBJRTggRE9NQ29udGVudExvYWRlZCBwb2x5ZmlsbFxuXHRcdFx0XHRcdHN3aXRjaCh0cnVlKXtcblx0XHRcdFx0XHRcdGNhc2Uob2JqLmlkID09PSAncmVhZHknIHx8IG9iai5pZCA9PT0gJ0RPTUNvbnRlbnRMb2FkZWQnKTpcblx0XHRcdFx0XHRcdFx0JChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0XHRkZWYucmVzb2x2ZSgxKTtcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0Y2FzZShvYmouaWQgPT09ICdsb2FkJyk6XG5cdFx0XHRcdFx0XHRcdCQod2luZG93KS5sb2FkKGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdFx0ZGVmLnJlc29sdmUoMSk7XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRcdCQoZG9jdW1lbnQpLm9uKG9iai5pZCxcImJvZHlcIixmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHRcdGRlZi5yZXNvbHZlKDEpO1xuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gZGVmO1xufTtcblxuXG5fcHVibGljLndyYXBfdGltZXIgPSBmdW5jdGlvbihvYmope1xuXG5cdFx0dmFyIERlZmVycmVkID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5qcycpO1xuXHRcdHZhciBkZWYgPSBEZWZlcnJlZCgpO1xuXG5cdFx0KGZ1bmN0aW9uKGRlZil7XG5cblx0XHRcdFx0dmFyIF9zdGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHR2YXIgX2VuZCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHRcdFx0XHRcdFx0ZGVmLnJlc29sdmUoe1xuXHRcdFx0XHRcdFx0XHRcdHN0YXJ0IDogX3N0YXJ0XG5cdFx0XHRcdFx0XHRcdFx0LGVuZCA6IF9lbmRcblx0XHRcdFx0XHRcdFx0XHQsZWxhcHNlZCA6IF9lbmQgLSBfc3RhcnRcblx0XHRcdFx0XHRcdFx0XHQsdGltZW91dCA6IG9iai50aW1lb3V0XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSxvYmoudGltZW91dCk7XG5cblx0XHR9KGRlZikpO1xuXG5cdFx0cmV0dXJuIGRlZjtcbn07XG5cblxuLyoqXG4gKiBDcmVhdGVzIGEgZGVmZXJyZWQgb2JqZWN0IHRoYXQgZGVwZW5kcyBvbiB0aGUgbG9hZGluZyBvZiBhIGZpbGUuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRlcFxuICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWQgb2JqZWN0XG4gKi9cbl9wdWJsaWMud3JhcF94aHIgPSBmdW5jdGlvbihkZXApe1xuXG5cdFx0dmFyIERlZmVycmVkID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5qcycpO1xuXG5cdFx0dmFyIHJlcXVpcmVkID0gW1wiaWRcIixcInVybFwiXTtcblx0XHRmb3IodmFyIGkgaW4gcmVxdWlyZWQpe1xuXHRcdFx0aWYoIWRlcFtyZXF1aXJlZFtpXV0pe1xuXHRcdFx0XHRyZXR1cm4gQ29uZmlnLmRlYnVnKFtcblx0XHRcdFx0XHRcIkZpbGUgcmVxdWVzdHMgY29udmVydGVkIHRvIHByb21pc2VzIHJlcXVpcmU6IFwiICsgcmVxdWlyZWRbaV1cblx0XHRcdFx0XHQsXCJNYWtlIHN1cmUgeW91IHdlcmVuJ3QgZXhwZWN0aW5nIGRlcGVuZGVuY3kgdG8gYWxyZWFkeSBoYXZlIGJlZW4gcmVzb2x2ZWQgdXBzdHJlYW0uXCJcblx0XHRcdFx0XHQsZGVwXG5cdFx0XHRcdF0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vSUYgUFJPTUlTRSBGT1IgVEhJUyBVUkwgQUxSRUFEWSBFWElTVFMsIFJFVFVSTiBJVFxuXHRcdGlmKENvbmZpZy5saXN0W2RlcC5pZF0pe1xuXHRcdFx0cmV0dXJuIENvbmZpZy5saXN0W2RlcC5pZF07XG5cdFx0fVxuXG5cdFx0Ly9DT05WRVJUIFRPIERFRkVSUkVEOlxuXHRcdHZhciBkZWYgPSBEZWZlcnJlZChkZXApO1xuXG5cdFx0aWYodHlwZW9mIEZpbGVfbG9hZGVyW0NvbmZpZy5zZXR0aW5ncy5tb2RlXVtkZXAudHlwZV0gIT09ICd1bmRlZmluZWQnKXtcblx0XHRcdEZpbGVfbG9hZGVyW0NvbmZpZy5zZXR0aW5ncy5tb2RlXVtkZXAudHlwZV0oZGVwLnVybCxkZWYsZGVwKTtcblx0XHR9XG5cdFx0ZWxzZXtcblx0XHRcdEZpbGVfbG9hZGVyW0NvbmZpZy5zZXR0aW5ncy5tb2RlXVsnZGVmYXVsdCddKGRlcC51cmwsZGVmLGRlcCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGRlZjtcbn07XG5cbi8qKlxuKiBBIFwic2lnbmFsXCIgaGVyZSBjYXVzZXMgYSBxdWV1ZSB0byBsb29rIHRocm91Z2ggZWFjaCBpdGVtXG4qIGluIGl0cyB1cHN0cmVhbSBhbmQgY2hlY2sgdG8gc2VlIGlmIGFsbCBhcmUgcmVzb2x2ZWQuXG4qXG4qIFNpZ25hbHMgY2FuIG9ubHkgYmUgcmVjZWl2ZWQgYnkgYSBxdWV1ZSBpdHNlbGYgb3IgYW4gaW5zdGFuY2VcbiogaW4gaXRzIHVwc3RyZWFtLlxuKlxuKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0XG4qIEBwYXJhbSB7c3RyaW5nfSBmcm9tX2lkXG4qIEByZXR1cm5zIHt2b2lkfVxuKi9cbl9wdWJsaWMucmVjZWl2ZV9zaWduYWwgPSBmdW5jdGlvbih0YXJnZXQsZnJvbV9pZCl7XG5cblx0XHRpZih0YXJnZXQuaGFsdF9yZXNvbHV0aW9uID09PSAxKSByZXR1cm47XG5cblx0IC8vTUFLRSBTVVJFIFRIRSBTSUdOQUwgV0FTIEZST00gQSBQUk9NSVNFIEJFSU5HIExJU1RFTkVEIFRPXG5cdCAvL0JVVCBBTExPVyBTRUxGIFNUQVRVUyBDSEVDS1xuXHQgdmFyIHN0YXR1cztcblx0IGlmKGZyb21faWQgIT09IHRhcmdldC5pZCAmJiAhdGFyZ2V0LnVwc3RyZWFtW2Zyb21faWRdKXtcblx0XHRcdCByZXR1cm4gQ29uZmlnLmRlYnVnKGZyb21faWQgKyBcIiBjYW4ndCBzaWduYWwgXCIgKyB0YXJnZXQuaWQgKyBcIiBiZWNhdXNlIG5vdCBpbiB1cHN0cmVhbS5cIik7XG5cdCB9XG5cdCAvL1JVTiBUSFJPVUdIIFFVRVVFIE9GIE9CU0VSVklORyBQUk9NSVNFUyBUTyBTRUUgSUYgQUxMIERPTkVcblx0IGVsc2V7XG5cdFx0XHQgc3RhdHVzID0gMTtcblx0XHRcdCBmb3IodmFyIGkgaW4gdGFyZ2V0LnVwc3RyZWFtKXtcblx0XHRcdFx0XHQgLy9TRVRTIFNUQVRVUyBUTyAwIElGIEFOWSBPQlNFUlZJTkcgSEFWRSBGQUlMRUQsIEJVVCBOT1QgSUYgUEVORElORyBPUiBSRVNPTFZFRFxuXHRcdFx0XHRcdCBpZih0YXJnZXQudXBzdHJlYW1baV0uc3RhdGUgIT09IDEpIHtcblx0XHRcdFx0XHRcdFx0IHN0YXR1cyA9IHRhcmdldC51cHN0cmVhbVtpXS5zdGF0ZTtcblx0XHRcdFx0XHRcdFx0IGJyZWFrO1xuXHRcdFx0XHRcdCB9XG5cdFx0XHQgfVxuXHQgfVxuXG5cdCAvL1JFU09MVkUgUVVFVUUgSUYgVVBTVFJFQU0gRklOSVNIRURcblx0IGlmKHN0YXR1cyA9PT0gMSl7XG5cblx0XHRcdC8vR0VUIFJFVFVSTiBWQUxVRVMgUEVSIERFUEVOREVOQ0lFUywgV0hJQ0ggU0FWRVMgT1JERVIgQU5EXG5cdFx0XHQvL1JFUE9SVFMgRFVQTElDQVRFU1xuXHRcdFx0dmFyIHZhbHVlcyA9IFtdO1xuXHRcdFx0Zm9yKHZhciBpIGluIHRhcmdldC5kZXBlbmRlbmNpZXMpe1xuXHRcdFx0XHR2YWx1ZXMucHVzaCh0YXJnZXQuZGVwZW5kZW5jaWVzW2ldLnZhbHVlKTtcblx0XHRcdH1cblxuXHRcdFx0dGFyZ2V0LnJlc29sdmUuY2FsbCh0YXJnZXQsdmFsdWVzKTtcblx0IH1cblxuXHQgaWYoc3RhdHVzID09PSAyKXtcblx0XHRcdCB2YXIgZXJyID0gW1xuXHRcdFx0XHRcdCB0YXJnZXQuaWQrXCIgZGVwZW5kZW5jeSAnXCIrdGFyZ2V0LnVwc3RyZWFtW2ldLmlkICsgXCInIHdhcyByZWplY3RlZC5cIlxuXHRcdFx0XHRcdCAsdGFyZ2V0LnVwc3RyZWFtW2ldLmFyZ3VtZW50c1xuXHRcdFx0IF07XG5cdFx0XHQgdGFyZ2V0LnJlamVjdC5hcHBseSh0YXJnZXQsZXJyKTtcblx0IH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gX3B1YmxpYztcbiIsIi8qKlxuICogRGVmYXVsdCBwcm9wZXJ0aWVzIGZvciBhbGwgZGVmZXJyZWQgb2JqZWN0cy5cbiAqIEBpZ25vcmVcbiAqL1xudmFyIHNjaGVtYSA9IGZ1bmN0aW9uKCl7XG5cblx0dmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyksXG5cdFx0XHRfcHVibGljID0ge307XG5cblx0dGhpcy5nZXQgPSBmdW5jdGlvbigpe1xuXHRcdHJldHVybiBfcHVibGljO1xuXHR9O1xuXG5cdF9wdWJsaWMuaXNfb3JneSA9IHRydWU7XG5cblx0X3B1YmxpYy5pZCA9IG51bGw7XG5cblx0Ly9BIENPVU5URVIgRk9SIEFVVDAtR0VORVJBVEVEIFBST01JU0UgSUQnU1xuXHRfcHVibGljLnNldHRsZWQgPSAwO1xuXG5cdC8qKlxuXHQqIFNUQVRFIENPREVTOlxuXHQqIC0tLS0tLS0tLS0tLS0tLS0tLVxuXHQqIC0xICAgPT4gU0VUVExJTkcgW0VYRUNVVElORyBDQUxMQkFDS1NdXG5cdCogIDAgICA9PiBQRU5ESU5HXG5cdCogIDEgICA9PiBSRVNPTFZFRCAvIEZVTEZJTExFRFxuXHQqICAyICAgPT4gUkVKRUNURURcblx0Ki9cblx0X3B1YmxpYy5zdGF0ZSA9IDA7XG5cblx0X3B1YmxpYy52YWx1ZSA9IFtdO1xuXG5cdC8vVGhlIG1vc3QgcmVjZW50IHZhbHVlIGdlbmVyYXRlZCBieSB0aGUgdGhlbi0+ZG9uZSBjaGFpbi5cblx0X3B1YmxpYy5jYWJvb3NlID0gbnVsbDtcblxuXHRfcHVibGljLm1vZGVsID0gXCJkZWZlcnJlZFwiO1xuXG5cdF9wdWJsaWMuZG9uZV9maXJlZCA9IDA7XG5cblx0X3B1YmxpYy50aW1lb3V0X2lkID0gbnVsbDtcblxuXHQvKipcblx0KiBEZWZhdWx0IHRpbWVvdXQgZm9yIGEgZGVmZXJyZWRcblx0KiBAdHlwZSBudW1iZXJcblx0Ki9cblx0X3B1YmxpYy50aW1lb3V0ID0gKGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuIENvbmZpZy5jb25maWcoKS50aW1lb3V0O1xuXHR9KCkpO1xuXG5cdF9wdWJsaWMuY2FsbGJhY2tfc3RhdGVzID0ge1xuXHRcdHJlc29sdmUgOiAwXG5cdFx0LHRoZW4gOiAwXG5cdFx0LGRvbmUgOiAwXG5cdFx0LHJlamVjdCA6IDBcblx0fTtcblxuXHQvKipcblx0KiBTZWxmIGV4ZWN1dGluZyBmdW5jdGlvbiB0byBpbml0aWFsaXplIGNhbGxiYWNrIGV2ZW50XG5cdCogbGlzdC5cblx0KlxuXHQqIFJldHVybnMgYW4gb2JqZWN0IHdpdGggdGhlIHNhbWUgcHJvcGVydHlOYW1lcyBhc1xuXHQqIF9wdWJsaWMuY2FsbGJhY2tfc3RhdGVzOiBhZGRpbmcgYm9pbGVycGxhdGVcblx0KiBwcm9wZXJ0aWVzIGZvciBlYWNoXG5cdCpcblx0KiBAcmV0dXJucyB7b2JqZWN0fVxuXHQqL1xuXHRfcHVibGljLmNhbGxiYWNrcyA9IChmdW5jdGlvbigpe1xuXG5cdFx0dmFyIG8gPSB7fTtcblxuXHRcdGZvcih2YXIgaSBpbiBfcHVibGljLmNhbGxiYWNrX3N0YXRlcyl7XG5cdFx0XHRvW2ldID0ge1xuXHRcdFx0XHR0cmFpbiA6IFtdXG5cdFx0XHRcdCxob29rcyA6IHtcblx0XHRcdFx0XHRvbkJlZm9yZSA6IHtcblx0XHRcdFx0XHRcdHRyYWluIDogW11cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0LG9uQ29tcGxldGUgOiB7XG5cdFx0XHRcdFx0XHR0cmFpbiA6IFtdXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdHJldHVybiBvO1xuXHR9KSgpO1xuXG5cdC8vUFJPTUlTRSBIQVMgT0JTRVJWRVJTIEJVVCBET0VTIE5PVCBPQlNFUlZFIE9USEVSU1xuXHRfcHVibGljLmRvd25zdHJlYW0gPSB7fTtcblxuXHRfcHVibGljLmV4ZWN1dGlvbl9oaXN0b3J5ID0gW107XG5cblx0Ly9XSEVOIFRSVUUsIEFMTE9XUyBSRS1JTklUIFtGT1IgVVBHUkFERVMgVE8gQSBRVUVVRV1cblx0X3B1YmxpYy5vdmVyd3JpdGFibGUgPSAwO1xuXG5cdC8qKlxuXHQqIFJFTU9URVxuXHQqXG5cdCogUkVNT1RFID09IDEgID0+ICBbREVGQVVMVF0gTWFrZSBodHRwIHJlcXVlc3QgZm9yIGZpbGVcblx0KlxuXHQqIFJFTU9URSA9PSAwICA9PiAgUmVhZCBmaWxlIGRpcmVjdGx5IGZyb20gdGhlIGZpbGVzeXN0ZW1cblx0KlxuXHQqIE9OTFkgQVBQTElFUyBUTyBTQ1JJUFRTIFJVTiBVTkRFUiBOT0RFIEFTIEJST1dTRVIgSEFTIE5PXG5cdCogRklMRVNZU1RFTSBBQ0NFU1Ncblx0Ki9cblx0X3B1YmxpYy5yZW1vdGUgPSAxO1xuXG5cdC8vQUREUyBUTyBNQVNURVIgTElTVC4gQUxXQVlTIFRSVUUgVU5MRVNTIFVQR1JBRElORyBBIFBST01JU0UgVE8gQSBRVUVVRVxuXHRfcHVibGljLmxpc3QgPSAxO1xuXG5cblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cdC8vICBfcHVibGljIE1FVEhPRFNcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuXHQvKipcblx0KiBSZXNvbHZlcyBhIGRlZmVycmVkL3F1ZXVlLlxuXHQqXG5cdCogQG1lbWJlcm9mIG9yZ3kvZGVmZXJyZWRcblx0KiBAZnVuY3Rpb24gb3JneS9kZWZlcnJlZCNyZXNvbHZlXG5cdCpcblx0KiBAcGFyYW0ge21peGVkfSB2YWx1ZSBSZXNvbHZlciB2YWx1ZS5cblx0KiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZC9xdWV1ZVxuXHQqL1xuXHRfcHVibGljLnJlc29sdmUgPSBmdW5jdGlvbih2YWx1ZSl7XG5cblx0XHR2YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcblxuXHRcdGlmKHRoaXMuc2V0dGxlZCA9PT0gMSl7XG5cdFx0XHRDb25maWcuZGVidWcoW1xuXHRcdFx0XHR0aGlzLmlkICsgXCIgY2FuJ3QgcmVzb2x2ZS5cIlxuXHRcdFx0XHQsXCJPbmx5IHVuc2V0dGxlZCBkZWZlcnJlZHMgYXJlIHJlc29sdmFibGUuXCJcblx0XHRcdF0pO1xuXHRcdH1cblxuXHRcdC8vU0VUIFNUQVRFIFRPIFNFVFRMRU1FTlQgSU4gUFJPR1JFU1Ncblx0XHRfcHJpdmF0ZS5zZXRfc3RhdGUodGhpcywtMSk7XG5cblx0XHQvL1NFVCBWQUxVRVxuXHRcdHRoaXMudmFsdWUgPSB2YWx1ZTtcblxuXHRcdC8vUlVOIFJFU09MVkVSIEJFRk9SRSBQUk9DRUVESU5HXG5cdFx0Ly9FVkVOIElGIFRIRVJFIElTIE5PIFJFU09MVkVSLCBTRVQgSVQgVE8gRklSRUQgV0hFTiBDQUxMRURcblx0XHRpZighdGhpcy5yZXNvbHZlcl9maXJlZCAmJiB0eXBlb2YgdGhpcy5yZXNvbHZlciA9PT0gJ2Z1bmN0aW9uJyl7XG5cblx0XHRcdHRoaXMucmVzb2x2ZXJfZmlyZWQgPSAxO1xuXG5cdFx0XHQvL0FkZCByZXNvbHZlciB0byByZXNvbHZlIHRyYWluXG5cdFx0XHR0cnl7XG5cdFx0XHRcdHRoaXMuY2FsbGJhY2tzLnJlc29sdmUudHJhaW4ucHVzaChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdHRoaXMucmVzb2x2ZXIodmFsdWUsdGhpcyk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0Y2F0Y2goZSl7XG5cdFx0XHRcdGRlYnVnZ2VyO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNle1xuXG5cdFx0XHR0aGlzLnJlc29sdmVyX2ZpcmVkID0gMTtcblxuXHRcdFx0Ly9BZGQgc2V0dGxlIHRvIHJlc29sdmUgdHJhaW5cblx0XHRcdC8vQWx3YXlzIHNldHRsZSBiZWZvcmUgYWxsIG90aGVyIGNvbXBsZXRlIGNhbGxiYWNrc1xuXHRcdFx0dGhpcy5jYWxsYmFja3MucmVzb2x2ZS5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnVuc2hpZnQoZnVuY3Rpb24oKXtcblx0XHRcdFx0X3ByaXZhdGUuc2V0dGxlKHRoaXMpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Ly9SdW4gcmVzb2x2ZVxuXHRcdF9wcml2YXRlLnJ1bl90cmFpbihcblx0XHRcdHRoaXNcblx0XHRcdCx0aGlzLmNhbGxiYWNrcy5yZXNvbHZlXG5cdFx0XHQsdGhpcy52YWx1ZVxuXHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuXHRcdCk7XG5cblx0XHQvL3Jlc29sdmVyIGlzIGV4cGVjdGVkIHRvIGNhbGwgcmVzb2x2ZSBhZ2FpblxuXHRcdC8vYW5kIHRoYXQgd2lsbCBnZXQgdXMgcGFzdCB0aGlzIHBvaW50XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblxuXHQvKipcblx0KiBSZWplY3RzIGEgZGVmZXJyZWQvcXVldWVcblx0KlxuXHQqIEBtZW1iZXJvZiBvcmd5L2RlZmVycmVkXG5cdCogQGZ1bmN0aW9uIG9yZ3kvZGVmZXJyZWQjcmVqZWN0XG5cdCpcblx0KiBAcGFyYW0ge3N0cmluZ3xhcnJheX0gZXJyIEVycm9yIGluZm9ybWF0aW9uLlxuXHQqIEByZXR1cm4ge29iamVjdH0gZGVmZXJyZWQvcXVldWVcblx0Ki9cblx0X3B1YmxpYy5yZWplY3QgPSBmdW5jdGlvbihlcnIpe1xuXG5cdFx0dmFyIF9wcml2YXRlID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5wcml2YXRlLmpzJyk7XG5cblx0XHRpZighKGVyciBpbnN0YW5jZW9mIEFycmF5KSl7XG5cdFx0XHRlcnIgPSBbZXJyXTtcblx0XHR9XG5cblx0XHR2YXIgbXNnID0gXCJSZWplY3RlZCBcIit0aGlzLm1vZGVsK1wiOiAnXCIrdGhpcy5pZCtcIicuXCJcblxuXHRcdGlmKENvbmZpZy5zZXR0aW5ncy5kZWJ1Z19tb2RlKXtcblx0XHRcdGVyci51bnNoaWZ0KG1zZyk7XG5cdFx0XHRDb25maWcuZGVidWcoZXJyLHRoaXMpO1xuXHRcdH1cblx0XHRlbHNle1xuXHRcdFx0bXNnID0gbXNnICsgXCIgVHVybiBvbiBkZWJ1ZyBtb2RlIGZvciBtb3JlIGluZm8uXCI7XG5cdFx0XHRjb25zb2xlLndhcm4obXNnKTtcblx0XHR9XG5cblx0XHQvL1JlbW92ZSBhdXRvIHRpbWVvdXQgdGltZXJcblx0XHRpZih0aGlzLnRpbWVvdXRfaWQpe1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMudGltZW91dF9pZCk7XG5cdFx0fVxuXG5cdFx0Ly9TZXQgc3RhdGUgdG8gcmVqZWN0ZWRcblx0XHRfcHJpdmF0ZS5zZXRfc3RhdGUodGhpcywyKTtcblxuXHRcdC8vRXhlY3V0ZSByZWplY3Rpb24gcXVldWVcblx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oXG5cdFx0XHR0aGlzXG5cdFx0XHQsdGhpcy5jYWxsYmFja3MucmVqZWN0XG5cdFx0XHQsZXJyXG5cdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG5cdFx0KTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cblx0LyoqXG5cdCogQ2hhaW4gbWV0aG9kXG5cblx0PGI+VXNhZ2U6PC9iPlxuXHRgYGBcblx0dmFyIE9yZ3kgPSByZXF1aXJlKFwib3JneVwiKSxcblx0XHRcdFx0XHRxID0gT3JneS5kZWZlcnJlZCh7XG5cdFx0XHRcdFx0XHRpZCA6IFwicTFcIlxuXHRcdFx0XHRcdH0pO1xuXG5cdC8vUmVzb2x2ZSB0aGUgZGVmZXJyZWRcblx0cS5yZXNvbHZlKFwiU29tZSB2YWx1ZS5cIik7XG5cblx0cS50aGVuKGZ1bmN0aW9uKHIpe1xuXHRcdGNvbnNvbGUubG9nKHIpOyAvL1NvbWUgdmFsdWUuXG5cdH0pXG5cblx0YGBgXG5cblx0KiBAbWVtYmVyb2Ygb3JneS9kZWZlcnJlZFxuXHQqIEBmdW5jdGlvbiBvcmd5L2RlZmVycmVkI3RoZW5cblx0KlxuXHQqIEBwYXJhbSB7ZnVuY3Rpb259IGZuIENhbGxiYWNrIGZ1bmN0aW9uXG5cdCogQHBhcmFtIHtmdW5jdGlvbn0gcmVqZWN0b3IgUmVqZWN0aW9uIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCogQHJldHVybiB7b2JqZWN0fSBkZWZlcnJlZC9xdWV1ZVxuXHQqL1xuXHRfcHVibGljLnRoZW4gPSBmdW5jdGlvbihmbixyZWplY3Rvcil7XG5cblx0XHR2YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcblxuXHRcdHN3aXRjaCh0cnVlKXtcblxuXHRcdFx0Ly9BbiBlcnJvciB3YXMgcHJldmlvdXNseSB0aHJvd24sIGFkZCByZWplY3RvciAmIGJhaWwgb3V0XG5cdFx0XHRjYXNlKHRoaXMuc3RhdGUgPT09IDIpOlxuXHRcdFx0XHRpZih0eXBlb2YgcmVqZWN0b3IgPT09ICdmdW5jdGlvbicpe1xuXHRcdFx0XHRcdHRoaXMuY2FsbGJhY2tzLnJlamVjdC50cmFpbi5wdXNoKHJlamVjdG9yKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Ly9FeGVjdXRpb24gY2hhaW4gYWxyZWFkeSBmaW5pc2hlZC4gQmFpbCBvdXQuXG5cdFx0XHRjYXNlKHRoaXMuZG9uZV9maXJlZCA9PT0gMSk6XG5cdFx0XHRcdHJldHVybiBDb25maWcuZGVidWcodGhpcy5pZCtcIiBjYW4ndCBhdHRhY2ggLnRoZW4oKSBiZWNhdXNlIC5kb25lKCkgaGFzIGFscmVhZHkgZmlyZWQsIGFuZCB0aGF0IG1lYW5zIHRoZSBleGVjdXRpb24gY2hhaW4gaXMgY29tcGxldGUuXCIpO1xuXG5cdFx0XHRkZWZhdWx0OlxuXG5cdFx0XHRcdC8vUHVzaCBjYWxsYmFjayB0byB0aGVuIHF1ZXVlXG5cdFx0XHRcdHRoaXMuY2FsbGJhY2tzLnRoZW4udHJhaW4ucHVzaChmbik7XG5cblx0XHRcdFx0Ly9QdXNoIHJlamVjdCBjYWxsYmFjayB0byB0aGUgcmVqZWN0aW9uIHF1ZXVlXG5cdFx0XHRcdGlmKHR5cGVvZiByZWplY3RvciA9PT0gJ2Z1bmN0aW9uJyl7XG5cdFx0XHRcdFx0dGhpcy5jYWxsYmFja3MucmVqZWN0LnRyYWluLnB1c2gocmVqZWN0b3IpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly9TZXR0bGVkLCBydW4gdHJhaW4gbm93XG5cdFx0XHRcdGlmKHRoaXMuc2V0dGxlZCA9PT0gMSAmJiB0aGlzLnN0YXRlID09PSAxICYmICF0aGlzLmRvbmVfZmlyZWQpe1xuXHRcdFx0XHRcdF9wcml2YXRlLnJ1bl90cmFpbihcblx0XHRcdFx0XHRcdHRoaXNcblx0XHRcdFx0XHRcdCx0aGlzLmNhbGxiYWNrcy50aGVuXG5cdFx0XHRcdFx0XHQsdGhpcy5jYWJvb3NlXG5cdFx0XHRcdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogdHJ1ZX1cblx0XHRcdFx0XHQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vVW5zZXR0bGVkLCB0cmFpbiB3aWxsIGJlIHJ1biB3aGVuIHNldHRsZWRcblx0XHRcdFx0ZWxzZXt9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblxuXHQvKipcblx0KiBEb25lIGNhbGxiYWNrLlxuXHQqXG5cdCogQG1lbWJlcm9mIG9yZ3kvZGVmZXJyZWRcblx0KiBAZnVuY3Rpb24gb3JneS9kZWZlcnJlZCNkb25lXG5cdCpcblx0KiBAcGFyYW0ge2Z1bmN0aW9ufSBmbiBDYWxsYmFjayBmdW5jdGlvblxuXHQqIEBwYXJhbSB7ZnVuY3Rpb259IHJlamVjdG9yIFJlamVjdGlvbiBjYWxsYmFjayBmdW5jdGlvblxuXHQqIEByZXR1cm5zIHtvYmplY3R9IGRlZmVycmVkL3F1ZXVlXG5cdCovXG5cdF9wdWJsaWMuZG9uZSA9IGZ1bmN0aW9uKGZuLHJlamVjdG9yKXtcblxuXHRcdHZhciBfcHJpdmF0ZSA9IHJlcXVpcmUoJy4vZGVmZXJyZWQucHJpdmF0ZS5qcycpO1xuXG5cdFx0aWYodGhpcy5jYWxsYmFja3MuZG9uZS50cmFpbi5sZW5ndGggPT09IDBcblx0XHRcdCYmIHRoaXMuZG9uZV9maXJlZCA9PT0gMCl7XG5cdFx0XHRcdGlmKHR5cGVvZiBmbiA9PT0gJ2Z1bmN0aW9uJyl7XG5cblx0XHRcdFx0XHQvL3dyYXAgY2FsbGJhY2sgd2l0aCBzb21lIG90aGVyIGNvbW1hbmRzXG5cdFx0XHRcdFx0dmFyIGZuMiA9IGZ1bmN0aW9uKHIsZGVmZXJyZWQsbGFzdCl7XG5cblx0XHRcdFx0XHRcdC8vRG9uZSBjYW4gb25seSBiZSBjYWxsZWQgb25jZSwgc28gbm90ZSB0aGF0IGl0IGhhcyBiZWVuXG5cdFx0XHRcdFx0XHRkZWZlcnJlZC5kb25lX2ZpcmVkID0gMTtcblxuXHRcdFx0XHRcdFx0Zm4ocixkZWZlcnJlZCxsYXN0KTtcblx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0dGhpcy5jYWxsYmFja3MuZG9uZS50cmFpbi5wdXNoKGZuMik7XG5cblx0XHRcdFx0XHQvL1B1c2ggcmVqZWN0IGNhbGxiYWNrIHRvIHRoZSByZWplY3Rpb24gcXVldWUgb25Db21wbGV0ZVxuXHRcdFx0XHRcdGlmKHR5cGVvZiByZWplY3RvciA9PT0gJ2Z1bmN0aW9uJyl7XG5cdFx0XHRcdFx0XHR0aGlzLmNhbGxiYWNrcy5yZWplY3QuaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKHJlamVjdG9yKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvL1NldHRsZWQsIHJ1biB0cmFpbiBub3dcblx0XHRcdFx0XHRpZih0aGlzLnNldHRsZWQgPT09IDEpe1xuXHRcdFx0XHRcdFx0aWYodGhpcy5zdGF0ZSA9PT0gMSl7XG5cdFx0XHRcdFx0XHRcdF9wcml2YXRlLnJ1bl90cmFpbihcblx0XHRcdFx0XHRcdFx0XHR0aGlzXG5cdFx0XHRcdFx0XHRcdFx0LHRoaXMuY2FsbGJhY2tzLmRvbmVcblx0XHRcdFx0XHRcdFx0XHQsdGhpcy5jYWJvb3NlXG5cdFx0XHRcdFx0XHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRcdFx0X3ByaXZhdGUucnVuX3RyYWluKFxuXHRcdFx0XHRcdFx0XHRcdHRoaXNcblx0XHRcdFx0XHRcdFx0XHQsdGhpcy5jYWxsYmFja3MucmVqZWN0XG5cdFx0XHRcdFx0XHRcdFx0LHRoaXMuY2Fib29zZVxuXHRcdFx0XHRcdFx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly9VbnNldHRsZWQsIHRyYWluIHdpbGwgYmUgcnVuIHdoZW4gc2V0dGxlZFxuXHRcdFx0XHRcdGVsc2V7fVxuXHRcdFx0fVxuXHRcdFx0ZWxzZXtcblx0XHRcdFx0cmV0dXJuIENvbmZpZy5kZWJ1ZyhcImRvbmUoKSBtdXN0IGJlIHBhc3NlZCBhIGZ1bmN0aW9uLlwiKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0ZWxzZXtcblx0XHRcdHJldHVybiBDb25maWcuZGVidWcoXCJkb25lKCkgY2FuIG9ubHkgYmUgY2FsbGVkIG9uY2UuXCIpO1xuXHRcdH1cblx0XHRcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBBbGxvd3MgYSBwcmVwcm9jZXNzb3IgdG8gc2V0IGJhY2tyYWNlIGRhdGEgb24gYW4gT3JneSBvYmplY3QuXG5cdCAqIEBwYXJhbSAge3N0cmluZ30gc3RyIGZpbGVuYW1lOmxpbmUgbnVtYmVyXG5cdCAqIEByZXR1cm4ge29iamVjdH0gZGVmZXJyZWQvcXVldWVcblx0ICovXG5cdF9wdWJsaWMuX2J0cmMgPSBmdW5jdGlvbihzdHIpe1xuXHRcdHRoaXMuYmFja3RyYWNlID0gc3RyO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xufTtcblxudmFyIGZhY3RvcnkgPSBmdW5jdGlvbigpe1xuXHR2YXIgbyA9IG5ldyBzY2hlbWEoKTtcblx0cmV0dXJuIG8uZ2V0KCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZhY3Rvcnk7XG4iLCJ2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcbnZhciBfcHVibGljID0ge30sXG5cdFx0X3ByaXZhdGUgPSB7fTtcblxuX3B1YmxpYy5icm93c2VyID0ge307XG5fcHVibGljLm5hdGl2ZSA9IHt9O1xuX3ByaXZhdGUubmF0aXZlID0ge307XG5cbi8vQnJvd3NlciBsb2FkXG5cbl9wdWJsaWMuYnJvd3Nlci5jc3MgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblxuXHR2YXIgaGVhZCA9ICBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImhlYWRcIilbMF0gfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuXHRlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpbmtcIik7XG5cblx0ZWxlbS5zZXRBdHRyaWJ1dGUoXCJocmVmXCIscGF0aCk7XG5cdGVsZW0uc2V0QXR0cmlidXRlKFwidHlwZVwiLFwidGV4dC9jc3NcIik7XG5cdGVsZW0uc2V0QXR0cmlidXRlKFwicmVsXCIsXCJzdHlsZXNoZWV0XCIpO1xuXG5cdGlmKGVsZW0ub25sb2FkKXtcblx0XHQoZnVuY3Rpb24oZWxlbSl7XG5cdFx0XHRcdGVsZW0ub25sb2FkID0gZWxlbS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKGVsZW0pO1xuXHRcdFx0IH07XG5cblx0XHRcdCBlbGVtLm9uZXJyb3IgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblx0XHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoXCJGYWlsZWQgdG8gbG9hZCBwYXRoOiBcIiArIHBhdGgpO1xuXHRcdFx0IH07XG5cblx0XHR9KGVsZW0scGF0aCxkZWZlcnJlZCkpO1xuXG5cdFx0aGVhZC5hcHBlbmRDaGlsZChlbGVtKTtcblx0fVxuXHRlbHNle1xuXHRcdC8vQUREIGVsZW0gQlVUIE1BS0UgWEhSIFJFUVVFU1QgVE8gQ0hFQ0sgRklMRSBSRUNFSVZFRFxuXHRcdGhlYWQuYXBwZW5kQ2hpbGQoZWxlbSk7XG5cdFx0Y29uc29sZS53YXJuKFwiTm8gb25sb2FkIGF2YWlsYWJsZSBmb3IgbGluayB0YWcsIGF1dG9yZXNvbHZpbmcuXCIpO1xuXHRcdGRlZmVycmVkLnJlc29sdmUoZWxlbSk7XG5cdH1cbn07XG5cbl9wdWJsaWMuYnJvd3Nlci5zY3JpcHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblxuXHR2YXIgZWxlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIik7XG5cdGVsZW0udHlwZSA9ICd0ZXh0L2phdmFzY3JpcHQnO1xuXHRlbGVtLnNldEF0dHJpYnV0ZShcInNyY1wiLHBhdGgpO1xuXG5cdChmdW5jdGlvbihlbGVtLHBhdGgsZGVmZXJyZWQpe1xuXHRcdFx0ZWxlbS5vbmxvYWQgPSBlbGVtLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdC8vQXV0b3Jlc29sdmUgYnkgZGVmYXVsdFxuXHRcdFx0XHRpZih0eXBlb2YgZGVmZXJyZWQuYXV0b3Jlc29sdmUgIT09ICdib29sZWFuJ1xuXHRcdFx0XHR8fCBkZWZlcnJlZC5hdXRvcmVzb2x2ZSA9PT0gdHJ1ZSl7XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSgodHlwZW9mIGVsZW0udmFsdWUgIT09ICd1bmRlZmluZWQnKSA/IGVsZW0udmFsdWUgOiBlbGVtKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdGVsZW0ub25lcnJvciA9IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdChcIkVycm9yIGxvYWRpbmc6IFwiICsgcGF0aCk7XG5cdFx0XHR9O1xuXHR9KGVsZW0scGF0aCxkZWZlcnJlZCkpO1xuXG5cdHRoaXMuaGVhZC5hcHBlbmRDaGlsZChlbGVtKTtcbn07XG5cbl9wdWJsaWMuYnJvd3Nlci5odG1sID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCxkZXApe1xuXHR0aGlzLmRlZmF1bHQocGF0aCxkZWZlcnJlZCxkZXApO1xufTtcblxuX3B1YmxpYy5icm93c2VyLmRlZmF1bHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkLG9wdGlvbnMpe1xuXHR2YXIgcixcblx0cmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdHJlcS5vcGVuKCdHRVQnLCBwYXRoLCB0cnVlKTtcblxuXHQoZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cdFx0cmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKHJlcS5yZWFkeVN0YXRlID09PSA0KSB7XG5cdFx0XHRcdGlmKHJlcS5zdGF0dXMgPT09IDIwMCl7XG5cdFx0XHRcdFx0ciA9IHJlcS5yZXNwb25zZVRleHQ7XG5cdFx0XHRcdFx0aWYob3B0aW9ucy50eXBlICYmIG9wdGlvbnMudHlwZSA9PT0gJ2pzb24nKXtcblx0XHRcdFx0XHRcdHRyeXtcblx0XHRcdFx0XHRcdFx0ciA9IEpTT04ucGFyc2Uocik7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRjYXRjaChlKXtcblx0XHRcdFx0XHRcdFx0X3B1YmxpYy5kZWJ1ZyhbXG5cdFx0XHRcdFx0XHRcdFx0XCJDb3VsZCBub3QgZGVjb2RlIEpTT05cIlxuXHRcdFx0XHRcdFx0XHRcdCxwYXRoXG5cdFx0XHRcdFx0XHRcdFx0LHJcblx0XHRcdFx0XHRcdFx0XSxkZWZlcnJlZCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmUocik7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoXCJFcnJvciBsb2FkaW5nOiBcIiArIHBhdGgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblx0fShwYXRoLGRlZmVycmVkKSk7XG5cblx0cmVxLnNlbmQobnVsbCk7XG59O1xuXG5cblxuLy9OYXRpdmUgbG9hZFxuXG5fcHVibGljLm5hdGl2ZS5jc3MgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblx0X3B1YmxpYy5icm93c2VyLmNzcyhwYXRoLGRlZmVycmVkKTtcbn07XG5cbl9wdWJsaWMubmF0aXZlLnNjcmlwdCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXHQvL2xvY2FsIHBhY2thZ2Vcblx0aWYocGF0aFswXT09PScuJyl7XG5cdFx0cGF0aCA9IF9wcml2YXRlLm5hdGl2ZS5wcmVwYXJlX3BhdGgocGF0aCxkZWZlcnJlZCk7XG5cdFx0dmFyIHIgPSByZXF1aXJlKHBhdGgpO1xuXHRcdC8vQXV0b3Jlc29sdmUgYnkgZGVmYXVsdFxuXHRcdGlmKHR5cGVvZiBkZWZlcnJlZC5hdXRvcmVzb2x2ZSAhPT0gJ2Jvb2xlYW4nXG5cdFx0fHwgZGVmZXJyZWQuYXV0b3Jlc29sdmUgPT09IHRydWUpe1xuXHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShyKTtcblx0XHR9XG5cdH1cblx0Ly9yZW1vdGUgc2NyaXB0XG5cdGVsc2V7XG5cdFx0Ly9DaGVjayB0aGF0IHdlIGhhdmUgY29uZmlndXJlZCB0aGUgZW52aXJvbm1lbnQgdG8gYWxsb3cgdGhpcyxcblx0XHQvL2FzIGl0IHJlcHJlc2VudHMgYSBzZWN1cml0eSB0aHJlYXQgYW5kIHNob3VsZCBvbmx5IGJlIHVzZWQgZm9yIGRlYnVnZ2luZ1xuXHRcdGlmKCFDb25maWcuc2V0dGluZ3MuZGVidWdfbW9kZSl7XG5cdFx0XHRDb25maWcuZGVidWcoXCJTZXQgY29uZmlnLmRlYnVnX21vZGU9MSB0byBydW4gcmVtb3RlIHNjcmlwdHMgb3V0c2lkZSBvZiBkZWJ1ZyBtb2RlLlwiKTtcblx0XHR9XG5cdFx0ZWxzZXtcblx0XHRcdF9wcml2YXRlLm5hdGl2ZS5nZXQocGF0aCxkZWZlcnJlZCxmdW5jdGlvbihkYXRhKXtcblx0XHRcdFx0dmFyIFZtID0gcmVxdWlyZSgndm0nKTtcblx0XHRcdFx0ciA9IFZtLnJ1bkluVGhpc0NvbnRleHQoZGF0YSk7XG5cdFx0XHRcdGRlZmVycmVkLnJlc29sdmUocik7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cbn07XG5cbl9wdWJsaWMubmF0aXZlLmh0bWwgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblx0X3B1YmxpYy5uYXRpdmUuZGVmYXVsdChwYXRoLGRlZmVycmVkKTtcbn07XG5cbl9wdWJsaWMubmF0aXZlLmRlZmF1bHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblx0KGZ1bmN0aW9uKGRlZmVycmVkKXtcblx0XHRfcHJpdmF0ZS5uYXRpdmUuZ2V0KHBhdGgsZGVmZXJyZWQsZnVuY3Rpb24ocil7XG5cdFx0XHRpZihkZWZlcnJlZC50eXBlID09PSAnanNvbicpe1xuXHRcdFx0XHRyID0gSlNPTi5wYXJzZShyKTtcblx0XHRcdH1cblx0XHRcdGRlZmVycmVkLnJlc29sdmUocik7XG5cdFx0fSk7XG5cdH0pKGRlZmVycmVkKTtcbn07XG5cbl9wcml2YXRlLm5hdGl2ZS5nZXQgPSBmdW5jdGlvbiAocGF0aCxkZWZlcnJlZCxjYWxsYmFjayl7XG5cdHBhdGggPSBfcHJpdmF0ZS5uYXRpdmUucHJlcGFyZV9wYXRoKHBhdGgpO1xuXHRpZihwYXRoWzBdID09PSAnLicpe1xuXHRcdC8vZmlsZSBzeXN0ZW1cblx0XHR2YXIgRnMgPSByZXF1aXJlKCdmcycpO1xuXHRcdEZzLnJlYWRGaWxlKHBhdGgsIFwidXRmLThcIiwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuXHRcdFx0aWYgKGVycil7XG5cdFx0XHRcdHRocm93IGVycjtcblx0XHRcdH1cblx0XHRcdGVsc2V7XG5cdFx0XHRcdGNhbGxiYWNrKGRhdGEpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cdGVsc2V7XG5cdFx0Ly9odHRwXG5cdFx0dmFyIHJlcXVlc3QgPSByZXF1aXJlKCdyZXF1ZXN0Jyk7XG5cdFx0cmVxdWVzdChwYXRoLGZ1bmN0aW9uKGVycm9yLHJlc3BvbnNlLGJvZHkpe1xuXHRcdFx0aWYgKCFlcnJvciAmJiByZXNwb25zZS5zdGF0dXNDb2RlID09PSAyMDApIHtcblx0XHRcdFx0Y2FsbGJhY2soYm9keSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNle1xuXHRcdFx0XHR0aHJvdyBlcnJvcjtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxufTtcblxuX3ByaXZhdGUubmF0aXZlLnByZXBhcmVfcGF0aCA9IGZ1bmN0aW9uKHApe1xuXHRwID0gKHBbMF0gIT09ICcvJyAmJiBwWzBdICE9PSAnLicpXG5cdD8gKChwWzBdLmluZGV4T2YoXCJodHRwXCIpIT09MCkgPyAnLi8nICsgcCA6IHApIDogcDtcblx0cmV0dXJuIHA7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IF9wdWJsaWM7XG4iLCJ2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcbnZhciBfcHJpdmF0ZSA9IHJlcXVpcmUoJy4vcXVldWUucHJpdmF0ZS5qcycpO1xuXG4vKipcbiAqIEBuYW1lc3BhY2Ugb3JneS9xdWV1ZVxuICogQGJvcnJvd3Mgb3JneS9kZWZlcnJlZCN0aGVuIGFzICN0aGVuXG4gKiBAYm9ycm93cyBvcmd5L2RlZmVycmVkI2RvbmUgYXMgI2RvbmVcbiAqIEBib3Jyb3dzIG9yZ3kvZGVmZXJyZWQjcmVqZWN0IGFzICNyZWplY3RcbiAqIEBib3Jyb3dzIG9yZ3kvZGVmZXJyZWQjcmVzb2x2ZSBhcyAjcmVzb2x2ZVxuICpcbiovXG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBxdWV1ZSBvYmplY3QuXG4gKiBJZiBubyA8Yj5yZXNvbHZlcjwvYj4gb3B0aW9uIGlzIHNldCwgcmVzb2x2ZWQgd2hlbiBhbGwgZGVwZW5kZW5jaWVzIGFyZSByZXNvbHZlZC4gRWxzZSwgcmVzb2x2ZWQgd2hlbiB0aGUgZGVmZXJyZWQgcGFyYW0gcGFzc2VkIHRvIHRoZSByZXNvbHZlciBvcHRpb25cbiAqIGlzIHJlc29sdmVkLlxuXG4gPGI+VXNhZ2U6PC9iPlxuIGBgYFxuIHZhciBPcmd5ID0gcmVxdWlyZShcIm9yZ3lcIiksXG5cdFx0XHRcdHEgPSBPcmd5LnF1ZXVlKFtcblx0XHRcdFx0XHQge1xuXHRcdFx0XHRcdFx0IGNvbW1lbnQgOiBcIlRoaXMgaXMgYSBuZXN0ZWQgcXVldWUgY3JlYXRlZCBvbiB0aGUgZmx5LlwiXG5cdFx0XHRcdFx0XHQgLHR5cGUgOiBcImpzb25cIlxuXHRcdFx0XHRcdFx0ICx1cmwgOiBcIi9hcGkvanNvbi9zb21udW1zXCJcblx0XHRcdFx0XHRcdCAscmVzb2x2ZXIgOiBmdW5jdGlvbihyLGRlZmVycmVkKXtcblx0XHRcdFx0XHRcdFx0IC8vRmlsdGVyIG91dCBldmVuIG51bWJlcnNcblx0XHRcdFx0XHRcdFx0IHZhciBvZGQgPSBhcnIuZmlsdGVyKGZ1bmN0aW9uKHZhbCkge1xuXHRcdFx0XHRcdFx0XHRcdCByZXR1cm4gMCAhPSB2YWwgJSAyO1xuXHRcdFx0XHRcdFx0XHQgfSk7XG5cdFx0XHRcdFx0XHRcdCBkZWZlcnJlZC5yZXNvbHZlKG9kZCk7XG5cdFx0XHRcdFx0XHQgfVxuXHRcdFx0XHRcdCB9XG5cdFx0XHRcdCBdLHtcblx0XHRcdFx0XHQgaWQgOiBcInExXCIsXG5cdFx0XHRcdFx0IHJlc29sdmVyIDogZnVuY3Rpb24ocixkZWZlcnJlZCl7XG5cdFx0XHRcdFx0XHQgdmFyIHByaW1lcyA9IHJbMF0uZmlsdGVyKGZ1bmN0aW9uKHZhbCkge1xuXHRcdFx0XHRcdFx0XHQgaGlnaCA9IE1hdGguZmxvb3IoTWF0aC5zcXJ0KHZhbCkpICsgMTtcblx0XHRcdFx0XHRcdFx0IGZvciAodmFyIGRpdiA9IDI7IGRpdiA8PSBoaWdoOyBkaXYrKykge1xuXHRcdFx0XHRcdFx0XHRcdCBpZiAodmFsdWUgJSBkaXYgPT0gMCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0IHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHRcdFx0XHQgfVxuXHRcdFx0XHRcdFx0XHQgfVxuXHRcdFx0XHRcdFx0XHQgcmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHQgfSk7XG5cdFx0XHRcdFx0XHQgZGVmZXJyZWQucmVzb2x2ZShwcmltZXMpO1xuXHRcdFx0XHRcdCB9KVxuXHRcdFx0XHQgfSk7XG5cbiBgYGBcbiAqIEBtZW1iZXJvZiBvcmd5XG4gKiBAZnVuY3Rpb24gcXVldWVcbiAqXG4gKiBAcGFyYW0ge2FycmF5fSBkZXBzIEFycmF5IG9mIGRlcGVuZGVuY2llcyB0aGF0IG11c3QgYmUgcmVzb2x2ZWQgYmVmb3JlIDxiPnJlc29sdmVyPC9iPiBvcHRpb24gaXMgY2FsbGVkLlxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgIExpc3Qgb2Ygb3B0aW9uczpcblxuLSA8Yj5pZDwvYj4ge3N0cmluZ30gVW5pcXVlIGlkIG9mIHRoZSBvYmplY3QuXG5cdC0gQ2FuIGJlIHVzZWQgd2l0aCBPcmd5LmdldChpZCkuXG5cdC0gT3B0aW9uYWwuXG5cblxuLSA8Yj50aW1lb3V0PC9iPiB7bnVtYmVyfSBUaW1lIGluIG1zIGFmdGVyIHdoaWNoIHJlamVjdCBpcyBjYWxsZWQuXG5cdC0gRGVmYXVsdHMgdG8gT3JneS5jb25maWcoKS50aW1lb3V0IFs1MDAwXS5cblx0LSBOb3RlIHRoZSB0aW1lb3V0IGlzIG9ubHkgYWZmZWN0ZWQgYnkgZGVwZW5kZW5jaWVzIGFuZC9vciB0aGUgcmVzb2x2ZXIgY2FsbGJhY2suXG5cdC0gVGhlbixkb25lIGRlbGF5cyB3aWxsIG5vdCBmbGFnIGEgdGltZW91dCBiZWNhdXNlIHRoZXkgYXJlIGNhbGxlZCBhZnRlciB0aGUgaW5zdGFuY2UgaXMgY29uc2lkZXJlZCByZXNvbHZlZC5cblxuXG4tIDxiPnJlc29sdmVyPC9iPiB7ZnVuY3Rpb24oPGk+cmVzdWx0PC9pPiw8aT5kZWZlcnJlZDwvaT4pfSBDYWxsYmFjayBmdW5jdGlvbiB0byBleGVjdXRlIGFmdGVyIGFsbCBkZXBlbmRlbmNpZXMgaGF2ZSByZXNvbHZlZC5cblx0LSA8aT5yZXN1bHQ8L2k+IGlzIGFuIGFycmF5IG9mIHRoZSBxdWV1ZSdzIHJlc29sdmVkIGRlcGVuZGVuY3kgdmFsdWVzLlxuXHQtIDxpPmRlZmVycmVkPC9pPiBpcyB0aGUgcXVldWUgb2JqZWN0LlxuXHQtIFRoZSBxdWV1ZSB3aWxsIG9ubHkgcmVzb2x2ZSB3aGVuIDxpPmRlZmVycmVkPC9pPi5yZXNvbHZlKCkgaXMgY2FsbGVkLiBJZiBub3QsIGl0IHdpbGwgdGltZW91dCB0byBvcHRpb25zLnRpbWVvdXQgfHwgT3JneS5jb25maWcoKS50aW1lb3V0LlxuXG5cdCogQHJldHVybnMge29iamVjdH0ge0BsaW5rIG9yZ3kvcXVldWV9XG4gKlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGRlcHMsb3B0aW9ucyl7XG5cblx0dmFyIF9vO1xuXHRpZighKGRlcHMgaW5zdGFuY2VvZiBBcnJheSkpe1xuXHRcdHJldHVybiBDb25maWcuZGVidWcoXCJRdWV1ZSBkZXBlbmRlbmNpZXMgbXVzdCBiZSBhbiBhcnJheS5cIik7XG5cdH1cblxuXHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXHQvL0RPRVMgTk9UIEFMUkVBRFkgRVhJU1Rcblx0aWYoIUNvbmZpZy5saXN0W29wdGlvbnMuaWRdKXtcblxuXHRcdHZhciBEZWZlcnJlZFNjaGVtYSA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuc2NoZW1hLmpzJykoKTtcblx0XHR2YXIgUXVldWVTY2hlbWEgPSByZXF1aXJlKCcuL3F1ZXVlLnNjaGVtYS5qcycpKCk7XG5cblx0XHQvL1Bhc3MgYXJyYXkgb2YgcHJvdG90eXBlcyB0byBxdWV1ZSBmYWN0b3J5XG5cdFx0X28gPSBfcHJpdmF0ZS5mYWN0b3J5KFtEZWZlcnJlZFNjaGVtYSxRdWV1ZVNjaGVtYV0sW29wdGlvbnNdKTtcblxuXHRcdC8vQWN0aXZhdGUgcXVldWVcblx0XHRfbyA9IF9wcml2YXRlLmFjdGl2YXRlKF9vLG9wdGlvbnMsZGVwcyk7XG5cblx0fVxuXHQvL0FMUkVBRFkgRVhJU1RTXG5cdGVsc2Uge1xuXG5cdFx0X28gPSBDb25maWcubGlzdFtvcHRpb25zLmlkXTtcblxuXHRcdGlmKF9vLm1vZGVsICE9PSAncXVldWUnKXtcblx0XHQvL01BVENIIEZPVU5EIEJVVCBOT1QgQSBRVUVVRSwgVVBHUkFERSBUTyBPTkVcblxuXHRcdFx0b3B0aW9ucy5vdmVyd3JpdGFibGUgPSAxO1xuXG5cdFx0XHRfbyA9IF9wcml2YXRlLnVwZ3JhZGUoX28sb3B0aW9ucyxkZXBzKTtcblx0XHR9XG5cdFx0ZWxzZXtcblxuXHRcdFx0Ly9PVkVSV1JJVEUgQU5ZIEVYSVNUSU5HIE9QVElPTlNcblx0XHRcdG9wdGlvbnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSxrZXkpe1xuXHRcdFx0XHRfb1trZXldID0gdmFsdWU7IFxuXHRcdFx0fSk7XG5cblx0XHRcdC8vQUREIEFERElUSU9OQUwgREVQRU5ERU5DSUVTIElGIE5PVCBSRVNPTFZFRFxuXHRcdFx0aWYoZGVwcy5sZW5ndGggPiAwKXtcblx0XHRcdFx0X3ByaXZhdGUudHBsLmFkZC5jYWxsKF9vLGRlcHMpO1xuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0Ly9SRVNVTUUgUkVTT0xVVElPTiBVTkxFU1MgU1BFQ0lGSUVEIE9USEVSV0lTRVxuXHRcdF9vLmhhbHRfcmVzb2x1dGlvbiA9ICh0eXBlb2Ygb3B0aW9ucy5oYWx0X3Jlc29sdXRpb24gIT09ICd1bmRlZmluZWQnKSA/XG5cdFx0b3B0aW9ucy5oYWx0X3Jlc29sdXRpb24gOiAwO1xuXHR9XG5cblx0cmV0dXJuIF9vO1xufTtcbiIsInZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xudmFyIFF1ZXVlU2NoZW1hID0gcmVxdWlyZSgnLi9xdWV1ZS5zY2hlbWEuanMnKSgpO1xudmFyIF9wcm90byA9IHJlcXVpcmUoJy4vZGVmZXJyZWQucHJpdmF0ZS5qcycpO1xudmFyIF9wdWJsaWMgPSBPYmplY3QuY3JlYXRlKF9wcm90byx7fSk7XG5cblxuLyoqXG4gKiBBY3RpdmF0ZXMgYSBxdWV1ZSBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9cbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gKiBAcGFyYW0ge2FycmF5fSBkZXBzXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBxdWV1ZVxuICovXG5fcHVibGljLmFjdGl2YXRlID0gZnVuY3Rpb24obyxvcHRpb25zLGRlcHMpe1xuXG5cdFx0Ly9BQ1RJVkFURSBBUyBBIERFRkVSUkVEXG5cdFx0Ly92YXIgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodGhpcyk7XG5cdFx0byA9IF9wcm90by5hY3RpdmF0ZShvKTtcblxuXHRcdC8vQHRvZG8gcmV0aGluayB0aGlzXG5cdFx0Ly9UaGlzIHRpbWVvdXQgZ2l2ZXMgZGVmaW5lZCBwcm9taXNlcyB0aGF0IGFyZSBkZWZpbmVkXG5cdFx0Ly9mdXJ0aGVyIGRvd24gdGhlIHNhbWUgc2NyaXB0IGEgY2hhbmNlIHRvIGRlZmluZSB0aGVtc2VsdmVzXG5cdFx0Ly9hbmQgaW4gY2FzZSB0aGlzIHF1ZXVlIGlzIGFib3V0IHRvIHJlcXVlc3QgdGhlbSBmcm9tIGFcblx0XHQvL3JlbW90ZSBzb3VyY2UgaGVyZS5cblx0XHQvL1RoaXMgaXMgaW1wb3J0YW50IGluIHRoZSBjYXNlIG9mIGNvbXBpbGVkIGpzIGZpbGVzIHRoYXQgY29udGFpblxuXHRcdC8vbXVsdGlwbGUgbW9kdWxlcyB3aGVuIGRlcGVuZCBvbiBlYWNoIG90aGVyLlxuXG5cdFx0Ly90ZW1wb3JhcmlseSBjaGFuZ2Ugc3RhdGUgdG8gcHJldmVudCBvdXRzaWRlIHJlc29sdXRpb25cblx0XHRvLnN0YXRlID0gLTE7XG5cblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cblx0XHRcdC8vUmVzdG9yZSBzdGF0ZVxuXHRcdFx0by5zdGF0ZSA9IDA7XG5cblx0XHRcdC8vQUREIERFUEVOREVOQ0lFUyBUTyBRVUVVRVxuXHRcdFx0UXVldWVTY2hlbWEuYWRkLmNhbGwobyxkZXBzKTtcblxuXHRcdFx0Ly9TRUUgSUYgQ0FOIEJFIElNTUVESUFURUxZIFJFU09MVkVEIEJZIENIRUNLSU5HIFVQU1RSRUFNXG5cdFx0XHRzZWxmLnJlY2VpdmVfc2lnbmFsKG8sby5pZCk7XG5cblx0XHRcdC8vQVNTSUdOIFRISVMgUVVFVUUgVVBTVFJFQU0gVE8gT1RIRVIgUVVFVUVTXG5cdFx0XHRpZihvLmFzc2lnbil7XG5cdFx0XHRcdFx0Zm9yKHZhciBhIGluIG8uYXNzaWduKXtcblx0XHRcdFx0XHRcdFx0c2VsZi5hc3NpZ24oby5hc3NpZ25bYV0sW29dLHRydWUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LDEpO1xuXG5cdFx0cmV0dXJuIG87XG59O1xuXG5cbi8qKlxuKiBVcGdyYWRlcyBhIHByb21pc2Ugb2JqZWN0IHRvIGEgcXVldWUuXG4qXG4qIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiogQHBhcmFtIHthcnJheX0gZGVwcyBcXGRlcGVuZGVuY2llc1xuKiBAcmV0dXJucyB7b2JqZWN0fSBxdWV1ZSBvYmplY3RcbiovXG5fcHVibGljLnVwZ3JhZGUgPSBmdW5jdGlvbihvYmosb3B0aW9ucyxkZXBzKXtcblxuXHRcdGlmKG9iai5zZXR0bGVkICE9PSAwIHx8IChvYmoubW9kZWwgIT09ICdwcm9taXNlJyAmJiBvYmoubW9kZWwgIT09ICdkZWZlcnJlZCcpKXtcblx0XHRcdFx0cmV0dXJuIENvbmZpZy5kZWJ1ZygnQ2FuIG9ubHkgdXBncmFkZSB1bnNldHRsZWQgcHJvbWlzZSBvciBkZWZlcnJlZCBpbnRvIGEgcXVldWUuJyk7XG5cdFx0fVxuXG5cdCAvL0dFVCBBIE5FVyBRVUVVRSBPQkpFQ1QgQU5EIE1FUkdFIElOXG5cdFx0dmFyIF9vID0gQ29uZmlnLm5haXZlX2Nsb25lcihbXG5cdFx0XHRcdFF1ZXVlU2NoZW1hXG5cdFx0XHRcdCxvcHRpb25zXG5cdFx0XSk7XG5cblx0XHRmb3IodmFyIGkgaW4gX28pe1xuXHRcdFx0IG9ialtpXSA9IF9vW2ldO1xuXHRcdH1cblxuXHRcdC8vZGVsZXRlIF9vO1xuXG5cdFx0Ly9DUkVBVEUgTkVXIElOU1RBTkNFIE9GIFFVRVVFXG5cdFx0b2JqID0gdGhpcy5hY3RpdmF0ZShvYmosb3B0aW9ucyxkZXBzKTtcblxuXHRcdC8vUkVUVVJOIFFVRVVFIE9CSkVDVFxuXHRcdHJldHVybiBvYmo7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gX3B1YmxpYztcbiIsInZhciBzY2hlbWEgPSBmdW5jdGlvbigpe1xuXG5cdHZhciBfcHJpdmF0ZSA9IHRoaXMsXG5cdFx0XHRfcHVibGljID0ge307XG5cblx0X3ByaXZhdGUuY29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKSxcblxuXHR0aGlzLmdldCA9IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuIF9wdWJsaWM7XG5cdH07XG5cblx0X3B1YmxpYy5tb2RlbCA9ICdxdWV1ZSc7XG5cblx0Ly9TRVQgVFJVRSBBRlRFUiBSRVNPTFZFUiBGSVJFRFxuXHRfcHVibGljLnJlc29sdmVyX2ZpcmVkID0gMDtcblxuXHQvL1BSRVZFTlRTIEEgUVVFVUUgRlJPTSBSRVNPTFZJTkcgRVZFTiBJRiBBTEwgREVQRU5ERU5DSUVTIE1FVFxuXHQvL1BVUlBPU0U6IFBSRVZFTlRTIFFVRVVFUyBDUkVBVEVEIEJZIEFTU0lHTk1FTlQgRlJPTSBSRVNPTFZJTkdcblx0Ly9CRUZPUkUgVEhFWSBBUkUgRk9STUFMTFkgSU5TVEFOVElBVEVEXG5cdF9wdWJsaWMuaGFsdF9yZXNvbHV0aW9uID0gMDtcblxuXHQvL1VTRUQgVE8gQ0hFQ0sgU1RBVEUsIEVOU1VSRVMgT05FIENPUFlcblx0X3B1YmxpYy51cHN0cmVhbSA9IHt9O1xuXG5cdC8vVVNFRCBSRVRVUk4gVkFMVUVTLCBFTlNVUkVTIE9SREVSXG5cdF9wdWJsaWMuZGVwZW5kZW5jaWVzID0gW107XG5cblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cdC8vICBRVUVVRSBJTlNUQU5DRSBNRVRIT0RTXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cdC8qKlxuXHQqIEFkZCBsaXN0IG9mIGRlcGVuZGVuY2llcyB0byBhIHF1ZXVlJ3MgdXBzdHJlYW0gYXJyYXkuXG5cdCpcblx0KiBUaGUgcXVldWUgd2lsbCByZXNvbHZlIG9uY2UgYWxsIHRoZSBwcm9taXNlcyBpbiBpdHNcblx0KiB1cHN0cmVhbSBhcnJheSBhcmUgcmVzb2x2ZWQuXG5cdCpcblx0KiBXaGVuIF9wdWJsaWMuX3ByaXZhdGUuY29uZmlnLmRlYnVnID09IDEsIG1ldGhvZCB3aWxsIHRlc3QgZWFjaFxuXHQqIGRlcGVuZGVuY3kgaXMgbm90IHByZXZpb3VzbHkgc2NoZWR1bGVkIHRvIHJlc29sdmVcblx0KiBkb3duc3RyZWFtIGZyb20gdGhlIHRhcmdldCwgaW4gd2hpY2hcblx0KiBjYXNlIGl0IHdvdWxkIG5ldmVyIHJlc29sdmUgYmVjYXVzZSBpdHMgdXBzdHJlYW0gZGVwZW5kcyBvbiBpdC5cblx0KlxuXHQqIEBwYXJhbSB7YXJyYXl9IGFyciAgL2FycmF5IG9mIGRlcGVuZGVuY2llcyB0byBhZGRcblx0KiBAcmV0dXJucyB7YXJyYXl9IHVwc3RyZWFtXG5cdCovXG5cdF9wdWJsaWMuYWRkID0gZnVuY3Rpb24oYXJyKXtcblxuXHRcdHZhciBfZGVmZXJyZWRfcHJpdmF0ZSA9IHJlcXVpcmUoJy4vcXVldWUucHJpdmF0ZS5qcycpO1xuXG5cdFx0dHJ5e1xuXHRcdFx0XHRpZihhcnIubGVuZ3RoID09PSAwKSByZXR1cm4gdGhpcy51cHN0cmVhbTtcblx0XHR9XG5cdFx0Y2F0Y2goZXJyKXtcblx0XHRcdFx0X3ByaXZhdGUuY29uZmlnLmRlYnVnKGVycik7XG5cdFx0fVxuXG5cdFx0Ly9JRiBOT1QgUEVORElORywgRE8gTk9UIEFMTE9XIFRPIEFERFxuXHRcdGlmKHRoaXMuc3RhdGUgIT09IDApe1xuXHRcdFx0XHRyZXR1cm4gX3ByaXZhdGUuY29uZmlnLmRlYnVnKFtcblx0XHRcdFx0XHRcIkNhbm5vdCBhZGQgZGVwZW5kZW5jeSBsaXN0IHRvIHF1ZXVlIGlkOidcIit0aGlzLmlkXG5cdFx0XHRcdFx0K1wiJy4gUXVldWUgc2V0dGxlZC9pbiB0aGUgcHJvY2VzcyBvZiBiZWluZyBzZXR0bGVkLlwiXG5cdFx0XHRcdF0sYXJyLHRoaXMpO1xuXHRcdH1cblxuXHRcdGZvcih2YXIgYSBpbiBhcnIpe1xuXG5cdFx0XHRcdHN3aXRjaCh0cnVlKXtcblxuXHRcdFx0XHRcdFx0Ly9DSEVDSyBJRiBFWElTVFNcblx0XHRcdFx0XHRcdGNhc2UodHlwZW9mIF9wcml2YXRlLmNvbmZpZy5saXN0W2FyclthXS5pZF0gPT09ICdvYmplY3QnKTpcblx0XHRcdFx0XHRcdFx0XHRhcnJbYV0gPSBfcHJpdmF0ZS5jb25maWcubGlzdFthcnJbYV0uaWRdO1xuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHQvL0lGIE5PVCwgQVRURU1QVCBUTyBDT05WRVJUIElUIFRPIEFOIE9SR1kgUFJPTUlTRVxuXHRcdFx0XHRcdFx0Y2FzZSh0eXBlb2YgYXJyW2FdID09PSAnb2JqZWN0JyAmJiAoIWFyclthXS5pc19vcmd5KSk6XG5cdFx0XHRcdFx0XHRcdFx0YXJyW2FdID0gX2RlZmVycmVkX3ByaXZhdGUuY29udmVydF90b19wcm9taXNlKGFyclthXSx7XG5cdFx0XHRcdFx0XHRcdFx0XHRwYXJlbnQgOiB0aGlzXG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdC8vUkVGIElTIEEgUFJPTUlTRS5cblx0XHRcdFx0XHRcdGNhc2UodHlwZW9mIGFyclthXS50aGVuID09PSAnZnVuY3Rpb24nKTpcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFwiT2JqZWN0IGNvdWxkIG5vdCBiZSBjb252ZXJ0ZWQgdG8gcHJvbWlzZS5cIik7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihhcnJbYV0pO1xuXHRcdFx0XHRcdFx0XHRcdGRlYnVnZ2VyO1xuXHRcdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly9tdXN0IGNoZWNrIHRoZSB0YXJnZXQgdG8gc2VlIGlmIHRoZSBkZXBlbmRlbmN5IGV4aXN0cyBpbiBpdHMgZG93bnN0cmVhbVxuXHRcdFx0XHRmb3IodmFyIGIgaW4gdGhpcy5kb3duc3RyZWFtKXtcblx0XHRcdFx0XHRcdGlmKGIgPT09IGFyclthXS5pZCl7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIF9wcml2YXRlLmNvbmZpZy5kZWJ1ZyhbXG5cdFx0XHRcdFx0XHRcdFx0XHRcIkVycm9yIGFkZGluZyB1cHN0cmVhbSBkZXBlbmRlbmN5ICdcIlxuXHRcdFx0XHRcdFx0XHRcdFx0K2FyclthXS5pZCtcIicgdG8gcXVldWVcIitcIiAnXCJcblx0XHRcdFx0XHRcdFx0XHRcdCt0aGlzLmlkK1wiJy5cXG4gUHJvbWlzZSBvYmplY3QgZm9yICdcIlxuXHRcdFx0XHRcdFx0XHRcdFx0K2FyclthXS5pZCtcIicgaXMgc2NoZWR1bGVkIHRvIHJlc29sdmUgZG93bnN0cmVhbSBmcm9tIHF1ZXVlICdcIlxuXHRcdFx0XHRcdFx0XHRcdFx0K3RoaXMuaWQrXCInIHNvIGl0IGNhbid0IGJlIGFkZGVkIHVwc3RyZWFtLlwiXG5cdFx0XHRcdFx0XHRcdFx0XVxuXHRcdFx0XHRcdFx0XHRcdCx0aGlzKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vQUREIFRPIFVQU1RSRUFNLCBET1dOU1RSRUFNLCBERVBFTkRFTkNJRVNcblx0XHRcdFx0dGhpcy51cHN0cmVhbVthcnJbYV0uaWRdID0gYXJyW2FdO1xuXHRcdFx0XHRhcnJbYV0uZG93bnN0cmVhbVt0aGlzLmlkXSA9IHRoaXM7XG5cdFx0XHRcdHRoaXMuZGVwZW5kZW5jaWVzLnB1c2goYXJyW2FdKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy51cHN0cmVhbTtcblx0fTtcblxuXHQvKipcblx0KiBSZW1vdmUgbGlzdCBmcm9tIGEgcXVldWUuXG5cdCpcblx0KiBAcGFyYW0ge2FycmF5fSBhcnJcblx0KiBAcmV0dXJucyB7YXJyYXl9IGFycmF5IG9mIGxpc3QgdGhlIHF1ZXVlIGlzIHVwc3RyZWFtXG5cdCovXG5cdF9wdWJsaWMucmVtb3ZlID0gZnVuY3Rpb24oYXJyKXtcblxuXHRcdC8vSUYgTk9UIFBFTkRJTkcsIERPIE5PVCBBTExPVyBSRU1PVkFMXG5cdFx0aWYodGhpcy5zdGF0ZSAhPT0gMCl7XG5cdFx0XHRcdHJldHVybiBfcHJpdmF0ZS5jb25maWcuZGVidWcoXCJDYW5ub3QgcmVtb3ZlIGxpc3QgZnJvbSBxdWV1ZSBpZDonXCIrdGhpcy5pZCtcIicuIFF1ZXVlIHNldHRsZWQvaW4gdGhlIHByb2Nlc3Mgb2YgYmVpbmcgc2V0dGxlZC5cIik7XG5cdFx0fVxuXG5cdFx0Zm9yKHZhciBhIGluIGFycil7XG5cdFx0XHRpZih0aGlzLnVwc3RyZWFtW2FyclthXS5pZF0pe1xuXHRcdFx0XHRcdGRlbGV0ZSB0aGlzLnVwc3RyZWFtW2FyclthXS5pZF07XG5cdFx0XHRcdFx0ZGVsZXRlIGFyclthXS5kb3duc3RyZWFtW3RoaXMuaWRdO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHQvKipcblx0KiBSZXNldHMgYW4gZXhpc3Rpbmcsc2V0dGxlZCBxdWV1ZSBiYWNrIHRvIE9yZ3lpbmcgc3RhdGUuXG5cdCogQ2xlYXJzIG91dCB0aGUgZG93bnN0cmVhbS5cblx0KiBGYWlscyBpZiBub3Qgc2V0dGxlZC5cblx0KiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuXHQqIEByZXR1cm5zIHtfZGVmZXJyZWRfcHJpdmF0ZS50cGx8Qm9vbGVhbn1cblx0Ki9cblx0X3B1YmxpYy5yZXNldCA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuXG5cdFx0dmFyIF9kZWZlcnJlZF9wcml2YXRlID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5wcml2YXRlLmpzJyk7XG5cblx0XHRpZih0aGlzLnNldHRsZWQgIT09IDEgfHwgdGhpcy5zdGF0ZSAhPT0gMSl7XG5cdFx0XHRyZXR1cm4gX3ByaXZhdGUuY29uZmlnLmRlYnVnKFwiQ2FuIG9ubHkgcmVzZXQgYSBxdWV1ZSBzZXR0bGVkIHdpdGhvdXQgZXJyb3JzLlwiKTtcblx0XHR9XG5cblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXHRcdHRoaXMuc2V0dGxlZCA9IDA7XG5cdFx0dGhpcy5zdGF0ZSA9IDA7XG5cdFx0dGhpcy5yZXNvbHZlcl9maXJlZCA9IDA7XG5cdFx0dGhpcy5kb25lX2ZpcmVkID0gMDtcblxuXHRcdC8vUkVNT1ZFIEFVVE8gVElNRU9VVCBUSU1FUlxuXHRcdGlmKHRoaXMudGltZW91dF9pZCl7XG5cdFx0XHRjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0X2lkKTtcblx0XHR9XG5cblx0XHQvL0NMRUFSIE9VVCBUSEUgRE9XTlNUUkVBTVxuXHRcdHRoaXMuZG93bnN0cmVhbSA9IHt9O1xuXHRcdHRoaXMuZGVwZW5kZW5jaWVzID0gW107XG5cblx0XHQvL1NFVCBORVcgQVVUTyBUSU1FT1VUXG5cdFx0X2RlZmVycmVkX3ByaXZhdGUuYXV0b190aW1lb3V0LmNhbGwodGhpcyxvcHRpb25zLnRpbWVvdXQpO1xuXG5cdFx0Ly9QT0lOVExFU1MgLSBXSUxMIEpVU1QgSU1NRURJQVRFTFkgUkVTT0xWRSBTRUxGXG5cdFx0Ly90aGlzLmNoZWNrX3NlbGYoKVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblxuXHQvKipcblx0KiBDYXVhZXMgYSBxdWV1ZSB0byBsb29rIG92ZXIgaXRzIGRlcGVuZGVuY2llcyBhbmQgc2VlIGlmIGl0XG5cdCogY2FuIGJlIHJlc29sdmVkLlxuXHQqXG5cdCogVGhpcyBpcyBkb25lIGF1dG9tYXRpY2FsbHkgYnkgZWFjaCBkZXBlbmRlbmN5IHRoYXQgbG9hZHMsXG5cdCogc28gaXMgbm90IG5lZWRlZCB1bmxlc3M6XG5cdCpcblx0KiAtZGVidWdnaW5nXG5cdCpcblx0KiAtdGhlIHF1ZXVlIGhhcyBiZWVuIHJlc2V0IGFuZCBubyBuZXdcblx0KiBkZXBlbmRlbmNpZXMgd2VyZSBzaW5jZSBhZGRlZC5cblx0KlxuXHQqIEByZXR1cm5zIHtpbnR9IFN0YXRlIG9mIHRoZSBxdWV1ZS5cblx0Ki9cblx0X3B1YmxpYy5jaGVja19zZWxmID0gZnVuY3Rpb24oKXtcblx0XHR2YXIgX2RlZmVycmVkX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcblx0XHRfZGVmZXJyZWRfcHJpdmF0ZS5yZWNlaXZlX3NpZ25hbCh0aGlzLHRoaXMuaWQpO1xuXHRcdHJldHVybiB0aGlzLnN0YXRlO1xuXHR9O1xufTtcblxudmFyIGZhY3RvcnkgPSBmdW5jdGlvbigpe1xuXHR2YXIgbyA9IG5ldyBzY2hlbWEoKTtcblx0cmV0dXJuIG8uZ2V0KCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZhY3Rvcnk7XG4iLCJ2YXIgRGVmZXJyZWQgPSByZXF1aXJlKCcuL2RlZmVycmVkLmpzJyksXG5cdFx0UXVldWUgPSByZXF1aXJlKCcuL3F1ZXVlLmpzJyksXG5cdFx0Q2FzdCA9IHJlcXVpcmUoJy4vY2FzdC5qcycpLFxuXHRcdENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4vKipcbiAqIEBuYW1lc3BhY2Ugb3JneVxuICovXG5cbi8qKlxuKiBDcmVhdGVzIGEgbmV3IGRlZmVycmVkIGZyb20gYSB2YWx1ZSBhbmQgYW4gaWQgYW5kIGF1dG9tYXRpY2FsbHlcbiogcmVzb2x2ZXMgaXQuXG4qXG4qIEBtZW1iZXJvZiBvcmd5XG4qIEBmdW5jdGlvbiBkZWZpbmVcbipcbiogQHBhcmFtIHtzdHJpbmd9IGlkIEEgdW5pcXVlIGlkIHlvdSBnaXZlIHRvIHRoZSBvYmplY3RcbiogQHBhcmFtIHttaXhlZH0gIGRhdGEgVGhlIHZhbHVlIHRoYXQgdGhlIG9iamVjdCBpcyBhc3NpZ25lZFxuKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuLSA8Yj5kZXBlbmRlbmNpZXM8L2I+IHthcnJheX1cbi0gPGI+cmVzb2x2ZXI8L2I+IHtmdW5jdGlvbig8aT5hc3NpZ25lZFZhbHVlPC9pPiw8aT5kZWZlcnJlZDwvaT59XG4qIEByZXR1cm5zIHtvYmplY3R9IHJlc29sdmVkIGRlZmVycmVkXG4qL1xuZGVmaW5lIDogZnVuY3Rpb24oaWQsZGF0YSxvcHRpb25zKXtcblxuXHRcdHZhciBkZWY7XG5cdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cdFx0b3B0aW9ucy5kZXBlbmRlbmNpZXMgPSBvcHRpb25zLmRlcGVuZGVuY2llcyB8fCBudWxsO1xuXHRcdG9wdGlvbnMucmVzb2x2ZXIgPSBvcHRpb25zLnJlc29sdmVyIHx8IG51bGw7XG5cblx0XHQvL3Rlc3QgZm9yIGEgdmFsaWQgaWRcblx0XHRpZih0eXBlb2YgaWQgIT09ICdzdHJpbmcnKXtcblx0XHRcdENvbmZpZy5kZWJ1ZyhcIk11c3Qgc2V0IGlkIHdoZW4gZGVmaW5pbmcgYW4gaW5zdGFuY2UuXCIpO1xuXHRcdH1cblxuXHRcdC8vQ2hlY2sgbm8gZXhpc3RpbmcgaW5zdGFuY2UgZGVmaW5lZCB3aXRoIHNhbWUgaWRcblx0XHRpZihDb25maWcubGlzdFtpZF0gJiYgQ29uZmlnLmxpc3RbaWRdLnNldHRsZWQgPT09IDEpe1xuXHRcdFx0cmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkNhbid0IGRlZmluZSBcIiArIGlkICsgXCIuIEFscmVhZHkgcmVzb2x2ZWQuXCIpO1xuXHRcdH1cblxuXHRcdG9wdGlvbnMuaWQgPSBpZDtcblxuXHRcdGlmKG9wdGlvbnMuZGVwZW5kZW5jaWVzICE9PSBudWxsXG5cdFx0XHQmJiBvcHRpb25zLmRlcGVuZGVuY2llcyBpbnN0YW5jZW9mIEFycmF5KXtcblx0XHRcdC8vRGVmaW5lIGFzIGEgcXVldWUgLSBjYW4ndCBhdXRvcmVzb2x2ZSBiZWNhdXNlIHdlIGhhdmUgZGVwc1xuXHRcdFx0dmFyIGRlcHMgPSBvcHRpb25zLmRlcGVuZGVuY2llcztcblx0XHRcdGRlbGV0ZSBvcHRpb25zLmRlcGVuZGVuY2llcztcblx0XHRcdGRlZiA9IFF1ZXVlKGRlcHMsb3B0aW9ucyk7XG5cdFx0fVxuXHRcdGVsc2V7XG5cdFx0XHQvL0RlZmluZSBhcyBhIGRlZmVycmVkXG5cdFx0XHRkZWYgPSBEZWZlcnJlZChvcHRpb25zKTtcblxuXHRcdFx0Ly9UcnkgdG8gaW1tZWRpYXRlbHkgc2V0dGxlIFtkZWZpbmVdXG5cdFx0XHRpZihvcHRpb25zLnJlc29sdmVyID09PSBudWxsXG5cdFx0XHRcdCYmICh0eXBlb2Ygb3B0aW9ucy5hdXRvcmVzb2x2ZSAhPT0gJ2Jvb2xlYW4nXG5cdFx0XHRcdHx8IG9wdGlvbnMuYXV0b3Jlc29sdmUgPT09IHRydWUpKXtcblx0XHRcdFx0Ly9wcmV2ZW50IGZ1dHVyZSBhdXRvcmVzb3ZlIGF0dGVtcHRzIFtpLmUuIGZyb20geGhyIHJlc3BvbnNlXVxuXHRcdFx0XHRkZWYuYXV0b3Jlc29sdmUgPSBmYWxzZTtcblx0XHRcdFx0ZGVmLnJlc29sdmUoZGF0YSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGRlZjtcbn0sXG5cblxuLyoqXG4gKiBHZXRzIGFuIGV4aXNpdGluZyBkZWZlcnJlZCAvIHF1ZXVlIG9iamVjdCBmcm9tIGdsb2JhbCBzdG9yZS5cbiAqIFJldHVybnMgbnVsbCBpZiBub25lIGZvdW5kLlxuICpcbiAqIEBtZW1iZXJvZiBvcmd5XG4gKiBAZnVuY3Rpb24gZ2V0XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGlkIElkIG9mIGRlZmVycmVkIG9yIHF1ZXVlIG9iamVjdC5cbiAqIEByZXR1cm5zIHtvYmplY3R9IGRlZmVycmVkIHwgcXVldWUgfCBudWxsXG4gKi9cbmdldCA6IGZ1bmN0aW9uKGlkKXtcblx0aWYoQ29uZmlnLmxpc3RbaWRdKXtcblx0XHRyZXR1cm4gQ29uZmlnLmxpc3RbaWRdO1xuXHR9XG5cdGVsc2V7XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cbn0sXG5cblxuLyoqXG4gKiBBZGQvcmVtb3ZlIGFuIHVwc3RyZWFtIGRlcGVuZGVuY3kgdG8vZnJvbSBhIHF1ZXVlLlxuICpcbiAqIENhbiB1c2UgYSBxdWV1ZSBpZCwgZXZlbiBmb3IgYSBxdWV1ZSB0aGF0IGlzIHlldCB0byBiZSBjcmVhdGVkLlxuICpcbiAqIEBtZW1iZXJvZiBvcmd5XG4gKiBAZnVuY3Rpb24gYXNzaWduXG4gKlxuICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSB0Z3QgUXVldWUgaWQgLyBxdWV1ZSBvYmplY3RcbiAqIEBwYXJhbSB7YXJyYXl9ICBhcnIgIEFycmF5IG9mIHByb21pc2UgaWRzIG9yIGRlcGVuZGVuY3kgb2JqZWN0c1xuICogQHBhcmFtIHtib29sZWFufSBhZGQgIElmIHRydWUgPGI+QUREPC9iPiBhcnJheSB0byBxdWV1ZSBkZXBlbmRlbmNpZXMsIElmIGZhbHNlIDxiPlJFTU9WRTwvYj4gYXJyYXkgZnJvbSBxdWV1ZSBkZXBlbmRlbmNpZXNcbiAqXG4gKiBAcmV0dXJuIHtvYmplY3R9IHF1ZXVlXG4gKi9cbmFzc2lnbiA6IGZ1bmN0aW9uKHRndCxhcnIsYWRkKXtcblxuXHRcdGFkZCA9ICh0eXBlb2YgYWRkID09PSBcImJvb2xlYW5cIikgPyBhZGQgOiAxO1xuXG5cdFx0dmFyIGlkLHE7XG5cdFx0c3dpdGNoKHRydWUpe1xuXHRcdFx0XHRjYXNlKHR5cGVvZiB0Z3QgPT09ICdvYmplY3QnICYmIHR5cGVvZiB0Z3QudGhlbiA9PT0gJ2Z1bmN0aW9uJyk6XG5cdFx0XHRcdFx0XHRpZCA9IHRndC5pZDtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlKHR5cGVvZiB0Z3QgPT09ICdzdHJpbmcnKTpcblx0XHRcdFx0XHRcdGlkID0gdGd0O1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRyZXR1cm4gQ29uZmlnLmRlYnVnKFwiQXNzaWduIHRhcmdldCBtdXN0IGJlIGEgcXVldWUgb2JqZWN0IG9yIHRoZSBpZCBvZiBhIHF1ZXVlLlwiLHRoaXMpO1xuXHRcdH1cblxuXHRcdC8vSUYgVEFSR0VUIEFMUkVBRFkgTElTVEVEXG5cdFx0aWYoQ29uZmlnLmxpc3RbaWRdICYmIENvbmZpZy5saXN0W2lkXS5tb2RlbCA9PT0gJ3F1ZXVlJyl7XG5cdFx0XHRcdHEgPSBDb25maWcubGlzdFtpZF07XG5cblx0XHRcdFx0Ly89PiBBREQgVE8gUVVFVUUnUyBVUFNUUkVBTVxuXHRcdFx0XHRpZihhZGQpe1xuXHRcdFx0XHRcdFx0cS5hZGQoYXJyKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLz0+IFJFTU9WRSBGUk9NIFFVRVVFJ1MgVVBTVFJFQU1cblx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRcdHEucmVtb3ZlKGFycik7XG5cdFx0XHRcdH1cblx0XHR9XG5cdFx0Ly9DUkVBVEUgTkVXIFFVRVVFIEFORCBBREQgREVQRU5ERU5DSUVTXG5cdFx0ZWxzZSBpZihhZGQpe1xuXHRcdFx0XHRxID0gUXVldWUoYXJyLHtcblx0XHRcdFx0XHRcdGlkIDogaWRcblx0XHRcdFx0fSk7XG5cdFx0fVxuXHRcdC8vRVJST1I6IENBTidUIFJFTU9WRSBGUk9NIEEgUVVFVUUgVEhBVCBET0VTIE5PVCBFWElTVFxuXHRcdGVsc2V7XG5cdFx0XHRcdHJldHVybiBDb25maWcuZGVidWcoXCJDYW5ub3QgcmVtb3ZlIGRlcGVuZGVuY2llcyBmcm9tIGEgcXVldWUgdGhhdCBkb2VzIG5vdCBleGlzdC5cIix0aGlzKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcTtcbn0sXG5cbi8qKlxuKiBEb2N1bWVudGVkIGluIHJlcXVpcmVkIGZpbGUuXG4qIEBpZ25vcmVcbiovXG5kZWZlcnJlZCA6IERlZmVycmVkLFxuXG4vKipcbiogRG9jdW1lbnRlZCBpbiByZXF1aXJlZCBmaWxlLlxuKiBAaWdub3JlXG4qL1xucXVldWUgOiBRdWV1ZSxcblxuLyoqXG4qIERvY3VtZW50ZWQgaW4gcmVxdWlyZWQgZmlsZS5cbiogQGlnbm9yZVxuKi9cbmNhc3QgOiBDYXN0LFxuXG4vKipcbiogRG9jdW1lbnRlZCBpbiByZXF1aXJlZCBmaWxlLlxuKiBAaWdub3JlXG4qL1xuY29uZmlnIDogQ29uZmlnLmNvbmZpZ1xuXG59O1xuIl19
