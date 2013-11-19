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
