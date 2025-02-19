/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const { Component, createFactory } = require("devtools/client/shared/vendor/react");
const dom = require("devtools/client/shared/vendor/react-dom-factories");
const PropTypes = require("devtools/client/shared/vendor/react-prop-types");
const {findDOMNode} = require("devtools/client/shared/vendor/react-dom");
const {button, div} = dom;

const Menu = require("devtools/client/framework/menu");
const MenuItem = require("devtools/client/framework/menu-item");
const ToolboxTab = createFactory(require("devtools/client/framework/components/toolbox-tab"));

class ToolboxTabs extends Component {
  // See toolbox-toolbar propTypes for details on the props used here.
  static get propTypes() {
    return {
      currentToolId: PropTypes.string,
      focusButton: PropTypes.func,
      focusedButton: PropTypes.string,
      highlightedTools: PropTypes.object,
      panelDefinitions: PropTypes.array,
      selectTool: PropTypes.func,
      toolbox: PropTypes.object,
      L10N: PropTypes.object,
    };
  }

  constructor(props) {
    super(props);

    this.state = {
      overflow: false,
    };

    this.addFlowEvents = this.addFlowEvents.bind(this);
    this.removeFlowEvents = this.removeFlowEvents.bind(this);
    this.onOverflow = this.onOverflow.bind(this);
    this.onUnderflow = this.onUnderflow.bind(this);
  }

  componentDidUpdate() {
    this.addFlowEvents();
  }

  componentWillUnmount() {
    this.removeFlowEvents();
  }

  addFlowEvents() {
    this.removeFlowEvents();
    let node = findDOMNode(this);
    if (node) {
      node.addEventListener("overflow", this.onOverflow);
      node.addEventListener("underflow", this.onUnderflow);
    }
  }

  removeFlowEvents() {
    let node = findDOMNode(this);
    if (node) {
      node.removeEventListener("overflow", this.onOverflow);
      node.removeEventListener("underflow", this.onUnderflow);
    }
  }

  onOverflow() {
    this.setState({
      overflow: true
    });
  }

  onUnderflow() {
    this.setState({
      overflow: false
    });
  }

  /**
   * Render all of the tabs, based on the panel definitions and builds out
   * a toolbox tab for each of them. Will render an all-tabs button if the
   * container has an overflow.
   */
  render() {
    let {
      currentToolId,
      focusButton,
      focusedButton,
      highlightedTools,
      panelDefinitions,
      selectTool,
    } = this.props;

    let tabs = panelDefinitions.map(panelDefinition => ToolboxTab({
      currentToolId,
      focusButton,
      focusedButton,
      highlightedTools,
      panelDefinition,
      selectTool,
    }));

    // A wrapper is needed to get flex sizing correct in XUL.
    return div(
      {
        className: "toolbox-tabs-wrapper"
      },
      div(
        {
          className: "toolbox-tabs"
        },
        tabs
      ),
      this.state.overflow ? renderAllToolsButton(this.props) : null
    );
  }
}

module.exports = ToolboxTabs;

/**
 * Render a button to access all tools, displayed only when the toolbar presents an
 * overflow.
 */
function renderAllToolsButton(props) {
  let {
    currentToolId,
    panelDefinitions,
    selectTool,
    toolbox,
    L10N,
  } = props;

  return button({
    className: "all-tools-menu all-tabs-menu",
    tabIndex: -1,
    title: L10N.getStr("toolbox.allToolsButton.tooltip"),
    onClick: ({ target }) => {
      let menu = new Menu({
        id: "all-tools-menupopup"
      });
      panelDefinitions.forEach(({id, label}) => {
        menu.append(new MenuItem({
          checked: currentToolId === id,
          click: () => {
            selectTool(id);
          },
          id: "all-tools-menupopup-" + id,
          label,
          type: "checkbox",
        }));
      });

      let rect = target.getBoundingClientRect();
      let screenX = target.ownerDocument.defaultView.mozInnerScreenX;
      let screenY = target.ownerDocument.defaultView.mozInnerScreenY;

      // Display the popup below the button.
      menu.popup(rect.left + screenX, rect.bottom + screenY, toolbox);
      return menu;
    },
  });
}
