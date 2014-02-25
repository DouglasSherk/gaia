/* global LazyLoader, OptionMenu, SimSettingsHelper */
/* exported SimPicker */

'use strict';

(function(exports) {

  /*
   * SimPicker is a helper to dynamically generate menus for selecting SIM
   * cards when making calls, sending SMS, etc.
   */
  var SimPicker = {
    _button: null,
    _simSelectedCallback: null,
    _clickCallback: null,
    _simSelectMenuShownCallback: null,
    _settingsKey: null,
    _holdTimer: null,

    init: function hk_init(button,
                           simSelectedCallback,
                           clickCallback,
                           simSelectMenuShownCallback,
                           settingsKey) {
      this._button = button;
      this._simSelectedCallback = simSelectedCallback;
      this._clickCallback = clickCallback;
      this._simSelectMenuShownCallback = simSelectMenuShownCallback;
      this._settingsKey = settingsKey;

      LazyLoader.load(['/shared/js/sim_settings_helper.js',
                       '/shared/js/option_menu.js']);

      if (window.navigator.mozMobileConnections.length > 1) {
        button.addEventListener('touchstart',
                                this._touchStart.bind(this));
        button.addEventListener('touchend',
                                this._touchEnd.bind(this));
      }
    },

    _touchStart: function hk_touchStart(event) {
      // Detect long presses by setting a timer that gets canceled if the touch
      // ends.
      this._holdTimer = setTimeout(function(self) {
        self._holdTimer = null;
        self._showSelectSimMenu();
      }, 400, this);
    },

    _touchEnd: function hk_touchEnd(event) {
      if (this._holdTimer) {
        clearTimeout(this._holdTimer);
        this._holdTimer = null;

        var self = this;
        SimSettingsHelper.getCardIndexFrom('outgoingCall', function(cardIndex) {
          if (cardIndex == SimSettingsHelper.ALWAYS_ASK_OPTION_VALUE) {
            // The user has requested that we ask them every time for this key,
            // so we prompt them to pick a SIM even when they only click.
            self._showSelectSimMenu();
          } else if (self._clickCallback) {
            // This was a simple click, not a long press. Pass it along to the
            // click handler.
            self._clickCallback(event);
          }
        });
      }
    },

    _showSelectSimMenu: function hk_showSelectSimMenu() {
      var params = {
        headerL10nId: 'select-sim-dial-via',
        classes: ['select-sim-menu'],
        items: []
      };

      var self = this;
      SimSettingsHelper.getCardIndexFrom('outgoingCall', function(cardIndex) {
        var defaultCardIndex = cardIndex;

        function hk_simSelectedCallback(cardIndex) {
          self._simSelectedCallback(cardIndex);
        }

        for (var i = 0; i < window.navigator.mozMobileConnections.length; i++) {
          var appendElem = null;
          if (i === defaultCardIndex) {
            appendElem = document.createElement('span');
            appendElem.classList.add('sim-default');
            appendElem.textContent =
              navigator.mozL10n.localize(appendElem,
                                         'select-sim-menu-button-default');
          }

          params.items.push({
            l10nId: 'select-sim-menu-button',
            l10nArgs: {n: i+1},
            method: hk_simSelectedCallback,
            appendElem: appendElem,
            params: [i]
          });
        }
        params.items.push({
          l10nId: 'cancel',
          incomplete: true
        });

        new OptionMenu(params).show();

        if (self._simSelectMenuShownCallback) {
          self._simSelectMenuShownCallback();
        }
      });
    },
  };

  exports.SimPicker = SimPicker;

})(window);
