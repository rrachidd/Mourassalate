import https from 'https';

https.get({
    hostname: 'api.github.com',
    path: '/repos/m-mouhait/Maroc-Logo/contents',
    headers: { 'User-Agent': 'Node.js' }
}, (res) => {
    let raw = '';
    res.on('data', d => raw += d);
    res.on('end', () => console.log(JSON.parse(raw).map(f => f.name)));
});
