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
      return Config.debug("Id "+options.id+" conflicts with existing id.")
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
