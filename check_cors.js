async function run() {
    const url = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Logo_Minist%C3%A8re_de_l%27%C3%89ducation_Nationale_du_Maroc.svg/1024px-Logo_Minist%C3%A8re_de_l%27%C3%89ducation_Nationale_du_Maroc.svg.png";
    const res = await fetch(url, { method: 'HEAD' });
    console.log(res.headers.get('access-control-allow-origin'));
}
run();
