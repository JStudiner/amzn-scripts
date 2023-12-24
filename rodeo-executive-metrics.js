// ==UserScript==
// @name         Rodeo Executive Metrics
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  An extension to Rodeo Bar by mooshahe that includes metrics related to the current CPT
// @author       studijac
// @match        https://rodeo-iad.amazon.com/*/ExSD*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    //get pack and pick caps
     function getPickPackCaps() {
         return new Promise((resolve,reject)=>{
             GM_xmlhttpRequest({
                 method: "GET",
                 url: "https://monitorportal.amazon.com/mws?Action=GetMetricData&Version=2007-07-07&SchemaName1=Search&Pattern1=marketplace=$YOO1$ methodname=$RawDataAggregator$ servicename=$PythiaCLI$ PICK.EACH.Count NOT metric=$PPFracs NOT metric=$PPCubiscan NOT metric=$PPConsolidation NOT metric=$PPInbound NOT metric=$PPTrans NOT metric=$PPRc&Period1=FiveMinute&Stat1=sum&LiveData1=true&SchemaName2=Search&Pattern2=marketplace=$YOO1$ methodname=$RawDataAggregator$ servicename=$PythiaCLI$ PACK.EACH.Count NOT metric=$PPFracs NOT metric=$PPCubiscan NOT metric=$PPConsolidation NOT metric=$PPInbound&HeightInPixels=400&WidthInPixels=1200&GraphTitle=Pick Cap Vs Pack Cap YOO1&GraphType=zoomer&TZ=EST@TZ: EST&HorizontalLineLeft1=Pick Ask - @ 50000,&StartTime1=-PT2H&EndTime1=-PT0H&FunctionExpression1=SUM(S1)*12&FunctionLabel1=Pick Capacity(sum of sums: {sum}) [avg: {avg}, avg: {avg}, datapointCount: {datapointCount}]&FunctionYAxisPreference1=left&FunctionExpression2=SUM(S2)*12&FunctionLabel2=Pack Capacity(sum of sums: {sum}) [avg: {avg}, avg: {avg}, datapointCount: {datapointCount}]&FunctionYAxisPreference2=left",
                 headers: {
                     "Accept": "application/xml",
                     "Accept-Encoding": "gzip, deflate, br",
                     "Accept-Language": "en-US,en;q=0.5",
                     "Connection": "keep-alive",
                     "Host": "monitorportal.amazon.com",
                     "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
                     "Sec-Fetch-Site": "cross-site",
                     "Sec-Fetch-Mode": "navigate",
                     "Sec-Fetch-Dest": "document",
                     "Upgrade-Insecure-Requests": "1"
                 },
                 onload: function(response) {

                     // Parse the XML response
                     var parser = new DOMParser();
                     var xmlDoc = parser.parseFromString(response.responseText, "application/xml");

                     // Find all StatisticSeries elements
                     var statisticSeries = xmlDoc.getElementsByTagName('StatisticSeries');

                     // Object to store data points grouped by label
                     var dataPointsByLabel = {};

                     // Iterate through each StatisticSeries
                     for (var i = 0; i < statisticSeries.length; i++) {
                         var label = statisticSeries[i].getElementsByTagName('Label')[0].textContent;
                         var datapoints = statisticSeries[i].getElementsByTagName('Datapoint');

                         // Store the last three data points for each label
                         dataPointsByLabel[label] = [];
                         for (var j = Math.max(datapoints.length - 3, 0); j < datapoints.length; j++) {
                             var val = datapoints[j].getElementsByTagName('Val')[0].textContent;
                             var startTime = datapoints[j].getElementsByTagName('StartTime')[0].textContent;
                             dataPointsByLabel[label].push({ startTime: startTime, val: val });
                         }
                     }
                     resolve(dataPointsByLabel)
                 },
                 onerror: function(response) {
                     // Handle error
                     console.error("Request failed", response);
                     reject(response)
                 }
             });
         })
    }

    async function makeCapDivs(){
         try {
             const capData = await getPickPackCaps(); // Assuming this returns the data as shown
             // Function to calculate average
             const calculateAverage = (dataPoints) => {
                 const sum = dataPoints.reduce((acc, dp) => acc + parseFloat(dp.val), 0);
                 const average = sum / dataPoints.length;
                 return Math.round(average);
             };

             // Extract data for Pick and Pack Capacity
             const pickCapData = capData["Pick Capacity(sum of sums: {sum}) [avg: {avg}, avg: {avg}, datapointCount: {datapointCount}]"];
             const packCapData = capData["Pack Capacity(sum of sums: {sum}) [avg: {avg}, avg: {avg}, datapointCount: {datapointCount}]"];

             // Calculate averages
             const pickCapAvg = calculateAverage(pickCapData);
             const packCapAvg = calculateAverage(packCapData);

             // Determine the border color
             const diff = Math.abs(pickCapAvg - packCapAvg);
             const borderColor = diff > 400 ? 'red' : 'green';
             // Create divs
             const pickCapDiv = document.createElement('div');
             pickCapDiv.textContent = `Pick cap: ${pickCapAvg}`;
             styleCapDiv(pickCapDiv,borderColor);

             const packCapDiv = document.createElement('div');
             packCapDiv.textContent = `Pack cap: ${packCapAvg}`;
             styleCapDiv(packCapDiv,borderColor);

             return [pickCapDiv, packCapDiv];
         } catch (error) {
             console.error("Error fetching cap data", error);
             // Handle errors
         }
    }
    //get rid of current text to make room for new div
    document.getElementsByClassName('process-path-title')[0].textContent = '';
    let parentDiv = document.getElementsByClassName('process-path-title')[0].parentElement;

    parentDiv = editParentDiv(parentDiv);
    async function initDisplay(){
        await makeCfDisplay();
    }
    initDisplay()

    //edit the original parent div that the new divs will go into
    function editParentDiv(div) {
        let style = div.style;
        style.paddingTop = '1rem';
        style.display = 'flex';
        style.flexDirection='column'
        style.gap = '1vw';
        return div
    }



    //make all of the divs and put it into a main div that attaches to original parent div
    function makeCfDisplay() {
        makeCapDivs().then(capDivs => {
            const wipDiv = makeWipDiv();
            const psolveDiv = makePsolveDiv();
            const scannedDiv = makeScannedDiv();
            const pickableDiv = makePickableDiv();
            const divs = [wipDiv, psolveDiv, scannedDiv, pickableDiv,capDivs[0],capDivs[1]];

            makeDisplayParentDiv(divs);
            makeCPTDisplay()
        });

    }

    function getCurrentTime() {
        const now = new Date();
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        return `${hour}:${minute}`;
    }

    // New function for CPT metrics
    function makeCPTDisplay() {
        const CPTHeader = makeCPTHeader();
        const totalCPTItemsDiv = makeTotalCPTItemsDiv();
        const pickingNotYetPickedDiv = makePickingNotYetPickedDiv();
        const pickingPickedDiv = makePickingPickedDiv();
        const sortableDiv = makeUnsortedDiv();
        const scannedCPT = makeScannedCPT();
        const psCPT = makePSCPT();
        const divs = [CPTHeader, totalCPTItemsDiv, pickingNotYetPickedDiv, pickingPickedDiv,sortableDiv,scannedCPT,psCPT];
        makeDisplayParentDiv(divs);
    }

    function checkTotalTime() {
        const totalTable=document.getElementById('TotalTable')
        const currentHour = new Date().getHours();
        let nextCPTTime = '';
        const firstRowFifthColumn = totalTable.rows[0].cells[4].textContent.trim();
        if (firstRowFifthColumn === "Later  Total") {

            return "Later  Total";
        }
        // Loop through columns starting from the 5th
        for (let i = 4; i < totalTable.rows[0].cells.length; i++) {


            const cell = totalTable.rows[0].cells[i];
            let timeStr = cell.textContent.trim();
             // Extract only the time part (assuming it's in the format "Nov 11 02:00")
            if (timeStr==="Later  Total"){
                return "Later  Total"
            }
            timeStr = timeStr.split('\n').pop().trim();

            const hourPart = parseInt(timeStr.split(':')[0]); // Extract the hour part


           // Check if current time is after 19:00
            if (currentHour >= 19) {
                // Adjust for next day if current hour is late night and column hour is early morning
                if (currentHour > 20 && hourPart < 6) {
                    nextCPTTime = timeStr;

                    break;
                } else if (hourPart >= 0 && hourPart <= 6) {
                    // Consider times after midnight as greater
                    nextCPTTime = timeStr;
                    break;
                } else if (hourPart > currentHour) {
                    nextCPTTime = timeStr;
                    break;
                }
            } else {
                // If current time is before 19:00, use the normal comparison
                if (hourPart > currentHour && hourPart <=19) {
                    nextCPTTime = timeStr;
                    break;
                }

            }
        }

        return nextCPTTime
    } // Default to the 5th column (index 4) if the CPT time is not found in other columns


    function getAnyTableTime(table){
        const psTable=document.getElementById('ProblemSolvingTable');

        const totalTime = checkTotalTime();
        // Assuming totalTime is in the format "HH:MM"
        let totalHour = ""
        if (totalTime === "Later  Total") {
            totalHour = "Later  Total";
        }
        else{
            totalHour = parseInt(totalTime.split(':')[0]);
        }

        for (let i = 4; i < table.rows[0].cells.length; i++) {
            const cellTimeStr = table.rows[0].cells[i].textContent.trim().split('\n').pop().trim();
            console.log(cellTimeStr);
            const cellHour = parseInt(cellTimeStr.split(':')[0]);
            if (cellTimeStr ===totalHour){
                return i;
            }
            if (table===psTable){
                 console.log("harskeet");
                console.log(cellHour +" - "+ totalHour);
             }
            if (i === 4 && (cellHour > totalHour) &&(cellHour<19)) {
                return 0;
            }

            if (cellHour === totalHour) {
                return i; // Return the matching column index
            }
        }

        return 0; // Return -1 if no matching column is found
    }

    function makeDisplayParentDiv(divs) {
        let displayDiv = document.createElement('div');
        let style = displayDiv.style;
        style.display = 'flex';
        style.gap = '1vw';
        divs.forEach(div => {displayDiv.appendChild(div)});
        parentDiv.appendChild(displayDiv);
    }


    function makeCPTHeader(){
        const totalTable=document.getElementById('TotalTable')
        const realCPTtime = checkTotalTime();
        const cptIndex = getAnyTableTime(totalTable);
        const cptTime =totalTable.rows[0].cells[cptIndex].textContent.trim();
        console.log(cptTime)
        const [date, time] = cptTime.split('\n'); // splits at newline to get ["Sep 15", "06:00"]
        let div = document.createElement('div');
        if (cptTime){

            if(time){
                div.textContent = `${time} CPT`
            }else{
                div.textContent = `${date} CPT`
            }
        }else{
            div.textContent = `${realCPTtime} CPT`
        }
        styleHeader(div);
        return div

    }
    function makeUnsortedDiv(){
        const rebinTable = document.getElementById('RebinBufferedTable');
        let rebinBuffered = 0;
        const totalTable=document.getElementById('TotalTable')

        if (rebinTable) {
            const lastRow = rebinTable.rows[rebinTable.rows.length - 1];
            const columnIndex = getAnyTableTime(rebinTable);
            rebinBuffered = columnIndex !== 0 ? parseInt(lastRow.cells[columnIndex].textContent.trim(), 10) : 0;
        }
        const ppTable = document.getElementById('PickingPickedTable');

        let ppMultis=0
        const ppColumnIndex = getAnyTableTime(ppTable);
        // Loop through rows of the ppTable.
        if (ppColumnIndex !== 0) {
            for (let i = 0; i < ppTable.rows.length; i++) {
                const row = ppTable.rows[i];
                // Get values from first and the relevant column.
                const criteriaValue = row.cells[0].textContent.trim();
                const pickValue = parseInt(row.cells[ppColumnIndex].textContent.trim(), 10); // Convert to number.

                // Check criteria and add to appropriate bucket.
                switch(criteriaValue) {
                    case "PPMultiBldgWide":
                        ppMultis += pickValue;
                        break;
                    case "PPMultiBldgWideOP":
                        ppMultis += pickValue;
                        break;
                    case "PPMultiFloor":
                        ppMultis += pickValue;
                        break;
                    case "PPMultiWrap":
                        ppMultis += pickValue;
                        break;
                    default:
                        break;
                }
            }

        }
        let div = document.createElement('div');
        const sortable = ppMultis + rebinBuffered;
        div.textContent = `Unsorted: ${sortable}`;
        styleCPTDiv(div);
        return div;
    }

    // New functions for CPT metrics
    function makeTotalCPTItemsDiv() {

        // Assuming you have a way to get total CPT items
        const totalTable=document.getElementById('TotalTable')
        const realCPTtime = checkTotalTime();
        let cptIndex = 4
        for (let i = 4; i < totalTable.rows[0].cells.length; i++) {
            const cellTimeStr = totalTable.rows[0].cells[i].textContent.trim().split('\n').pop().trim();
            const cellHour = parseInt(cellTimeStr.split(':')[0]);
            if (cellTimeStr ===realCPTtime){
                cptIndex=i
            }
            if (i === 4 && (cellHour >realCPTtime )) {
                cptIndex=0
            }

            if (cellHour === realCPTtime) {
                cptIndex=i // Return the matching column index
            }
        }

        
        // Fetch the value from the bottom element of the 5th row.
        const lastRow = totalTable.rows[totalTable.rows.length - 1];
       
        const totalCPTItems = lastRow.cells[cptIndex].textContent.trim();

        let div = document.createElement('div');
        div.textContent = `Total: ${totalCPTItems}`;
        styleCPTDiv(div);
        return div;

    }


    function makePickingNotYetPickedDiv() {
        const totalTable=document.getElementById('TotalTable')
        // Assuming you have a way to get total CPT items
        const pnypTable=document.getElementById('PickingNotYetPickedTable')

        const columnIndex = getAnyTableTime(pnypTable);
        // Fetch the value from the bottom element of the 5th row.
        const lastRow = pnypTable.rows[pnypTable.rows.length - 1];
        const unpicked = columnIndex !== 0 ? lastRow.cells[columnIndex].textContent.trim() : 0;
        let div = document.createElement('div');
        div.textContent = `Not Picked: ${unpicked}`;
        styleCPTDiv(div);
        return div;
    }

    function makePickingPickedDiv() {
        const ppTable = document.getElementById('PickingPickedTable');
        const columnIndex = getAnyTableTime(ppTable);
        let bins = {};

        if (columnIndex !== 0) {
            bins = getPPValues(ppTable, columnIndex);
        } else {
            bins = {
                multis: 0,
                singles: 0,
                line8: 0,
                teamlift: 0,
            };
        }

        const total = bins.singles + bins.line8 + bins.teamlift + bins.multis;
        let div = document.createElement('div');
        div.textContent = `Packable: ${total} (Sorted: ${bins.multis}, Singles: ${bins.singles}, Line 8: ${bins.line8}, TeamLift: ${bins.teamlift})`;
        styleCPTDiv(div);
        return div;
    }

    function getPPValues(ppTable, columnIndex) {
        const bins = {
            multis: 0,
            singles: 0,
            line8: 0,
            teamlift: 0,
        };

        const sortedTable = document.getElementById('SortedTable');
        const sortedTableIndex = getAnyTableTime(sortedTable);
        const lastRow = sortedTable.rows[sortedTable.rows.length - 1];
        bins.multis = sortedTableIndex != 0 ? parseInt(lastRow.cells[sortedTableIndex].textContent.trim(), 10) : 0;

        // Loop through rows of the ppTable.
        for (let i = 0; i < ppTable.rows.length; i++) {
            const row = ppTable.rows[i];
            const criteriaValue = row.cells[0].textContent.trim();
            const pickValue = parseInt(row.cells[columnIndex].textContent.trim(), 10); // Convert to number.

            // Check criteria and add to appropriate bucket.
            switch(criteriaValue) {
                case "PPSingleFloorNonCon":
                    bins.singles+=pickValue;
                    break;
                case "PPHOVHeavy":
                    bins.teamlift+=pickValue;
                    break;
                case "PPBLBONonCon":
                    bins.line8 += pickValue;
                    break;
                case "PPSingleFloor":
                    bins.singles+=pickValue;
                    break;
                case "PPHOVAuto":
                    bins.singles+=pickValue;
                    break;
                case "PPSingleMech":
                    bins.teamlift+=pickValue;
                    break;
                case "PPSingleOP":
                    bins.singles+=pickValue;
                    break;
                case "PPSingleOPNonCon":
                    bins.line8+=pickValue;
                    break;
                case "PPSingleOPSIOC":
                    bins.line8+=pickValue;
                    break;
                case "PPSingleTeamLift":
                    bins.teamlift+=pickValue;
                    break;
                case "PPSingleTeamLift1":
                    bins.teamlift+=pickValue;
                    break;
                case "PPSingleTeamLift2":
                    bins.teamlift+=pickValue;
                    break;

                default:
                    break;
            }
        }

        return bins;
    }
    function makeScannedCPT(){
        const scannedTable=document.getElementById('ScannedTable');
        const columnIndex = getAnyTableTime(scannedTable)
        const lastRow=scannedTable.rows[scannedTable.rows.length-1];
        const scanned=columnIndex!=0 ?lastRow.cells[columnIndex].textContent.trim():0;
        let div = document.createElement('div');
        div.textContent=`Spoos: ${scanned}`
        styleCPTDiv(div);
        return div;

    }
     function makePSCPT(){
        const psTable=document.getElementById('ProblemSolvingTable');
        const columnIndex = getAnyTableTime(psTable);
         console.log("Psolve Idx: "+columnIndex);
        const lastRow=psTable.rows[psTable.rows.length-1];
        const ps= columnIndex!=0?lastRow.cells[columnIndex].textContent.trim():0;
        let div = document.createElement('div');
        div.textContent=`Psolve: ${ps}`
        styleCPTDiv(div);
        return div

    }

   function getNextCPT(table) {
    // Get the CPT time from the given table
    const tableCPTTimeStr = table.rows[0].cells[4].textContent.trim();

    // Get the CPT time from the TotalTable as the reference time
    const totalTable = document.getElementById('TotalTable');
    const totalCPTTimeStr = totalTable.rows[0].cells[4].textContent.trim();
    // Compare the two times

    return tableCPTTimeStr <= totalCPTTimeStr;
   }

    function convertToDateTime(timeStr) {
        // Convert time string 'HH:MM' to a Date object
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    //wip is picking picked + rebin buffered + sorted
    function makeWipDiv() {
        const pickingPicked = document.getElementById('PickingPickedTable').getElementsByClassName('grand-total')[0].getElementsByClassName('subtotal')[0].textContent.trim();
        let rebinBuffered;
        if (document.getElementById('RebinBufferedTable') === null) {
            rebinBuffered = 0;
        } else {
            rebinBuffered = document.getElementById('RebinBufferedTable').getElementsByClassName('grand-total')[0].getElementsByClassName('subtotal')[0].textContent.trim();
        }
        //check if there is anything in sorted to begin with
        let sorted;
        if (document.getElementById('SortedTable') === null) {
            sorted = 0;
        } else {
            sorted = document.getElementById('SortedTable').getElementsByClassName('grand-total')[0].getElementsByClassName('subtotal')[0].textContent.trim();
        }
        let totWip = parseInt(pickingPicked) + parseInt(rebinBuffered) + parseInt(sorted);
        let newDiv = document.createElement('div');
        newDiv.textContent = `Total wip: ${totWip} (pp: ${pickingPicked}) (rebin: ${rebinBuffered}) (sorted: ${sorted})`;
        styleDiv(newDiv);
        return newDiv;
    }

    //psolve will flag yellow above 40 and red at 50+
    function makePsolveDiv() {
        let psolve;
        if (document.getElementById('ProblemSolvingTable') === null) {
            psolve = 0;
        } else {
            psolve = document.getElementById('ProblemSolvingTable').getElementsByClassName('grand-total')[0].getElementsByClassName('subtotal')[0].textContent.trim();
        }
        let newDiv = document.createElement('div');
        let style = newDiv.style;
        if (parseInt(psolve) >= 40) {
            style.backgroundColor = 'yellow';
        }
        if (parseInt(psolve) >= 50) {
            style.backgroundColor = 'red';
        }
        newDiv.textContent = `Psolve: ${psolve}`;
        styleDiv(newDiv);
        return newDiv;
    }

    //scanned will flag yellow at 450 and red at 500+
    function makeScannedDiv() {
        let scanned;
        if (document.getElementById('ScannedTable') === null) {
            scanned = 0;
        } else {
            scanned = document.getElementById('ScannedTable').getElementsByClassName('grand-total')[0].getElementsByClassName('subtotal')[0].textContent.trim();
        }
        let newDiv = document.createElement('div');
        let style = newDiv.style;
        if (parseInt(scanned) >= 450) {
            style.backgroundColor = 'yellow';
        }
        if (parseInt(scanned) >= 500) {
            style.backgroundColor = 'red';
        }
        newDiv.textContent = `Scanned: ${scanned}`;
        styleDiv(newDiv);
        return newDiv;
    }

    //pickable is RTP TOT + PNYP TOT - RTP NP TOT - PNYP NP TOT
    function makePickableDiv() {
        const rtpTot = document.getElementById('ReadyToPickTable').getElementsByClassName('grand-total')[0].getElementsByClassName('subtotal')[0].textContent.trim();
        const rtpNpTot = document.getElementById('ReadyToPickHardCappedTable').getElementsByClassName('grand-total')[0].getElementsByClassName('subtotal')[0].textContent.trim();
        const pnypTot = document.getElementById('PickingNotYetPickedTable').getElementsByClassName('grand-total')[0].getElementsByClassName('subtotal')[0].textContent.trim();
        const pnypNpTot = document.getElementById('PickingNotYetPickedHardCappedTable').getElementsByClassName('grand-total')[0].getElementsByClassName('subtotal')[0].textContent.trim();
        const pickable = parseInt(rtpTot) + parseInt(pnypTot) - parseInt(rtpNpTot) - parseInt(pnypNpTot);

        let newDiv = document.createElement('div');
        newDiv.textContent = `Total pickable: ${pickable}`;
        styleDiv(newDiv);
        return newDiv;
    }


    //common styling for each div
    function styleDiv(div) {
        const style = div.style;
        style.padding = '1rem';
        style.border = '1px solid #e4e4e7';
        style.borderRadius = '5px';
        style.fontSize = '1.3rem';
        style.display = 'flex';
        return div;
    }
    function styleCPTDiv(div){
        const style=div.style
        style.padding = '1rem';
        style.border = '3px solid #3f2929';
        style.borderRadius = '5px';
        style.fontSize = '1.3rem';
        style.display = 'flex';
        return div;
    }
    function styleCapDiv(div,borderColor){
        const style=div.style
        style.padding = '1rem';
        style.border = `3px solid ${borderColor}`;
        style.borderRadius = '5px';
        style.fontSize = '1.3rem';
        style.display = 'flex';
        return div;
    }
    function styleHeader(div){
        const style=div.style
        style.padding = '1rem';
        style.fontSize = '1.3rem';
        style.display = 'flex';
        style.fontWeight = 'bold'; // This line makes the text bold
        return div;
    }
}());