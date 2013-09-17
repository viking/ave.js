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
