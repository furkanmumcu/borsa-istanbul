exports.handler = async (event) => {
	console.log('event: ' + JSON.stringify(event));
	const axios = require('axios');
	
	let config = {
		headers: {
		  API_TOKEN: process.env.API_TOKEN,
		}
	}; 
	await axios.get(process.env.URL, config).then(resp => {
		console.log(resp.data);
				
	},resp => {console.log("hata")});
};