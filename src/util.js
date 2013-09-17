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
