define(function() {
  var RouteHelper = function() {
  };

  RouteHelper.prototype.urlFor = function(url) {
    if (this.parentNode) {
      return this.parentNode.urlFor(url);
    }
    return url;
  };

  RouteHelper.mixin = function(obj) {
    obj.urlFor = RouteHelper.prototype.urlFor;
    RouteHelper.call(obj);
  };

  return RouteHelper;
});
