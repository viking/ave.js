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
ave.RouteHelper = function() {
};

ave.RouteHelper.prototype.urlFor = function(url) {
  if (this.parentNode) {
    return this.parentNode.urlFor(url);
  }
  return url;
};

ave.RouteHelper.mixin = function(obj) {
  obj.urlFor = ave.RouteHelper.prototype.urlFor;
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
            element.value = this._savedValues[name];
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
            values[name] = element.value;
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
