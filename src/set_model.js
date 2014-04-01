maria.SetModel.subclass(ave, 'SetModel', {
  constructor: function() {
    maria.SetModel.apply(this, arguments);
    ave.ValidationHelper.apply(this);
    maria.on(this, 'change', this);
    this._nextId = 1;
    this._changes = {addedTargets: [], deletedTargets: []};
  },

  properties: {
    childAdded: function(model) {
    },

    childDeleted: function(model) {
    },

    childChanged: function(model) {
    },

    toSortedArray: function() {
      return this.toArray();
    },

    toJSON: function() {
      return JSON.stringify(this.dump.apply(this, arguments));
    },

    load: function(data) {
      this._loading = true;
      for (var i = 0; i < data.length; i++) {
        var model = new this._modelConstructor();
        model.load(data[i]);
        this.add(model);
      }
      this._loading = false;
    },

    dump: function() {
      var data = [];
      var args = arguments;
      this.toSortedArray().forEach(function(model) {
        data.push(model.dump.apply(model, args));
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
            this.childAdded(model);
            this._changes.addedTargets.push(model);
          }

          for (var i = 0; i < evt.deletedTargets.length; i++) {
            var model = evt.deletedTargets[i];

            // stop listening to validate events for removed targets
            maria.off(model, 'validate', this);

            this.childDeleted(model);
            this._changes.deletedTargets.push(model);
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
      var evt = {
        type: 'save',
        addedTargets: this._changes.addedTargets.slice(0),
        deletedTargets: this._changes.deletedTargets.slice(0)
      };

      this.dispatchEvent(evt);
      this._changes.addedTargets.length = 0;
      this._changes.deletedTargets.length = 0;
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
