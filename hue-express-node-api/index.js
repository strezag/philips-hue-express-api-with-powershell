"use strict";

const config = require("config");
var cors = require("cors");
const express = require("express");
const { json } = require("express/lib/response");
const v3 = require("node-hue-api").v3;
const LightState = v3.lightStates.LightState;
var docs = require("express-mongoose-docs");

const allowedOrigins = "http://localhost:3000";

const CLIENT_ID = config.get("huedeveloperapi.client_id"),
  CLIENT_SECRET = config.get("huedeveloperapi.client_secret"),
  APP_ID = config.get("huedeveloperapi.app_id");

// You would retrieve these from where ever you chose to securely store them
const ACCESS_TOKEN = config.get("huedeveloperapi.access_token"),
  REFRESH_TOKEN = config.get("huedeveloperapi.refresh_token"),
  USERNAME = config.get("huedeveloperapi.access_token_username");

// A state value you can use to validate the Callback URL results with, it should not really be hardcoded, but should
// be dynamically generated.
const STATE = config.get("huedeveloperapi.state");

// Replace this with your authorization code that you get from the Callback URL for your Hue Remote API Application.
// If you do not fill this value in, the code will give you the URL to start the process for generating this value.
const authorizationCode = config.get("huedeveloperapi.authorization_code");
const port = 9000;

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin
      // (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        var msg =
          "The CORS policy for this site does not " +
          "allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
  })
);

const remoteBootstrap = v3.api.createRemote(CLIENT_ID, CLIENT_SECRET);

app.get("/", (req, res) =>
  res.json({
    state: "Running...obviously",
    message: "Change configured Philips Hue light colors based on an API call.",
  })
);

app.get("/authorize", (req, res) => {
  authorizeHueApi();
});

app.get("/lights", (req, res) => {
  getLightsList(res);
});

