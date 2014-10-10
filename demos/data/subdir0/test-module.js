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
        __id : "test-module"
        ,__dependencies : [

            {
                url : "../subdir1/test-module-2a.js"
                ,type : "script"
                ,autoresolve : false
            }
            ,{
                url : "../subdir2/test-module-2b.js"
                ,type : "script"
                ,autoresolve : false
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