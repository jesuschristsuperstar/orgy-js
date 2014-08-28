////////////////////////////////////////
//  PUBLIC METHODS
////////////////////////////////////////


public.cast = function(obj){
            
    var required = ["then","error","id"];
    for(var i in required){
        if(!obj[required[i]]){
            return public.debug("Castable objects require: " + required[i]);
        }
    }

    //GET A BLANK DEFERRED TO PLAY WITH
    var deferred = public.deferred({
        id : obj.id
    });

    //CREATE RESOLVER [ASYNC]
    var resolver = function(){
        deferred.resolve.call(deferred,arguments[0]);
    };

    //SET RESOLVER
    obj.then(resolver);

    //CREATE REJECTOR [ASYNC]
    var err = function(err){
        deferred.reject(err);
    };

    //SET REJECTOR
    obj.error(err);

    //RETURN THE DEFERRED
    return deferred;
}
        