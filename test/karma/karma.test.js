console.log("Karma@ "+window.location.host);

//Deps from node.queue.js
//Karma on Travis won't traverse. Removing nested example.
//@todo - maybe reference this dep to github cdn instead
Deps.pop();

Orgy.config({
  debug_mode : 1
});

var q = Orgy.queue(Deps,{
   id : "q1"
});

Test.describe(q,Deps);