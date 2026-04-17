import fs from 'fs';

const targetUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Logo_Minist%C3%A8re_de_l%27%C3%89ducation_Nationale_du_Maroc.svg/1024px-Logo_Minist%C3%A8re_de_l%27%C3%89ducation_Nationale_du_Maroc.svg.png";
const url = `https://api.codetabs.com/v1/proxy?quest=${targetUrl}`;

async function run() {
    const response = await fetch(url);
    if(response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        console.log("Success! size:", buffer.length);
        const dataUri = `data:image/png;base64,${buffer.toString('base64')}`;
        fs.writeFileSync('logoBase64.json', JSON.stringify({ dataUri }));
    } else {
        console.log("Failed:", await response.text());
    }
}
run();
