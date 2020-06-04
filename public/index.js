let time = null;
let data = null;

window.addEventListener('load', function() {
	$.ajax({
		url: 'http://localhost:9000/data',
		type: 'GET',
		success: function(res, status) {
			if(status === 'success') {
				data = res;
				time = 0;
				printToScreen(0);
			}
		},
		failure: function(err, status) {
			console.log(err);
		}
	})
})

function printForTime(data) {
	drawGraph(data);
	console.log('time', data);
	$('#time').children('span').text(data.time);
	
	let icon1 = "&#xf244;";
	let icon2 = "&#xf243;", icon3 = "&#xf242;";
	let icon4 = "&#xf241;", icon5 = "&#xf240;";
	let displayIcon;
	
	let ap = data.purchaseLogic.map((item, idx) => {
		if(item.batteryPercentage === undefined || item.batteryPercentage === null) {
			item.batteryPercentage = 0;
		}

		if(item.batteryPercentage == 0 || item.batteryPercentage == "No Battery")
		displayIcon = icon1
		else if(item.batteryPercentage > 0 && item.batteryPercentage <= 20)
		displayIcon = icon2
		else if(item.batteryPercentage > 20 && item.batteryPercentage <= 50)
		displayIcon = icon3
		else if(item.batteryPercentage > 50 && item.batteryPercentage <= 90)
		displayIcon = icon4
		else
		displayIcon = icon5

		return `
			<div class='col col-lg-4 col-md-6 col-sm-12'>
				<div class="card">
						<div class="card-body">
							<strong>House ${idx + 1}</strong>
						</div>
						<div class="card">
							<ul class="list-group list-group-flush">
							
								<li class="list-group-item">
									hasBattery: <span>${item.hasBattery}</span> <br>
									Indicator : <span class = "fa">${displayIcon}</span>
								</li>
								<li class="list-group-item">
									hasBattery: <span>${item.batteryPercentage}</span>
								</li>
								<li class="list-group-item">
									Demand: <span>${item.demand.toFixed(3)}</span>
								</li>
								<li class="list-group-item">
									Supply: <span>${item.supply.toFixed(3)}</span>
								</li>
								<li class="list-group-item">
									Task: <span>${item.task}</span>
								</li>
								<li class="list-group-item">
									<button id="houseDetail" type="button" class="btn btn-dark" onclick="houseDetail(${idx})"> Detail </button>
								</li>
							</ul>
						</div>
					</div>
			</div>
		`
    });
    
	$('#houseData').html(ap);
	$('#bidLength').text(data.bidLength);
	$('#askLength').text(data.askLength);
}

function previousTime() {
	if(time == 0)
		return;

	time = time - 1;
	printToScreen(time);
}

function nextTime() {
	if(time == data.data.length) 
		return;
	time = time + 1;
	printToScreen(time);
}

function drawGraph(data) {
	let prodData = new Array();
	let consData = new Array();
	let i = 1;
	let house; 
	for(house in data.purchaseLogic) {
		prodData.push({
			y : data.purchaseLogic[house].supply,
			label : "House " + (i)
		})
		consData.push({
			y : data.purchaseLogic[house].demand,
			label : "House " + (i)
		})
		i++;
	}

	var chart = new CanvasJS.Chart("chartContainer", {
		animationEnabled: true,
		title:{
			text: "Production and Consumption of each house"
		},
		axisY: {
			title: "Energy in Wh"
		},
		data: [{
			type: "bar",
			showInLegend: true,
			name: "Production",
			color: "gold",
			dataPoints: prodData
		},
		{
			type: "bar",
			showInLegend: true,
			name: "Consumption",
			color: "silver",
			dataPoints: consData
		}]
	});
	chart.render();
}

function printToScreen(idx) {
	$('#nationalGridAddress').text( data.nationalGridAddress );
	$('#nationalGridPrice').text('$' + data.nationalGridPrice);
	$('#houseNumber').hide();
	$('#dashboard').hide();
	printForTime(data.data[idx]);
}

let i = 0;
let flag=0;

