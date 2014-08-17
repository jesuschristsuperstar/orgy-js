exports.types = function(dependencies,values){
    
    for (var i in dependencies){

        switch(dependencies[i].type){

            case("json"):
                expect(typeof values[i]).to.equal('object',values[i]); 
                break;

            case("css"):
                expect(typeof values[i]).to.equal('object',values[i]);
                break;

            case("timer"): 

                var t = 0;

                //check time elapsed is greater than timeout
                if(dependencies[i].timeout <= values[i].elapsed){
                    t = 1; 
                }
                else{
                    console.error("Did not wait for timer?!")
                    console.log("Elapsed "+ values[i].elapsed+" ms");
                    console.log("Required: "+dependencies[i].timeout+" ms");
                    console.log(values[i]);
                }

                expect(t).to.equal(1);
                break;
                
            default:
        }
    }
};