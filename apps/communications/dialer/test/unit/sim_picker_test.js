/* globals MockMozMobileConnection, MockMozNavigatorSettings, OptionMenu,
           SimPicker, SimSettingsHelper */

'use strict';

requireApp('communications/dialer/test/unit/mock_lazy_loader.js');
requireApp('communications/dialer/test/unit/mock_l10n.js');
requireApp('communications/dialer/test/unit/mock_mozMobileConnection.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');

requireApp('communications/shared/js/sim_picker.js');
requireApp('communications/shared/js/sim_settings_helper.js');
requireApp('communications/shared/js/option_menu.js');

var mocksHelperForSimPicker = new MocksHelper([
  'LazyL10n',
  'LazyLoader'
]).init();

suite('SIM picker', function() {
  var subject;
  var realMozSettings;
  var realMozMobileConnections;
  var realMozL10n;
  var button;

  mocksHelperForSimPicker.attachTestHelpers();

  suiteSetup(function() {
    subject = SimPicker;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = [];

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;
    // We have to add a stub function to localize because SIM picker uses it,
    // but it's tested in the OptionMenu tests.
    navigator.mozL10n.localize = function() {};

    button = document.createElement('button');
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    navigator.mozMobileConnections = realMozMobileConnections;
  });

  function checkClickCallback(done) {
    subject.init(button, null, function() {
      done();
    });

    subject._touchStart();
    subject._touchEnd();
  }

  suite('<= 1 SIMs', function() {
    setup(function() {
      button = document.createElement('button');
      navigator.mozMobileConnections = [MockMozMobileConnection];
    });

    test('should get click callback when tapping', checkClickCallback);

    test('should not show SIM picker menu when long pressing', function(done) {
      var onerrorStub = this.sinon.stub();

      subject.init(button, function(cardIndex) {
        sinon.assert.called(onerrorStub);
      });

      subject._touchStart();
      setTimeout(function() {
        done();
      }, 500);
    });
  });

  suite('>= 2 SIMs', function() {
    setup(function() {
      navigator.mozMobileConnections =
        [this.sinon.stub(), MockMozMobileConnection];
    });

    test('should get click callback when tapping', checkClickCallback);

    test('should show SIM picker menu when long pressing', function(done) {
      subject.init(button, null, null, function() {
        done();
      });

      subject._touchStart();
    });

    test('should fire SIM selected callback', function(done) {
      var onerrorStub = this.sinon.stub();

      subject.init(button, function(cardIndex) {
        if (cardIndex !== 1) {
          sinon.assert.called(onerrorStub);
        } else {
          done();
        }
      }, null, function() {
        subject._simSelectedCallback(1);
      });

      subject._touchStart();
    });
  });

  suite('always ask', function() {
    setup(function() {
      navigator.mozMobileConnections =
        [this.sinon.stub(), MockMozMobileConnection];

      var settings = {};
      settings[SimSettingsHelper.SETTINGS_KEY_TELEPHONY] =
        SimSettingsHelper.ALWAYS_ASK_OPTION_VALUE;

      MockNavigatorSettings.createLock().set(settings);
    });

    test('should show SIM picker when clicked', function(done) {
      subject.init(button, null, null, function() {
        done();
      }, SimSettingsHelper.SETTINGS_KEY_TELEPHONY);

      subject._touchStart();
      subject._touchEnd();
    });
  });
});
