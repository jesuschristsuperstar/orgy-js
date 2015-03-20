var Config = require('./config.js'),
    Deferred = require('./deferred.js');


/**
 * Casts an object into an Orgy deferred.
 *
 * > Object to be casted must have the following properties:
 *  - then()
 *  - error()
 *
 * > If the casted object has an id or url property set, the id or url
 * [in that order] will become the id of the deferred for referencing
 * with Orgy.get(id)
 * 
 * @memberof orgy
 * @function cast
 * 
 * @param {object} obj  /thenable
 * @returns {object}
 */
module.exports = function(obj){

    var required = ["then","error"];
    for(var i in required){
        if(!obj[required[i]]){
            return Config.debug("Castable objects require the following properties: "
                + required[i]);
        }
    }

    var options = {};
    if(obj.id){
        options.id = obj.id;
    }
    else if(obj.url){
        options.id = obj.url;
    }
    else{
      //if no id, use backtrace origin
      if(!options.id){
        options.id = Config.generate_id();
      }
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
