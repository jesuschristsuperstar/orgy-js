console.log("Karma@ "+window.location.host);

//Karma on Travis won't traverse. Removing nested example.
//@todo - maybe reference this dep to github cdn instead
Test.deps.pop();

Orgy.config({
  debug_mode : 1
});

var q = Orgy.queue(Test.deps,{
   id : "q1"
});

Test.describe(q,Test.deps);