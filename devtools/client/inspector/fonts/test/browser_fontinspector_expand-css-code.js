/* vim: set ts=2 et sw=2 tw=80: */
/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that the font-face css rule code is collapsed by default, and can be expanded.

const TEST_URI = URL_ROOT + "browser_fontinspector.html";

add_task(function* () {
  let { view } = yield openFontInspectorForURL(TEST_URI);
  let viewDoc = view.document;

  info("Expanding the details section of the first font");
  let fontEl = getUsedFontsEls(viewDoc)[0];
  yield expandFontDetails(fontEl);

  info("Checking that the css font-face rule is collapsed by default");
  let codeEl = fontEl.querySelector(".font-css-code");
  is(codeEl.textContent, "@font-face {}", "The font-face rule is collapsed");

  info("Expanding the rule by clicking on the expander icon");
  let onExpanded = BrowserTestUtils.waitForCondition(() => {
    return codeEl.textContent === `@font-face {
  font-family: "bar";
  src: url("bad/font/name.ttf"), url("ostrich-regular.ttf") format("truetype");
}`;
  }, "Waiting for the font-face rule");

  let expander = fontEl.querySelector(".font-css-code .theme-twisty");
  expander.click();
  yield onExpanded;

  ok(true, "Font-face rule is now expanded");
});
