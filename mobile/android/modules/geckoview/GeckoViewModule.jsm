/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

this.EXPORTED_SYMBOLS = ["GeckoViewModule"];

ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyGetter(this, "dump", () =>
    ChromeUtils.import("resource://gre/modules/AndroidLog.jsm",
                       {}).AndroidLog.d.bind(null, "ViewModule"));

function debug(aMsg) {
  // dump(aMsg);
}

class GeckoViewModule {
  constructor(aModuleName, aWindow, aBrowser, aEventDispatcher) {
    this.isRegistered = false;
    this.window = aWindow;
    this.browser = aBrowser;
    this.eventDispatcher = aEventDispatcher;
    this.moduleName = aModuleName;

    this.eventDispatcher.registerListener(
      () => this.onSettingsUpdate(), "GeckoView:UpdateSettings"
    );

    this.eventDispatcher.registerListener(
      (aEvent, aData, aCallback) => {
        if (aData.module == this.moduleName) {
          this._register();
          this.messageManager.sendAsyncMessage("GeckoView:Register", aData);
        }
      }, "GeckoView:Register"
    );

    this.eventDispatcher.registerListener(
      (aEvent, aData, aCallback) => {
        if (aData.module == this.moduleName) {
          this.messageManager.sendAsyncMessage("GeckoView:Unregister", aData);
          this._unregister();
        }
      }, "GeckoView:Unregister"
    );

    this.init();
    this.onSettingsUpdate();
  }

  // Override this with module initialization.
  init() {}

  // Called when settings have changed. Access settings via this.settings.
  onSettingsUpdate() {}

  _register() {
    if (this.isRegistered) {
      return;
    }
    this.register();
    this.isRegistered = true;
  }

  register() {}

  _unregister() {
    if (!this.isRegistered) {
      return;
    }
    this.unregister();
    this.isRegistered = false;
  }

  unregister() {}

  get settings() {
    let view = this.window.arguments[0].QueryInterface(Ci.nsIAndroidView);
    return Object.freeze(view.settings);
  }

  get messageManager() {
    return this.browser.messageManager;
  }
}
