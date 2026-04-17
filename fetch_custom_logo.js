import fs from 'fs';
import https from 'https';

const url = "https://z-cdn-media.chatglm.cn/files/1ac79b00-e161-420b-ae8c-e33e287ecad5.png?auth_key=1876450811-74017ecfc0a14ac1ac699b72186efdba-0-cee90226931ebd56e8c3b5f1737aeb60";

https.get(url, (res) => {
    if (res.statusCode !== 200) {
        console.error(`Failed to fetch: ${res.statusCode} ${res.statusMessage}`);
        return;
    }
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const dataUri = `data:image/png;base64,${buffer.toString('base64')}`;
        fs.writeFileSync('base64_custom_logo.txt', dataUri);
        console.log(`Saved. Size: ${dataUri.length}`);
    });
}).on('error', console.error);
