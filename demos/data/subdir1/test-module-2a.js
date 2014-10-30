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