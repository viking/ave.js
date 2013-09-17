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
