const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3 ( new Web3.providers.HttpProvider("HTTP://127.0.0.1:8545"));

const exchange = require('./exchange'); //compiled contracts instance

class AgentNationalGrid{
    constructor(){
        this.national_GridPrice = 0.1; //dollar maybe
    }
    async getAccount(idx) {
        let accts = await web3.eth.getAccounts();
        this.ethereum_Address = accts[idx];
        return this.ethereum_Address;
    }
}

//-----------------------------------------------------------------------------
class Agent{
    constructor(batteryCapacity, batteryBool){
        this.timeRow = 0; this.balance = 0;
        this.householdAddress = 0; this.household = 0; this.householdID = 0;
        this.nationalGridAddress = 0; this.nationalGridPrice = 0.1; //dollar per kwh  // setNationalGrid()
        this.hasBattery = batteryBool; 
        this.priceOfEther = 250;  // 1 ether = 250dollar
        this.WEI_IN_ETHER = 1000000000000000000;
        this.balanceHistory = new Array();   // setAgentBalance()

        this.batteryCapacity = batteryCapacity; this.amountOfCharge = batteryCapacity;  //fully charged initially
        this.excessEnergy = 0;  this.shortageEnergy = 0;
        this.currentDemand = 0; this.currentSupply = 0; 

        // loadSmartMeterData(historicData, householdID) => historical Demand and supply {time, demand} and {time, supply}
        this.historicalDemand = new Array(); this.historicalSupply = new Array();  this.historicalPrices =  new Array();
        
        this.bidHistory = new Array();  //placeBuy(price, amount, data) => {transactionCost, address,price, amount, data}
        this.askHistory = new Array(); //placeAsk(price, amount, data)                
        this.successfulAskHistory = new Array(); //addSuccessfulAsk(amount) => {amount, date, timerow}

        //below both functions use web3 sendTransaction(); {1.send to NationalGridAddress}, {2.send to receiver}
        this.nationalGridPurchases = new Array();  //buyFromNationalGrid(amount) => {TransactionReceipt, date, quantity, receiver}
        this.successfulBidHistory = new Array(); //sendFunds(price, amount, receiver) =>{TransactionReceipt, date, quantity,}
    }

    async loadSmartMeterData(historicData, householdID){   // historicData {time, demand, supply}
        this.householdID = householdID;
        
        //historicData mei puri file ari

        for (i=1; i<historicData.length-1; i++){
            let currentDemand = {
                time: historicData[i][0], 
                demand: parseFloat(historicData[i][1]) * 1000  // kwh to watthr
            }
            let currentSupply = {
                time: historicData[i][0], 
                supply: parseFloat(historicData[i][2]) * 1000
            }
            this.historicalDemand.push(currentDemand); this.historicalSupply.push(currentSupply);
        }
        return true;
    }

    async  getAccount(index) {
        let accounts = await web3.eth.getAccounts();
        this.ethereumAddress = accounts[index];
        return this.ethereumAddress;
    }

    async getAgentBalance() {
        let balance = await web3.eth.getBalance(this.ethereumAddress);
        this.balance = balance; return balance;
    }

    async setAgentBalance() {
        let balance = 0; balance = await web3.eth.getBalance(this.ethereumAddress);
        this.balanceHistory.push(balance);
    }

    async setNationalGrid(nationalGridPrice, nationalGridAddress ) {
        let nationalGridPriceEther = nationalGridPrice / 250;  // to ether
        let nationalGridPriceWei = await web3.utils.toWei(`${nationalGridPriceEther}`, 'ether'); //to wei
        this.nationalGridPrice = nationalGridPriceWei; this.nationalGridAddress = nationalGridAddress;
    }

    addSuccessfulAsk(amount) { // seller
        let date = (new Date).getTime();
        let newReceivedTransaction = { amount: amount, date: date, timeRow: this.timeRow } 
        this.successfulAskHistory.push(newReceivedTransaction);
    }

    async buyFromNationalGrid(amount) {
        let amountTransaction = this.nationalGridPrice * (amount/1000); //kilowatt to megawatt //ether
        amountTransaction = parseInt( + amountTransaction.toFixed(18)); //transaction cost
        let transactionReceipt = 0;
        try{
        transactionReceipt = await web3.eth.sendTransaction({to: this.nationalGridAddress, from: this.ethereumAddress, value: amountTransaction, gas: '2000000'});
        }catch(err){console.log('buying from national grid error', err)};

        let date = (new Date).getTime();
        let newTransactionReceipt = {
            transactionReceipt: transactionReceipt, transactionCost: transactionReceipt.gasUsed,
            transactionAmount: amountTransaction,
            date: date, quantity: amount, timeRow: this.timeRow
        }

        this.nationalGridPurchases.push(newTransactionReceipt); 
        this.charge(amount);
        return transactionReceipt;
    }