function runSimulation(tim) {
	let x = setTimeout(function() {
		nextTime();
		/*printToScreen(i);
		*/
		i++;
		if(i == data.data.length) // || flag
		clearTimeout(timeout);
		else
		runSimulation(tim);
	},1000)
}

function stopSimulation(){
	flag=1;
}

function drawLineGraph(data,houseIndex) {

	console.log(data)
	console.log(houseIndex)

	let t;
	let demandData = new Array();
	let supplyData = new Array();

	for(t in data) {
		let demand = data[t].purchaseLogic[houseIndex].demand
		let supply = data[t].purchaseLogic[houseIndex].supply

		demandData.push({
			x : data[t].time,
			y : demand
		})
		supplyData.push({
			x : data[t].time,
			y : supply
		})
	}

	var chart = new CanvasJS.Chart("chartContainer", {
		animationEnabled: true,
		theme: "light2",
		title:{
			text: "Demand/Supply Curve"
		},
		axisX:{
			crosshair: {
				enabled: true,
				snapToDataPoint: true
			}
		},
		axisY: {
			title: "Energy in Wh",
			crosshair: {
				enabled: true
			}
		},
		toolTip:{
			shared:true
		},  
		legend:{
			cursor:"pointer",
			verticalAlign: "bottom",
			horizontalAlign: "left",
			dockInsidePlotArea: true,
			itemclick: toogleDataSeries
		},
		data: [{
			type: "line",
			showInLegend: true,
			name: "Demand",
			markerType: "square",
			color: "#F08080",
			dataPoints: demandData
		},
		{
			type: "line",
			showInLegend: true,
			name: "Supply",
			lineDashType: "dash",
			dataPoints: supplyData
		}]
	});
	chart.render();
	
	function toogleDataSeries(e){
		if (typeof(e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
			e.dataSeries.visible = false;
		} else{
			e.dataSeries.visible = true;
		}
		chart.render();
	}
}

function printForHouse(data, houseIndex) {
	drawLineGraph(data,houseIndex);
	$('#time').children('span').text(houseIndex);

	let icon1 = "&#xf244;"
	let icon2 = "&#xf243;"
	let icon3 = "&#xf242;"
	let icon4 = "&#xf241;"
	let icon5 = "&#xf240;"
	let displayIcon;

	// TODO draw graph for all time of that house
	
	let ap = data.map((item, idx) => {
		let houseData = item.purchaseLogic[houseIndex]
		if(houseData.batteryPercentage == 0 || houseData.batteryPercentage == "No Battery")
		displayIcon = icon1
		else if(houseData.batteryPercentage > 0 && houseData.batteryPercentage <= 20)
		displayIcon = icon2
		else if(houseData.batteryPercentage > 20 && houseData.batteryPercentage <= 50)
		displayIcon = icon3
		else if(houseData.batteryPercentage > 50 && houseData.batteryPercentage <= 90)
		displayIcon = icon4
		else
		displayIcon = icon5

		return `
			<div class='col col-lg-4 col-md-6 col-sm-12'>
				<div class="card">
						<div class="card-body">
							<strong>Time ${item.time}</strong>
						</div>
						<div class="card">
							<ul class="list-group list-group-flush">
							
								<li class="list-group-item">
									Indicator : <span class = "fa">${displayIcon}</span>
								</li>
								<li class="list-group-item">
									Battery(kWh) : <span class = "fa">${houseData.batteryPercentage}</span>
								</li>
								<li class="list-group-item">
									Demand(kWh) : <span>${houseData.demand.toFixed(3)}</span>
								</li>
								<li class="list-group-item">
									Supply(kWh) : <span>${houseData.supply.toFixed(3)}</span>
								</li>
								<li class="list-group-item">
									Task : <span>${houseData.task}</span>
								</li>
							</ul>
						</div>
					</div>
			</div>
		`
	});

	$('#houseData').html(ap);
}

function houseDetail(idx) {
	$('#nationalGridAddress').text(data.nationalGridAddress);
	$('#nationalGridPrice').text('$' + data.nationalGridPrice);
	$('#time').hide();
	$('#dashboard').show();
	$('#houseNumber').show();
	$('#houseNumber').children('span').text(idx+1);

	printForHouse(data.data,idx);
}

function showDashboard() {
	location.reload();
}