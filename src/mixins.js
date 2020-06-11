import {kTangoRestContext} from "@waltz-controls/waltz-tango-rest-plugin";
import {kUserContext} from "@waltz-controls/waltz-user-context-plugin";
import {kControllerUserAction} from "@waltz-controls/waltz-user-actions-plugin";

/**
 * Limits and reverses list element
 *
 * @type {{limit: number, addFirst(*=): void}}
 */
export const BoundedReverseList = {
    limit : 100,
    /**
     * Adds an element to this list but places it on top. Removes elements that are exceed limit.
     *
     * @param item
     */
    addFirst(item) {
        const id = this.add(item);
        this.moveTop(id);
        while (this.data.count() > (this.config.limit || this.limit)) {
            this.remove(this.getLastId());
        }
    }
}

/**
 * Performs action defined in run function only if this component is visible
 *
 * User may define before_start and/or after_stop to perform extra action before/after start/stop
 *
 * @type {webix.mixin}
 * @property {function} [before_start]
 * @property {function} [after_stop]
 * @memberof mixins
 */
export const Runnable = {
    _delay: 1000,
    _intervalId: 0,
    /**
     * @memberof mixins.Runnable
     */
    start: function () {
        this._intervalId = setInterval(function () {
            if (!this.$destructed && this.isVisible())
                this.run();
        }.bind(this), this._delay);
    },
    /**
     * @returns {boolean}
     * @memberof mixins.Runnable
     */
    isRunning:function(){
        return this._intervalId !== 0;
    },
    /**
     * @param {number} delay
     * @memberof mixins.Runnable
     */
    changeDelay: function (delay) {
        this._delay = delay;
        this.stop();
        this.start();
    },
    /**
     * @memberof mixins.Runnable
     */
    stop: function () {
        clearInterval(this._intervalId);
        this._intervalId = 0;
    }
}

/**
 * A bunch of convenient getters
 *
 * @type {{getUserContext(): Promise<UserContext>, getTangoRest(): Promise<TangoRestApi>, beforeCloseMain(): void, getUserActionsController(): UserActionController}}
 */
export const WaltzWidgetMixin = {
    /**
     *
     * @return {Promise<TangoRestApi>}
     */
    getTangoRest(){
        return this.config.root.app.getContext(kTangoRestContext);
    },

    /**
     *
     * @return {Promise<UserContext>}
     */
    getUserContext(){
        return this.config.root.app.getContext(kUserContext);
    },

    /**
     *
     * @return {UserActionController}
     */
    getUserActionsController(){
        return this.config.root.app.getController(kControllerUserAction);
    },

    /**
     * Calls this root's beforeClose
     *
     * @see ScriptingWidget#beforeCloseMain
     */
    beforeCloseMain(){
        this.config.root.beforeCloseMain && this.config.root.beforeCloseMain();
    }
}

/**
 * Provides hide/show methods for settings (this.$$('settings')) form element
 *
 * @type {{hideSettings(): void, toggleSettings(): void, showSettings(): void}}
 */
export const ToggleSettings = {
    toggleSettings(){
        const $$settings = this.$$('settings');
        if($$settings.isVisible()){
            this.hideSettings();
        } else {
            this.showSettings();
        }
    },
    hideSettings() {
        const $$settings = this.$$('settings');
        $$settings.hide();
    },
    showSettings() {
        const $$settings = this.$$('settings');
        $$settings.show();
    }
}

function devicesTreeIdToTangoId(tree, id) {
    const item = tree.getItem(id);
    const host = tree.getTangoHostId(item);

    return TangoId.fromDeviceId(`${host}/${item.device_name}`)
}

/**
 * Defines onBeforeDrop for this widget.
 *
 * Calls this.config.root.addXXX(TangoId), where XXX: Device, Attribute, Command, Pipe
 *
 * @type {WebixMixin}
 */
export const TangoDropTarget = {
    extension() {
        return {
            on: {
                onBeforeDrop(context) {
                    if (context.from === this) return true;
                    if (context.from.config.view === 'device_tree_list' && //drop attribute from device control panel
                        context.from.config.$id === 'attrs') {
                        this.config.root.addAttribute(TangoId.fromMemberId(context.source[0]));
                    }
                    if (context.from.config.view === 'device_tree_list' && //drop command from device control panel
                        context.from.config.$id === 'commands') {
                        this.config.root.addCommand(TangoId.fromMemberId(context.source[0]));
                    }
                    if (context.from.config.view === 'device_tree_list' && //drop command from device control panel
                        context.from.config.$id === 'pipes') {
                        this.config.root.addPipe(TangoId.fromMemberId(context.source[0]));
                    } else if (context.from.config.view === 'devices_tree' && //drop from tango devices tree
                        (context.from.getItem(context.source[0]).isAlias || context.from.getItem(context.source[0]).isMember)) {
                        this.config.root.addDevice(devicesTreeIdToTangoId(context.from, context.source[0]));
                    } else {
                        this.getTopParentView().showOverlay(`${context.from.config.$id} are not supported by this widget`);
                    }

                    return false;
                }
            }
        }
    },
    $init(config) {
        webix.extend(config, this.extension());
    }
}