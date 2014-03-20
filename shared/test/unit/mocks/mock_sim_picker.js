/* exported MockSimPicker */

'use strict';

var MockSimPicker = {
  mInUseSim: null,
  init: function() { },
  getOrPick: function() { },
  getInUseSim: function() { return this.mInUseSim; },
  mTeardown: function() { this.mInUseSim = null; }
};
