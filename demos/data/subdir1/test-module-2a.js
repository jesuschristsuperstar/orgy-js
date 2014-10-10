(function(obj){
    if(typeof process === 'object' && process + '' === '[object process]'){
      obj.cwd = __dirname;
      var def = Orgy.define(obj.__id,obj);
      module.exports = def;
    }
    else{
      Orgy.define(obj.__id,obj);
    }
    
}(function(){
    
    var cls = {

        ///////////////////////////////////////////////////
        //  VARIABLES
        ///////////////////////////////////////////////////
        __id : "test-module-2a"
        ,__dependencies : [
            {
                url : "../data2.json"
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