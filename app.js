const cheerio = require('cheerio');
const axios = require('axios');
const express = require('express');
const app = express();
const fs = require('fs');
let admin = require("firebase-admin");

app.get('/', function (req, res) {
	if(!checkToken(req)) {
		console.log("ok!");
		res.send("ok!");
		checkBorsa();
	}
	else{
		res.send("git burdan :(");
	}
});

app.get('/testFCM', function (req, res) {
	sendMessageToMobile();
	res.send("ok!");
});

const PORT = process.env.PORT || 8888;
console.log("listening on port: " + PORT);
app.listen(PORT);

function checkBorsa(){
	axios.get('http://www.kap.org.tr/tr/Sektorler').then(resp => {

		//inject jquery
		var $ = cheerio.load(resp.data);
				
		/**
		 * replace(/(^[ \t]*\n)/gm, "") -> bos satirlari kaldirir
		 * replace(/^ +/gm, '') -> satir basi bosluklari kaldirir
		 * 
		 * sirket bilgilerini alip array haline getir
		 */
		let companies = $('#011000a011000a001000a').next().next().text();
		if(companies === undefined || companies === null || companies === ""){
			//send error message to client then exit
			console.log("sending error")
			return;
		}
		companies = companies.replace(/(^[ \t]*\n)/gm, "").replace(/^ +/gm, '');
		//console.log("bulunan sirketlerin bilgileri:\n" + companies);
		let arr = companies.split("\n");
		

		//bilisim sektorunde bulunan sirket sayisi
		let number = $('#011000a011000a001000a').next().text().match(/\d+/)[0];
		console.log("bilisim sektorunde bulunan sirket sayisi: " + number);

		//sirket bilgilerini sirket objesine parse edip JSON halinde yazdirma
		let sirketler = [];
		let sirketKodlari = [];
		for(let i = 3; i<=number*3; i=i+3){
			let sirket  = new Sirket(arr[i], arr[i+1], arr[i+2]);
			sirketKodlari.push(arr[i+1]);
			sirketler.push(sirket);
		}
		//console.log(JSON.stringify(sirketler));
		//console.log(JSON.stringify(sirketKodlari));

		compareBorsaData(sirketler, sirketKodlari);

	});
}


function checkToken(req){
	return req.get('API_TOKEN') && req.get('API_TOKEN') == process.env.API_TOKEN;
}

class Sirket {
	constructor(sira, kod, unvan) {
		this.sira = sira;
		this.kod = kod;
		this.unvan = unvan;
	}
};

function writeJsonFile(fileName, content){
	return new Promise(function(resolve,reject){
		fs.writeFile("./" + fileName + ".json", JSON.stringify(content), function(err) {
			if(err) {
				return console.log(err);
				reject();
			}
			resolve();
		}); 
	})
};

function readJsonFile(fileName){
	return new Promise(function(resolve,reject){
		fs.readFile("./" + fileName + ".json",  "utf8", function(err, data) {
			if(err) {
				return console.log(err);
				reject();
			}
			resolve(JSON.parse(data));
		}); 
	})
};

async function testingLogic(fileName, content){
	await writeJsonFile(fileName, content);
	let response = await readJsonFile(fileName);
	//console.log("response: " + response);
};

async function compareBorsaData(sirketler, sirketKodlari){
	//readJsonFile ile eskisirketleri ve eskisirketkodlarini al
	let oldSirketler = await readJsonFile("sirketler");
	let oldsirketKodlari = await readJsonFile("sirketKodlari");

	//eski sirketkodlari ile yenisini karsilastir
	let yeniSirketler = sirketKodlari.filter(x => !oldsirketKodlari.includes(x));
	let cikanSirketler = oldsirketKodlari.filter(x => !sirketKodlari.includes(x));

	console.log("yeniSirketler: " + yeniSirketler + " cikanSirketler: " + cikanSirketler);
	//firebase e mesaj yolla


	//writeJsonFile ile sirketler ve sirketKodlarini tekrar yaz
	await writeJsonFile("sirketler", sirketler);
	await writeJsonFile("sirketKodlari", sirketKodlari);
};



//FCM impl

let serviceAccount = {
	type: process.env.pkey_type,
	project_id: process.env.pkey_project_id,
	private_key_id: process.env.pkey_private_key_id,
	private_key: process.env.pkey_private_key,
	client_email: process.env.pkey_client_email,
	client_id: process.env.pkey_client_id,
	auth_uri: process.env.pkey_auth_uri,
	token_uri: process.env.pkey_token_uri,
	auth_provider_x509_cert_url: process.env.pkey_auth_provider_x509_cert_url,
	client_x509_cert_url: process.env.pkey_client_x509_cert_url,
};

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: process.env.fcm_databaseURL
});

let registrationToken =  process.env.registrationToken;

function sendMessageToMobile(data = {}, notification = {"title":"default", "body":"default"}){
	var message = {
		data: data,
		notification: notification,
		token: registrationToken
	};
	
	admin.messaging().send(message)
	.then((response) => {
		// Response is a message ID string.
		console.log('Successfully sent message:', response);
	})
	.catch((error) => {
		console.log('Error sending message:', error);
	});
};