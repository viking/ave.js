require.config({
  baseUrl: '..',
  paths: {
    lib: 'lib',
    test: 'test/js'
  }
});

require([
  'lib/prod'
], function(prod) {
  var logger;
  prod.phantom = navigator.userAgent.match(/PhantomJS/);
  if (prod.phantom) {
    logger = new prod.ConsoleLogger(console);
  }
  else {
    logger = new prod.HtmlLogger(document);
  }
  var runner = new prod.Runner(logger);

  require([
    'test/test_util',
    'test/test_model',
    'test/test_input_view',
    'test/test_router',
    'test/test_set_model',
    'test/test_storage'
  ], function() {
    for (var i = 0; i < arguments.length; i++) {
      runner.addSuite(arguments[i]);
    }
    runner.run(function() {
      if (prod.phantom) {
        console.log("QUIT"); // tell phantom to stop
      }
    });
  });
});
