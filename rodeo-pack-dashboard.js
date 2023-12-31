// ==UserScript==
// @name         Rodeo Dwells
// @namespace    YOO1
// @version      0.1
// @description  Tracks the top dwelling spoos and cages for your next CPT
// @author       studijac
// @include     https://rodeo-*.amazon.com/*/ItemList?*
// @include     https://rodeo-*.amazon.com/*/Search?*
// @include     https://rodeo-*.amazon.com/*/ExSD?*
// @require     https://drive.corp.amazon.com/view/ORY1Scripts/libs/jquery/3.2.1/jquery.min.js
// @updateURL    https://raw.githubusercontent.com/JStudiner/amzn-scripts/main/rodeo-pack-dashboard.js
// @downloadURL  https://raw.githubusercontent.com/JStudiner/amzn-scripts/main/rodeo-pack-dashboard.js

// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_addStyle
// @grant       GM_xmlhttpRequest
// ==/UserScript==

this.$ = this.jQuery = jQuery.noConflict(true);

(function() {
    'use strict';

     function fetchData() {
        GM_xmlhttpRequest({
            method: "GET",
            url: "https://rodeo-iad.amazon.com/YOO1/ItemListCSV?_enabledColumns=on&WorkPool=Scanned&enabledColumns=ASIN_TITLES&enabledColumns=LAST_EXSD&enabledColumns=LPN&enabledColumns=OUTER_SCANNABLE_ID&Excel=true&ExSDRange.RangeStartMillis=1703138399999&ExSDRange.RangeEndMillis=1703415660000&Fracs=NON_FRACS&ProcessPath=PPSingleOP%2CPPSingleFloorNonCon%2CPPMultiFloor%2CPPSingleFloor%2CPPSingleOPNonCon%2CPPMultiBldgWide%2CPPSingleOPSIOC%2CPPMultiWrap&shipmentType=CUSTOMER_SHIPMENTS",
            onload: function(response) {
                if (response.status >= 200 && response.status < 300) {
                    // Process the response
                    processSpoosData(response.responseText);
                } else {
                    console.error('Data fetch error:', response.statusText);
                }

            }
        });
    }


    function processSpoosData(data) {
        // Parse the data (this depends on the format of the data)
        var parser = new DOMParser();
        var doc = parser.parseFromString(htmlTable, 'text/html');
        var rows = doc.querySelectorAll('table tr');
        var data = [];

        rows.forEach((row, index) => {
            // Skip the header row
            if (index === 0) return;

            var cells = row.querySelectorAll('td');
            var item = {
                scannableId: cells[6].textContent,            // Assuming 7th column is Scannable ID
                outerScannableId: cells[7].textContent,      // Assuming 8th column is Outer Scannable ID
                expectedShipDate: cells[4].textContent,      // Assuming 5th column is Expected Ship Date
                dwellTime: cells[16].textContent             // Assuming 17th column is Dwell Time
            };

            data.push(item);
        });

        return data;

    }

    fetchData();
})();