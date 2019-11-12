module.exports = {
    "env": {
        "commonjs": true,
        "es6": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly",
        "document": true,
        "XMLHttpRequest": true,
        "$": true,
        "window": true
    }
  ,
    "parserOptions": {
        "ecmaVersion": 2018
    },
    "rules": {
        "indent": [
            "error",
            2,
          {
            "SwitchCase": 1
          }
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "error",
            "never"
        ],
        "curly": ["error", "multi-or-nest"],
        "brace-style": ["error", "1tbs"],
        "space-before-blocks": "error",
        "no-case-declarations": "off",
        "no-trailing-spaces": "error",
        "key-spacing": ["error", {
          "beforeColon": false,
          "afterColon": true
        }],
        "prefer-template": "error",
        "semi-spacing": ["error", {"before": false, "after": true}],
        "no-debugger": [0]
    }
}
