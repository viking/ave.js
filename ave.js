define(['lib/maria'], function(maria) {
var ave = {};
ave.capitalize = function(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

ave.camelize = function(string) {
  var result = '';
  string.split('_').forEach(function(s) {
    result += ave.capitalize(s);
  });
  return result;
};

ave.numProperties = function(object) {
  var num = 0;
  for (key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      num++;
    }
  }
  return num;
};

ave.clearProperties = function(object) {
  for (key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      delete object[key];
    }
  }
};

ave.instantiateModel = function(modelClass, attributes) {
  var model = new modelClass();
  for (key in attributes) {
    var method = 'set' + ave.camelize(key);
    model[method].call(model, attributes[key]);
  }
  return model;
};

ave.send = function(receiver, method, arguments) {
  return receiver[method].apply(receiver, arguments);
};

ave.deepEqual = function(a, b) {
  if (a === b) return true;
  if (typeof(a) != typeof(b)) return false;
  if (typeof(a) != 'object') return a == b;
  if (a == null || b == null) return false;

  if (a instanceof Array && b instanceof Array) {
    if (a.length != b.length) return false;

    for (var i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  var aKeys = [];
  for (var key in a) {
    aKeys.push(key);
  }

  for (var key in b) {
    var index = aKeys.indexOf(key);
    if (index < 0) {
      return false;
    }
    aKeys.splice(index, 1);

    if (!ave.deepEqual(a[key], b[key])) {
      return false;
    }
  }

  if (aKeys.length > 0) {
    return false;
  }

  return true;
};

ave.isBlank = function(value) {
  return value == null || value == '';
};
ave.RouteHelper = function() {
};

ave.RouteHelper.prototype.urlFor = function(url) {
  if (this.parentNode) {
    return this.parentNode.urlFor(url);
  }
  return url;
};

ave.RouteHelper.prototype.go = function(url) {
  if (this.parentNode) {
    return this.parentNode.go(url);
  }
  return url;
};

ave.RouteHelper.mixin = function(obj) {
  obj.urlFor = ave.RouteHelper.prototype.urlFor;
  obj.go = ave.RouteHelper.prototype.go;
  ave.RouteHelper.call(obj);
};
ave.ValidationHelper = function() {
  this._errors = {};
}

maria.borrow(ave.ValidationHelper.prototype, {
  validate: function() {
  },

  isValid: function() {
    ave.clearProperties(this._errors);
    this.validate();
    this.dispatchEvent({type: 'validate'});

    /* check for errors */
    return ave.numProperties(this._errors) == 0;
  },

  addError: function(name, msg) {
    var errors = this._errors[name] || (this._errors[name] = []);
    errors.push(msg);
  },

  getErrors: function() {
    return this._errors;
  },
});
maria.ElementView.subclass(ave, 'InputView', {
  constructor: function() {
    maria.ElementView.apply(this, arguments);
    ave.RouteHelper.mixin(this);
  },
  properties: {
    buildTemplate: function() {
      maria.ElementView.prototype.buildTemplate.apply(this, arguments);
      this._savedValues = this._getValues(false);
    },

    getValues: function() {
      return this._getValues(true);
    },

    saveValues: function() {
      this._savedValues = this._getValues(false);
    },

    reset: function() {
      var elements = this._findAllFormElements();
      for (var i = 0; i < elements.length; i++) {
        var element = elements[i];
        var name = element.getAttribute('name');
        if (name != null) {
          if (element.tagName == 'SELECT') {
            element.selectedIndex = this._savedValues[name];
          }
          else {
            if (element.getAttribute('type') == 'checkbox') {
              element.checked = this._savedValues[name];
            }
            else {
              element.value = this._savedValues[name];
            }
          }
          this._removeErrorClass(element);
        }
      }
    },

    displayErrors: function(errors) {
      var elements = this._findAllFormElements();
      for (var i = 0; i < elements.length; i++) {
        var name = elements[i].getAttribute('name');
        if (name && errors.hasOwnProperty(name)) {
          this._addErrorClass(elements[i]);
        }
      }
    },

    _findAllFormElements: function() {
      var elements = this.findAll('input');
      var textareas = this.findAll('textarea');
      elements.push.apply(elements, textareas);
      var selects = this.findAll('select');
      elements.push.apply(elements, selects);

      return elements;
    },

    _addErrorClass: function(elt) {
      var classAttr = elt.getAttribute('class');
      if (classAttr && !classAttr.match(/ *error */)) {
        classAttr += ' error';
      }
      else {
        classAttr = 'error';
      }
      elt.setAttribute('class', classAttr);
    },

    _removeErrorClass: function(elt) {
      var classAttr = elt.getAttribute('class');
      if (classAttr) {
        elt.setAttribute('class', classAttr.replace(/ *error */, ''));
      }
    },

    _getValues: function(useOptionValues) {
      var values = {};
      var elements = this._findAllFormElements();
      for (var i = 0; i < elements.length; i++) {
        var element = elements[i];
        var name = element.getAttribute('name');
        if (name != null) {
          if (element.tagName == 'SELECT') {
            if (useOptionValues) {
              var option = element.options[element.selectedIndex];
              values[name] = option ? option.value : null;
            }
            else {
              values[name] = element.selectedIndex;
            }
          }
          else {
            if (element.getAttribute('type') == 'checkbox') {
              values[name] = element.checked;
            }
            else {
              values[name] = element.value;
            }
          }
        }
      }
      return values;
    }
  }
});

ave.InputView.subclass = function() {
  maria.ElementView.subclass.apply(this, arguments);
};
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
        var originalValues = {};
        originalValues[name] = this._attributes[name];

        this._attributes[name] = value;
        if (!quiet) {
          this.dispatchEvent({
            type: 'change', originalValues: originalValues
          });
        }
        return true;
      }
      return false;
    },

    setAttributes: function(object, quiet) {
      var changed = false;
      var originalValues = {};
      for (var key in object) {
        var originalValue = this.getAttribute(key);
        if (this.setAttribute(key, object[key], true)) {
          changed = true;
          originalValues[key] = originalValue;
        }
      }
      if (changed && !quiet) {
        this.dispatchEvent({type: 'change', originalValues: originalValues});
      }
    },

    load: function(data) {
      // override to control JSON unserialization
      var name;
      for (name in this._associations) {
        var association = this._associations[name];
        var obj = new association.constructor();
        obj.load(data[name]);
        this[association.setterName].call(this, obj);
        delete(data[name]);
      }

      this.setAttributes(data, true);
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
        attributes[name] = obj.dump.apply(obj, arguments);
      }
      return attributes;
    },

    toJSON: function() {
      return JSON.stringify(this.dump.apply(this, arguments));
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
          ave.isBlank(this._attributes[attributeName])) {
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

    handleEvent: function(evt) {
      if (evt.type == 'validate') {
        evt.stopPropagation();
      }
    },

    save: function(evt) {
      this.dispatchEvent({type: 'save'});
    }
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
      var setterName;
      var getterName = 'get' + ave.camelize(associationName);
      var propertyName = '_' + associationName;
      var config = options.associations[associationName];

      switch (config.type) {
        case 'hasMany':
          setterName = '_set' + ave.camelize(associationName);
          var constructor = config.constructor;
          if (config.getter) {
            properties[getterName] = config.getter;
          }
          else {
            (function(associationName, getterName, setterName, propertyName, constructor) {
              properties[getterName] = function() {
                this.dispatchEvent({
                  type: 'association',
                  associationName: associationName,
                  associationType: 'hasMany',
                  method: 'get'
                });
                if (!this[propertyName]) {
                  this[setterName].call(this, new constructor());
                }
                return this[propertyName];
              };
            })(associationName, getterName, setterName, propertyName, constructor);
          }

          (function(setterName, propertyName) {
            properties[setterName] = function(obj) {
              if (this[propertyName]) {
                throw "property is already set";
              }

              obj.parentNode = this;
              obj.addParentEventTarget(this);
              maria.on(obj, 'validate', this);
              this[propertyName] = obj;
            };
          })(setterName, propertyName);

          break;
        case 'hasOne':
          setterName = 'set' + ave.capitalize(associationName);
          var constructor = config.constructor;
          if (config.getter) {
            properties[getterName] = config.getter;
          }
          else {
            (function(associationName, getterName, propertyName) {
              properties[getterName] = function() {
                this.dispatchEvent({
                  type: 'association',
                  associationName: associationName,
                  associationType: 'hasOne',
                  method: 'get'
                });
                return this[propertyName];
              };
            })(associationName, getterName, propertyName);
          }

          (function(setterName, propertyName, constructor) {
            properties[setterName] = function(model) {
              if (model instanceof constructor) {
                if (this[propertyName]) {
                  var oldModel = this[propertyName];
                  oldModel.removeParentEventTarget(this);
                  if (oldModel.parentNode === this) {
                    delete(oldModel.parentNode);
                  }
                }
                this[propertyName] = model;
                model.parentNode = this;
                model.addParentEventTarget(this);
                this.dispatchEvent({type: 'change'});
              }
              else {
                throw("model is not an instance of the specified constructor");
              }
            };
          })(setterName, propertyName, constructor);
          break;
      }

      config.getterName = getterName;
      config.setterName = setterName;
      config.propertyName = propertyName;
    }
  }
  if (options.attributeNames) {
    for (var i = 0; i < options.attributeNames.length; i++) {
      var attributeName = options.attributeNames[i];
      var camelized = ave.camelize(attributeName);
      var getterName = 'get' + camelized;
      var setterName = 'set' + camelized;

      if (!properties.hasOwnProperty(getterName)) {
        (function(attributeName, getterName) {
          properties[getterName] = function() {
            return this.getAttribute(attributeName);
          }
        })(attributeName, getterName);
      }

      if (!properties.hasOwnProperty(setterName)) {
        (function(attributeName, setterName) {
          properties[setterName] = function(value) {
            this.setAttribute(attributeName, value);
          }
        })(attributeName, setterName);
      }
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
maria.Model.subclass(ave, 'Storage', {
  constructor: function() {
    maria.Model.apply(this, arguments);
    this._collections = {};
  },

  properties: {
    getBackend: function() {
      if (typeof(this._backend) == "undefined") {
        this.setBackend(localStorage);
      }
      return this._backend;
    },

    setBackend: function(backend) {
      this._backend = backend;
      if (typeof(backend) == "object") {
        this._mode = "local";
      }
      else if (typeof(backend) == "string") {
        this._mode = "remote";
      }
    },

    getMode: function() {
      return this._mode;
    },

    register: function(collectionName, setModelConstructor, callback) {
      var backend = this.getBackend();
      var mode = this.getMode();

      if (mode == "local") {
        var setModel;

        if (collectionName in backend) {
          setModel = setModelConstructor.fromJSON(backend[collectionName]);
        }
        else {
          setModel = new setModelConstructor();
        }

        this._register(collectionName, setModelConstructor, setModel);
      }
      else if (mode == "remote") {
        var xhr = new XMLHttpRequest();
        var self = this;
        xhr.onreadystatechange = function() {
          if (xhr.readyState != 4)
            return;

          var setModel;
          if (xhr.responseText != '') {
            setModel = setModelConstructor.fromJSON(xhr.responseText);
          }
          else {
            setModel = new setModelConstructor();
          }
          self._register(collectionName, setModelConstructor, setModel);
          callback();
        };
        xhr.open("get", backend + "/" + collectionName + ".json");
        xhr.send();
      }
    },

    getCollection: function(collectionName) {
      return this._collections[collectionName].setModel;
    },

    _register: function(collectionName, setModelConstructor, setModel) {
      var self = this;
      maria.on(setModel, 'save', function(evt) {
        self._update(collectionName);
      });

      this._collections[collectionName] = {
        setModel: setModel,
        modelConstructor: setModelConstructor.modelConstructor
      };
    },

    _update: function(collectionName) {
      var backend = this.getBackend();
      var mode = this.getMode();
      var data = this._collections[collectionName].setModel.toJSON();
      var event = {type: 'change', collectionName: collectionName};

      if (mode == "local") {
        backend[collectionName] = data;
        this.dispatchEvent(event);
      }
      else if (mode == "remote") {
        var xhr = new XMLHttpRequest();
        var self = this;
        xhr.onreadystatechange = function() {
          if (xhr.readyState != 4)
            return;

          self.dispatchEvent(event);
        };
        xhr.open("post", backend + "/" + collectionName + ".json");
        xhr.send(new Blob([data]));
      }
    },
  }
});
maria.Model.subclass(ave, 'Router', {
  constructor: function() {
    maria.Model.apply(this, arguments)
    this._routes = [];
  },

  properties: {
    setWindow: function(window) {
      if (this._window) {
        maria.off(this._window, 'popstate', this, 'route');
      }
      this._window = window;
      maria.on(window, 'popstate', this, 'route');
    },

    setRootUrl: function(url) {
      if (url.match(/\.html$/)) {
        this._rootUrl = url;
        this._useAnchors = true;
        this._rootUrlPattern = new RegExp("^" + this._rootUrl + '#?');
      }
      else {
        this._rootUrl = url.replace(/\/$/, "");
        this._rootUrlPattern = new RegExp("^" + this._rootUrl);
      }
    },

    addRoute: function(pattern, name) {
      this._routes.push([pattern, name]);
    },

    route: function() {
      var url = this._window.location.href;
      if (url != this._currentUrl && this._urlIsValid(url)) {
        this._route(url);
        return true;
      }
      return false;
    },

    go: function(url) {
      if (!url.match(/^\w+:|^\//)) {
        url = this.urlFor(url);
      }
      if (this._urlIsValid(url)) {
        this._window.history.pushState({}, "", url);
        this._route(url);
        return true;
      }
      return false;
    },

    urlFor: function(url) {
      url = url.replace(/^\//, '');
      if (this._useAnchors) {
        return (url == '' ? this._rootUrl : this._rootUrl + '#/' + url);
      }
      return this._rootUrl + '/' + url;
    },

    // private methods

    _urlIsValid: function(url) {
      return url.match(this._rootUrlPattern);
    },

    _route: function(url) {
      var name, args = [];

      var relativeUrl = url.replace(this._rootUrlPattern, "");
      if ((this._useAnchors && relativeUrl == "") || (!this._useAnchors && relativeUrl == "/")) {
        name = 'root';
      }
      else {
        for (var i = 0; i < this._routes.length; i++) {
          var routePattern = this._routes[i][0];
          var routeName = this._routes[i][1];

          if (typeof(routePattern) == 'string') {
            if (routePattern == relativeUrl) {
              name = routeName;
              break;
            }
          }
          else {
            var md = relativeUrl.match(routePattern);
            if (md) {
              name = routeName;
              args = md.slice(1);
              break;
            }
          }
        }
      }
      if (name) {
        this.dispatchEvent({type: 'route', name: name, args: args})
      }
      else {
        throw "the url \"" + url + "\" didn't match any routes";
      }
      this._currentUrl = url;
    },
  }
});
return ave;
});
