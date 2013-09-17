maria.SetModel.subclass(ave, 'SetModel', {
  constructor: function() {
    maria.SetModel.apply(this, arguments);
    ave.ValidationHelper.apply(this);
    maria.on(this, 'change', this);
  },

  properties: {
    validate: function() {
      var index = 0;
      this.forEach(function(model) {
        if (!model.isValid()) {
          this.addError('child/'+index, 'is invalid');
        }
      }, this);
    },

    validatesChild: function(model) {
    },

    validatesUnique: function(attributeName, model) {
      var value = model.getAttribute(attributeName);
      var valid = true;
      this.forEach(function(other) {
        if (valid && other !== this && other.getAttribute(attributeName) == value) {
          this.addError(attributeName, 'is already taken');
          valid = false;
        }
      }, model);
      return valid;
    },

    handleEvent: function(evt) {
      if (evt.type == 'validate') {
        this.validatesChild(evt.target);
      }
      else if (evt.type == 'change' && evt.target === this) {
        // start listening to validate events for added targets
        for (var i = 0; i < evt.addedTargets.length; i++) {
          var field = evt.addedTargets[i];
          maria.on(field, 'validate', this);
        }

        // stop listening to validate events for removed targets
        for (var i = 0; i < evt.deletedTargets.length; i++) {
          var field = evt.deletedTargets[i];
          maria.off(field, 'validate', this);
        }
      }
    }
  }
});

for (var key in ave.ValidationHelper.prototype) {
  if (Object.prototype.hasOwnProperty.call(ave.ValidationHelper.prototype, key)) {
    if (!Object.prototype.hasOwnProperty.call(ave.SetModel.prototype, key)) {
      ave.SetModel.prototype[key] = ave.ValidationHelper.prototype[key];
    }
  }
}

ave.SetModel.subclass = function() {
  ave.Model.subclass.apply(this, arguments);
};
