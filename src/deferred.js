const createId = function(){
  let id = Symbol();
  return id;
}
module.exports.createId = createId;


module.exports.deferred = function(resolve,reject,options){

  const self = this;

  //create a unique id for this deferred
  this.id = createId();
  
  //initialize at pending state
  this.state = 'pending'; //pending,resolved,rejected
  
  this.resolve = function(){
    self.state = 'resolved';
    resolve(arguments);
  }

  this.reject = function(){
    self.state = 'rejected'; 
    reject(arguments);
  }

  if(options.timeout){
    setTimeout(function(){
      self.reject();
      //unset self.reject since already called
      self.reject = function(){};
    },options.timeout);
  }
}
