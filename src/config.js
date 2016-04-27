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
