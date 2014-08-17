/** 
orgy: A queue and deferred library that is so very hot right now. 
Version: 1.1.5 
Built: 2014-08-17 
Author: tecfu.com  
*/

var public = {};

var private = {};

public.list = {};

public.modules_exported = [];

public.modules_loaded = 0;

public.registered_callbacks = {};

public.i = 0;

public.config = function(obj) {
    if (obj) {
        for (var i in obj) {
            if (typeof private.config[i] !== "undefined") {
                private.config[i] = obj[i];
            } else {
                return public.debug("Property " + i + " is not configurable.");
            }
        }
    }
    return private.config;
};

public.export = function(obj) {
    public.modules_exported.push(obj);
    return obj;
};

public.define = function(id, data) {
    if (!public.list[id] || public.list[id].settled !== 1) {
        var def = public.deferred({
            id: id
        });
        def.resolve(data);
        return def;
    } else {
        public.debug("Can't define " + id + ". Already resolved.");
    }
};

public.export_module = function(deferred) {
    deferred.then(function() {
        if (typeof process === "object" && process + "" === "[object process]") {
            module.exports = deferred.value;
        } else {
            modules[deferred.id] = deferred.value;
        }
    });
};

public.assign = function(tgt, arr, add) {
    add = typeof add === "boolean" ? add : 1;
    var id, q;
    switch (true) {
      case typeof tgt === "object" && typeof tgt.then === "function":
        id = tgt.id;
        break;

      case typeof tgt === "string":
        id = tgt;
        break;

      default:
        return public.debug("Assign target must be a queue object or the id of a queue.");
    }
    if (this.list[id] && this.list[id].model === "queue") {
        q = this.list[id];
        if (add) {
            q.add(arr);
        } else {
            q.remove(arr);
        }
    } else if (add) {
        q = public.queue(arr, {
            id: id
        });
    } else {
        public.debug("Cannot remove dependencies from a queue that does not exist.");
    }
    return q;
};

public.register_callback = function(name, fn) {
    public.registered_callbacks[name] = fn;
};

public.array_to_function = function(target) {
    var clone = target.slice(0);
    var root_id = clone[0];
    clone.splice(0, 1);
    var root;
    if (public.list[root_id] && public.list[root_id].hasOwnProperty("value")) {
        root = public.list[root_id].value;
    } else {
        root = window[root_id];
    }
    if (typeof root === "undefined") {
        console.error(root_id + " not found on window or public.list");
        debugger;
    }
    var x, y;
    x = y = root;
    var l = clone.length;
    var args = clone[l - 1];
    var end;
    if (args instanceof Array) {
        end = l - 1;
    } else {
        end = l;
    }
    var parent;
    for (var b = 0; b < end; b++) {
        var key = clone[b];
        if (b === end - 1 || l === 1) {
            parent = x;
        }
        if (typeof x[key] === "undefined") {
            console.error("Property '" + key + "' not found on object:", x);
            debugger;
            return;
        }
        x = x[key];
        y = x;
    }
    return {
        constructor: x,
        args: args,
        parent: parent
    };
};

public.naive_cloner = function(donors) {
    var o = {};
    for (var a in donors) {
        for (var b in donors[a]) {
            if (donors[a][b] instanceof Array) {
                o[b] = donors[a][b].slice(0);
            } else if (typeof donors[a][b] === "object") {
                o[b] = JSON.parse(JSON.stringify(donors[a][b]));
            } else {
                o[b] = donors[a][b];
            }
        }
    }
    return o;
};

public.debug = function(msg, force_debug_mode) {
    if (msg instanceof Array) {
        for (var i in msg) {
            console.error("ERROR-" + i + ": " + msg[i]);
        }
    } else {
        console.error("ERROR: " + msg);
    }
    if (public.config.debug_mode == 1 || force_debug_mode) {
        debugger;
    }
    if (private.config.mode === "browser") {
        return false;
    } else {
        process.exit();
    }
};

private.config = {
    document: null,
    debug_mode: 1,
    mode: function() {
        if (typeof process === "object" && process + "" === "[object process]") {
            return "node";
        } else {
            return "browser";
        }
    }()
};

