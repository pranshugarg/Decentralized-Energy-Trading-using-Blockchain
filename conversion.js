
// wei refers to the smallest denomination of Ether

function convertArrayGasToDollars(array, GASPRICE, WEI_IN_ETHER, priceOfEther) {
    let sumCost = array.reduce((a, b) => a + b, 0);
    let calcPrice = sumCost * GASPRICE;
    let costEther = calcPrice / WEI_IN_ETHER;
    let costDollars = costEther * ( parseFloat(priceOfEther.toFixed(18)));
    costDollars = parseFloat(costDollars.toFixed(3));
    return costDollars;
}

function convertArrayWeiToDollars(arrayWei, WEI_IN_ETHER, priceOfEther) {
    let sumCost = arrayWei.reduce((a, b) => a + b, 0);
    let costEther = sumCost / WEI_IN_ETHER;
    let costDollars = costEther * ( parseFloat(priceOfEther.toFixed(18)));
    costDollars = parseFloat(costDollars.toFixed(3));
    return costDollars;
}

function convertWeiToDollars(weiValue,  WEI_IN_ETHER, priceOfEther) {
    let costEther = weiValue / WEI_IN_ETHER;
    let costDollars = costEther * ( parseFloat(priceOfEther.toFixed(18)));
    costDollars = parseFloat(costDollars.toFixed(3));
    return costDollars;
}

function convertGasToDollars(gasCost, GASPRICE, WEI_IN_ETHER, priceOfEther) {
    let calcPrice = gasCost * GASPRICE;
    let costEther = calcPrice / WEI_IN_ETHER;
    let costDollars = costEther * ( parseFloat(priceOfEther.toFixed(18)));
    costDollars = parseFloat(costDollars.toFixed(3));
    return costDollars;
}

module.exports = {convertArrayGasToDollars, convertArrayWeiToDollars, convertWeiToDollars, convertGasToDollars};