const cheerio = require('cheerio');
const axios = require('axios');
const express = require('express');
const app = express();
const fs = require('fs');
let admin = require("firebase-admin");


//--------------------------------------------------------------------
//--------------- Router ---------------------------------------------
//--------------------------------------------------------------------

app.use('/', function (req, res, next) {
	if(process.env.SECURITY == 'enabled'){
		checkToken(req) ? next() : res.send("denied");
	}
	else{
		next();
	}
});

app.get('/', function (req, res) {
	console.log("ok!");
	res.send("ok!");
});

app.get('/checkBorsa', function (req, res) {
	console.log("ok!");
	res.send("ok!");
	checkBorsa();
});

app.get('/testFCM', function (req, res) {
	sendMessageToMobile();
	res.send("ok!");
});

app.get('/test', function (req, res) {
	res.send("test!");
});

function checkToken(req){
	return req.get('API_TOKEN') && req.get('API_TOKEN') == process.env.API_TOKEN;
}

const PORT = process.env.PORT || 8888;
console.log("listening on port: " + PORT);
app.listen(PORT);
initializeFCM();


//--------------------------------------------------------------------
//--------------- checkBorsa logic and helper functions --------------
//--------------------------------------------------------------------

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

class Sirket {
	constructor(sira, kod, unvan) {
		this.sira = sira;
		this.kod = kod;
		this.unvan = unvan;
	}
};

function writeJsonFile(fileName, content){
	return new Promise(function(resolve,reject){
		fs.writeFile("./data/" + fileName + ".json", JSON.stringify(content), function(err) {
			if(err) {
				console.log('writeJsonFile err: ' + err);
				reject();
			}
			console.log('write success: ' + JSON.stringify(content));
			resolve();
		}); 
	})
};

function readJsonFile(fileName){
	return new Promise(function(resolve,reject){
		fs.readFile("./data/" + fileName + ".json", 'utf-8', function(err, data) {
			if(err) {
				console.log('readJsonFile err: ' + err);
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
	//let oldSirketler = await readJsonFile("sirketler"); // will be used later
	let oldsirketKodlari = await readJsonFile("sirketKodlari");
	console.log("guncel sirket kodlari: " + sirketKodlari + "\n bir onceki sirket kodlari: " + oldsirketKodlari);

	//eski sirketkodlari ile yenisini karsilastir
	let borsayaGirenSirketler = sirketKodlari.filter(x => !oldsirketKodlari.includes(x));
	let borsadanCikanSirketler = oldsirketKodlari.filter(x => !sirketKodlari.includes(x)); // will be used later

	console.log("borsayaGirenSirketler: " + borsayaGirenSirketler + " borsadanCikanSirketler: " + borsadanCikanSirketler);
	
	//firebase e mesaj yolla
	let fcmData = {
		title: '',
		body: '',
	};
	if(borsayaGirenSirketler.length == 0){
		fcmData.title = 'BorsaApp';
		fcmData.body = 'Borsaya yeni giren şirket bulunmamaktadır'
	}
	if(borsayaGirenSirketler.length > 0){
		fcmData.title = 'BorsaApp Yeni Şirket!';
		fcmData.body = 'Borsaya yeni giren şirketler: ' + JSON.stringify(borsayaGirenSirketler);
	}

	await sendMessageToMobile(fcmData).catch((error) => {
		console.log(error);
	});

	//writeJsonFile ile sirketler ve sirketKodlarini tekrar yaz
	//await writeJsonFile("sirketler", sirketler);
	await writeJsonFile("sirketKodlari", sirketKodlari);
};


//--------------------------------------------------------------------
// -------------- FCM impl -------------------------------------------
//--------------------------------------------------------------------

function initializeFCM(){
	try {
		let serviceAccount = {
			type: process.env.pkey_type,
			project_id: process.env.pkey_project_id,
			private_key_id: process.env.pkey_private_key_id,
			private_key: process.env.pkey_private_key.replace(/\\n/g, '\n'),
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
				
	} catch (error) {
		console.error("initializeFCM Error: " + error);
	}
};

function sendMessageToMobile(data = {"title":"default", "body":"default"}){
	return new Promise(function(resolve,reject){
		let registrationTokens = [
			process.env.registrationToken1,
			process.env.registrationToken2,
		];
		
		let message = {
			data: data,
			tokens: registrationTokens,
			priority: "high"
		};
		console.log("fcm message: " + JSON.stringify(message.data));
		admin.messaging().sendMulticast(message)
		.then((response) => {
			if (response.failureCount > 0) {
				const failedTokens = [];
				response.responses.forEach((resp, idx) => {
				  if (!resp.success) {
					failedTokens.push(registrationTokens[idx]);
				  }
				});
				console.log('List of tokens that caused failures: ' + failedTokens);
			}
			console.log('Successfully sent message:', JSON.stringify(response));
			resolve();
		})
		.catch((error) => {
			//console.log('Error sending message:', error);
			reject('Error sending message:', error);
		});
	})
};