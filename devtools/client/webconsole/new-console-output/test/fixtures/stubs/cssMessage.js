/* Any copyright is dedicated to the Public Domain.
  http://creativecommons.org/publicdomain/zero/1.0/ */
/* eslint-disable max-len */

"use strict";

/*
 * THIS FILE IS AUTOGENERATED. DO NOT MODIFY BY HAND. RUN TESTS IN FIXTURES/ TO UPDATE.
 */

const { ConsoleMessage } =
  require("devtools/client/webconsole/new-console-output/types");

let stubPreparedMessages = new Map();
let stubPackets = new Map();
stubPreparedMessages.set(`Unknown property ‘such-unknown-property’.  Declaration dropped.`, new ConsoleMessage({
  "id": "1",
  "allowRepeating": true,
  "source": "css",
  "timeStamp": 1479159920406,
  "type": "log",
  "helperType": null,
  "level": "warn",
  "messageText": "Unknown property ‘such-unknown-property’.  Declaration dropped.",
  "parameters": null,
  "repeatId": "{\"frame\":{\"source\":\"http://example.com/browser/devtools/client/webconsole/new-console-output/test/fixtures/stub-generators/test-css-message.html\",\"line\":3,\"column\":25},\"groupId\":null,\"indent\":0,\"level\":\"warn\",\"messageText\":\"Unknown property ‘such-unknown-property’.  Declaration dropped.\",\"parameters\":null,\"source\":\"css\",\"type\":\"log\",\"userProvidedStyles\":null}",
  "stacktrace": null,
  "frame": {
    "source": "http://example.com/browser/devtools/client/webconsole/new-console-output/test/fixtures/stub-generators/test-css-message.html",
    "line": 3,
    "column": 25
  },
  "groupId": null,
  "userProvidedStyles": null,
  "notes": null,
  "indent": 0
}));

stubPreparedMessages.set(`Error in parsing value for ‘padding-top’.  Declaration dropped.`, new ConsoleMessage({
  "id": "1",
  "allowRepeating": true,
  "source": "css",
  "timeStamp": 1479159920465,
  "type": "log",
  "helperType": null,
  "level": "warn",
  "messageText": "Error in parsing value for ‘padding-top’.  Declaration dropped.",
  "parameters": null,
  "repeatId": "{\"frame\":{\"source\":\"http://example.com/browser/devtools/client/webconsole/new-console-output/test/fixtures/stub-generators/test-css-message.html\",\"line\":3,\"column\":16},\"groupId\":null,\"indent\":0,\"level\":\"warn\",\"messageText\":\"Error in parsing value for ‘padding-top’.  Declaration dropped.\",\"parameters\":null,\"source\":\"css\",\"type\":\"log\",\"userProvidedStyles\":null}",
  "stacktrace": null,
  "frame": {
    "source": "http://example.com/browser/devtools/client/webconsole/new-console-output/test/fixtures/stub-generators/test-css-message.html",
    "line": 3,
    "column": 16
  },
  "groupId": null,
  "userProvidedStyles": null,
  "notes": null,
  "indent": 0
}));

stubPackets.set(`Unknown property ‘such-unknown-property’.  Declaration dropped.`, {
  "from": "server1.conn0.child1/consoleActor2",
  "type": "pageError",
  "pageError": {
    "errorMessage": "Unknown property ‘such-unknown-property’.  Declaration dropped.",
    "errorMessageName": "",
    "sourceName": "http://example.com/browser/devtools/client/webconsole/new-console-output/test/fixtures/stub-generators/test-css-message.html",
    "lineText": "",
    "lineNumber": 3,
    "columnNumber": 25,
    "category": "CSS Parser",
    "timeStamp": 1479159920406,
    "warning": true,
    "error": false,
    "exception": false,
    "strict": false,
    "info": false,
    "private": false,
    "stacktrace": null,
    "notes": null
  }
});

stubPackets.set(`Error in parsing value for ‘padding-top’.  Declaration dropped.`, {
  "from": "server1.conn0.child1/consoleActor2",
  "type": "pageError",
  "pageError": {
    "errorMessage": "Error in parsing value for ‘padding-top’.  Declaration dropped.",
    "errorMessageName": "",
    "sourceName": "http://example.com/browser/devtools/client/webconsole/new-console-output/test/fixtures/stub-generators/test-css-message.html",
    "lineText": "",
    "lineNumber": 3,
    "columnNumber": 16,
    "category": "CSS Parser",
    "timeStamp": 1479159920465,
    "warning": true,
    "error": false,
    "exception": false,
    "strict": false,
    "info": false,
    "private": false,
    "stacktrace": null,
    "notes": null
  }
});

module.exports = {
  stubPreparedMessages,
  stubPackets,
};
