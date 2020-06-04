const Web3 = require('web3'); const ganache = require('ganache-cli');
const web3 = new Web3( new Web3.providers.HttpProvider("http://127.0.0.1:8545") );
const {Agent,AgentNationalGrid} = require('./prosumer.js'); //class imports
const exchange = require('./exchange'); //compiled contracts
const readCSV = require('./readFile.js'); 

//import functions
const {convertArrayGasToDollars, convertArrayWeiToDollars, convertWeiToDollars, convertGasToDollars} = require('./conversion.js');
let fs = require('fs');
var csv = require("fast-csv"); let parse = require('csv-parse');
let async = require('async'); let calculateIntersection = require('./inter');

let id = new Array();
let agentsNoBattery = new Array(); let agentsBattery = new Array();
let numberOfBids = new Array();

const outputFile = 'output.csv';                  

const GASPRICE = 20000000000;  // 20 GWEI
const PRICE_OF_ETHER = 250; const WEI_IN_ETHER = 1000000000000000000; const NATIONAL_GRID_PRICE = 0.1; 

async function getFiles() {
    console.log('reading files...');
    let householdHistoricData = new Array();
    
    for (i = 1; i <= 15; i++){ householdHistoricData.push( await readCSV(`./data/house${i}.csv`)); }
    return {householdHistoricData};
}

async function createAgents(householdHistoricData, batteryCapacity, batteryBool) {
    console.log('creating agents...');
    let agents = new Array(); let agentNationalGrid = new AgentNationalGrid();

        for (var i=1;i<=15;i++){
            if(i>=8) batteryBool = true;

            agent = new Agent(batteryCapacity, batteryBool); //constructor of class from prosumer
        
            agentAccount = await agent.getAccount(i%10); //i%10

            await agent.loadSmartMeterData(householdHistoricData[i-1], i);  //historic demand and supply
                                               //       ( (i-1)th csv file   , i is houseHoldId) 
            let newAgent = { id: i, agent, agentAccount }
            agents.push(newAgent);      
        }    
    return { agents, agentNationalGrid };
}

async function getExchangeBids() {
    let bids = new Array(); let asks = new Array();
    let bid = 0, ask = 0;

    let bidsCount= await exchange.methods.getBidsCount().call();
    let asksCount= await exchange.methods.getAsksCount().call();   
    console.log("Number of bids Placed: " + bidsCount);  
    console.log("Number of Asks Placed: " + asksCount);

    for (let i = 0; i <= bidsCount - 1 ; i++) {
        bid = await exchange.methods.getBid(i).call();         //contracts to array

        let date = new Date(parseInt(bid[3])); date = date.toLocaleString();  //current time
        newBid = { price: parseInt(bid[1]), amount: parseInt(bid[2]), address: bid[0], date: date } //new JSON object
        bids.push(newBid);
    }
    for (let j = 0; j <= asksCount - 1; j++){
        try {  ask = await exchange.methods.getAsk(j).call(); }
        catch(err){ console.log('ERROR', err); }

        let date = new Date(parseInt(ask[3])); date = date.toLocaleString(); 
        newAsk = { price: parseInt(ask[1]), amount: parseInt(ask[2]), address: ask[0], date: date }
        asks.push(newAsk);
    }
    return { bids, asks };
}

function sortByAmount(a, b) {  //decreasing amount
    if (a.amount === b.amount) { return 0; }
    else { return (a.amount > b.amount) ? -1 : 1; }
}

async function clearMarket() {  //remove all bids and asks
    let bidsCount = await exchange.methods.getBidsCount().call();
    let asksCount = await exchange.methods.getAsksCount().call();
    let accounts = await web3.eth.getAccounts();

    await exchange.methods.clearMarket().send({
        from: accounts[ Math.floor(Math.random() * accounts.length)  ], //accounts.length-3
        gas: '2000000'
    });
}

