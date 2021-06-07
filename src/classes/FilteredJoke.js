// filtered joke gets created out of the total-jokes array
// filters can be applied with setter methods
// final getter method returns one or multiple jokes that match all filters

const scl = require("svcorelib");
const safeRegex = require("safe-regex");

const AllJokes = require("./AllJokes");
const parseJokes = require("../parseJokes");
const languages = require("../languages");
const tr = require("../translate");
const jokeCache = require("../jokeCache");

const settings = require("../../settings");


/** @typedef {"nsfw"|"racist"|"sexist"|"religious"|"political"|"explicit"} BlacklistFlags */
/** @typedef {"Any"|"Programming"|"Miscellaneous"|"Dark"} JokeCategory */


scl.unused(AllJokes);

var _lastIDs = [];
var _selectionAttempts = 0;

class FilteredJoke
{
    //#MARKER constructor
    /**
     * Constructs an object of type FilteredJoke
     * @param {AllJokes} allJokes 
     */
    constructor(allJokes)
    {
        if(scl.isEmpty(allJokes))
            throw new Error(`Error while constructing new FilteredJoke object: parameter "allJokes" is empty`);

        this._allJokes = allJokes;
        this._filteredJokes = null;

        let idRangePerLang = {};

        Object.keys(parseJokes.jokeCountPerLang).forEach(lc => {
            idRangePerLang[lc] = [ 0, (parseJokes.jokeCountPerLang[lc] - 1) ];
        });

        /** Resolved category names (aliases are not allowed here) */
        this._allowedCategories = [
            settings.jokes.possible.anyCategoryName.toLowerCase(),
            ...settings.jokes.possible.categories.map(c => c.toLowerCase())
        ];
        this._allowedTypes = [...settings.jokes.possible.types];
        this._searchString = null;
        this._idRange = [0, (parseJokes.jokeCountPerLang[settings.languages.defaultLanguage] - 1)];
        this._initialIdRange = [0, (parseJokes.jokeCountPerLang[settings.languages.defaultLanguage] - 1)];
        this._idRangePerLang = idRangePerLang;
        this._flags = [];
        this._errors = [];
        this._lang = settings.languages.defaultLanguage;
        this._amount = 1;
        this._safeMode = false;

        if(!_lastIDs || !Array.isArray(_lastIDs))
            _lastIDs = [];

        return this;
    }

    //#MARKER categories
    /**
     * Sets the category / categories a joke can be from
     * @param {JokeCategory|JokeCategory[]} categories 
     * @returns {boolean} Returns true if the category / categories were set successfully, else returns false
     */
    setAllowedCategories(categories)
    {
        if(!Array.isArray(categories))
            categories = new Array(categories);

        let allCategories = [
            settings.jokes.possible.anyCategoryName.toLowerCase(),
            ...settings.jokes.possible.categories.map(c => c.toLowerCase())
        ];
        let catsValid = [];

        if(typeof categories == "object" && categories.length != undefined)
            categories.forEach(cat => {
                if(allCategories.includes(cat.toLowerCase()))
                    catsValid.push(true);
            });

        if(catsValid.length != categories.length)
        {
            this._errors.push("The joke category is invalid");
            return false;
        }
        
        if((typeof categories == "string" && categories.toLowerCase() == settings.jokes.possible.anyCategoryName.toLowerCase())
        || (typeof categories != "string" && categories.map(c => c.toLowerCase()).includes(settings.jokes.possible.anyCategoryName.toLowerCase())))
            categories = [...settings.jokes.possible.categories];
        
        this._allowedCategories = categories;
        return true;
    }

    /**
     * Returns the category / categories a joke can be in
     * @returns {JokeCategory[]}
     */
    getAllowedCategories()
    {
        return this._allowedCategories.map(c => c.toLowerCase());
    }

