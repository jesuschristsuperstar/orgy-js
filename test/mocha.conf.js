global.jsdom = require("jsdom").jsdom;
global.doc = jsdom("starting body content");
global.window = doc.defaultView;
global.document = global.window.document;
global.$ = require("jquery");
global.Orgy = require("../src/main.js");
global.chai = require("chai");
global.expect = chai.expect;
global.assert = chai.assert;
global.should = chai.should();

//change working directory
process.chdir(__dirname);

require("./deferred");
require("./queue");
require("./chaining");
require("./cast");

//Require all the files in the current directory.
//We do this because we want to use the same files to run
//node and browser tests, and thus the same filepaths in the test dependencies
/*
var requireDirectory = require('require-directory'),
  hash = requireDirectory(__dirname, {recurse: false});
*/
