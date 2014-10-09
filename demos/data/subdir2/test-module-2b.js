(function(obj){
    
    var def = Orgy.define(obj.__id,obj);
    if(typeof process === 'object' && process + '' === '[object process]'){
        module.exports = def;
    }
    
}(function(){
    
    var cls = {

        ///////////////////////////////////////////////////
        //  VARIABLES
        ///////////////////////////////////////////////////
        __id : "test-module-2b"
        ,__dependencies : [
            {
                url : "data/data3.json"
                ,type : "json"
            }
        ]
        
        ////////////////////////////////////////
        //  CONSTRUCTOR/RESOLVER
        ////////////////////////////////////////
        ,__resolver : function(r,deferred){  
            deferred.resolve(this);
        }
    };
    
    return cls;
    
}()));