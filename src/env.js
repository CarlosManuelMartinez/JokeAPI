const dotenv = require("dotenv");

const { colors } = require("svcorelib");

const col = colors.fg;

/** @typedef {import("svcorelib").JSONCompatible} JSONCompatible*/
/** @typedef {import("./types/env").Env} Env */
/** @typedef {import("./types/env").EnvDependentProp} EnvDependentProp */


/** All environment-dependent settings */
const envSettings = Object.freeze({
    prod: {
        name: "JokeAPI",
        httpPort: 8076,
        baseUrl: "https://v2.jokeapi.dev",
    },
    stage: {
        name: "JokeAPI_ST",
        httpPort: 8075,
        baseUrl: "https://stage.jokeapi.dev",
    },
});

let initialized = false;
/** @type {Env} */
let env;


/**
 * Initializes the environment module
 */
function init()
{
    if(initialized)
        return;

    dotenv.config();

    if(!process.env || Object.keys(process.env).length === 0)
        throw new Error("no environment variables found, please make sure a NODE_ENV variable is defined");

    const nodeEnv = process.env.NODE_ENV ? process.env.NODE_ENV.toLowerCase() : null;

    switch(nodeEnv)
    {
    case "prod":
    case "production":
        env = "prod";
        break;
    default:
        env = "stage";
        break;
    }

    initialized = true;
}

/**
 * Normalizes the environment passed as the env var `NODE_ENV` and returns it
 * @param {boolean} [colored=false] Set to `true` to color in the predefined env colors
 * @returns {Env}
 */
function getEnv(colored = false)
{
    if(!initialized)
        init();

    const envCol = env === "prod" ? col.green : col.cyan;

    return colored === true ? `${envCol}${env}${col.rst}` : env;
}

/**
 * Returns a property of the environment-dependent settings
 * @param {EnvDependentProp} prop
 * @returns {JSONCompatible}
 */
function getProp(prop)
{
    const deplEnv = getEnv();

    try
    {
        return envSettings[deplEnv][prop];
    }
    catch(err)
    {
        console.error(`Error while resolving environment-dependent settings property '${prop}' in current env '${deplEnv}':\n${err instanceof Error ? err.stack : err}`);
        process.exit(1);
    }
}


module.exports = { init, getEnv, getProp };
