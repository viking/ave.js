define([
  'lib/prod',
  'lib/sinon',
  'lib/maria',
  'ave'
], function(prod, sinon, maria, ave) {
  var Router = ave.Router;

  return new prod.Suite('Router', {
    setUp: function() {
      this.window = {
        history: {
          pushState: sinon.stub()
        },
        addEventListener: sinon.stub()
      };
      this.router = new Router();
      this.router.setWindow(this.window);
    },

    "static page": new prod.Suite('static page', {
      setUp: function() {
        this.window.location = { href: '/index.html' };
        this.router.setRootUrl('/index.html');
      },

      "urlFor": function() {
        this.assertEquals(this.router.urlFor('/'), '/index.html');
        this.assertEquals(this.router.urlFor('/bar'), '/index.html#/bar');
      },

      "initial route": function(done) {
        var self = this;
        maria.on(this.router, 'route', done(function(evt) {
          self.assertEquals('root', evt.name)
        }));
        this.router.route();
      },

      "added route": function(done) {
        this.router.addRoute('/foo', 'foo');
        this.window.location = { href: '/index.html#/foo' };

        var self = this;
        maria.on(this.router, 'route', done(function(evt) {
          this.assertEquals('foo', evt.name);
        }));
        this.router.route();
      },

      "go": function(done) {
        this.router.addRoute('/foo', 'foo');

        var self = this;
        maria.on(this.router, 'route', done(function(evt) {
          self.assertEquals('foo', evt.name);
        }));
        this.router.go('/index.html#/foo');
        this.assertCalledWith(this.window.history.pushState, {}, '', '/index.html#/foo');
      },
    }),

    "non-static page": new prod.Suite('non-static page', {
      setUp: function() {
        this.window.location = { href: '/foo/' };
        this.router.setRootUrl('/foo/');
      },

      "urlFor": function() {
        this.assertEquals(this.router.urlFor('/'), '/foo/');
        this.assertEquals(this.router.urlFor('/bar'), '/foo/bar');
      },

      "initial route": function(done) {
        var self = this;
        maria.on(this.router, 'route', done(function(evt) {
          self.assertEquals('root', evt.name)
        }));
        this.router.route();
      },

      "added route": function(done) {
        this.router.addRoute('/foo', 'foo');
        this.window.location = { href: '/foo/foo' };

        var self = this;
        maria.on(this.router, 'route', done(function(evt) {
          this.assertEquals('foo', evt.name);
        }));
        this.router.route();
      },

      "go": function(done) {
        this.router.addRoute('/foo', 'foo');

        var self = this;
        maria.on(this.router, 'route', done(function(evt) {
          self.assertEquals('foo', evt.name);
        }));
        this.router.go('/foo/foo');
        this.assertCalledWith(this.window.history.pushState, {}, '', '/foo/foo');
      },

      "reacting to popstate": function(done) {
        this.assertCalledWith(this.window.addEventListener, 'popstate');

        this.router.addRoute('/foo', 'foo');
        this.router.route();
        this.router.go('/foo/foo');

        var self = this;
        maria.on(this.router, 'route', done(function(evt) {
          self.assertEquals('root', evt.name);
        }));

        // simulate popstate call
        this.window.addEventListener.getCall(0).args[1]({})
      },

      "double route call does nothing": function() {
        var spy = sinon.spy();
        maria.on(this.router, 'route', spy);
        this.router.route();
        this.router.route();
        this.assertCalled(spy, 1);
      },
    })
  })
});
