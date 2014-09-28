////////////////////////////////////////
//  PUBLIC METHODS
////////////////////////////////////////


public.cast = function(obj){
            
    var required = ["then","error","id"];
    for(var i in required){
        if(!obj[required[i]]){
            return public.debug("Castable objects require: " 
                    + required[i]);
        }
    }

    //GET A BLANK DEFERRED TO PLAY WITH
    var def = public.deferred({
        id : obj.id
    });

    //CREATE RESOLVER [ASYNC]
    var resolver = function(){
        def.resolve.call(def,arguments[0]);
    };

    //SET RESOLVER
    obj.then(resolver);

    //CREATE REJECTOR [ASYNC]
    var err = function(err){
        def.reject(err);
    };

    //SET REJECTOR
    obj.error(err);

    //RETURN THE DEFERRED
    return def;
};      