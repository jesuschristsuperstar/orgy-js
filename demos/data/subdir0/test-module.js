(function(obj){
  
  var options = {
    id : obj.__id
    ,dependencies : obj.__dependencies
    ,resolver : (obj.__resolver) ? obj.__resolver.bind(obj) : null
  };
  
  if(typeof process==='object' && process+''==='[object process]'){
    options.cwd = __dirname;
    var def = Orgy.define(options);
    module.exports = def;
  }
  else{
    Orgy.define(options);
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