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
        __id : "test-module-2b"
        ,__dependencies : [
            {
                url : "../data3.json"
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