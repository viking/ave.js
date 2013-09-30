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

    load: function(data) {
      // override to control JSON unserialization
      var name;
      for (name in this._associations) {
        var association = this._associations[name];
        var obj = new association.constructor();
        obj.load(data[name]);
        this[association.propertyName] = obj;
        delete(data[name]);
      }

      this.setAttributes(data);
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

    dump: function() {
      // override to control JSON serialization
      var attributes = {};
      maria.borrow(attributes, this._attributes);

      var name;
      for (name in this._associations) {
        var association = this._associations[name];
        var obj = this[association.getterName].call(this);
        attributes[name] = obj.dump();
      }
      return attributes;
    },

    toJSON: function() {
      return JSON.stringify(this.dump());
    },

    validate: function() {
      var name;
      for (name in this._associations) {
        var association = this._associations[name];
        if (this.hasOwnProperty(association.propertyName)) {
          var obj = this[association.getterName].call(this);
          if (!obj.isValid()) {
            this.addError(name, 'is invalid');
          }
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

ave.Model.fromJSON = function(json) {
  var data = JSON.parse(json);
  var model = new this();
  model.load(data);
  return model;
};

ave.Model.subclass = function(namespace, name, options) {
  options = options || {};
  var properties = options.properties || (options.properties = {});
  properties.associations = {};
  if (options.associations) {
    properties._associations = options.associations;
    for (var associationName in options.associations) {
      var getterName = 'get' + ave.camelize(associationName);
      var propertyName = '_' + associationName;
      var config = options.associations[associationName];
      config.getterName = getterName;
      config.propertyName = propertyName;

      switch (config.type) {
        case 'hasMany':
          var constructor = config.constructor;
          (function(propertyName, constructor) {
            properties[getterName] = function() {
              if (!this[propertyName]) {
                var obj = new constructor()
                obj.parentNode = this;
                obj.addParentEventTarget(this);
                this[propertyName] = obj;
              }
              return this[propertyName];
            }
          })(propertyName, constructor);
          break;
        case 'hasOne':
          var setterName = 'set' + ave.capitalize(associationName);
          var constructor = config.constructor;
          (function(propertyName, constructor) {
            properties[getterName] = function() {
              return this[propertyName];
            };
            properties[setterName] = function(model) {
              if (model instanceof constructor) {
                if (this[propertyName]) {
                  this[propertyName].removeParentEventTarget(this);
                }
                this[propertyName] = model;
                model.addParentEventTarget(this);
                this.dispatchEvent({type: 'change'});
              }
              else {
                throw("model is not an instance of the specified constructor");
              }
            };
          })(propertyName, constructor);
          properties[propertyName] = null;
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
  klass.fromJSON = ave.Model.fromJSON;

  if (options.entityName) {
    klass.entityName = options.entityName;
  }
  if (options.collectionName) {
    klass.collectionName = options.collectionName;
  }
};