    //#MARKER type
    /**
     * Sets which types the joke(s) can be of
     * @param {"single"|"twopart"} type 
     * @returns {boolean} Returns true if the type is valid and could be set, false if not
     */
    setAllowedType(type)
    {
        if(settings.jokes.possible.types.includes(type))
        {
            this._allowedTypes = [type];
            return true;
        }
        else
        {
            this._errors.push("The \"type\" parameter is invalid");
            return false;
        }
    }

    /**
     * Returns the allowed types a joke can be of
     * @returns {Array<"single"|"twopart">}
     */
    getAllowedTypes()
    {
        return this._allowedTypes
    }

    //#MARKER search string
    /**
     * Sets a string to serach for in jokes
     * @param {string} searchString Raw string to search for in the joke - URI components get decoded automatically
     * @returns {boolean} Returns true if the search string is a valid string and could be set, false if not
     */
    setSearchString(searchString)
    {
        if(typeof searchString != "string")
        {
            this._errors.push("The \"contains\" parameter is invalid");
            return false;
        }
        
        try
        {
            this._searchString = searchString;
            return true;
        }
        catch(err)
        {
            this._errors.push("The URI is malformatted or the \"contains\" parameter isn't correctly percent-encoded");
            return false;
        }
    }

    /**
     * Returns the set search string
     * @param {boolean} [skipDecoding=false] Whether to skip URI decoding
     * @returns {string|null} Returns the search string if it is set, else returns null
     */
    getSearchString(skipDecoding = false)
    {
        return !skipDecoding ? decodeURIComponent(this._searchString) : this._searchString;
    }

    //#MARKER id
    /**
     * The IDs a joke can be of
     * @param {number} start
     * @param {number} [end] If this is not set, it will default to the same value the param `start` has
     * @param {string} [lang] Lang code
     * @returns {boolean} Returns false if the parameter(s) is/are not of type `number`, else returns true
     */
    setIdRange(start, end = null, lang = null)
    {
        if(scl.isEmpty(end))
            end = start;
        
        if(scl.isEmpty(lang))
            lang = this.getLanguage() || settings.languages.defaultLanguage;

        if(isNaN(parseInt(start)) || isNaN(parseInt(end)) || typeof start != "number" || typeof end != "number" || scl.isEmpty(start) || scl.isEmpty(end))
        {
            this._errors.push("The \"idRange\" parameter values are not numbers");
            return false;
        }

        if(start < 0 || end > this._idRangePerLang[lang][1])
        {
            this._errors.push("The \"idRange\" parameter values are out of range");
            return false;
        }
        
        this._idRange = [start, end];
        return true;
    }

    /**
     * Returns the current ID range
     * @returns {Array<Number>} An array containing two numbers (index 0 = start ID, index 1 = end ID)
     */
    getIdRange()
    {
        return this._idRange;
    }

    //#MARKER flags
    /**
     * Sets the blacklist flags
     * @param {BlacklistFlags[]} flags 
     * @returns {boolean} Returns true if the flags were set, false if they are invalid
     */
    setBlacklistFlags(flags)
    {
        let flagsInvalid = false;
        flags.forEach(flag => {
            if(!settings.jokes.possible.flags.includes(flag))
                flagsInvalid = true;
        });

        if(flagsInvalid)
        {
            this._errors.push("The \"blacklistFlags\" parameter is invalid or contains one or more invalid flags");
            return false;
        }
        
        this._flags = flags;
        return true;
    }

    /**
     * Returns the set blacklist flags
     * @returns {BlacklistFlags[]}
     */
    getBlacklistFlags()
    {
        return this._flags;
    }

    //#MARKER language
    /**
     * Sets the language
     * @param {string} code 
     * @returns {boolean} Returns true if the language was set, false if it is invalid
     */
    setLanguage(code)
    {
        if(languages.isValidLang(code) === true)
        {
            this._lang = code;
            return true;
        }

        return false;
    }

    /**
     * Returns the set language code
     * @returns {string}
     */
    getLanguage()
    {
        return this._lang || settings.languages.defaultLanguage;
    }

