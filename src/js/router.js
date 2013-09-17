define(['lib/maria'], function(maria) {
  var namespace = {};

  maria.Model.subclass(namespace, 'Router', {
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

  return namespace.Router;
});
