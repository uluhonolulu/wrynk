'use strict';
const { UserCredential } = require('loopback-component-passport');


var loopback = require('loopback');
var boot = require('loopback-boot');
var cookieParser = require('cookie-parser');
var session = require('express-session');
const Util = require('../lib/util');

var app = module.exports = loopback();
// Create an instance of PassportConfigurator with the app instance
var loopbackPassport = require('loopback-component-passport');
var PassportConfigurator = loopbackPassport.PassportConfigurator;
var passportConfigurator = new PassportConfigurator(app);


// Enable http session
app.middleware('session', session({
  secret: 'kitty',
  saveUninitialized: true,
  resave: true,
}));

// Load the provider configurations
var config = {};
try {
 config = require('../providers.json');
} catch(err) {
 console.error('Please configure your passport strategy in `providers.json`.');
 console.error('Copy `providers.json.template` to `providers.json` and replace the clientID/clientSecret values with your own.');
 process.exit(1);
}
// Initialize passport
passportConfigurator.init();

// console.log("models:" + JSON.stringify(app.models));

//composer settings need to be set before boot -- used in discovery
var composerSettings = {
  card: "admin@rynk",
  namespaces: 'never',
  authentication: true,
  multiuser: true
}
app.set('composer', composerSettings);


// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname);

// The access token is only available after boot
app.middleware('auth', loopback.token({
  model: app.models.accessToken,
}));

// Set up related models (needs to be after "boot", so that app.models are initialized)
passportConfigurator.setupModels({
  userModel: app.models.user,
  userIdentityModel: app.models.userIdentity,
  userCredentialModel: app.models.userCredential
});
// Configure passport strategies for third party auth providers
for(var s in config) {
  var c = config[s];
  c.session = c.session !== false;
  c.profileToUser = Util.profileToUser;
  passportConfigurator.configureProvider(s, c);
}

app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }

  });
};




// start the server if `$ node server.js`
if (require.main === module) {
  app.start();
}

async function importCard(path) {
  let data = await fs.readFile(path);
  let card = await IdCard.fromArchive(data);
  await cardStore.put(name, card);
  // Get the card back from the card store. This obviously looks a bit weird,
  // but importantly this will configure the LoopBack wallet on the connection
  // profile stored within the card.
  card = await cardStore.get(name);
  // Then we import the card into the card store using the admin connection.
  // This imports the credentials from the card into the LoopBack wallet.
  const adminConnection = new AdminConnection({ cardStore });
  await adminConnection.importCard(name, card);  
}