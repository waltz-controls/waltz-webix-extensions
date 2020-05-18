import 'codemirror/lib/codemirror.css';
import 'codemirror/addon/hint/show-hint.css';
//
import CodeMirror from 'codemirror/lib/codemirror.js';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/addon/hint/show-hint.js';
import 'codemirror/addon/hint/javascript-hint.js';

(function () {

    CodeMirror.extendMode("css", {
        commentStart: "/*",
        commentEnd: "*/",
        newlineAfterToken: function (_type, content) {
            return /^[;{}]$/.test(content);
        }
    });

    CodeMirror.extendMode("javascript", {
        commentStart: "/*",
        commentEnd: "*/",
        // FIXME semicolons inside of for
        newlineAfterToken: function (_type, content, textAfter, state) {
            if (this.jsonMode) {
                return /^[\[,{]$/.test(content) || /^}/.test(textAfter);
            } else {
                if (content == ";" && state.lexical && state.lexical.type == ")") return false;
                return /^[;{}]$/.test(content) && !/^;/.test(textAfter);
            }
        }
    });

    var inlineElements = /^(a|abbr|acronym|area|base|bdo|big|br|button|caption|cite|code|col|colgroup|dd|del|dfn|em|frame|hr|iframe|img|input|ins|kbd|label|legend|link|map|object|optgroup|option|param|q|samp|script|select|small|span|strong|sub|sup|textarea|tt|var)$/;

    CodeMirror.extendMode("xml", {
        commentStart: "<!--",
        commentEnd: "-->",
        newlineAfterToken: function (type, content, textAfter, state) {
            var inline = false;
            if (this.configuration == "html")
                inline = state.context ? inlineElements.test(state.context.tagName) : false;
            return !inline && ((type == "tag" && />$/.test(content) && state.context) ||
                /^</.test(textAfter));
        }
    });

    // Comment/uncomment the specified range
    CodeMirror.defineExtension("commentRange", function (isComment, from, to) {
        var cm = this, curMode = CodeMirror.innerMode(cm.getMode(), cm.getTokenAt(from).state).mode;
        cm.operation(function () {
            if (isComment) { // Comment range
                cm.replaceRange(curMode.commentEnd, to);
                cm.replaceRange(curMode.commentStart, from);
                if (from.line == to.line && from.ch == to.ch) // An empty comment inserted - put cursor inside
                    cm.setCursor(from.line, from.ch + curMode.commentStart.length);
            } else { // Uncomment range
                var selText = cm.getRange(from, to);
                var startIndex = selText.indexOf(curMode.commentStart);
                var endIndex = selText.lastIndexOf(curMode.commentEnd);
                if (startIndex > -1 && endIndex > -1 && endIndex > startIndex) {
                    // Take string till comment start
                    selText = selText.substr(0, startIndex)
                        // From comment start till comment end
                        + selText.substring(startIndex + curMode.commentStart.length, endIndex)
                        // From comment end till string end
                        + selText.substr(endIndex + curMode.commentEnd.length);
                }
                cm.replaceRange(selText, from, to);
            }
        });
    });

    // Applies automatic mode-aware indentation to the specified range
    CodeMirror.defineExtension("autoIndentRange", function (from, to) {
        var cmInstance = this;
        this.operation(function () {
            for (var i = from.line; i <= to.line; i++) {
                cmInstance.indentLine(i, "smart");
            }
        });
    });

    // Applies automatic formatting to the specified range
    CodeMirror.defineExtension("autoFormatRange", function (from, to) {
        var cm = this;
        var outer = cm.getMode(), text = cm.getRange(from, to).split("\n");
        var state = CodeMirror.copyState(outer, cm.getTokenAt(from).state);
        var tabSize = cm.getOption("tabSize");

        var out = "", lines = 0, atSol = from.ch == 0;

        function newline() {
            out += "\n";
            atSol = true;
            ++lines;
        }

        for (var i = 0; i < text.length; ++i) {
            var stream = new CodeMirror.StringStream(text[i], tabSize);
            while (!stream.eol()) {
                var inner = CodeMirror.innerMode(outer, state);
                var style = outer.token(stream, state), cur = stream.current();
                stream.start = stream.pos;
                if (!atSol || /\S/.test(cur)) {
                    out += cur;
                    atSol = false;
                }
                if (!atSol && inner.mode.newlineAfterToken &&
                    inner.mode.newlineAfterToken(style, cur, stream.string.slice(stream.pos) || text[i + 1] || "", inner.state))
                    newline();
            }
            if (!stream.pos && outer.blankLine) outer.blankLine(state);
            if (!atSol && i < text.length - 1) newline();
        }

        cm.operation(function () {
            cm.replaceRange(out, from, to);
            for (var cur = from.line + 1, end = from.line + lines; cur <= end; ++cur)
                cm.indentLine(cur, "smart");
            cm.setSelection(from, cm.getCursor(false));
        });
    });
})();

/**
 * Extends webix.ui.textarea with codemirror features
 *
 * Extends {@link https://docs.webix.com/api__refs__ui.textarea.html webix.ui.textarea}
 * @property {String} name
 * @property editor
 * @memberof ui.ScriptingConsole
 * @namespace codemirror_textarea
 */
export const codemirror_textarea = webix.protoUI(
    /** @lends codemirror_textarea.prototype */
    {
        name: "codemirror_textarea",
        editor: null,
        /**
         * @memberof ui.ScriptingConsole.codemirror_textarea
         */
        getValue: function () {
            return this.editor.getValue();
        },
        /**
         * @memberof ui.ScriptingConsole.codemirror_textarea
         */
        setValue: function (value) {
            if (!value || typeof value !== 'string') return;
            this.editor.setValue(value);
        },
        /**
         * @memberof ui.ScriptingConsole.codemirror_textarea
         * @constructor
         */
        $init: function (config) {
            this.$ready.push(() => this.adjust());

            this.$ready.push(() => {
                this.attachEvent('onAfterRender', () => {
                    if (!PRODUCTION) console.time('CodeMirror render');
                    const value = (this.editor) ? this.editor.getValue() : undefined;
                    this.editor = CodeMirror.fromTextArea(this.getInputNode(),
                        {
                            extraKeys: {"Ctrl-Space": "autocomplete"},
                            commands: {
                                indentAuto: "Ctrl-Alt-l"
                            },
                            mode: config.mode || "javascript",
                            lineNumbers: true,
                            gutter: true,
                            lineWrapping: true,
                            viewportMargin: Infinity,
                            ...config
                        });

                    this.setValue(value);
                    if (!PRODUCTION) console.timeEnd('CodeMirror render');
                    // ~ 20ms
                });

            });
        },
        defaults: {
            tooltip: 'Autocomplete: ctrl+space'
        }
    }, webix.ui.textarea);