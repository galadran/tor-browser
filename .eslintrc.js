"use strict";

module.exports = {
  // New rules and configurations should generally be added in
  // tools/lint/eslint/eslint-plugin-mozilla/lib/configs/recommended.js to
  // allow external repositories that use the plugin to pick them up as well.
  "extends": [
    "plugin:mozilla/recommended"
  ],
  "plugins": [
    "mozilla"
  ],
  // The html plugin is enabled via a command line option on eslint. To avoid
  // bad interactions with the xml preprocessor in eslint-plugin-mozilla, we
  // turn off processing of the html plugin for .xml files.
  "settings": {
    "html/xml-extensions": [ ".xhtml" ]
  },

  "overrides": [{
    // eslint-plugin-html handles eol-last slightly different - it applies to
    // each set of script tags, so we turn it off here.
    "files": "**/*.*html",
    "rules": {
      "eol-last": "off",
    }
  }, {
    // These xbl bindings are assumed to be in the browser-window environment,
    // we would mark it in the files, but ESLint made this more difficult with
    // our xml processor, so we list them here. Bug 1397874 & co are working
    // towards removing these files completely.
    "files": [
      "browser/base/content/tabbrowser.xml",
      "browser/base/content/urlbarBindings.xml",
      "browser/components/search/content/search.xml",
      "browser/components/translation/translation-infobar.xml",
      "toolkit/components/prompts/content/tabprompts.xml"
    ],
    "env": {
      "mozilla/browser-window": true
    }
  },{
    // XXX Bug 1421969. These files/directories are still being fixed,
    // so turn off mozilla/use-services for them for now.
    "files": [
      "extensions/pref/**",
      "mobile/android/**",
      "testing/**",
    ],
    "rules": {
      "mozilla/use-services": "off",
    }
  }, {
    // XXX Bug 1434446. These directories have jsm files still being fixed, so
    // turn off global no-unused-vars checking for them.
    "files": [
      "accessible/**/*.jsm",
      "browser/components/**/*.jsm",
      "browser/extensions/**/*.jsm",
      "services/sync/**/*.jsm",
      "toolkit/**/*.jsm",
    ],
    "rules": {
      "mozilla/mark-exported-symbols-as-used": "error",
      "no-unused-vars": ["error", {
        "args": "none",
        "vars": "local",
        "varsIgnorePattern": "^Cc|Ci|Cu|Cr|EXPORTED_SYMBOLS"
      }]
    }
  }, {
    // XXX Bug 1433175. These directories are still being fixed, so turn off
    // mozilla/use-cc-etc for now.
    "files": [
      "accessible/**",
      "browser/**",
      "devtools/**",
      "dom/**",
      "extensions/pref/**",
      "mobile/android/**",
      "security/manager/**",
      "services/**",
      "storage/test/**",
      "testing/**",
      "toolkit/**",
      "xpcom/**",
    ],
    "rules": {
      "mozilla/use-cc-etc": "off",
    }
  }, {
    // XXX Bug 1436303. These directories are still being fixed, so turn off
    // mozilla/no-cc-etc for now.
    "files": [
      "devtools/**"
    ],
    "rules": {
      "mozilla/no-define-cc-etc": "off",
    }
  }]
};
