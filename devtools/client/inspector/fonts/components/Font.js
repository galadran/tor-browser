/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { createFactory, PureComponent } = require("devtools/client/shared/vendor/react");
const dom = require("devtools/client/shared/vendor/react-dom-factories");
const PropTypes = require("devtools/client/shared/vendor/react-prop-types");

const FontPreview = createFactory(require("./FontPreview"));

const { getStr } = require("../utils/l10n");
const Types = require("../types");

class Font extends PureComponent {
  static get propTypes() {
    return {
      font: PropTypes.shape(Types.font).isRequired,
      fontOptions: PropTypes.shape(Types.fontOptions).isRequired,
      onPreviewFonts: PropTypes.func.isRequired,
    };
  }

  constructor(props) {
    super(props);

    this.state = {
      isFontExpanded: false,
      isFontFaceRuleExpanded: false,
    };

    this.onFontToggle = this.onFontToggle.bind(this);
    this.onFontFaceRuleToggle = this.onFontFaceRuleToggle.bind(this);
  }

  componentWillReceiveProps(newProps) {
    if (this.props.font.name === newProps.font.name) {
      return;
    }

    this.setState({
      isFontExpanded: false,
      isFontFaceRuleExpanded: false,
    });
  }

  onFontToggle() {
    this.setState({
      isFontExpanded: !this.state.isFontExpanded
    });
  }

  onFontFaceRuleToggle() {
    this.setState({
      isFontFaceRuleExpanded: !this.state.isFontFaceRuleExpanded
    });
  }

  renderFontCSS(cssFamilyName) {
    return dom.p(
      {
        className: "font-css-name"
      },
      `${getStr("fontinspector.usedAs")} "${cssFamilyName}"`
    );
  }

  renderFontCSSCode(rule, ruleText) {
    if (!rule) {
      return null;
    }

    // Cut the rule text in 3 parts: the selector, the declarations, the closing brace.
    // This way we can collapse the declarations by default and display an expander icon
    // to expand them again.
    let leading = ruleText.substring(0, ruleText.indexOf("{") + 1);
    let body = ruleText.substring(ruleText.indexOf("{") + 1, ruleText.lastIndexOf("}"));
    let trailing = ruleText.substring(ruleText.lastIndexOf("}"));

    let { isFontFaceRuleExpanded } = this.state;

    return dom.pre(
      {
        className: "font-css-code",
      },
      this.renderFontCSSCodeTwisty(),
      leading,
      isFontFaceRuleExpanded ?
        null
        :
        dom.span(
          {
            className: "font-css-code-expander"
          }
        ),
      isFontFaceRuleExpanded ? body : null,
      trailing
    );
  }

  renderFontTypeAndURL(url, format) {
    if (!url) {
      return dom.p(
        {
          className: "font-format-url"
        },
        getStr("fontinspector.system")
      );
    }

    return dom.p(
      {
        className: "font-format-url"
      },
      getStr("fontinspector.remote"),
      dom.a(
        {
          className: "font-url",
          href: url
        },
        format
      )
    );
  }

  renderFontName(name) {
    return dom.h1(
      {
        className: "font-name",
        onClick: this.onFontToggle,
      },
      name
    );
  }

  renderFontTwisty() {
    let { isFontExpanded } = this.state;
    return this.renderTwisty(isFontExpanded, this.onFontToggle);
  }

  renderFontCSSCodeTwisty() {
    let { isFontFaceRuleExpanded } = this.state;
    return this.renderTwisty(isFontFaceRuleExpanded, this.onFontFaceRuleToggle);
  }

  renderTwisty(isExpanded, onClick) {
    let attributes = {
      className: "theme-twisty",
      onClick,
    };
    if (isExpanded) {
      attributes.open = "true";
    }

    return dom.span(attributes);
  }

  render() {
    let {
      font,
      fontOptions,
      onPreviewFonts,
    } = this.props;

    let { previewText } = fontOptions;

    let {
      CSSFamilyName,
      format,
      name,
      previewUrl,
      rule,
      ruleText,
      URI,
    } = font;

    let { isFontExpanded } = this.state;

    return dom.li(
      {
        className: "font" + (isFontExpanded ? " expanded" : ""),
      },
      this.renderFontTwisty(),
      this.renderFontName(name),
      FontPreview({ previewText, previewUrl, onPreviewFonts }),
      dom.div(
        {
          className: "font-details"
        },
        this.renderFontTypeAndURL(URI, format),
        this.renderFontCSSCode(rule, ruleText),
        this.renderFontCSS(CSSFamilyName)
      )
    );
  }
}

module.exports = Font;
