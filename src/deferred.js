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
