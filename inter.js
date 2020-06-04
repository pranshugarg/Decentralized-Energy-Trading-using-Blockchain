const regression = require('regression'); 
const algebra = require('algebra.js');
var Fraction = algebra.Fraction; var Expression = algebra.Expression;
var Equation = algebra.Equation; const WEI_IN_ETHER = 1000000000000000000;
const PRICE_OF_ETHER = 250;

function slope(x1, y1, x2, y2) {
    if (x1 == x2) return false;
    return (y1 - y2) / (x1 - x2);
}

function yInt(x1, y1, x2, y2) {
    if (x1 === x2) return y1 === 0 ? 0 : false;
    if (y1 === y2) return y1;
    return y1 - slope(x1, y1, x2, y2) * x1 ;
}

function getIntersection(x11, y11, x12, y12, x21, y21, x22, y22) {
    var slope1, slope2, yint1, yint2, intx, inty;
    if (x11 == x21 && y11 == y21) return [x11, y11];
    if (x12 == x22 && y12 == y22) return [x12, y22];

    slope1 = slope(x11, y11, x12, y12);
    slope2 = slope(x21, y21, x22, y22);
    if (slope1 === slope2) return false;

    yint1 = yInt(x11, y11, x12, y12);
    yint2 = yInt(x21, y21, x22, y22);
    if (yint1 === yint2) return yint1 === false ? false : [0, yint1];

    if (slope1 === false) return [y21, slope2 * y21 + yint2];
    if (slope2 === false) return [y11, slope1 * y11 + yint1];
    intx = (slope1 * x11 + yint1 - yint2)/ slope2;
    return [intx, slope1 * intx + yint1];
}

function setCharAt(str,index,chr) {
    if(index > str.length-1) return str;
    return str.substr(0,index) + chr + str.substr(index+1);
}

function nthIndex(str, pat, n){
    var L= str.length, i= -1;
    while(n-- && i++<L){
        i= str.indexOf(pat, i);
        if (i < 0) break;
    }
    return i;
}

function calculateIntersection(array1, array2){
    let array1DescendingPrice = [];
    let array2AscendingPrice = [];
    array1DescendingPrice = array1.sort(sortDescending); // bids
    array2AscendingPrice = array2.sort(sortAscending); //asks

    let intersection = [ 0, 0];
    let array1x = new Array();
    let array1y = new Array();
    let array2x = new Array();
    let array2y = new Array();

    let array1Polynomial = new Array();
    let array2Polynomial = new Array();

    let array1xsub = Array(array1DescendingPrice.length).fill(0);
    let array2xsub = new Array()

    for(let i = 0; i< array1DescendingPrice.length; i++) { //bids
        for(let j = 0; j <= i; j++) {
            array1xsub[i] += array1DescendingPrice[j].amount; //cumulative amount used in regression
        }
        array1x.push(array1DescendingPrice[i].amount);
        array1y.push(array1DescendingPrice[i].price);
        array1Polynomial.push(new Array(array1xsub[i], array1y[i])); // cumulative amount, price
    }

    array2xsub.push(0); array2y.push(0);
    array2Polynomial.push(new Array(array2xsub[0], array2y[0]));
    
    for(let i = 0;  i < array2AscendingPrice.length; i++) { //asks
        let value = 0;
        for(let j = 0; j <= i; j++) {
            value += array2AscendingPrice[j].amount;
        }
        array2xsub.push(value); 
        array2x.push(array2AscendingPrice[i].amount);
        array2y.push(array2AscendingPrice[i].price);
        array2Polynomial.push(new Array(array2xsub[i + 1], array2y[i + 1])); 
    }

    const result1 = regression.linear(array1Polynomial); // bids, give eqn of st. line 
    const result2 = regression.linear(array2Polynomial); // asks

    let equation1 = result1.string;
    let equation2 = result2.string;

    equation1 = equation1.replace(/\+ -/g, "-"); // (y=) htt jayega
    equation1 = equation1.replace("y = ", "");

    equation2 = equation2.replace(/\+ -/g, "-");
    equation2 = equation2.replace("y = ", "");
    
    let equationFinal = `${equation1} = ${equation2}`; //solving for x(intersection)
    //ki x pe dono milegi 
    
    //put into equation and solve
    var eq = new algebra.parse(equationFinal);
    var ans = eq.solveFor("x"); //num and den , amount
    let possibleIntersections = [];
    ans  =  ans.numer/ans.denom; //cumulative amount

    let tempResult = result1.predict(ans); // bid regression
    intersection = tempResult;

    let minimum = tempResult[1]; //price
    
    if(minimum == Infinity || minimum == undefined) {
        minimum = 240000000000000;
    }
    intersection[1] = parseInt(minimum); // 1 pe price, amount ke liye
    return intersection;
}

function sortDescending(a, b) {
    if (a.price === b.price) {
        return 0;
    }
    else {
        return (a.price > b.price) ? -1 : 1;
    }
}

function sortAscending(a, b) {
    if (a.price === b.price) {
        return 0;
    }
    else {
        return (a.price < b.price) ? -1 : 1;
    }
}

function sortFunctionByAmount(a, b) {
    if (a[0] === b[0]) {
        return 0;
    }
    else {
        return (a[0] < b[0]) ? -1 : 1;
    }
}

module.exports = calculateIntersection;