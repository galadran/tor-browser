 /* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* eslint no-unused-vars: [2, {"vars": "local"}] */
/* import-globals-from ../../test/head.js */
"use strict";

// Import the inspector's head.js first (which itself imports shared-head.js).
Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/devtools/client/inspector/test/head.js",
  this);

Services.prefs.setCharPref("devtools.inspector.activeSidebar", "fontinspector");
registerCleanupFunction(() => {
  Services.prefs.clearUserPref("devtools.inspector.activeSidebar");
});

/**
 * The font-inspector doesn't participate in the inspector's update mechanism
 * (i.e. it doesn't call inspector.updating() when updating), so simply calling
 * the default selectNode isn't enough to guaranty that the panel has finished
 * updating. We also need to wait for the fontinspector-updated event.
 */
var _selectNode = selectNode;
selectNode = function* (node, inspector, reason) {
  let onUpdated = inspector.once("fontinspector-updated");
  yield _selectNode(node, inspector, reason);
  yield onUpdated;
};

/**
 * Adds a new tab with the given URL, opens the inspector and selects the
 * font-inspector tab.
 * @return {Promise} resolves to a {toolbox, inspector, view} object
 */
var openFontInspectorForURL = Task.async(function* (url) {
  yield addTab(url);
  let {toolbox, inspector} = yield openInspector();

  // Call selectNode again here to force a fontinspector update since we don't
  // know if the fontinspector-updated event has been sent while the inspector
  // was being opened or not.
  yield selectNode("body", inspector);

  return {
    toolbox,
    inspector,
    view: inspector.fontinspector
  };
});

/**
 * Focus one of the preview inputs, clear it, type new text into it and wait for the
 * preview images to be updated.
 *
 * @param {FontInspector} view - The FontInspector instance.
 * @param {String} text - The text to preview.
 */
function* updatePreviewText(view, text) {
  info(`Changing the preview text to '${text}'`);

  let doc = view.document;
  let previewImg = doc.querySelector("#sidebar-panel-fontinspector .font-preview");

  info("Clicking the font preview element to turn it to edit mode");
  let onClick = once(doc, "click");
  previewImg.click();
  yield onClick;

  let input = previewImg.parentNode.querySelector("input");
  is(doc.activeElement, input, "The input was focused.");

  info("Blanking the input field.");
  while (input.value.length) {
    let update = view.inspector.once("fontinspector-updated");
    EventUtils.sendKey("BACK_SPACE", doc.defaultView);
    yield update;
  }

  if (text) {
    info("Typing the specified text to the input field.");
    let update = waitForNEvents(view.inspector, "fontinspector-updated", text.length);
    EventUtils.sendString(text, doc.defaultView);
    yield update;
  }

  is(input.value, text, "The input now contains the correct text.");
}

async function expandFontDetails(fontEl) {
  info("Expanding a font details section");

  let onExpanded = BrowserTestUtils.waitForCondition(() => isFontDetailsVisible(fontEl),
                                                     "Waiting for font details");
  let twisty = fontEl.querySelector(".theme-twisty");
  twisty.click();
  await onExpanded;
}

function isFontDetailsVisible(fontEl) {
  return [...fontEl.querySelectorAll(".font-css-name, .font-css-code, .font-format-url")]
         .every(el => el.getBoxQuads().length);
}

/**
 * Get all of the <li> elements for the fonts used on the currently selected element.
 *
 * @param  {document} viewDoc
 * @return {Array}
 */
function getUsedFontsEls(viewDoc) {
  return viewDoc.querySelectorAll("#font-container > .fonts-list > li");
}

/**
 * Expand the other fonts accordion.
 */
async function expandOtherFontsAccordion(viewDoc) {
  info("Expanding the other fonts section");

  let accordion = viewDoc.querySelector("#font-container .accordion");
  let isExpanded = () => accordion.querySelector(".fonts-list");

  if (isExpanded()) {
    return;
  }

  let onExpanded = BrowserTestUtils.waitForCondition(isExpanded,
                                                     "Waiting for other fonts section");
  accordion.querySelector(".theme-twisty").click();
  await onExpanded;
}

/**
 * Get all of the <li> elements for the fonts used elsewhere in the document.
 *
 * @param  {document} viewDoc
 * @return {Array}
 */
function getOtherFontsEls(viewDoc) {
  return viewDoc.querySelectorAll("#font-container .accordion .fonts-list > li");
}

/**
 * Given a font element, return its name.
 *
 * @param  {DOMNode} fontEl
 *         The font element.
 * @return {String}
 *         The name of the font as shown in the UI.
 */
function getName(fontEl) {
  return fontEl.querySelector(".font-name").textContent;
}
