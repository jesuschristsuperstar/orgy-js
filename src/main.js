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