//n-1 n-1 bheja as indices
async function matchBids(bid_index, ask_index, bids, asks, agentsBattery, intersection) {
    if (bids.length == 0 || asks.length == 0) { return { bids, asks, agentsBattery}; }

    let obj = agentsBattery.find(function (obj) { return obj.agentAccount === bids[bid_index].address; }); 
    //bidder , (n-1)th bid kis agent ki hai 

    if(bids[bid_index].amount - asks[ask_index].amount >= 0){  //bid>=ask amountOFcharge(minimum vali kyuki descending sort hai)
        let remainder = bids[bid_index].amount - asks[ask_index].amount;
        let calcAmount = bids[bid_index].amount - remainder; //asked amount  

        await obj.agent.sendFunds(intersection[1], calcAmount , asks[ask_index].address ); //intersection[1] is the price 

         let objSeller = agentsBattery.find(function (obj) { return obj.agentAccount === asks[ask_index].address; }); //seller
         //objSeller.agent.discharge(calcAmount); //seller discharged
         objSeller.agent.addSuccessfulAsk(intersection[1], calcAmount); //addSuccessfulAsk()

        bids[bid_index].amount = remainder; //remain charge in bidder's account 

        if(remainder==0){ bids.splice(bid_index, 1); }
        asks.splice(ask_index, 1); //ask to hamesha khatam hogi
        return (matchBids(bids.length-1, asks.length-1, bids, asks, agentsBattery, intersection));
    }
    if(bids[bid_index].amount - asks[ask_index].amount < 0){  //bid<ask
        let remainder = asks[ask_index].amount - bids[bid_index].amount;
        let calcAmount = asks[ask_index].amount - remainder; //bid amount
        
        //obj bid vale ka address hai, paise bhejega
        //ask[ask_index].address receiver hai
        await obj.agent.sendFunds(intersection[1], calcAmount, asks[ask_index].address );

        let objSeller = agentsBattery.find(function (obj) { return obj.agentAccount === asks[ask_index].address; }); //seller
         //objSeller.agent.discharge(calcAmount); //seller discharge
         objSeller.agent.addSuccessfulAsk(intersection[1], calcAmount);
        
        asks[ask_index].amount = remainder; //seller has amount of charge left

        if(remainder == 0){ asks.splice(ask_index, 1); }
        bids.splice(bid_index, 1); //bid ka hamesha pura charge mil gya
        return (matchBids(bids.length-1, asks.length-1, bids, asks, agentsBattery, intersection)); 
    }
}
/*___________________________________________(*-*)____________________________________________________________*/
async function init() {
    let unFilledBids = new Array(); let unFilledAsks = new Array();
    let aggregatedDemand = new Array(); let aggregatedSupply = new Array();
    let historicalPricesPlot = new Array();
    
    console.log("Inside init() function");
    var accounts = await web3.eth.getAccounts();
    
    let { householdHistoricData } = await getFiles();   //array of array
    //all files data

    let { agents, agentNationalGrid } = await createAgents(householdHistoricData, 12000, false);  //battery capacity 12000 unit
    console.log("Agents created");

    let agentsBattery = agents; 
    let nationalGridAddress = await agentNationalGrid.getAccount(accounts.length-1); 
    //last account selected as National Grid

    let dataToReturnApi = [];
    dataToReturnApi.nationalGridAddress = nationalGridAddress; 
    dataToReturnApi.NATIONAL_GRID_PRICE = NATIONAL_GRID_PRICE;

    let timeArray= new Array();
    console.log(`using ${agentsBattery.length} amount of agents`);
    console.log('starting simulation');

    for (let i= 2184; i < 2584 ; i++) {
        timeArray.push(i); console.log('time', i);
        let retData = {};  retData.time = i;
        let agentPurchaseLogic = [];

        for (let j = 0; j < agentsBattery.length; j++){
            agentsBattery[j].agent.setCurrentTime(i);   
           
            //naional grid for each agent
            if( i == 2184){ await agentsBattery[j].agent.setNationalGrid(NATIONAL_GRID_PRICE, nationalGridAddress); }
            try{
                let pc = await agentsBattery[j].agent.purchaseLogic(); //purchase logic
                agentPurchaseLogic.push(pc);
            }        
            catch(err){ console.log('error from purchase logic', err); }
        }
        retData.purchaseLogic = agentPurchaseLogic;
        let { bids, asks } = await getExchangeBids();        
       
        console.log("exchanged");
        retData.bidLength = bids.length; retData.askLength = asks.length;

        if (bids.length >= 2  && asks.length  >= 2 ){
            let intersection = calculateIntersection(bids, asks); //price wei mei hogi
            let priceDollars = convertWeiToDollars(intersection[1], WEI_IN_ETHER, PRICE_OF_ETHER);
            console.log('price in Dollars', priceDollars);
            let paidBids = new Array();
            
            bids = bids.sort(sortByAmount); asks = asks.sort(sortByAmount);  //descending
            numberOfBids.push(bids.length);
            
            for (let j = 0; j < agentsBattery.length; j++) {
                agentsBattery[j].agent.historicalPrices[i] = intersection[1]; //set price 
            }

            let { bids: unfilledBids, asks: unfilledAsks, agentsBattery: agentsBattery2} = await matchBids(bids.length - 1, asks.length - 1, bids, asks, agentsBattery, intersection);
            bids = unfilledBids; asks = unfilledAsks;
            agentsBattery = agentsBattery2;
           
            if(bids.length > 0) {
                for (let i = 0; i < bids.length; i++){
                    let obj = agentsBattery.find(function (obj) { return obj.agentAccount === bids[i].address; });
                    obj.agent.unfilledOrdersProcess(); // buy from nationalGrid
                    unFilledBids.push(bids[i]);
                }
            }
            if(asks.length > 0) {
                for (let i = 0; i < asks.length; i++){
                        let obj = agentsBattery.find(function (obj) { return obj.agentAccount === asks[i].address; });
                        obj.agent.charge(asks[i].amount); //charge own battery instead of selling          
                        unFilledAsks.push(asks[i]);
                }
            }
            try{  await clearMarket();  } 
            catch(err){  console.log('error while trying to clear market', err); }
        }
        else if (bids.length < 2  || asks.length  < 2) { //no intersection i.e cant buy or sell directly
            numberOfBids.push(bids.length);
            
            let fullfill = [];

            for (let i=0; i < bids.length; i++){ //if ask.length=1, nobody ready to sell
                unFilledBids.push(bids[i]); 
                
                let obj = agentsBattery.find(function (obj) { return obj.agentAccount === bids[i].address; });//return bid object
                
                obj.agent.unfilledOrdersProcess();  //i.e. buy rest(extra) from NationalGrid
            }

            for (let i=0; i < asks.length; i++) { //if bid.length=1, nobody to buy
                unFilledAsks.push(asks[i]);
                let obj = agentsBattery.find(function (obj) { return obj.agentAccount === asks[i].address; });  
                obj.agent.charge(asks[i].amount); //charge own battery from rest(extra energy not sold)
            }

            for (let j = 0; j < agentsBattery.length; j++) {
                agentsBattery[j].agent.historicalPrices[i] = 0;  // no exchange thus price=0
            }

            try{
             await clearMarket();
            }catch(err){ console.log('error while trying to clear market', err); }
        }
        dataToReturnApi.push(retData);
    } 
    //___________________________________ 
    let agentBalanceAverage = new Array();
    
    let history = agentsBattery[0].agent.historicalPrices;
    let aggActualDemand =  new Array();
    let transactionCostBid = new Array(); let transactionCostAsk = new Array(); let transactionCostAvg = new Array();
    let transactionCost = new Array();
    let nationalGridBidsAggAmount= new Array();  let nationalGridBidsAggGas = new Array();
    let nationalGridPurchases = new Array();  let nationalGridTotalCost = new Array();
    
    let successfulBidsAggAmount = new Array(); let successfulBidsAggGas = new Array();
    let successfulBidsTotalCost = new Array();
    let totalExpenditureHourly = new Array();
    let totalExpenditure = new Array();
    let totalNumberTransactions = new Array();

    let averageNumberTransactions = new Array();       //averages parameters (for each agent)
    let averageNationalGridPurchases = new Array(); 

    let agent;  let simulationCSV = new Array(); let csvData = new Array();
    const sumPrices= history.reduce((a, b) => a + b, 0);// no use

    for (let i= 2184; i < 2584; i++) {   //Calculating Parameters from simulation to plot
        let demand = new Array();     let supply = new Array();
        let gasCostBids = new Array(); let gasCostAsks = new Array();
        let nationalGridBidsGas = new Array();
        let successfulBidsGas = new Array();
     
        //in dollar
        historicalPricesPlot[i] = convertWeiToDollars(agentsBattery[0].agent.historicalPrices[i], WEI_IN_ETHER, PRICE_OF_ETHER);

        for (let j = 0; j < agentsBattery.length; j++) {
            demand.push(agentsBattery[j].agent.historicalDemand[i].demand); //demand and supply at time i
            if(j>=8) //battery hai end valo pe
                supply.push(agentsBattery[j].agent.historicalSupply[i].supply);
            
            //bids and asks at time time
            for(let k = 0; k < agentsBattery[j].agent.bidHistory.length; k++ ) {  
                if( agentsBattery[j].agent.bidHistory[k].timeRow == i){
                    gasCostBids.push(agentsBattery[j].agent.bidHistory[k].transactionCost); } }
          
            for(let z=0; z < agentsBattery[j].agent.askHistory.length; z++) {
                if( agentsBattery[j].agent.askHistory[z].timeRow == i){
                    gasCostAsks.push(agentsBattery[j].agent.askHistory[z].transactionCost); } }
            
            for(let k = 0; k < agentsBattery[j].agent.successfulBidHistory.length; k++) {
                if ( agentsBattery[j].agent.successfulBidHistory[k].timeRow == i) {
                    successfulBidsGas.push(agentsBattery[j].agent.successfulBidHistory[k].transactionCost); } }
    
             for(let k=0; k < agentsBattery[j].agent.nationalGridPurchases.length; k++) {
                 if ( agentsBattery[j].agent.nationalGridPurchases[k].timeRow == i) {
                     nationalGridBidsGas.push(agentsBattery[j].agent.nationalGridPurchases[k].transactionCost); } }
        }
    
        if(gasCostBids.length > 0) {                        
            let bidCostDollars = convertArrayGasToDollars(gasCostBids, GASPRICE, WEI_IN_ETHER, PRICE_OF_ETHER);
            transactionCostBid[i] = bidCostDollars; //sum of gasCost of all bids in dollar
        }
        else if(gasCostBids.length == 0) { transactionCostBid[i] = 0; }

        if(gasCostAsks.length > 0) {
            let askCostDollars = await convertArrayGasToDollars(gasCostAsks, GASPRICE, WEI_IN_ETHER, PRICE_OF_ETHER);
            transactionCostAsk[i] = askCostDollars; 
        }
        else if(gasCostAsks.length == 0) { transactionCostAsk[i] = 0; }
       
        let sumTransactions = nationalGridBidsGas.length + gasCostAsks.length + gasCostBids.length + successfulBidsGas.length;
        totalNumberTransactions.push(sumTransactions);
        let numberMarketTransactions = gasCostAsks.length + gasCostBids.length + successfulBidsGas.length;
    
        const sumDemand = demand.reduce((a, b) => a + b, 0); const sumSupply = supply.reduce((a, b) => a + b, 0);
        
        aggregatedDemand[i] = sumDemand; aggregatedSupply[i] = sumSupply;
  
        let newCsvEntry = {
            time: i, agg_demand: aggregatedDemand[i], agg_supply: aggregatedSupply[i],
            historical_prices: historicalPricesPlot[i],
            no_total_transactions: totalNumberTransactions[i-2184], //indexing // i-2184
            no_trades_market:  successfulBidsGas.length,
            no_market_transactions: numberMarketTransactions, 
            no_nat_grid_transactions: nationalGridBidsGas.length
        }
        csvData.push(newCsvEntry);
    }
    console.log(`writing results of simulation to csv file : ${outputFile}`);

    //csv.createWriteStream 
    var csvStream = csv.format({ headers: true }),
    writableStream = fs.createWriteStream(outputFile);
    writableStream.on("finish", function () {  console.log("DONE!"); }); 
    csvStream.pipe(writableStream);

    for(let i = 0; i < csvData.length; i++) { csvStream.write(csvData[i]);  }
    csvStream.end();

    return {
        data: dataToReturnApi,
        nationalGridAddress: nationalGridAddress,
        nationalGridPrice: NATIONAL_GRID_PRICE   
    };
};

//init();
//run function for simulation

module.exports = init;

