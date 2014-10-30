(function(obj){
  
  var options = {};
  var id = obj.__id;
  
  if(obj.__dependencies){
    options.dependencies = obj.__dependencies;
  }
  
  if(obj.__resolver){
    options.resolver = obj.__resolver.bind(obj);
  };
  
  if(typeof process==='object' && process+''==='[object process]'){
    options.cwd = __dirname;
    var def = Orgy.define(id,obj,options);
    module.exports = def;
  }
  else{
    Orgy.define(id,obj,options);
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