public.deferred = function(options) {
    if (!options || typeof options.id !== "string") {
        return public.debug("Must set id.");
    }
    if (!public.list[options.id]) {
        var _o = private.deferred.factory(options);
        _o = private.deferred.activate(_o);
    } else {
        _o = public.list[options.id];
    }
    return _o;
};

private.deferred = {
    factory: function(options) {
        var _o = public.naive_cloner([ private.deferred.tpl, options ]);
        return _o;
    },
    tpl: {
        model: "deferred",
        settled: 0,
        id: null,
        done_fired: 0,
        _state: 0,
        _timeout_id: null,
        value: [],
        error_q: [],
        then_q: [],
        done_fn: null,
        reject_q: [],
        downstream: {},
        execution_history: [],
        overwritable: 0,
        timeout: 5e3,
        remote: 1,
        list: 1,
        resolve: function(value) {
            if (this.settled !== 0) {
                public.debug(this.id + " can't resolve. Only unsettled promise objects resolvable.");
            }
            this._state = -1;
            this.value = value;
            if (!this.resolver_fired) {
                this.resolver_fired = 1;
                if (this.resolver) {
                    this.resolver(this, value);
                    return this;
                }
            }
            var v, fn, l = this.then_q.length;
            for (var i = 0; i < l; i++) {
                fn = this.then_q.splice(0, 1);
                v = fn[0].call(this, v || this.value);
                this.execution_history.push(fn[0]);
                if (typeof v !== "undefined" && v.then) {
                    this._state = 0;
                    this.add([ v ]);
                    return;
                } else if (typeof v !== "undefined") {
                    this.value = v;
                }
            }
            if (this.set) {
                if (this.set instanceof Array) {
                    var tgt = public.array_to_function(this.set);
                    tgt.parent[tgt.args] = this.value;
                } else if (typeof this.set === "function") {
                    this.set(this.value);
                }
            }
            for (var i in public.registered_callbacks) {
                console.log("Orgy.js executing registered callback '" + i + "' on " + this.id);
                public.registered_callbacks[i].call(this);
            }
            if (this._timeout_id) {
                clearTimeout(this._timeout_id);
            }
            private.deferred._set_state.call(this, 1);
            this.done();
            return this;
        },
        reject: function(err) {
            if (!(err instanceof Array)) {
                err = [ err ];
            }
            err.unshift("REJECTED " + this.model + ": '" + this.id + "'");
            public.debug(err);
            if (this._timeout_id) {
                clearTimeout(this._timeout_id);
            }
            this.catch_params = err;
            private.deferred._set_state.call(this, 2);
            for (var i in this.reject_q) {
                this.value.push(this.reject_q[i].apply(this, arguments));
            }
            return this;
        },
        then: function(fn, rejector) {
            switch (true) {
              case this._state === 2:
                break;

              case this.done_fired === 1:
                public.debug(this.id + " can't attach .then() after .done() has fired.");
                break;

              case this.settled === 1 && this._state === 1 && !this.done_fired:
                var r = fn.call(this, this.value);
                if (typeof r !== "undefined") {
                    this.value = r;
                }
                break;

              default:
                this.then_q.push(fn);
                if (typeof rejector === "function") {
                    this.reject_q.push(rejector);
                }
                break;
            }
            return this;
        },
        done: function(fn) {
            if (this.done_fn === null) {
                if (fn) {
                    this.done_fn = fn;
                }
            } else if (fn) {
                public.debug("done() can only be called once.");
                return;
            }
            if (this.settled === 1 && this._state === 1 && this.done_fn) {
                this.done_fired = 1;
                this.done_fn.call(this, this.value);
            }
        }
    },
    _set_state: function(int) {
        this._state = int;
        if (int === 1 || int === 2) {
            this.settled = 1;
        }
        private.deferred._signal_downstream.call(this, this);
    },
    _get_state: function() {
        return this._state;
    },
    activate: function(obj) {
        if (!obj.id) {
            obj.id = private.deferred._make_id(obj.model);
            obj.autonamed = true;
        }
        if (public.list[obj.id] && !public.list[obj.id].overwritable) {
            public.debug("Tried to overwrite " + obj.id + " without overwrite permissions.");
            return public.list[obj.id];
        } else {
            public.list[obj.id] = obj;
        }
        private.deferred.auto_timeout.call(obj);
        return obj;
    },
    auto_timeout: function(timeout) {
        this.timeout = typeof timeout === "undefined" ? this.timeout : timeout;
        if (!this.type || this.type !== "timer") {
            if (this._timeout_id) {
                clearTimeout(this._timeout_id);
            }
            if (typeof this.timeout === "undefined") {
                public.debug(this.id + " Auto timeout this.timeout cannot be undefined.");
            } else if (this.timeout === -1) {
                return false;
            }
            var scope = this;
            this._timeout_id = setTimeout(function() {
                private.deferred.auto_timeout_cb.call(scope);
            }, this.timeout);
        } else {}
        return true;
    },
    auto_timeout_cb: function() {
        if (this._state !== 1) {
            var msgs = [];
            var scope = this;
            var fn = function(obj) {
                if (obj._state !== 1) {
                    return obj.id;
                } else {
                    return false;
                }
            };
            var r = private.deferred.search_obj_recursively(this, "upstream", fn);
            msgs.push(scope.id + ": rejected by auto timeout after " + this.timeout + "ms");
            msgs.push("Cause:");
            msgs.push(r);
            return private.deferred.tpl.reject.call(this, msgs);
        }
    },
    error: function(cb) {
        if (this._state === 2) {
            cb();
        } else {
            this.error_q.push(cb);
        }
        return this;
    },
    _make_id: function(model) {
        return "anonymous-" + model + "-" + public.i++;
    },
    _signal_downstream: function(target) {
        for (var i in target.downstream) {
            if (target.downstream[i].settled === 1) {
                public.debug(target.id + " tried to settle promise " + "'" + target.downstream[i].id + "' that has already been settled.");
            }
        }
        for (var i in target.downstream) {
            if (target.downstream[i].settled !== 1) {
                private.queue.receive_signal(target.downstream[i], target.id);
            }
        }
    },
    search_obj_recursively: function(obj, propName, fn, breadcrumb) {
        if (typeof breadcrumb === "undefined") {
            breadcrumb = [ obj.id ];
        }
        var r1;
        for (var i in obj[propName]) {
            r1 = fn(obj[propName][i]);
            if (r1 !== false) {
                if (breadcrumb.indexOf(r1) !== -1) {
                    return public.debug([ "Circular condition in recursive search of obj property '" + propName + "'. Offending value: " + r1, breadcrumb ]);
                }
                breadcrumb.push(r1);
                if (obj[propName][i][propName]) {
                    return private.deferred.search_obj_recursively(obj[propName][i], propName, fn, breadcrumb);
                }
                break;
            }
        }
        return breadcrumb;
    },
    convert_to_promise: function(obj) {
        if (!obj.id) {
            if (obj.type === "timer") {
                obj.id = "timer-" + obj.timeout + "-" + public.i++;
            } else if (typeof obj.url === "string") {
                obj.id = obj.url.split("/").pop();
                if (obj.id.search(".js") !== -1) {
                    obj.id = obj.id.split(".");
                    obj.id.pop();
                    obj.id = obj.id.join(".");
                }
            } else {
                return public.debug([ "Dependency type '" + obj.type + "' requires id, but id undefined.", obj ]);
            }
        }
        if (obj.type !== "timer") {
            if (typeof public.list[obj.id] !== "undefined") {
                return public.list[obj.id];
            }
        }
        var prom;
        switch (true) {
          case obj.type === "event":
            prom = private.deferred._wrap_event(obj);
            break;

          case obj.type === "promise" || obj.then:
            switch (true) {
              case typeof obj.promise === "function":
                if (obj.scope) {
                    prom = obj.promise.call(obj.scope);
                } else {
                    prom = obj.promise();
                }
                break;

              case obj.then:
                prom = obj;
                break;

              case typeof obj.id === "string":
                if (public.list[obj.id]) {
                    prom = public.list[obj.id];
                } else {
                    console.warn("Promise '" + obj.id + "': did not exist. Auto creating new deferred.");
                    prom = public.deferred({
                        id: obj.id
                    });
                }
                ;
                break;

              default:            }
            if (typeof prom !== "object" || !prom.then) {
                console.error("Dependency labeled as a promise did not return a promise.");
                console.error(obj);
                debugger;
                return false;
            }
            break;

          case obj.type === "timer":
            prom = private.deferred._wrap_timer(obj);
            break;

          default:
            obj.type = obj.type || "default";
            prom = private.deferred._wrap_xhr(obj);
        }
        public.list[obj.id] = prom;
        return prom;
    },
    _wrap_event: function(obj) {
        var def = public.deferred({
            id: obj.id
        });
        var resolver = function() {
            private.deferred.tpl.resolve.call(def, 1);
        };
        if (typeof document !== "undefined" && typeof window !== "undefined") {
            if (typeof $ !== "function") {
                var msg = "window and document based events depend on jQuery";
                console.error(msg);
                debugger;
                def.reject(msg);
            } else {
                switch (true) {
                  case obj.id === "ready" || obj.id === "DOMContentLoaded":
                    $(document).ready(resolver);
                    break;

                  case obj.id === "load":
                    $(window).load(resolver);
                    break;

                  default:
                    $(document).on(obj.id, "body", resolver);
                }
            }
        }
        return def;
    },
    _wrap_timer: function(obj) {
        var prom = public.deferred(obj);
        (function(prom) {
            var _start = new Date().getTime();
            setTimeout(function() {
                var _end = new Date().getTime();
                prom.resolve({
                    start: _start,
                    end: _end,
                    elapsed: _end - _start,
                    timeout: obj.timeout
                });
            }, obj.timeout);
        })(prom);
        return prom;
    },
    _wrap_xhr: function(dep) {
        var required = [ "id", "url" ];
        for (var i in required) {
            if (!dep[required[i]]) {
                return public.debug("File requests converted to promises require: " + required[i]);
            }
        }
        if (public.list[dep.id]) {
            return public.list[dep.id];
        }
        var deferred;
        deferred = public.deferred(dep);
        deferred = private.deferred.attach_xhr(deferred, dep);
        return deferred;
    },
    load_script: function(deferred, data) {
        if (public.modules_exported.length > public.modules_loaded) {
            var m = public.modules_exported[public.modules_exported.length - 1];
            if (m.__dependencies instanceof Array) {
                m.__id = deferred.id;
                public.queue(m.__dependencies || [], {
                    id: m.__id,
                    resolver: function() {
                        m.__resolver.call(m, deferred, deferred.value);
                    }
                });
            } else {
                deferred.resolve(m);
            }
            public.modules_loaded++;
        } else {
            deferred.resolve(data);
        }
    },
    attach_xhr: function(deferred, dep) {
        dep.rol = typeof dep.rol !== "undefined" ? dep.rol : 1;
        if (typeof process !== "object" || process + "" !== "[object process]") {
            this.head = this.head || document.getElementsByTagName("head")[0] || document.documentElement;
            switch (true) {
              case dep.type === "css" || dep.type === "link":
                var node = document.createElement("link");
                node.setAttribute("href", dep.url);
                node.setAttribute("type", "text/css");
                node.setAttribute("rel", "stylesheet");
                (function() {
                    node.onload = node.onreadystatechange = function() {
                        deferred.resolve(node);
                    };
                })(node);
                this.head.appendChild(node);
                break;

              case dep.type === "script":
                var node = document.createElement("script");
                node.type = "text/javascript";
                node.setAttribute("src", dep.url);
                node.setAttribute("id", dep.id);
                node.onerror = function() {
                    deferred.reject("Failed to load path: " + dep.url);
                };
                (function(node) {
                    node.onload = node.onreadystatechange = function() {
                        private.deferred.load_script(deferred, node);
                    };
                })(node);
                this.head.appendChild(node);
                break;

              case dep.type === "json":
              default:
                var r;
                var req = new XMLHttpRequest();
                req.open("GET", dep.url, true);
                if (typeof dep.show_messages !== "undefined") {
                    req.setRequestHeader("show-messages", dep.show_messages);
                }
                if (typeof dep.return_packet !== "undefined") {
                    req.setRequestHeader("return-packet", dep.return_packet);
                }
                req.onreadystatechange = function() {
                    if (req.readyState === 4) {
                        if (req.status === 200) {
                            r = req.responseText;
                            if (dep.type === "json") {
                                try {
                                    r = JSON.parse(r);
                                } catch (e) {
                                    public.debug([ "Could not decode JSON", dep.url, r ]);
                                }
                            }
                            deferred.resolve(r);
                        } else {
                            deferred.reject("Error loading " + dep.url);
                        }
                    }
                };
                req.send(null);
            }
        } else {
            function process_result(deferred, data, dep) {
                switch (true) {
                  case dep.type === "script":
                    private.deferred.load_script(deferred, data);
                    break;

                  case dep.type === "json":
                    data = JSON.parse(data);
                    deferred.resolve(data);
                    break;

                  default:
                    deferred.resolve(data);
                }
            }
            if (dep.remote) {
                var request = require("request");
                request.get(dep.url, function(error, response, body) {
                    if (!error && response.statusCode == 200) {
                        process_result(deferred, body, dep);
                    }
                });
            } else {
                var path = dep.url;
                if (dep.type === "script") {
                    var data = require(path);
                    private.deferred.load_script(deferred, data);
                } else if (dep.type === "css") {
                    if (private.config.document !== null) {
                        var cheerio = require("cheerio");
                        var $ = cheerio.load(private.config.document);
                        var node = $("head").append('<link rel="stylesheet" href="' + dep.url + '" type="text/css" />');
                        private.config.document = $.html();
                        deferred.resolve(node);
                    } else {
                        return public.debug([ dep.url, "Must pass html document to Orgy.config() before attempting to add DOM nodes [i.e. css] as dependencies." ]);
                    }
                } else {
                    var fs = require("fs");
                    (function(deferred, dep) {
                        fs.readFile(path, "utf8", function(err, data) {
                            if (err) {
                                public.debug([ "File " + dep.url + " not found @ local path '" + path + "'", "CWD: " + cwd ]);
                                process.exit();
                            }
                            process_result(deferred, data, dep);
                        });
                    })(deferred, dep);
                }
            }
        }
        return deferred;
    }
};