    async sendFunds(price, amount, receiver) {
        let amountTransaction = price * (amount/1000); //in wei
        amountTransaction = parseInt(amountTransaction);
        let transactionReceipt = 0 ; 
        try{
        transactionReceipt = await web3.eth.sendTransaction({to: receiver, from: this.ethereumAddress, value: amountTransaction});
        }catch(err){
            console.log('error in sending funds', err);
        }
        let date = (new Date).getTime();
        let newTransactionReceipt = {
            transactionReceipt: transactionReceipt, transactionCost: transactionReceipt.gasUsed,
            transactionAmount: amountTransaction,
            timeRow: this.timeRow, date: date, quantity: amount, receiver: receiver
        }
        this.successfulBidHistory.push(newTransactionReceipt);
        this.charge(amount); //battery charged after buying
        return transactionReceipt;
    }

    convertWeiToDollars(weiValue) {
        let costEther = weiValue / this.WEI_IN_ETHER;
        let costDollars = costEther * ( + this.priceOfEther.toFixed(18)); // 1 ether = 150 dollar around
        costDollars = + costDollars.toFixed(3);
        return costDollars;
    }

    async placeBuy(price, amount, date) { //request energy from market
        let transactionReceipt = 0 ;
        try{ transactionReceipt = await exchange.methods.placeBid(Math.floor(price), Math.floor(amount), date)
                                .send( { from: this.ethereumAddress , gas: '3000000' }); ///msg sender
        }
        catch(err){ console.log('error in placeBuy', err);}      
        let newBid = {
            address: this.ethereumAddress, price: price, amount: amount, date: date,
            timeRow: this.timeRow, transactionCost: transactionReceipt.gasUsed
        }
        this.bidHistory.push(newBid);
        return true;
    }

    async placeAsk(price, amount, date){
        let transactionReceipt = 0 ;
        try{  transactionReceipt = await exchange.methods.placeAsk(Math.floor(price), Math.floor(amount), date)
                                    .send({ from: this.ethereumAddress,  gas: '3000000' }); ///msg sender
        }
        catch(err){ console.log('error in placeAsk', err);}
        let newAsk = {
            address: this.ethereumAddress, price: price, amount: amount,
            date: date, timeRow: this.timeRow, transactionCost: transactionReceipt.gasUsed
        }
        this.askHistory.push(newAsk);
        return true;
    }

    charge(amount){
        this.amountOfCharge += amount;
        if(this.amountOfCharge > this.batteryCapacity) { this.amountOfCharge = this.batteryCapacity; }
        let newObj = { timeRow: this.timeRow, charge: this.amountOfCharge }
    }

    discharge(amount){
        this.amountOfCharge -= amount;
        if(this.amountOfCharge <= 0) {  this.amountOfCharge = 0; }
        let newObj = { timeRow: this.timeRow, charge: this.amountOfCharge }
    }

    setCurrentTime(row){  this.timeRow = row; }

    async unfilledOrdersProcess(){    // buy (demand-suply)
        let demand = this.historicalDemand[this.timeRow].demand;
        let supply = this.historicalSupply[this.timeRow].supply;
        
        let shortageOfEnergy = demand;
        if(this.hasBattery) shortageOfEnergy = demand - supply;  //supplied by battery

        //buy remaining shortage from NationalGrid
        await this.buyFromNationalGrid(shortageOfEnergy); /// function defined above 
    }

    calculateYesterdayAverage() {
        if ( this.timeRow - 24 <= 0){   return this.timeRow - 24; }  //first day
        let scaledTime = (this.timeRow - 24)/24;
        let startOfDay = Math.floor(scaledTime) * 24;
        let endOfDay = startOfDay + 24;
        let sumPrices = 0;
        for (let i = startOfDay; i <= endOfDay; i++) {
            sumPrices += this.historicalPrices[i]
        }
        return sumPrices / 24;
    }

