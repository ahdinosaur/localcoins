var path = require('path'),
    url = require('url'),
    fs = require('fs'),
    readline = require('readline'),
    resource = require('resource'),
    request = require('request'),
    async = require('async');

var clientID = "cff0d0765c4648791ba9",
    clientSecret = "4cc3b235432c1ea8a4c2e877ee287a199e9ee025";

var site = {
  name: "localbitcoins.com",
  root: "https://localbitcoins.com"
};

var configPath;
if (process.env.XDG_CONFIG_HOME) {
  configPath = path.join(process.env.XDG_CONFIG_HOME, ".config/localcoins");
} else {
  configPath = path.join(process.env.HOME, ".config/localcoins");
}


/**
 * prompts for username and password
 * @return {string} result.user
 * @return {string} result.pass
 */
var promptUserAndPass = function (callback) {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question(site.name + " username: ", function(user) {
    rl.question(site.name + " password: ", function(pass) {
      console.log(user, pass);
      rl.close();
      return callback(null, {
        user: user.trim(),
        pass: pass.trim()
      });
    });
  });
};

/**
 * authenticates using username and password
 * @param {string} options.user username
 * @param {string} options.pass password
 */
var authUsingUserAndPass = function (options, callback) {
  request.post(site.root + "/oauth2/access_token", {
    form: {
      client_id: clientID,
      client_secret: clientSecret,
      grant_type: "password",
      username: options.user,
      password: options.pass
    }
  }, function(err, res, body) {
    if (err) { return callback(err); }
    body = JSON.parse(body);
    if (body.error) {
      console.log("ERROR!", body.error);
      return callback(null, undefined);
    }
    return callback(null, {
      user: options.user,
      accessToken: body.access_token,
      refreshToken: body.refresh_token
    });
  });
};

/**
 *
 */
var authFlow = function(callback) {
  async.waterfall([
    promptUserAndPass,
    authUsingUserAndPass],
    function(err, credentials) {
      console.log(err, credentials);
      if (err) {
        return callback(err);
      } else if (!credentials) {
        return authFlow(callback);
      } else {
        return callback(null, credentials);
      }
    });
};

/**
 * read config
 */
var readConfig = function (callback) {
  fs.readFile(configPath, function(err, data) {
    if (err && err.code === "ENOENT") {
      return callback(null, {});
    } else if (err) {
      return callback(err);
    } else {
      return callback(null, JSON.parse(data));
    }
  });
};

/**
 * write config
 */
var writeConfig = function (config, callback) {
  var str = JSON.stringify(config, null, 2);
  fs.writeFile(configPath, str, callback);
};


/**
 * saves credentials for later use
 */
var saveCredentials = function (credentials, callback) {
  // read existing config
    if (err) { return callback(err); }
  config.credentials = config.credentials || {};
  config.credentials[site.name] = credentials;
  writeConfig(config, function(err) {
    // return access token for immediate use
    return callback(err, credentials.accessToken);
  });
};

/**
 *
 */
var recurseProps = function (obj, props) {
  if (props.length === 0 ||
    typeof obj === 'undefined') {
    return obj;
  } else {
    recurseProps(obj[props.pop()], props);
  }
};

var token = function(callback) {

  async.waterfall([
    readConfig,
    function(config, callback) {
      config.credentials = config.credentials || {};
      config.credentials[site.name] = config.credentials[site.name] || {};
      // TODO support using refresh token
      if (!config.credentials[site.name].accessToken) {
        authFlow(function(err, credentials) {
          if (err) { return callback(err); }
          config.credentials[site.name] = credentials;
          writeConfig(config, function(err) {
            return callback(err, config);
          });
        });
      } else {
        return callback(null, config);
      }
    },
    function(config, callback) {
      var token = config.credentials[site.name].accessToken;
      return callback(null, token);
    }],
    callback);
};

var post = function(route, data, callback) {
  token(function(err, token) {
    var form = data;
    form.access_token = token;
    request.post(site.root + route, {
      form: form
    }, function(err, res, body) {
      return callback(err, JSON.parse(body));
    });
  });
};


//
// public methods below
//

var escrows = resource.define('escrows');

var escrowsAll = function (callback) {
  post('/api/escrows/', {}, callback);
};
escrows.method('all', escrowsAll, {
  description: "lists all escrows of token",
  properties: {
    callback: {
      type: 'function'
    }
  }
});

var escrowsRelease = function (escrowID, callback) {
  post('/api/escrow_release/'+escrowID+'/', {}, callback);
};
escrows.method('release', escrowsRelease, {
  description: "releases an escrow of token by escrowID",
  properties: {
    escrowID: {
      type: 'string'
    },
    callback: {
      type: 'function'
    }
  }
});

var ads = resource.define('ads');

var adsAll = function(callback) {
  post('/api/ads/', {}, callback);
};
ads.method('all', adsAll, {
  description: "lists all ads of token",
  properties: {
    callback: {
      type: 'function'
    }
  }
});

var adsUpdate = function(options, callback) {
  var route = '/api/ad/'+options['id']+'/';
  delete options['id'];
  post(route, options, callback);
};
ads.method('update', adsUpdate, {
  description: "updates ad of token by id",
  properties: {
    options: {
      type: 'object',
      properties: {
        id: {
          type: 'string'
        }
      }
    },
    callback: {
      type: 'function'
    }
  }
});

resource.use('cli').createRouter([ads, escrows]).route();