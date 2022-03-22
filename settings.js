const { getProp } = require("./src/env");

const packageJSON = require("./package.json");
const scl = require("svcorelib");
const col = scl.colors.fg;
const bgc = scl.colors.bg;

/**
 * Global settings for JokeAPI.  
 * (Yes this file is huge but this is intentional to make JokeAPI as dynamic but also configurable as possible)  
 *   
 * - The exported object `settings` can (and should) not be modified at runtime!  
 * - Developer Documentation: settings nodes are referred to like this: `settings.foo.bar`
 */
const settings = {
    /** Settings regarding debugging */
    debug: {
        verboseLogging: getProp("debug"), // extra debug output in the console
        dashboardEnabled: false,   // refreshes the init message on interval
        dashboardInterval: 1000,   // sets the interval (in ms) at which to refresh the init message (only if dashboard mode is enabled)
        progressBarDisabled: true, // set to true to disable the progress bar - greatly improves readability of verbose debug output in the startup phase
        onlyLogErrors: true,       // set to true to disable sending any console logs but error messages
    },
    /** General information about JokeAPI */
    info: {
        name: getProp("name"),                          // the name of JokeAPI
        desc: packageJSON.description,                  // the description of JokeAPI
        projGitHub: "https://github.com/Sv443/JokeAPI", // URL to the project's GitHub page
        version: packageJSON.version,                   // the version as a string
        versionInt: packageJSON.version.split(".").map(n=>parseInt(n)), // the version as a number array
        docsURL: getProp("baseUrl"),                    // the URL to the documentation of JokeAPI
        /** Info about JokeAPI's author (hello 👀) */
        author: {
            name: packageJSON.author.name,   // author name
            email: packageJSON.author.email, // author email
            website: packageJSON.author.url, // author website
            github: `https://github.com/${packageJSON.author.name}`, // author github page
        },
        privacyPolicyUrl: "https://sv443.net/privacypolicy/en",
        contribGuideUrl: "https://github.com/Sv443/JokeAPI/blob/master/.github/Contributing.md#readme",
    },
    /** Everything regarding JokeAPI's initialization */
    init: {
        mainFilePath: "./src/main.js",
        initDirs: [ // directories that should be generated if they don't exist - paths relative to root of project - doesn't necessarily need trailing slash
            "./data/logs",
            "./docs/compiled",
            "./data/auth",
            "./data/lists",
            "./data/submissions",
        ],
        exitSignals: [ // all signals that should cause a soft exit
            "SIGINT",
            "SIGTERM",
        ],
    },
    /** Request logging (to the console) */
    logging: {
        logChar: "▌",                  // character that gets logged on each request
        spacerAfter: 10,               // after how many logged requests a spacer should be put - set to 0 to disable
        disableLogging: false,         // set to true to disable logging a character on each request
        blacklistLoggingEnabled: true, // whether or not to log the character when an IP is on the blacklist
    },
    /** General joke settings */
    jokes: {
        jokesFormatVersion: 3,             // current joke format version
        jokesFolderPath: "./joke-files/",  // path to the jokes folder - needs trailing slash
        jokeSubmissionURL: `${getProp("baseUrl")}#submit`, // joke submission url
        jokeSubmissionPath: "./data/submissions/",         // path to a directory where joke submissions should be saved to - needs trailing slash
        submissions: {
            timeFrame: 60,                               // time frame of submission rate limiter (in seconds)
            rateLimiting: 5,                             // how many requests per timeframe should be allowed
            invalidCharRegex: /(?![\u0000-\u0fff])./gm,  // eslint-disable-line no-control-regex
            minLength: 2,                                // minimum amount of characters needed in joke submissions (per property)
            fuseThreshold: 0.4,                          // Fuse.js threshold for the submission script (default = 0.4, 0 = requires perfect match, 1 = everything matches)
            cache: {
                location: "./data/submissionCache.json", // Submission cache file location
                maxSize: 16000000,    // max size in bytes (default = 16000000 / 16 MB)
                maxAge: 4380,         // max age of the entry in hours (default = 4380 / 6 months)^,
                clearRatio: 0.1,      // floating point number between 0 and 1 of how many of the cache entries should be cleared when the max props above are reached
            },
        },
        jokesTemplateFile: "template.json",  // relative to "jokes.jokesFolderPath"
        /** Possible / available filter components of jokes */
        possible: {
            filterComponentTranslationFile: "./data/translations/filterComponents.json", // translations for the filter components
            anyCategoryName: "Any", // the name of the "Any" category - case insensitive / readable name
            categories: [           // all categories (excluding "Any") - case insensitive / readable name
                "Misc",
                "Programming",
                "Dark",
                "Pun",
                "Spooky",
                "Christmas",
            ],
            categoryAliases: { // aliases of categories. Alias at key gets resolved to category at value. Value has to be present in the "categories" array above - case sensitive / readable names
                "Miscellaneous": "Misc",
                "Coding": "Programming",
                "Development": "Programming",
                "Halloween": "Spooky",
            },
            flags: [ // all flags - HAVE TO BE LOWER CASE!
                "nsfw",
                "religious",
                "political",
                "racist",
                "sexist",
                "explicit",
            ],
            formats: [ // all file formats - HAVE TO BE LOWER CASE!
                "json",
                "xml",
                "yaml",
                "txt",
            ],
            types: [ // all joke types - HAVE TO BE LOWER CASE!
                "single",
                "twopart",
            ],
        },
        fileFormatsPath: "./data/fileFormats.json", // path to the file formats file
        /** default file format settings */
        defaultFileFormat: {
            fileFormat: "json",           // the default file format string
            mimeType: "application/json", // the default file format mime type
        },
        lastIDsMaxLength: 15,          // the maximum amount of joke IDs that get saved to the blacklist-array
        jokeRandomizationAttempts: 25, // after how many attempts of selecting a random joke to stop trying
        splitChars: [ ",", "+", "-" ], // which characters should separate the values of parameters with support for multiple values
        splitCharRegex: /[,+-]/gm,     // which characters should separate the values of parameters with support for multiple values
        maxAmount: 10,                 // the maximum amount of jokes that can be fetched with a single call to the get jokes endpoint
        /** logical operators for the `?contains` parameter - all of these should be percent-encodable with `encodeURIComponent()` and shouldn't be a [reserved character](https://datatracker.ietf.org/doc/html/rfc3986#section-2.2) */
        searchStringOperators: {
            wildcard: "*",   // wildcard / any-match character
            orOperator: "|", // OR operator to chain "expressions"
        },
        regexRepetitionLimit: 10, // Max limit of repetitions / wildcards allowed in regexes built based on user input - this is to prevent ReDoS attacks, see https://snyk.io/blog/redos-and-catastrophic-backtracking/
    },
    /** Settings for the `httpServer` module */
    httpServer: {
        port: getProp("httpPort"), // http server port
        allowCORS: true,           // whether or not to allow Cross Origin Resource Sharing
        rateLimiting: 100,         // amount of allowed requests per below defined timeframe
        timeFrame: 60,             // timeframe in seconds
        maxPayloadSize: 5120,      // max size (in bytes) that will be accepted in a PUT request - if payload exceeds this size, it will abort with status 413
        maxUrlLength: 250,         // max amount of characters of the URL - if the URL is longer than this, the request will abort with status 414
        infoHeaders: true,         // whether or not to add an informational header about JokeAPI to each request
        startupTimeout: 15,        // in seconds, timeout after which startup fails if the HTTP server couldn't start up (blocked port, etc.)
        submissionNoDataTimeout: 5000, // in milliseconds, timeout after which a submission request times out if no data was transmitted
        ipSanitization: {          // used to sanitize IP addresses so they can be used in file paths
            regex: /[^A-Za-z0-9\-_./]|^COM[0-9]([/.]|$)|^LPT[0-9]([/.]|$)|^PRN([/.]|$)|^CLOCK\$([/.]|$)|^AUX([/.]|$)|^NUL([/.]|$)|^CON([/.]|$)/gm,
            replaceChar: "#", // what character to use instead of illegal characters
        },
        /** IP hashing settings */
        ipHashing: {
            enabled: true,                  // hashes all IP addresses. If set to false, JokeAPI is not GDPR compliant anymore!
            algorithm: "sha256",            // the algorithm of the hash - available algorithms depend on the OpenSSL version installed on the machine (can be listed with "openssl list -digest-algorithms")
            digest: "hex",                  // the output format of the hash - can be "base64", "hex" or "latin1"
            hashRegex: /^[0-9a-fA-F]{64}$/, // regex to validate an IP hash (exactly 64 hexadecimal chars)
        },
        /** Encoding settings */
        encodings: {
            gzip: true,    // Whether or not Gzip encoding should be enabled for the documentation page
            deflate: true, // Whether or not Deflate encoding should be enabled for the documentation page
            brotli: true,  // Whether or not Brotli encoding should be enabled for the documentation page (old Node versions might need this disabled)
        },
        encodingPriority: [ // The priority of the encodings. Items with a lower array index (further to the left) have a higher priority
            "brotli", "gzip", "deflate",
        ],
    },
    /** Everything regarding errors */
    errors: {
        errorLogDir: "./data/logs/",               // path to the error log directory - needs trailing slash
        errorMessagesPath: "./data/errorMessages", // path to error messages file
    },
    /** All of JokeAPI's lists */
    lists: {
        blacklistPath: "./data/lists/ipBlacklist.json",             // path to the IP blacklist
        whitelistPath: "./data/lists/ipWhitelist.json",             // path to the IP whitelist
        consoleBlacklistPath: "./data/lists/consoleBlacklist.json", // path to the IP console blacklist
    },
    /** Settings for the documentation website */
    documentation: {
        dirPath: "./docs/",               // path to the documentation directory - needs trailing slash
        compiledPath: "./docs/compiled/", // path to the compiled docs directory - needs trailing slash
        faviconPath: "./docs/static/favicon.ico",   // path to the favicon.ico file - don't add trailing slash
        rawDirPath: "./docs/raw/",                  // path to the raw documentation files directory - needs trailing slash
        daemonInterval: 2,                          // interval (in seconds) at which the daemon checks for changes in the documentation directory
        errorPagePath: "./docs/raw/errorPage.html", // path to the error page
        codeFontFileName: "static/external/CascadiaCode_2110.31.ttf", // the name of the font file that is going to be used in code blocks - relative to the directory specified with the above property "dirPath"
        submissionForm: {
            dirPath: "./docs/raw/", // path to the submission form directory - needs trailing slash
            fileNames: {
                html: "submit.html",         // name of the HTML file of the submission form - relative to the parameter "documentation.submissionForm.dirPath"
                js: "../static/submit.js",   // name of the JS file of the submission form - relative to the parameter "documentation.submissionForm.dirPath"
                css: "../static/submit.css", // name of the CSS file of the submission form - relative to the parameter "documentation.submissionForm.dirPath"
            },
        },
        staticCacheAge: 86400, // after how much time a client browser should delete and re-fetch the cached static content
    },
    /** Everything regarding endpoints */
    endpoints: {
        /** Http method GET */
        get: {
            dirPath: "./src/endpoints/GET/", // path to the dir containing all the GET endpoint classes
        },
        /** Http method POST or PUT */
        post: {
            dirPath: "./src/endpoints/POST/", // path to the dir containing all the POST endpoint classes
        },
        ratelimitBlacklist: [        // calling an endpoint in this array will not count towards the rate limit counter
            "static",
        ],
        translationsFile: "./data/translations/endpoints.json", // file where endpoint translations are located in
    },
    /** Colors to use in the console */
    colors: {
        success: col.green,     // when request was successful
        error: col.red,         // when request was errored
        ratelimit: col.magenta, // when request was rate limited
        docs: col.yellow,                      // when docs were requested
        blacklisted: bgc.red + col.yellow,     // when a request IP is blacklisted
        docsrecompiled: bgc.yellow + col.blue, // when the docs were recompiled
    },
    /** Analytics module */
    analytics: {
        enabled: false,            // whether or not the analytics module should be enabled
        dirPath: "./data/sql/",    // path to the analytics directory - needs trailing slash
        sqlTableName: "analytics", // name of the SQL table
    },
    /** General settings for everything related to the SQL database (login credentials are set in the .env file) */
    sql: {
        host: "localhost",   // IP address to the DB host - default for local device is "localhost"
        database: "jokeapi", // the name of the DB
        port: 3306,          // the port of the DB - default is 3306
        timeout: 5000,       // after how many milliseconds queries should time out
    },
    /** Authentication (Auth Tokens) */
    auth: {
        tokenListFile: "./data/auth/tokens.json", // path to the token list file
        tokenListFolder: "./data/auth",           // path to the auth folder
        daemonInterval: 20,                       // after how many seconds the auth tokens should be refreshed
    },
    /** Settings regarding languages */
    languages: {
        langFilePath: "./data/languages.json",                 // file containing all language codes and corresponding language information
        defaultLanguage: "en",                                 // default language (two character code, lowercase)
        translationsFile: "./data/translations/general.json",  // general translations file
        fuzzySearchThreshold: 0.4,                             // threshold of the Fuse.js fuzzy search when looking up language codes based on language names (recommended: 0.4)
        splashesFilePath: "./data/translations/splashes.json", // where the splash texts of different languages are stored
    },
    /** Unit tests */
    tests: {
        location: "./tests/",  // folder where unit tests are located - requires trailing slash
        initPingInterval: 250, // in ms - interval between init pings (default: 250)
    },
    /** Joke caching */
    jokeCaching: {
        tableName: "joke_cache",                             // table name of the joke cache DB table
        createTableFile: "./data/sql/create_joke_cache.sql", // file that contains SQL code to create the cache table
        expiryHours: 96,                                     // amount of hours after which the entire joke cache of a client is cleared - set to 0 or less to disable (makes JokeAPI GDPR non-compliant!)
        gcIntervalMinutes: 60,                               // interval (in minutes) that should run the garbage collector (that cleans up expired DB entries)
        poolSizeDivisor: 2,                                  // used to calculate joke pool size according to this formula: Math.floor(jokeAmountPerLang / poolSizeDivisor = poolSize)
    },
    /** Legacy features that might be deprecated soon */
    legacy: {
        submissionEndpointsPutMethod: true,  // whether or not submission endpoints should also be able to be called with the PUT method
    },
};

const frozenSettings = Object.freeze(settings); // use Object.freeze() to prevent modifications at runtime

/** @type {Readonly<typeof(settings)>} */
module.exports = frozenSettings;
