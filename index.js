const Diff = require("diff");
const TelegramBot = require("node-telegram-bot-api");

const { TOKEN, ID } = process.env;
const bot = new TelegramBot(TOKEN, { "polling": false });

const req = require("./json/req.json")

let last = [];

const send = (url, msg) => {
    bot.sendMessage(ID, `${url}\n\n\`\`\`diff\n${msg}\n\`\`\``, { "parse_mode": "Markdown" });
}
const checkOne = async (obj, cb) => {
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
    if(!last?.[obj.url])
        return last[obj.url] = d;
    if(obj.bin) {
        if(last[obj.url] == d) cb(obj.url, "+ Binary diff");
        return;
    }
    let diffstr = "";
    const diff = Diff.diffLines(last[obj.url], d);
    last[obj.url] = d;
    for(let i of diff) {
        if(!i.added && !i.removed) continue;
        diffstr += `${i.added ? "+" : "-"} ${i.value}\n`;
    }
    if(diffstr) cb(obj.url, diffstr);
}
const check = async () => {
    for(let i of req) {
        await checkOne(i, send).catch(console.error);
    }
}

setTimeout(check);
// setInterval(check, 30 * 60 * 1000);
setInterval(check, 30 * 60 * 1000);

require("http").createServer((req, res) => {
    res.writeHead(200);
    res.end("O-Kay!");
}).listen(12000);