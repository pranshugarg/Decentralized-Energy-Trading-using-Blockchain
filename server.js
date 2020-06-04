const express = require('express');
const fs = require('fs');
const app = express();
const dd = require('./API.json');
const simulation = require('./simulation');
app.use(express.static('public'));
let ret = null;

async function run() {
	if(ret === null) 
	ret = await simulation();

	fs.writeFileSync('./result.json', JSON.stringify(ret),  'utf8' ,
	err => {
	if(err) {
			console.log('Cant write to file: ', err);
	} else {
			console.log('File written');
	}
	}
	)

console.log("Object written successfully :/")
}

//run();
// uncomment to run simulation and form json file 

app.use('/data', async (req, res) => {
	res.status(200).json(dd);
});

const PORT = 9000;
app.listen(PORT, (err) => {
	if(err) {
		console.log("Could not start server");
		console.log('Error: ', err);
		return;
	}
	console.log(`Server started at http://localhost:${PORT}`);
})