var fs = require('fs');
let csv = require('fast-csv');
let parse = require('csv-parse');

//fast csv method
async function readCSV (inputFile){
    return new Promise((resolve, reject) =>{
        let csvData=[];

        csv
        .parseFile(inputFile)   // .fromPath(inputFile)    
        .on("data", function(data){ 
            //on is async function and hence execution will be paused in main flow and
            //will be resumed only after nonasync function gets executed
            csvData.push(data);
        })
        .on("end", function(){
            resolve(csvData);
            //console.log("done");
        });
    });   
}

module.exports = readCSV;