app.post("/lights/setlightstate/on", (req, res) => {
  try {
    //logRequestBodyValues(req);
    if (req.body.lightids == undefined) {
      return res.sendStatus(400);
    }
    let lightState = new LightState();
    lightState.on(true);

    req.body.lightids
      .map((i) => Number(i))
      .forEach((id) => {
        console.log(`Toggling light #${id} on.`);
        hueConnect(id, lightState);
      });
    console.log(`Command executed successfully.\n`);
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

app.post("/lights/setlightstate/off", (req, res) => {
  try {
    if (req.body.lightids == undefined) {
      return res.sendStatus(400);
    }
    let lightState = new LightState();
    lightState.off(true);

    req.body.lightids
      .map((i) => Number(i))
      .forEach((id) => {
        console.log(`Toggling light #${id} off.`);
        hueConnect(id, lightState);
      });
    console.log(`Command executed successfully.\n`);
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});
app.post("/lights/setlightstate", (req, res) => {
  try {
    logRequestBodyValues(req);
    console.log(`Color State: ${JSON.stringify(req.body)}`)
    if (req.body.lightids == undefined) {
      console.log("[lightids] body parameters is missing.");
      return res.sendStatus(400);
    } else if (req.body.colorstate == undefined && req.body.hue == undefined) {
      console.log(
        "[colorstate] OR [hue] body parameters are missing. Request requires one or the other."
      );
      return res.sendStatus(400);
    } else if ((req.body.colorstate !== undefined && req.body.hue >= 0)) {
      console.log(
        "Both [hue] AND [colorstate] are present in the requested body parameters.  Request requires one or the other, but not both."
      );
      return res.sendStatus(400);
    }

    // Brightness defaults - max 100
    if (req.body.brightness == undefined || req.body.brightness > 100) {
      req.body.brightness = 100;
    }

    // Hue defaults - max 65535
    if(req.body.hue !== undefined || req.body.hue >= 0){
      if(req.body.hue > 65535){
        console.log('Setting [hue] is over max 65535. Setting to max 65535');
        req.body.hue = 65535;
      }
    }

    // Saturation defaults - max 100
    if (req.body.saturation == undefined || req.body.saturation > 100) {
      req.body.saturation = 100;
    }

    // On state defaults
    if (req.body.onstate == undefined) {
      req.body.onstate = true;
    }

    let lightState = updateLightState(req);
    req.body.lightids
      .map((i) => Number(i))
      .forEach((id) => {
        console.log(`Applying light state to light ${id}.`);
        hueConnect(id, lightState);
      });
    console.log(`Command executed successfully.\n`);
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

function getLightsList(res) {
  if (ACCESS_TOKEN == null || REFRESH_TOKEN == null || USERNAME == null) {
    authorizeHueApi();
  } else {
    // The username value is optional, one will be create upon connection if one is not passed in, but this example is
    // pretending to be something close to what you would expect to operate like upon a reconnection using previously
    // obtained tokens and username.
    remoteBootstrap
      .connectWithTokens(ACCESS_TOKEN, REFRESH_TOKEN, USERNAME)
      .catch((err) => {
        console.error(
          "Failed to get a remote connection using existing tokens."
        );
        console.error(err);
        process.exit(1);
      })
      .then((api) => {
        // Successfully connected using the existing OAuth tokens.
        // Get all lights from the API
        api.lights.getAll().then((lights) => {
          res.json(lights);
        });
      });
  }
}

function logRequestBodyValues(req) {
  console.log(`Target Light IDs: ${req.body.lightids}`);
  console.log(`Target Color State: ${req.body.colorstate}`);
  console.log(`Target Hue: ${req.body.hue}`);
  console.log(`Target Saturation: ${req.body.saturation}`);
  console.log(`Target Brightness: ${req.body.brightness}`);
  console.log(`Alert Toggle: ${req.body.alert}`);
  console.log(`On State Toggle: ${req.body.onstate}`);
}

function colorPresetLightState(req, lightState) {
  let colors = {
    yellow: 11250,
    green: 27087,
    blue: 47325,
    pink: 55000,
    red: 65535,
  };

  let saturation = req.body.saturation;
  if (saturation !== undefined && saturation == 0) {
    saturation = 100;
  }
  lightState.saturation(saturation);

  let brightness = req.body.brightness;
  if (brightness !== undefined && brightness == 0) {
    brightness = 75;
  }
  lightState.brightness(brightness);

  console.log(`Switching to color: ${req.body.colorstate}`);
  switch (req.body.colorstate) {
    case "red":
      return lightState.hue(colors.red);
    case "blue":
      return lightState.hue(colors.blue);
    case "green":
      return lightState.hue(colors.green);
    case "yellow":
      return lightState.hue(colors.yellow);
    case "pink":
      return lightState.hue(colors.pink);
    default:
      return lightState.brightness(50).hue(1).saturation(1);
  }
}

function updateLightState(req) {
  console.log(`Updating light state: ${JSON.stringify(req.body)}`)
  let lightState = new LightState().on(true);

  if (req.body.onstate == false) {
    lightState.off(true);
    return lightState;
  }

  if (req.body.alert !== undefined) {
    lightState.alertShort();
  }

  if (req.body.colorstate !== undefined && req.body.colorstate !== "default") {
    lightState = colorPresetLightState(req, lightState);
  } else if (req.body.hue !== 0) {

    lightState.hue(req.body.hue);

    if (req.body.saturation !== 0) {
      lightState.saturation(req.body.saturation);
    }

    if (req.body.brightness !== 0) {
      lightState.brightness(req.body.brightness);
    }
  }
  return lightState;
}
function hueConnect(lightId, requestedState) {
  if (ACCESS_TOKEN == null || REFRESH_TOKEN == null || USERNAME == null) {
    authorizeHueApi();
  } else {
    try {
      remoteBootstrap
        .connectWithTokens(ACCESS_TOKEN, REFRESH_TOKEN, USERNAME)
        .catch((err) => {
          console.error(
            "Failed to get a remote connection using existing tokens."
          );
          console.error(err);
          process.exit(1);
        })
        .then((api) => {
          return api.lights.getLight(lightId).then((light) => {
            //console.log(`Requested state: ${JSON.stringify(requestedState)}`)
            return api.lights.setLightState(lightId, requestedState);
          });
        });
    } catch (error) {
      console.log(error);
    }
  }
}

function authorizeHueApi() {
  if (!authorizationCode) {
    console.log(
      "***********************************************************************************************"
    );
    console.log(
      `You need to generate an authorization code for your application using this URL:`
    );
    console.log(
      `${remoteBootstrap.getAuthCodeUrl("node-hue-api-remote", APP_ID, STATE)}`
    );
    console.log(
      "***********************************************************************************************"
    );
  } else {
    try {
      // Exchange the code for tokens and connect to the Remote Hue API
      remoteBootstrap
        .connectWithCode(authorizationCode)
        .catch((err) => {
          console.error(
            "Failed to get a remote connection using authorization code."
          );
          console.error(err);
          process.exit(1);
        })
        .then((api) => {
          console.log(
            "Successfully validated authorization code and exchanged for tokens"
          );

          const remoteCredentials = api.remote.getRemoteAccessCredentials();

          // Display the tokens and username that we now have from using the authorization code. These need to be stored
          // for future use.
          console.log(
            `Remote API Access Credentials:\n ${JSON.stringify(
              remoteCredentials,
              null,
              2
            )}\n`
          );
          console.log(
            `The Access Token is valid until:  ${new Date(
              remoteCredentials.tokens.access.expiresAt
            )}`
          );
          console.log(
            `The Refresh Token is valid until: ${new Date(
              remoteCredentials.tokens.refresh.expiresAt
            )}`
          );
          console.log(
            "\nNote: You should securely store the tokens and username from above as you can use them to connect\n" +
              "in the future."
          );
        });
    } catch (error) {
      console.log(error);
    }
  }
}

app.listen(port, () =>
  console.log(`Hue API app listening on port ${port}...\n`)
);

docs(app);
