/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set ft=javascript ts=2 et sw=2 tw=80: */
/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_URI = "http://example.com/browser/devtools/client/webconsole/" +
                 "test/test-bug-632347-iterators-generators.html";

function test() {
  requestLongerTimeout(6);

  loadTab(TEST_URI).then(() => {
    openConsole().then(consoleOpened);
  });
}

function consoleOpened(HUD) {
  let {JSPropertyProvider} = require("devtools/shared/webconsole/js-property-provider");

  let tmp = ChromeUtils.import("resource://gre/modules/jsdebugger.jsm", {});
  tmp.addDebuggerToGlobal(tmp);
  let dbg = new tmp.Debugger();

  let jsterm = HUD.jsterm;
  let win = content.wrappedJSObject;
  let dbgWindow = dbg.addDebuggee(content);
  let container = win._container;

  // Make sure autocomplete does not walk through generators.
  let result = container.gen1.next().value;
  let completion = JSPropertyProvider(dbgWindow, null, "_container.gen1.");
  isnot(completion.matches.length, 0, "Got matches for gen1");

  is(result + 1, container.gen1.next().value, "gen1.next() did not execute");

  result = container.gen2.next().value;

  completion = JSPropertyProvider(dbgWindow, null, "_container.gen2.");
  isnot(completion.matches.length, 0, "Got matches for gen2");

  is((result / 2 + 1) * 2, container.gen2.next().value,
     "gen2.next() did not execute");

  completion = JSPropertyProvider(dbgWindow, null, "window._container.");
  ok(completion, "matches available for window._container");
  ok(completion.matches.length, "matches available for window (length)");

  dbg.removeDebuggee(content);
  jsterm.clearOutput();

  jsterm.execute("window._container", (msg) => {
    jsterm.once("variablesview-fetched", testVariablesView.bind(null, HUD));
    let anchor = msg.querySelector(".message-body a");
    EventUtils.synthesizeMouse(anchor, 2, 2, {}, HUD.iframeWindow);
  });
}

function testVariablesView(aWebconsole, aEvent, aView) {
  findVariableViewProperties(aView, [
    { name: "gen1", isGenerator: true },
    { name: "gen2", isGenerator: true },
  ], { webconsole: aWebconsole }).then(function () {
    executeSoon(finishTest);
  });
}
