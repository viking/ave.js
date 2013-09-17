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

ave.arraysEqual = function(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length != b.length) return false;

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};
