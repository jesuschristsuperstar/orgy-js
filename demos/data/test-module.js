/**
 * Interface to display customer account transactions.
 * 
 * */
(function(obj){
    //NODE [IF BROWSER MUST SELF-DEFINE]
    if(typeof process === 'object' && process + '' === '[object process]'){
        module.exports = (Orgy.export(obj) || obj);
    }
    else{
        Orgy.export(obj);
    }
}(function(){
    var cls = {

        ///////////////////////////////////////////////////
        //  VARIABLES
        ///////////////////////////////////////////////////
        __dependencies : [
            {
                url : "*/data/test-module-2a.js"
                ,type : "script"
            }
            ,{
                url : "*/data/test-module-2b.js"
                ,type : "script"
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