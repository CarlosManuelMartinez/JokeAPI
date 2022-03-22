const { default: axios } = require("axios");

const { getProp } = require("../src/env");


const url = `http://127.0.0.1:${getProp("httpPort")}/joke/Any?amount=1`;
const requestsPerInterval = 20;
const token = "v5nr5yg_stresstest"; // make sure this token exists (in file at `settings.auth.tokenListFile`) - else generate it with `npm run add-token`


function request()
{
    return new Promise(async (res, rej) => {
        const data = await axios.get(url, { headers: { "Authentication": `Bearer ${token}` } });

        if(data && Array.isArray(data.jokes) && data.jokes.length == 10)
            return res();
        else
            return rej(`Data = ${typeof data} / Jokes length = ${data && Array.isArray(data.jokes) ? data.jokes.length : "invalid"}`);
    });
}

let counter = 0;

function run()
{
    counter++;

    const requests = [];

    for(let i = 0; i < requestsPerInterval; i++)
        requests.push(request());

    Promise.all(requests).then(() => {
        console.log(`Iteration ${counter}: Successfully sent ${requestsPerInterval} requests`);

        run();
    }).catch(err => {
        console.error(`Iteration ${counter} - Error: ${err}`);
    });
}

run();