    async purchaseLogic() {
        let demand = this.historicalDemand[this.timeRow].demand;
        let supply = this.historicalSupply[this.timeRow].supply;

        let excessEnergy = 0, shortageOfEnergy = 0;
        let time = (new Date()).getTime();
        let bidsCount = 0, bid = 0 ,price = 0, asksCount = 0, ask = 0;
        
        if(supply >= demand) { excessEnergy = supply - demand; }  //supply i.e generated from solar panel
        if(supply < demand)  { shortageOfEnergy = demand - supply; }

        // ************* RETURNING TO API ************
        let returnData = {};
        returnData.supply = supply;
        returnData.demand = demand;
        if(excessEnergy)  returnData.excessEnergy = excessEnergy;
        if(shortageOfEnergy)  returnData.shortageEnergy = shortageOfEnergy;
        returnData.hasBattery = this.hasBattery;
        // **************************************************

        if(this.hasBattery == true) {
            if(excessEnergy > 0){ //excess energy
                if (this.amountOfCharge <= 0.5 * this.batteryCapacity){
                    this.charge(excessEnergy); //charge if less then 50%

                     // ************** RETURNING TO API ***************
                    returnData.batteryPercentage = '< 50%';
                    returnData.action = 'Battery Charged';
                    // **************************************************
                }
                else if (0.5*this.batteryCapacity < this.amountOfCharge && this.amountOfCharge< 0.8*this.batteryCapacity ){
                    //50-80% , sell or charge
                    bidsCount = await exchange.methods.getBidsCount().call();   

                    // *****************RETURNING TO API***************
                    returnData.batteryPercentage = '50-80%';
                    returnData.bidsCount = bidsCount;
                    // **************************************************

                    if( bidsCount > 0) {  //if there are bids today
                        bid = await exchange.methods.getBid(bidsCount-1).call(); //current bids
                        if(this.historicalPrices[this.timeRow - 24] != null || this.historicalPrices[this.timeRow - 24] != undefined){
                            let averagePrice = this.calculateYesterdayAverage(); //last day avg price
                            
                            // **************************************************
                            returnData.yesterdayAverage = averagePrice;
                            returnData.lastBidPrice = bid[1];
                            // **************************************************

                            if(bid[1] >= averagePrice){ //sell,  if current price > last day avg
                                await this.placeAsk(bid[1], Math.floor(excessEnergy), time);
                                returnData.task = 'Ask Placed';
                            }
                            else if(bid[1] < averagePrice){ //else charge
                                if( this.amountOfCharge + excessEnergy <= this.batteryCapacity) {
                                    this.charge(excessEnergy);
                                    returnData.task = 'Charge Battery';
                                }                           
                            }
                        }
                        else{ 
                            await this.placeAsk(bid[1], Math.floor(excessEnergy), time);
                             returnData.task = 'Ask Placed';
                        }
                    }
                    else { //if no bid, charge
                        this.charge(excessEnergy);
                        returnData.task = 'Excess energy & no bid => Charged Battery';
                    }
                }
                else if (this.amountOfCharge >= this.batteryCapacity * 0.8 ){ // >80% , sell directly, no need to charge 
                    excessEnergy*=100;
                    price = Math.random()*0.03 + 0.04;
                    price = await this.convertToWei(price);
                    await this.placeAsk(price, Math.floor(excessEnergy), time);
                    returnData.batteryPercentage = '> 80 %';
                    returnData.task = 'Ask Placed';
                }
            }
            else if (shortageOfEnergy > 0){ //energy shortage , bid or buy
                 if (this.amountOfCharge >= 0.5 * this.batteryCapacity){ 
                     //use from solar panel
                     //use remaining from battery i.e discharge
                    returnData.batteryPercentage = '> 50%';
                    returnData.task = 'Battery Discharged';
                    this.discharge(shortageOfEnergy); 
                    
                    //return true;
                }
                else if(this.amountOfCharge < 0.5 * this.batteryCapacity && this.amountOfCharge > 0.2 * this.batteryCapacity){
                    //20-50% , submit bid if there is sufficient energy for next few hours
                    let price = Math.random()*0.03 + 0.04; //random price less than 0.1(National Grid Price)
                    let amount = this.formulateAmount(); //kitna energy chaiye

                    if( amount === false) { 
                        return;
                    }
                    
                    price = await this.convertToWei(price);
                    await this.placeBuy(Math.floor(price), Math.floor(amount), time); 
                    returnData.batteryPercentage = '20-50%';
                    returnData.task = 'Place Bid';
                }
                else if (this.amountOfCharge <= 0.2 * this.batteryCapacity){ //<20%, buy from nationalGrid(no time to bid)
                    await this.buyFromNationalGrid(0.5 * this.batteryCapacity);
                    returnData.batteryPercentage = '< 20%';
                    returnData.task = 'Buy From National Grid';
                }   
            }  
        }


        if(this.hasBattery == false){  //no self supply (no solar panel)
            shortageOfEnergy = demand;            
            price = Math.random()*0.03 + 0.04;
            price = await this.convertToWei(price);
            await this.placeBuy(price, shortageOfEnergy, time); 
            returnData.batteryPercentage = 'No Battery';
            returnData.task = 'Place Bid';
        }

        return returnData;
    }

//////////////////////////////////////////////////////// 199-290             

    formulateAmount() {
        let timeInterval = 10;
        let supplySum = 0, demandSum = 0, energyNeeded = 0;
        for(let i = this.timeRow ; i < this.timeRow + timeInterval; i++) {
            supplySum += this.historicalSupply[i].supply;
            demandSum += this.historicalDemand[i].demand;
        }
        if(supplySum - demandSum >= 0) {
            return false;                //in next ten hours, supply>demand, no need to buy
        }
        if(supplySum - demandSum < 0) {
            energyNeeded = Math.abs(supplySum - demandSum); //if demand more
        }
        if(this.amountOfCharge + energyNeeded >= this.batteryCapacity) {
            energyNeeded = this.batteryCapacity - this.amountOfCharge;
        }
        return energyNeeded;  //demand-supply or //capacity-amountOfCharge
    }

    async convertToWei(price) {
        let calcPrice = (price / this.priceOfEther);
        calcPrice = calcPrice.toFixed(18);
        try{
        price = await web3.utils.toWei(calcPrice, 'ether');
        }catch(err){console.log('error from conversion', err)};
        price = parseInt(price);
        return price;
    }

}


module.exports = {Agent,AgentNationalGrid};