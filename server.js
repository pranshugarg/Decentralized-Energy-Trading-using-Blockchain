const express = require('express');
const fs = require('fs');
const app = express();

const simulation = require('./simulation');

let ret = null;

async function run() {
	if(ret === null) 
	ret = await simulation();

	if(ret===undefined || ret===null){
		console.log("Undefined returned by simulation");
	}

	fs.writeFileSync('./result.json', JSON.stringify(ret),  'utf8'
	,
	err => {
	console.log("Stuck after simulation. Object not in results :/")
	if(err) {
			console.log('Cant write to file: ', err);
	} else {
			console.log('File written');
	}
	}
	)

console.log("Object written successfully :/")
}

run();

app.use(async (req, res) => {
	if(ret === null || ret === undefined) {
		console.log('Object NI aaya ');
		res.status(500).json({
			success: false,
			message: 'Sorry'
		});
		return;
	}
	
	res.status(200).json({
		success: true,
		data: 'Saved'
	});
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