    //#MARKER safe mode
    /**
     * Sets the safe mode
     * @param {boolean} safeModeEnabled 
     * @returns {boolean} Returns the new value of the safe mode
     */
    setSafeMode(safeModeEnabled)
    {
        if(typeof safeModeEnabled == "boolean")
            this._safeMode = safeModeEnabled;
        else
            this._safeMode = false;
        
        return this._safeMode;
    }

    /**
     * Returns the value of the safe mode
     * @returns {boolean}
     */
    getSafeMode()
    {
        return this._safeMode;
    }

    //#MARKER amount
    /**
     * Sets the amount of jokes
     * @param {number} num 
     * @returns {boolean|string} Returns true if the amount was set, string containing error if it is invalid
     */
    setAmount(num)
    {
        num = parseInt(num);

        if(isNaN(num) || num < 1 || num > settings.jokes.maxAmount)
            return `"num" parameter in FilteredJoke.setAmount() couldn't be resolved to an integer or it is less than 0 or greater than ${settings.jokes.maxAmount}`;

        this._amount = num;
        return true;
    }

    /**
     * Returns the set joke amount or `1` if not yet set
     * @returns {number}
     */
    getAmount()
    {
        return this._amount || 1;
    }

    //#MARKER apply filters
    /**
     * Applies the previously set filters and modifies the `this._filteredJokes` property with the applied filters
     * @private
     * @param {string} ip Client IP hash
     * @param {string} lang Language code
     * @returns {Promise}
     */
    _applyFilters(ip, lang)
    {
        return new Promise((resolve, reject) => {
            try
            {
                this._filteredJokes = [];

                if(!lang)
                    lang = settings.languages.defaultLanguage;
                
                let jokesArray = this._allJokes.getJokeArray(lang);

                jokeCache.cache.listEntries(ip, lang).then(cacheIdList => {
                    // #SECTION joke cache
                    if(this._idRange == this._initialIdRange)
                    {
                        // joke caching is disabled when using the ID range parameter due to its dynamic, always different nature
                        jokesArray = jokesArray.filter(joke => {
                            // filter out all jokes that are on a client's joke cache list
                            if(!cacheIdList.includes(joke.id))
                                return joke;
                        });
                    }

                    let isErrored = false;

                    // #SECTION iterate over jokes & check for matching parameters
                    jokesArray.forEach(joke => {
                        // IMPORTANT: only use synchronous code in here!
                        // iterate over each joke, reading all set filters and thereby checking if it suits the request
                        // to deny a joke from being served, just return from this callback function

                        // set `isErrored` to true to skip through joke checking
                        if(isErrored)
                            return;

                        //#SECTION safe mode
                        if(this.getSafeMode() === true) // if safe mode is enabled
                        {
                            if(joke.safe !== true) // if joke is not safe, it's invalid
                                return;
                            
                            if(joke.category == "Dark") // if joke is in category "Dark", it's invalid
                                return;
                        }
                        

                        //#SECTION id range
                        let idRange = this.getIdRange(lang);
                        if(joke.id < idRange[0] || joke.id > idRange[1]) // if the joke is not in the specified ID range, it's invalid
                            return;

                        //#SECTION categories
                        let cats = this.getAllowedCategories().map(c => c.toLowerCase());

                        if((typeof cats == "object" && !cats.includes(settings.jokes.possible.anyCategoryName.toLowerCase()))
                        || (typeof cats == "string" && cats != settings.jokes.possible.anyCategoryName.toLowerCase()))
                        {
                            if(!cats.includes(joke.category.toLowerCase())) // if possible categories don't contain the requested category, joke is invalid
                                return;
                        }

                        //#SECTION flags
                        let blFlags = this.getBlacklistFlags();
                        if(!scl.isEmpty(blFlags))
                        {
                            let flagMatches = false;
                            Object.keys(joke.flags).forEach(flKey => {
                                if(blFlags.includes(flKey) && joke.flags[flKey] === true)
                                    flagMatches = true;
                            });

                            if(flagMatches) // joke has one or more of the set blacklist flags, joke is invalid
                                return;
                        }
                        
                        //#SECTION type
                        if(!this.getAllowedTypes().includes(joke.type)) // if joke type doesn't match the requested type(s), joke is invalid
                            return;
                        
                        //#SECTION search string
                        try
                        {
                            if(!this.checkMatchesSearchString(joke, lang)) // if the provided search string doesn't match the joke, the joke is invalid
                                return;
                        }
                        catch(err)
                        {
                            isErrored = true;
                            return reject((err instanceof Error) ? err.message : err);
                        }
                        
                        //#SECTION language
                        let langCode = this.getLanguage();
                        if(languages.isValidLang(langCode) !== true)
                            return; // invalid lang code, joke is invalid
                        if(joke.lang.toLowerCase() != langCode.toLowerCase())
                            return; // lang code doesn't match so joke is invalid
                        
                        // Note: amount param is used in getJokes()


                        //#SECTION done
                        this._filteredJokes.push(joke); // joke is valid, push it to the array that gets passed in the resolve() just below
                    });

                    return resolve(this._filteredJokes);
                }).catch(err => {
                    return reject(`Couldn't list joke cache entries: ${err}`);
                });
            }
            catch(err)
            {
                return reject(err);
            }
        });
    }

