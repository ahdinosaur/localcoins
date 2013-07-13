var path = require('path'),
    url = require('url'),
    fs = require('fs'),
    resource = require('resource');

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

localcoins = resource.define('localcoins');

/**
 * prompts for username and password
 * @return {string} result.user
 * @return {string} result.pass
 */
var promptUserAndPass = function (callback) {
  var prompt = require('prompt-lite');
  prompt.start();
  var schema = localcoins.authUsingUserAndPass.schema.properties.options;
  schema.properties.pass.hidden = true;
  prompt.get(schema, function(err, result) {
    return callback(null, {
      user: result.user.trim(),
      pass: result.pass
    });
  });
};
localcoins.method('promptUserAndPass', promptUserAndPass);

/**
 * authenticates using username and password
 * @param {string} options.user username
 * @param {string} options.pass password
 */
var authUsingUserAndPass = function (options, callback) {
  var request = require('request');
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
localcoins.method('authUsingUserAndPass', authUsingUserAndPass, {
  description: "oauth using username and password",
  properties: {
    options: {
      properties: {
        user: {
          description: site.name + " username",
          type: 'string',
          required: 'true'
        },
        pass: {
          description: site.name + " password",
          type: 'string',
          required: 'true'
        }
      }
    }
  }
});

/**
 *
 */
var authFlow = function(callback) {
  var async = require('async');
  async.waterfall([
    localcoins.promptUserAndPass,
    localcoins.authUsingUserAndPass],
    function(err, credentials) {
      if (err) {
        return callback(err);
      } else if (!credentials) {
        return localcoins.authFlow(callback);
      } else {
        return callback(null, credentials);
      }
    });
};
localcoins.method('authFlow', authFlow);

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
localcoins.method('readConfig', readConfig);

/**
 * write config
 */
var writeConfig = function (config, callback) {
  var str = JSON.stringify(config, null, 2);
  fs.writeFile(configPath, str, callback);
};
localcoins.method('writeConfig', writeConfig);

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
  var async = require('async');
  async.waterfall([
    localcoins.readConfig,
    function(config, callback) {
      config.credentials = config.credentials || {};
      config.credentials[site.name] = config.credentials[site.name] || {};
      // TODO support using refresh token
      if (!config.credentials[site.name].accessToken) {
        localcoins.authFlow(function(err, credentials) {
          if (err) { return callback(err); }
          config.credentials[site.name] = credentials;
          localcoins.writeConfig(config, function(err) {
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
localcoins.method('token', token);

var post = function(route, data, callback) {
  var request = require('request');
  localcoins.token(function(err, token) {
    var form = data;
    form.access_token = token;
    request.post(site.root + route, {
      form: form
    }, function(err, res, body) {
      return callback(err, JSON.parse(body));
    });
  });
};
localcoins.method('post', post, {
  description: "retrieves token and posts to localcoins site",
  properties: {
    route: {
      type: 'string',
      format: 'uri'
    },
    data: {
      type: 'object'
    },
    callback: {
      type: 'function'
    }
  }
});

localcoins.dependencies = {
  'async': '*',
  'request': '*',
  'prompt-lite': '*'
};


//
// public methods below
//

var escrows = resource.define('escrows');
escrows.dependencies = {};

var escrowsAll = function (callback) {
  localcoins.post('/api/escrows/', {}, callback);
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
  localcoins.post('/api/escrow_release/'+escrowID+'/', {}, callback);
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
ads.dependencies = {};

var adsAll = function(callback) {
  localcoins.post('/api/ads/', {}, callback);
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
  localcoins.post(route, options, callback);
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

localcoins.ads = ads;
localcoins.escrows = escrows;
localcoins.resources = [ads, escrows];

resource.use('cli').createRouter(localcoins.resources, {}, function(err, router) {
  if (err) { throw err; }
  router.route();
});