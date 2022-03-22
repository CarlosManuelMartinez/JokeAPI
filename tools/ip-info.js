const http = require("http");

const { getClientIp } = require("request-ip");
const scl = require("svcorelib");
const { isIPv4 } = require("net");
const k = require("kleur");

const { hashIP, isLocal } = require("../src/resolveIP");
const parseURL = require("../src/parseURL");

const { exit } = process;

const cycleCols = [ scl.colors.fg.green, scl.colors.fg.blue, scl.colors.fg.yellow, scl.colors.fg.magenta, scl.colors.fg.cyan, scl.colors.fg.white, scl.colors.fg.red ];

const colCycleEnabled = process.argv.includes("--color-cycle") || process.argv.includes("-c");


const port = 8074;

const padding = "├ ";
const padLast = "└ ";


async function run()
{
    await parseURL.init();

    let colorIdx = 0;

    http.createServer((req, res) => {
        const rawIP = getClientIp(req);
        const hashedIP = hashIP(rawIP);
        const url = parseURL(req.url);

        let col = "";

        if(colCycleEnabled)
        {
            colorIdx++;

            if(colorIdx == cycleCols.length)
                colorIdx = 0;

            col = cycleCols[colorIdx];
        }

        const headerCol = txt => !colCycleEnabled ? k.blue(txt) : txt;

        let ipInfo = "";

        ipInfo += `┌ ${headerCol("Request info:")} \n`;
        ipInfo += `│ ${padding}Method:    ${req.method} \n`;
        ipInfo += `│ ${padding}URL:       /${url.pathArray.join("/")} \n`;
        ipInfo += `│ ${padLast}UserAgent: ${req.headers["user-agent"] ?? "(none)"} \n`;

        ipInfo += `│\n├ ${headerCol("IP info:")} \n`;
        ipInfo += `│ ${padding}Raw IP:    ${rawIP} ${isIPv4(rawIP) ? k.gray("(IPv4)") : k.gray("(IPv6)")} \n`;
        ipInfo += `│ ${padding}Is Local:  ${isLocal(rawIP) ? "yes" : "no"} \n`;
        ipInfo += `│ ${padding}Hash 64:   ${hashedIP} \n`;
        ipInfo += `│ ${padding}Hash 16:   ${hashedIP.substring(0, 16)} \n`;
        ipInfo += `│ ${padLast}Hash 8:    ${hashedIP.substring(0, 8)} \n`;
        
        ipInfo += `│\n└ ${headerCol("Time:")} \n`;
        ipInfo += `  ${padding}Date:      ${new Date().toLocaleDateString()} \n`;
        ipInfo += `  ${padding}Time:      ${new Date().toLocaleTimeString()} \n`;
        ipInfo += `  ${padding}Unix 13:   ${Date.now()} \n`;
        ipInfo += `  ${padLast}Unix 10:   ${Math.floor(Date.now() / 1000)} \n`;

        console.log(`\n\n\n\n${col}${ipInfo}${scl.colors.rst}`);

        // remove color sequences in the format '\x1b[31m'
        const browserResp = ipInfo.replace(/\x1b\[\d{0,2}m/ug, ""); // eslint-disable-line no-control-regex

        res.writeHead(200, { "Content-Type": "text/plain; charset=UTF-8" });
        res.end(browserResp);
    }).listen(port, undefined, err => {
        if(err)
        {
            console.error(`Error: ${err}`);
            exit(1);
        }
        else
            console.info(`Ready. Listening at http://127.0.0.1:${port}\n`);
    });
}

run();
