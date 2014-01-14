maria.SetModel.subclass(ave, 'SetModel', {
  constructor: function() {
    maria.SetModel.apply(this, arguments);
    ave.ValidationHelper.apply(this);
    maria.on(this, 'change', this);
    this._nextId = 1;
  },

  properties: {
    childAdded: function(model) {
    },

    childDeleted: function(model) {
    },

    childChanged: function(model) {
    },

    toJSON: function() {
      return JSON.stringify(this.dump.apply(this, arguments));
    },

    load: function(data) {
      this._loading = true;
      for (var i = 0; i < data.models.length; i++) {
        var model = new this._modelConstructor();
        model.load(data.models[i]);
        this.add(model);
      }
      this._loading = false;
      this._nextId = data._nextId;
    },

    dump: function() {
      var data = {models: [], _nextId: this._nextId};
      var args = arguments;
      this.forEach(function(model) {
        data.models.push(model.dump.apply(model, args));
      });
      return data;
    },

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
        evt.stopPropagation();
        this.validatesChild(evt.target);
      }
      else if (evt.type == 'change') {
        if (evt.target === this) {
          for (var i = 0; i < evt.addedTargets.length; i++) {
            var model = evt.addedTargets[i];

            // start listening to validate events for added targets
            maria.on(model, 'validate', this);
            model.parentNode = this;
            if (!this._loading) {
              model.setId(this._nextId++);
            }
            this.childAdded(model);
          }

          for (var i = 0; i < evt.deletedTargets.length; i++) {
            var model = evt.deletedTargets[i];

            // stop listening to validate events for removed targets
            maria.off(model, 'validate', this);

            this.childDeleted(model);
          }
        }
        else {
          // determine if the child is part of this set model (maybe overkill)
          this.some(function(model) {
            if (model === evt.target) {
              this.childChanged(evt);
              return true;
            }
            return false;
          }, this);
        }
      }
      else {
        maria.SetModel.prototype.handleEvent.apply(this, arguments);
      }
    },

    save: function() {
      this.dispatchEvent({type: 'save'});
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

ave.SetModel.fromJSON = function(json) {
  var data = JSON.parse(json);
  var setModel = new this();
  setModel.load(data);
  return setModel;
};

ave.SetModel.subclass = function(namespace, name, options) {
  if (options && options.modelConstructor) {
    var properties = options.properties || (options.properties = {});
    properties._modelConstructor = options.modelConstructor;
  }
  ave.Model.subclass.apply(this, arguments);
  namespace[name].fromJSON = ave.SetModel.fromJSON;
};
