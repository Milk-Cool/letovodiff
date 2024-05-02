const Diff = require("diff");
const TelegramBot = require("node-telegram-bot-api");

const { TOKEN, ID, LOG } = process.env;
const bot = new TelegramBot(TOKEN, { "polling": false });

const req = require("./json/req.json")

let last = [];

const send = async (obj, msg) => {
    msg = `${obj.url}\n${obj.body ? "`" + obj.body + "`\n" : ""}\n\`\`\`diff\n${msg}\n\`\`\``;
    for(let i = 0; i < msg.length; i += 1000) {
        let chunk = msg.slice(i, i + 1000);
        await bot.sendMessage(ID, `${chunk.startsWith("```") ? "" : "```diff"}${chunk}${chunk.endsWith("```") ? "" : "```"}`, { "parse_mode": "Markdown" });
    }
}
const checkOne = async (obj, cb) => {
    if(LOG) console.log("Checking", obj.url);
    const options = obj.body ? {
        "method": "POST",
        "body": obj.body,
        "headers": obj.headers ?? {}
    } : {
        "method": "GET",
        "headers": obj.headers ?? {}
    };
    const f = await fetch(obj.url, options);
    let d = obj.bin ? Buffer.from(await f.arrayBuffer()) : await f.text();
    if(obj.json)
        d = JSON.stringify(JSON.parse(d), null, 2);
    const k = obj.url + (obj.body ? ":::" + obj.body : "");
    if(!last?.[k])
        return last[k] = d;
    if(obj.bin) {
        if(last[k] == d) cb(obj, "+ Binary diff");
        return;
    }
    let diffstr = "";
    const diff = Diff.diffLines(last[k], d);
    if(LOG) console.log(diff.filter(x => x.added || x.removed));
    last[k] = d;
    for(let i of diff) {
        if(!i.added && !i.removed) continue;
        diffstr += `${i.added ? "+" : "-"} ${i.value}\n`;
    }
    if(diffstr) await cb(obj, diffstr);
}
const check = async () => {
    if(LOG) console.log("Checking all...");
    for(let i of req) {
        await checkOne(i, send).catch(console.error);
    }
    if(LOG) console.log("Done checking, waiting now...");
}

setTimeout(check);
// setInterval(check, 5 * 1000);
setInterval(check, 30 * 60 * 1000);

require("http").createServer((req, res) => {
    res.writeHead(200);
    res.end("O-Kay!");
}).listen(12000);