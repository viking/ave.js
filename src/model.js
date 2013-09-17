maria.Model.subclass(ave, 'Model', {
  constructor: function() {
    maria.Model.apply(this, arguments);
    ave.ValidationHelper.apply(this);

    this._attributes = {};
    if (this._attributeNames) {
      for (var i = 0; i < this._attributeNames.length; i++) {
        this._attributes[this._attributeNames[i]] = null;
      }
    }
  },
  properties: {
    _attributeNames: null,

    setAttribute: function(name, value, quiet) {
      if (this._attributeNames && this._attributeNames.indexOf(name) < 0) {
        throw("invalid attribute: " + name);
      }

      if (!ave.deepEqual(this._attributes[name], value)) {
        this._attributes[name] = value;
        if (!quiet) {
          this.dispatchEvent({type: 'change'});
        }
        return true;
      }
      return false;
    },

    setAttributes: function(object) {
      var changed = false;
      for (var key in object) {
        if (this.setAttribute(key, object[key], true)) {
          changed = true;
        }
      }
      if (changed) {
        this.dispatchEvent({type: 'change'});
      }
    },

    getAttribute: function(name) {
      if (this._attributeNames && this._attributeNames.indexOf(name) < 0) {
        throw("invalid attribute: " + name);
      }
      return this._attributes[name];
    },

    getAttributes: function() {
      return this._attributes;
    },

    validate: function() {
      for (name in this.associationGetters) {
        var getter = this.associationGetters[name];
        var obj = this[getter].call(this);
        if (!obj.isValid()) {
          this.addError(name, 'is invalid');
        }
      }
    },

    validatesPresence: function(attributeName) {
      if (!this._attributes.hasOwnProperty(attributeName) ||
          this._attributes[attributeName] == null ||
          this._attributes[attributeName] == "") {
        this.addError(attributeName, 'is required');
        return false;
      }
      return true;
    },

    validatesType: function(attributeName, type) {
      if (typeof(this._attributes[attributeName]) != type) {
        this.addError(attributeName, 'must be of type "' + type + '"');
        return false;
      }
      return true;
    },

    validatesFormat: function(attributeName, pattern) {
      var value = this._attributes[attributeName];
      if (value && !value.toString().match(pattern)) {
        this.addError(attributeName, 'is not in the correct format');
        return false;
      }
      return true;
    },
  }
});

for (var key in ave.ValidationHelper.prototype) {
  if (Object.prototype.hasOwnProperty.call(ave.ValidationHelper.prototype, key)) {
    if (!Object.prototype.hasOwnProperty.call(ave.Model.prototype, key)) {
      ave.Model.prototype[key] = ave.ValidationHelper.prototype[key];
    }
  }
}

ave.Model.subclass = function(namespace, name, options) {
  options = options || {};
  var properties = options.properties || (options.properties = {});
  properties.associationGetters = {};
  if (options.associations) {
    for (var associationName in options.associations) {
      var getterName = 'get' + ave.capitalize(associationName);
      var variableName = '_' + associationName;
      var config = options.associations[associationName];

      properties.associationGetters[associationName] = getterName;

      switch (config.type) {
        case 'hasMany':
          var setModel = config.setModel;
          (function(variableName, setModel) {
            properties[getterName] = function() {
              if (!this[variableName]) {
                this[variableName] = new setModel();
              }
              return this[variableName];
            }
          })(variableName, setModel);
          break;
        case 'hasOne':
          var setterName = 'set' + ave.capitalize(associationName);
          var constructor = config.modelConstructor;
          (function(variableName, constructor) {
            properties[getterName] = function() {
              return this[variableName];
            };
            properties[setterName] = function(model) {
              if (model instanceof constructor) {
                this[variableName] = model;
              }
              else {
                throw("model is not an instance of the specified constructor");
              }
            };
          })(variableName, constructor);
          properties[variableName] = null;
          break;
      }
    }
  }
  if (options.attributeNames) {
    for (var i = 0; i < options.attributeNames.length; i++) {
      var attributeName = options.attributeNames[i];
      var camelized = ave.camelize(attributeName);
      var getterName = 'get' + camelized;
      var setterName = 'set' + camelized;

      (function(attributeName) {
        properties[getterName] = function() {
          return this.getAttribute(attributeName);
        }
        properties[setterName] = function(value) {
          this.setAttribute(attributeName, value);
        }
      })(attributeName);
    }
    properties._attributeNames = options.attributeNames;
  }
  maria.subclass.call(this, namespace, name, options);
  var klass = namespace[name];

  if (options.entityName) {
    klass.entityName = options.entityName;
  }
  if (options.collectionName) {
    klass.collectionName = options.collectionName;
  }
};
