var Main = require('./main.js'),
    Deferred = require('./deferred.js'),
    _public = {},
    _private = {};


////////////////////////////////////////
//  _public METHODS
////////////////////////////////////////


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
 * @param {object} obj  /thenable
 * @returns {object}
 */
_public.cast = function(obj){

    var required = ["then","error"];
    for(var i in required){
        if(!obj[required[i]]){
            return Main.debug("Castable objects require the following properties: "
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
      //Get backtrace info if none found [may be set @ _public.define]
      var backtrace = Main.get_backtrace_info('cast');

      //if no id, use backtrace origin
      if(!options.id){
        options.id = backtrace.origin + '-' + (++Main[i]);
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

    //Create Rejector
    var err = function(err){
      def.reject(err);
    };

    //Set rejector
    obj.error(err);

    //Return deferred
    return def;
};

module.exports = _public;
