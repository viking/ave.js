maria.SetModel.subclass(ave, 'SetModel', {
  constructor: function() {
    maria.SetModel.apply(this, arguments);
    ave.ValidationHelper.apply(this);
    maria.on(this, 'change', this);
    this._nextId = 1;
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
        for (var i = 0; i < evt.addedTargets.length; i++) {
          var model = evt.addedTargets[i];

          // start listening to validate events for added targets
          maria.on(model, 'validate', this);
          model.setId(this._nextId++);
        }

        for (var i = 0; i < evt.deletedTargets.length; i++) {
          var model = evt.deletedTargets[i];

          // stop listening to validate events for removed targets
          maria.off(model, 'validate', this);
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
