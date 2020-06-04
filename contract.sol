pragma solidity ^0.4.17;

contract Exchange {
    struct Bid {
        address owner;
        uint price; uint amount; uint date;
    }
    
    Bid[] public Bids;  // what buyers are willing to pay
    Bid[] public Asks;  // what sellers are willing to take for it

    function getBid(uint index) public view returns(address, uint, uint, uint){
        return (Bids[index].owner, Bids[index].price, Bids[index].amount, Bids[index].date);
    }

    function getAsk(uint index) public view returns(address, uint, uint, uint){
        return (Asks[index].owner, Asks[index].price, Asks[index].amount, Asks[index].date);
    }

    function placeBid(uint _price, uint _amount, uint timestamp) public returns (bool) {
        Bid memory b;
        b.owner = msg.sender; b.price = _price;
        b.amount = _amount; b.date = timestamp;

        Bids.push(b);
        return true;
    }

    function placeAsk(uint _price, uint _amount, uint timestamp) public returns (bool) {
        Bid memory a;
        a.owner = msg.sender; a.price = _price;
        a.amount = _amount; a.date = timestamp;

        Asks.push(a);
        return true;
    }
    
    function removeBid(uint index) public returns(uint){
        if (index >= Bids.length) return;
        
        for (uint i = index; i<Bids.length-1; i++){
            Bids[i] = Bids[i+1];
        }
        Bids.length--;
        return Bids.length;
    }

    function removeAsk(uint index) public returns(uint) {
        if (index >= Asks.length) return;
        
        for (uint i = index; i<Asks.length-1; i++){
            Asks[i] = Asks[i+1];
        }
        Asks.length--;
        return Asks.length;
    }

    function getBidsCount() public view returns(uint) {
        return Bids.length;
    }
    
    function getAsksCount() public view returns(uint) {
        return Asks.length;
    }

    function clearMarket() public { delete Bids; delete Asks; }
}