    /**
     * Checks if a passed joke matches the currently set search string
     * @param {parseJokes.Joke} joke
     * @param {string} lang
     * @returns {boolean}
     */
    checkMatchesSearchString(joke, lang)
    {
        let searchMatches = false;

        const searchStr = this.getSearchString(true);

        const containsOperator = Object.values(settings.jokes.searchStringOperators).reduce(op => searchStr.includes(op));

        if(!scl.isEmpty(searchStr))
        {
            // if the search string doesn't contain a logical operator (issue #289)
            if(!containsOperator)
            {
                if(joke.type == "single" && joke.joke.toLowerCase().includes(searchStr))
                    searchMatches = true;
                else if(joke.type == "twopart" && `${joke.setup} ${joke.delivery}`.toLowerCase().includes(searchStr))
                    searchMatches = true;
            }
            else
            {
                // search string contains at least one logical operator character

                // create initial pattern
                const pattern = decodeURIComponent(escapeRegexPattern(searchStr).replace(new RegExp(`[${settings.jokes.searchStringOperators.wildcard}]`, "gm"), ".*"));
                // isolate the pattern based on the OR operator(s) present
                const isolatedPattern = `^${pattern.split(settings.jokes.searchStringOperators.orOperator).join(`$|^`)}$`;
                // create the final regex
                const searchRegex = new RegExp(isolatedPattern, "gmi");
                // make sure there's no way in hell a user can ReDoS JokeAPI with exponential-time Regexes / catastrophic backtracking
                const regexSafe = safeRegex(searchRegex, { limit: settings.jokes.regexRepetitionLimit });

                if(regexSafe === true)
                {
                    if(joke.type == "single" && joke.joke.replace(/\n/g, " ").match(searchRegex))
                        searchMatches = true;
                    else if(joke.type == "twopart" && `${joke.setup} ${joke.delivery}`.replace(/\n/g, " ").match(searchRegex))
                        searchMatches = true;
                }
                else
                    throw new Error(tr(lang, "patternTooComplex", searchStr, settings.jokes.regexRepetitionLimit));
            }
        }
        else
            searchMatches = true; // no search string is set, so consider every joke valid

        return searchMatches;
    }