public.queue = function(deps, options) {
    var _o;
    if (!(deps instanceof Array)) {
        return public.debug("Queue dependencies must be an array.");
    }
    if (!options || !options.id) {
        return public.debug("Queues require an id.");
    }
    if (!public.list[options.id]) {
        var _o = private.queue.factory(options);
        _o = private.queue.activate(_o, options, deps);
    } else {
        _o = public.list[options.id];
        if (_o.model !== "queue") {
            options.overwritable = 1;
            _o = private.queue.upgrade(_o, options, deps);
        } else {
            for (var i in options) {
                _o[i] = options[i];
            }
            if (deps.length > 0) {
                private.queue.tpl.add.call(_o, deps);
            }
        }
        _o.halt_resolution = typeof options.halt_resolution !== "undefined" ? options.halt_resolution : 0;
    }
    return _o;
};

private.queue = {
    factory: function(options) {
        var _o = public.naive_cloner([ private.deferred.tpl, private.queue.tpl, options ]);
        return _o;
    },
    tpl: {
        model: "queue",
        resolver_fired: 0,
        halt_resolution: 0,
        upstream: {},
        dependencies: [],
        add: function(arr) {
            try {
                if (arr.length === 0) return this.upstream;
            } catch (err) {
                public.debug(err);
            }
            if (this._state !== 0) {
                return public.debug("Cannot add list to queue id:'" + this.id + "'. Queue settled/in the process of being settled.");
            }
            for (var a in arr) {
                switch (true) {
                  case typeof arr[a] === "string":
                    if (!public.list[arr[a]]) {
                        return public.debug(arr[a] + "' does not exist so cannot be added to a queue.");
                    } else {
                        arr[a] = public.list[arr[a]];
                    }
                    break;

                  case typeof arr[a] === "object" && typeof arr[a].then !== "function":
                    arr[a] = private.deferred.convert_to_promise(arr[a]);
                    break;

                  case typeof arr[a].then === "function":
                    break;

                  default:
                    console.error("Object could not be converted to promise.");
                    console.error(arr[a]);
                    debugger;
                    continue;
                }
                for (var b in this.downstream) {
                    if (b === arr[a].id) {
                        return public.debug("Error adding upstream dependency '" + arr[a].id + "' to queue" + " '" + this.id + "'.\n Promise object for '" + arr[a].id + "' is scheduled to resolve downstream from queue '" + this.id + "' so it can't be added upstream.");
                    }
                }
                this.upstream[arr[a].id] = arr[a];
                arr[a].downstream[this.id] = this;
                this.dependencies.push(arr[a]);
            }
            return this.upstream;
        },
        remove: function(arr) {
            if (this._state !== 0) {
                console.error("Cannot remove list from queue id:'" + this.id + "'. Queue settled/in the process of being settled.");
                return false;
            }
            for (var a in arr) {
                if (this.upstream[arr[a].id]) {
                    delete this.upstream[arr[a].id];
                    delete arr[a].downstream[this.id];
                }
            }
        },
        reset: function(options) {
            if (this.settled !== 1 || this._state !== 1) {
                public.debug("Can only reset a queue settled without errors.");
            }
            options = options || {};
            this.settled = 0;
            this._state = 0;
            this.resolver_fired = 0;
            this.done_fired = 0;
            if (this._timeout_id) {
                clearTimeout(this._timeout_id);
            }
            this.downstream = {};
            this.dependencies = [];
            private.deferred.auto_timeout.call(this, options.timeout);
            return this;
        },
        check_self: function() {
            private.queue.receive_signal(this, this.id);
            return this._state;
        }
    },
    activate: function(o, options, deps) {
        o = private.deferred.activate(o);
        private.queue.tpl.add.call(o, deps);
        private.queue.receive_signal(o, o.id);
        if (o.assign) {
            for (var a in o.assign) {
                public.assign(o.assign[a], [ o ], true);
            }
        }
        return o;
    },
    receive_signal: function(target, from_id) {
        if (target.halt_resolution === 1) return;
        if (from_id !== target.id && !target.upstream[from_id]) {
            console.error(from_id + " can't signal " + target.id + " because not in upstream.");
            debugger;
            return;
        } else {
            var status = 1;
            for (var i in target.upstream) {
                if (target.upstream[i]._state !== 1) {
                    status = target.upstream[i]._state;
                    break;
                }
            }
        }
        if (status === 1) {
            var values = [];
            for (var i in target.dependencies) {
                values.push(target.dependencies[i].value);
            }
            private.deferred.tpl.resolve.call(target, values);
        }
        if (status === 2) {
            var err = [ target.id + " dependency '" + target.upstream[i].id + "' was rejected.", target.upstream[i].arguments ];
            private.deferred.tpl.reject.apply(target, err);
        }
    },
    upgrade: function(obj, options, deps) {
        if (obj.settled !== 0 || obj.model !== "promise" && obj.model !== "deferred") {
            return public.debug("Can only upgrade unsettled promise or deferred into a queue.");
        }
        var _o = public.naive_cloner([ private.queue.tpl, options ]);
        for (var i in _o) {
            obj[i] = _o[i];
        }
        delete _o;
        obj = private.queue.activate(obj, options, deps);
        return obj;
    }
};

public.cast = function(obj) {
    var required = [ "then", "error", "id" ];
    for (var i in required) {
        if (!obj[required[i]]) {
            return public.debug("Castable objects require: " + required[i]);
        }
    }
    var deferred = public.deferred({
        id: obj.id
    });
    var resolver = function() {
        deferred.resolve.call(deferred, arguments[0]);
    };
    obj.then(resolver);
    var err = function(err) {
        deferred.reject(err);
    };
    obj.error(err);
    return deferred;
};

if (typeof process === "object" && process + "" === "[object process]") {
    module.exports = public;
} else {
    Orgy = public;
}
//# sourceMappingURL=orgy.devel.js.map