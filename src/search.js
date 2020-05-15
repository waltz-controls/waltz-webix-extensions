const search2 = webix.protoUI({
    name:"search2",
    $cssName:"search",
    $renderIcon:function(){
        const config = this.config;
        const height = config.aheight - 2*config.inputPadding,
            padding = (height - 18)/2 -1;
        let html = "", pos = 2;
        ["close", "search"].forEach(icon => {
            html+="<span style='right:"+pos+"px;height:"
                +(height-padding)+"px;padding-top:"+padding
                +"px;' class='webix_input_icon wxi-"+icon+"'></span>";

            pos+=24;
        });
        return html;
    },
    on_click:{
        "wxi-search":function(e){
            return this.callEvent("onFocus",[e]);
        },
        "wxi-close":function(e){
            this.setValue("");
            return this.callEvent("onFocus",[e]);
        }
    },
}, webix.ui.search);

/**
 * Creates search element with cross and zoom icons
 *
 * @param {string} target id
 * @param {string|function} filter
 */
export function newSearch(target, filter) {
    return {
        view: "search2",
        placeholder: "type to filter",
        borderless: true,
        value: "",
        on: {
            onTimedKeyPress: function () {
                this.getTopParentView().$$(target).filter(filter, this.getValue());
            },
            onFocus: function () {
                this.getTopParentView().$$(target).filter(filter, this.getValue());
            }
        }
    }
}

/**
 * Creates search element with cross and zoom icons + executes provided filter function. Also shows suggestData.
 *
 * @param {function} filter
 * @param {string[]} [suggestData=[]] suggest
 */
export function newComplexSearch(filter, suggestData = []){
    const suggest = webix.ui({
        view:"suggest",
        data:suggestData
    })

    return {
        view: "search2",
        id:"search",
        placeholder: "type to filter",
        borderless: true,
        value: "",
        suggest,
        on: {
            onItemClick(){
                //link suggest to the input
                $$(this.config.suggest).config.master = this;
                //show
                $$(this.config.suggest).show(this.$view)
            },
            onTimedKeyPress: filter,
            onFocus: filter
        }
    }
}