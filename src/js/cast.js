////////////////////////////////////////
//  PUBLIC METHODS
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
public.cast = function(obj){
            
    var required = ["then","error"];
    for(var i in required){
        if(!obj[required[i]]){
            return public.debug("Castable objects require: " 
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
    
    //Create a deferred
    var def = public.deferred(options);

    //Set then, rejector
    def.then(function(r){
        obj.then(r);
    },function(r){
        obj.error(r);
    });

    //Return deferred
    return def;
};      