const createId = function(){
  let id = Symbol();
  return id;
}
module.exports.createId = createId;


module.exports.deferred = function(resolve,reject,options){

  options = options || {};
  const self = this;
  let timeoutId = false; //handle so we can clear timeout on resolve

  //set to usettled state
  this.settled = false;

  //track if timed out
  this.timedOut = false;

  //create a unique id for this deferred
  this.id = createId();
  
  //initialize at pending state
  this.state = 'pending'; //pending,resolved,rejected
  
  this.resolve = function(){
    //do not re-run if already settled
    if(self.settled){
      throw new Error ('Cannot resolve a deferred that has already been settled.'); 
    }
    self.state = 'resolved';
    resolve(arguments);
    self.settled = true;
    if(timeoutId){
      clearTimeout(timeoutId);
    }
  }

  this.reject = function(){
    //do not re-run if already settled
    if(self.settled){
      throw new Error ('Cannot reject a deferred that has already been settled.'); 
    }
    self.state = 'rejected'; 
    reject(arguments);
    self.settled = true;
    if(timeoutId){
      clearTimeout(timeoutId);
    }}

  if(options.timeout){
    timeoutId = setTimeout(function(){
      self.reject('timeout',options.timeout);
      self.timedOut = true;
      //unset self.reject since already called
      self.reject = function(){};
    },options.timeout);
  }

  return this;
}