    //#MARKER get joke
    /**
     * Applies all filters and returns the final joke
     * @param {string} ip Client IP hash
     * @param {string} langCode
     * @param {number} [amount=1] The amount of jokes to return
     * @returns {Promise<parseJokes.Joke[]>} Returns a promise containing an array, which in turn contains a single or multiple randomly selected joke/s that match/es the previously set filters. If the filters didn't match, rejects promise.
     */
    getJokes(ip, langCode, amount = 1)
    {
        amount = parseInt(amount);
        if(isNaN(amount) || scl.isEmpty(amount))
            amount = 1;
        
        return new Promise((resolve, reject) => {
            let retJokes = [];
            let multiSelectLastIDs = [];

            this._applyFilters(ip, this._lang || settings.languages.defaultLanguage).then(filteredJokes => {
                if(Array.isArray(filteredJokes))
                {
                    /** @type {Promise[]} */
                    let promises = [];
                    filteredJokes.forEach(joke => promises.push(jokeCache.cache.addEntry(ip, joke.id, langCode)));

                    Promise.all(promises).then(() => {
                        return; // joke cache checking doesn't need to be waited for
                    }).catch(err => {
                        scl.unused(err);
                        return; // joke cache checking doesn't necessarily *need* to succeed
                    });
                }

                if(filteredJokes.length == 0 || typeof filteredJokes != "object")
                {
                    if(this._errors && this._errors.length > 0)
                        return reject(this._errors);
                    else
                        return reject(tr(this.getLanguage(), "foundNoMatchingJokes"));
                }
                
                if(!_lastIDs || !Array.isArray(_lastIDs))
                    _lastIDs = [];
                
                if(typeof _selectionAttempts != "number")
                    _selectionAttempts = 0;

                /**
                 * @param {Array<parseJokes.Joke[]>} jokes 
                 */
                let selectRandomJoke = jokes => {
                    let idx = scl.randRange(0, (jokes.length - 1));
                    let selectedJoke = jokes[idx];

                    if(jokes.length > settings.jokes.lastIDsMaxLength && _lastIDs.includes(selectedJoke.id))
                    {
                        if(_selectionAttempts > settings.jokes.jokeRandomizationAttempts)
                            return reject();

                        _selectionAttempts++;

                        jokes.splice(idx, 1); // remove joke that is already contained in _lastIDs

                        return selectRandomJoke(jokes);
                    }
                    else
                    {
                        _lastIDs.push(selectedJoke.id);

                        if(_lastIDs.length > settings.jokes.lastIDsMaxLength)
                            _lastIDs.shift();

                        _selectionAttempts = 0;

                        if(!multiSelectLastIDs.includes(selectedJoke.id))
                        {
                            multiSelectLastIDs.push(selectedJoke.id);
                            return selectedJoke;
                        }
                        else
                        {
                            if(_selectionAttempts > settings.jokes.jokeRandomizationAttempts)
                                return reject();

                            _selectionAttempts++;

                            jokes.splice(idx, 1); // remove joke that is already contained in _lastIDs

                            return selectRandomJoke(jokes);
                        }
                    }
                };

                if(amount < filteredJokes.length)
                {
                    for(let i = 0; i < amount; i++)
                    {
                        let rJoke = selectRandomJoke(filteredJokes);
                        if(rJoke != null)
                            retJokes.push(rJoke);
                    }
                }
                else retJokes = filteredJokes;
                
                // Sort jokes by ID
                // retJokes.sort((a, b) => {
                //     if(b.id > a.id)
                //         return -1;
                //     else
                //         return 1;
                // });

                return resolve(retJokes);
            }).catch(err => {
                return reject(err);
            });
        });
    }

    //#MARKER get all jokes
    /**
     * Applies all filters and returns an array of all jokes that are viable
     * @returns {Promise<parseJokes.Joke[]>} Returns a promise containing a single, randomly selected joke that matches the previously set filters. If the filters didn't match, rejects promise.
     */
    getAllJokes()
    {
        return new Promise(async (res, rej) => {
            try
            {
                const filteredJokes = await this._applyFilters(this._lang || settings.languages.defaultLanguage);
                return res(filteredJokes);
            }
            catch(err)
            {
                return rej(err);
            }
        });
    }
}

/**
 * Escapes a regex pattern string
 * @param {string} input
 */
function escapeRegexPattern(input)
{
    return input.replace(/[-[\]/{}()+?.\\^$]/g, "\\$&");
}

module.exports = FilteredJoke;
