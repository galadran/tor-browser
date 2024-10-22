/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* See https://bugzilla.mozilla.org/show_bug.cgi?id=898559 */

function run_test()
{
  let sandbox = Components.utils.Sandbox("http://www.blah.com", {
    metadata: "test metadata",
    addonId: "12345"
  });

  Components.utils.importGlobalProperties(["XMLHttpRequest"]);

  Assert.equal(Components.utils.getSandboxMetadata(sandbox), "test metadata");
  Assert.equal(Components.utils.getSandboxAddonId(sandbox), "12345");

  sandbox = Components.utils.Sandbox("http://www.blah.com", {
    metadata: { foopy: { bar: 2 }, baz: "hi" }
  });

  let metadata = Components.utils.getSandboxMetadata(sandbox);
  Assert.equal(metadata.baz, "hi");
  Assert.equal(metadata.foopy.bar, 2);
  metadata.baz = "foo";

  metadata = Components.utils.getSandboxMetadata(sandbox);
  Assert.equal(metadata.baz, "foo");

  metadata = { foo: "bar" };
  Components.utils.setSandboxMetadata(sandbox, metadata);
  metadata.foo = "baz";
  metadata = Components.utils.getSandboxMetadata(sandbox);
  Assert.equal(metadata.foo, "bar");

  let thrown = false;
  let reflector = new XMLHttpRequest();

  try {
    Components.utils.setSandboxMetadata(sandbox, { foo: reflector });
  } catch(e) {
    thrown = true;
  }

  Assert.equal(thrown, true);

  sandbox = Components.utils.Sandbox(this, {
    metadata: { foopy: { bar: 2 }, baz: "hi" }
  });

  let inner = Components.utils.evalInSandbox("Components.utils.Sandbox('http://www.blah.com')", sandbox);

  metadata = Components.utils.getSandboxMetadata(inner);
  Assert.equal(metadata.baz, "hi");
  Assert.equal(metadata.foopy.bar, 2);
  metadata.baz = "foo";
}

