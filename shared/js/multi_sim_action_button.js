/* globals LazyLoader, SettingsListener, SimPicker */
/* exported MultiSimActionButton */

'use strict';

// Keep this in sync with SimSettingsHelper.
const ALWAYS_ASK_OPTION_VALUE = '-1';

var MultiSimActionButton = function MultiSimActionButton(
  button, callCallback, settingsKey, phoneNumberGetter) {
  this._button = button;
  this._callCallback = callCallback;
  this._settingsKey = settingsKey;
  this._phoneNumberGetter = phoneNumberGetter;

  this._button.addEventListener('click', this._click.bind(this));

  if (navigator.mozIccManager &&
      navigator.mozIccManager.iccIds.length > 1) {
    this._button.addEventListener('contextmenu', this._contextmenu.bind(this));

    var self = this;
    LazyLoader.load(['/shared/js/settings_listener.js'], function() {
      self._simIndication = self._button.querySelector('.js-sim-indication');

      SettingsListener.observe(settingsKey, 0,
                               self._settingsObserver.bind(self));

      var telephony = navigator.mozTelephony;
      if (telephony) {
        telephony.oncallschanged = self._onCallsChanged.bind(self);
        telephony.conferenceGroup.oncallschanged =
          self._onCallsChanged.bind(self);
      }
    });
  }
};

MultiSimActionButton.prototype._getCardIndex =
  function cb_getCardIndex(callback) {
  var self = this;
  LazyLoader.load(['/shared/js/sim_picker.js'], function() {
    var inUseSim = SimPicker.getInUseSim();
    if (inUseSim !== null) {
      callback(inUseSim);
      return;
    }

    callback(self._defaultCardIndex);
  });
};

MultiSimActionButton.prototype._click = function cb_click(event) {
  if (event) {
    event.preventDefault();
  }

  var phoneNumber = this._phoneNumberGetter && this._phoneNumberGetter();
  if (!navigator.mozIccManager || phoneNumber === '') {
    return;
  }

  if (navigator.mozIccManager.iccIds.length === 1) {
    this.performAction();
    return;
  }

  var self = this;
  self._getCardIndex(function(cardIndex) {
    // The user has requested that we ask them every time for this key,
    // so we prompt them to pick a SIM even when they only click.
    if (cardIndex == ALWAYS_ASK_OPTION_VALUE) {
      LazyLoader.load(['/shared/js/sim_picker.js'], function() {
        SimPicker.getOrPick(cardIndex, phoneNumber,
                            self.performAction.bind(self));
      });
    } else {
      self.performAction(cardIndex);
    }
  });
};

MultiSimActionButton.prototype._settingsObserver =
  function cb_settingsObserver(cardIndex) {
  this._defaultCardIndex = cardIndex;
  this._updateUI(cardIndex);
};

MultiSimActionButton.prototype._onCallsChanged =
  function cb_onCallsChanged(event) {
  var self = this;
  LazyLoader.load(['/shared/js/sim_picker.js'], function() {
    var inUseSim = SimPicker.getInUseSim();
    if (inUseSim !== null) {
      self._updateUI(inUseSim);
    }
  });
}

MultiSimActionButton.prototype._updateUI = function cb_updateUI(cardIndex) {
  if (cardIndex >= 0 &&
      navigator.mozIccManager &&
      navigator.mozIccManager.iccIds.length > 1) {
    if (this._simIndication) {
      var self = this;
      navigator.mozL10n.ready(function() {
        navigator.mozL10n.localize(self._simIndication,
                                   'sim-picker-button', {n: cardIndex+1});
      });
    }

    document.body.classList.add('has-preferred-sim');
  } else {
    document.body.classList.remove('has-preferred-sim');
  }
};

MultiSimActionButton.prototype._contextmenu = function cb_contextmenu(event) {
  // Don't do anything, including preventDefaulting the event, if the phone
  // number is blank. We don't want to preventDefault because we want the
  // contextmenu event to generate a click.
  var phoneNumber = this._phoneNumberGetter && this._phoneNumberGetter();
  if (!navigator.mozIccManager ||
      navigator.mozIccManager.iccIds.length === 0 ||
      phoneNumber === '' ||
      event.target.disabled) {
    return;
  }

  // If telephony is currently active (for example, in a call), we must use that
  // SIM for any actions, so we shouldn't show any facing options which allow
  // them to pick a different one.
  var telephony = navigator.mozTelephony;
  if (telephony &&
      ((telephony.calls && telephony.calls.length) ||
       (telephony.conferenceGroup &&
        telephony.conferenceGroup.calls &&
        telephony.conferenceGroup.calls.length))) {
    return;
  }

  if (event) {
    event.preventDefault();
  }

  var self = this;
  self._getCardIndex(function(cardIndex) {
    LazyLoader.load(['/shared/js/sim_picker.js'], function() {
      SimPicker.getOrPick(cardIndex, phoneNumber,
                          self.performAction.bind(self));
    });
  });
};

MultiSimActionButton.prototype.performAction =
  function cb_performAction(cardIndex) {
  var phoneNumber = this._phoneNumberGetter && this._phoneNumberGetter();
  if (phoneNumber === '') {
    return;
  }

  if (cardIndex !== undefined) {
    this._callCallback(phoneNumber, cardIndex);
  } else {
    var self = this;
    this._getCardIndex(function(cardIndex) {
      self._callCallback(phoneNumber, cardIndex);
    });
  }
};
