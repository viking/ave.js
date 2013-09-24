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
