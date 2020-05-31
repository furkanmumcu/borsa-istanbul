
const cheerio = require('cheerio');
const axios = require('axios');
const express = require('express');
const app = express();


app.get('/', function (req, res) {

	console.log(req.get('API_TOKEN'))
	console.log(process.env.API_TOKEN)

	if(req.get('API_TOKEN') && req.get('API_TOKEN') == process.env.API_TOKEN) {
		axios.get('http://www.kap.org.tr/tr/Sektorler').then(resp => {

			//inject jquery
			var $ = cheerio.load(resp.data);
			

			//bilisim sektorunde bulunan sirket sayisi
			let number = $('#011000a011000a001000a').next().text().match(/\d+/)[0];
			console.log("bilisim sektorunde bulunan sirket sayisi: " + number);


			/**
			 * replace(/(^[ \t]*\n)/gm, "") -> bos satirlari kaldirir
			 * replace(/^ +/gm, '') -> satir basi bosluklari kaldirir
			 * 
			 * sirket bilgilerini alip array haline getir
			 */
			let companiees = $('#011000a011000a001000a').next().next().text().replace(/(^[ \t]*\n)/gm, "").replace(/^ +/gm, '');
			console.log("bulunan sirketlerin bilgileri:\n" + companiees);
			let arr = companiees.split("\n");
			

			//sirket bilgilerini sirket objesine parse edip JSON halinde yazdirma
			let data = [];
			for(let i = 3; i<=number*3; i=i+3){
				let sirket  = new Sirket(arr[i], arr[i+1], arr[i+2]);
				data.push(sirket);
			}
			console.log(JSON.stringify(data));
			res.send(JSON.stringify(data));
		});
	}
	
	res.send("git burdan :(");
	
});

const PORT = process.env.PORT || 8888;
app.listen(PORT);

class Sirket {
	constructor(sira,kod, unvan) {
		this.sira = sira;
		this.kod = kod;
		this.unvan = unvan;
	}
};