// ==UserScript==
// @name        NewRodeo
// @namespace   ORY1
// @version 20220602
// @updateURL   https://drive.corp.amazon.com/view/ORY1Scripts/NewRodeo.user.js
// @downloadURL https://drive.corp.amazon.com/view/ORY1Scripts/NewRodeo.user.js
// @include     https://rodeo-*.amazon.com/*/ItemList?*
// @include     https://rodeo-*.amazon.com/*/Search?*
// @include     https://rodeo-*.amazon.com/*/ExSD?*
// @require     https://drive.corp.amazon.com/view/ORY1Scripts/libs/jquery/3.2.1/jquery.min.js
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_addStyle
// @grant       GM_xmlhttpRequest
// ==/UserScript==
// ORY1 - lorfeuvr@amazon.com
// _______________________________________





//-------------------------------------------------------------
// Don't make any changes after this line
//-------------------------------------------------------------

this.$ = this.jQuery = jQuery.noConflict(true);


var SupportedLanguages = [];
var nrsl = {};
var V = {};
var rodeoSettings = {};
var divinfo;
var _PickingNotYetPicked = [];
var _WallsLocation = [];
var _BoxRec = [];
var _ShipLocation = [];
var _TrackingID = [];
var _cvAtPM00002 = [];
var PickersLocation = {};
var eagleeyecounter = 0;
var eagleeyeretry = {};
var maxretry = 3;
var TblAsinInOverageWall = [];
var OverageWallChecked = 0;



$(document).ready(function () {
  nrs_setup();
  if (V.Action == 'ExSD'){ExSD();}
  if (V.Action != 'ExSD'){noExSD();}
});


function ExSD(){

  
  if (rodeoSettings.HighlightActivePP){
    /*------------------------------
    -  Highlight Active Process Path
    */
    if ($('#PickingNotYetPickedTable').length){
      $('#PickingNotYetPickedTable tbody tr.header-row')
        .append('<th style="background-color:#f4c99c;min-width:50px;text-align:center">In Scan</th>')
        .append('<th style="background-color:#f4c99c;min-width:50px;text-align:center">Pickers</th>')
        .append('<th style="background-color:#f4c99c;min-width:50px;text-align:center">Instant<br />Pick Rate</th>')
        .append('<th style="background-color:#f4c99c;min-width:50px;text-align:center">Instant<br />UPH</th>')
        .append('<th style="background-color:#f4c99c;min-width:50px;text-align:center">Batches<br />Active</th>')
        .append('<th style="background-color:#f4c99c;min-width:50px;text-align:center">Batch<br />Limit</th>')
        .append('<th style="background-color:#f4c99c;min-width:50px;text-align:center">Totes<br />Active</th>')
        .append('<th style="background-color:#f4c99c;min-width:50px;text-align:center">Tote<br />Limit</th>')
        .append('<th style="background-color:#f4c99c;min-width:50px;text-align:center">AutoFlow<br />Pick Rate Avg</th>')
        .append('<th style="background-color:#f4c99c;min-width:50px;text-align:center">AutoFlow<br />Pick TUR</th>');

      $('#PickingNotYetPickedTable tbody tr:not(".header-row")').each(function(){
        var ppath = $.trim($(this).find('th:first').text()).toLowerCase();
        $(this).find('th:first').addClass('th_' + ppath);
        $(this)
          .addClass('tr_' + ppath)
          .append('<td class="inscan_' + ppath + '"></td>')
          .append('<td class="pickers_' + ppath + '"></td>')
          .append('<td class="pickrate_' + ppath + '"></td>')
          .append('<td class="uph_' + ppath + '"></td>')
          .append('<td class="batches_' + ppath + '"></td>')
          .append('<td class="batchlimit_' + ppath + '"></td>')
          .append('<td class="totes_' + ppath + '"></td>')
          .append('<td class="totelimit_' + ppath + '"></td>')
          .append('<td class="pra_' + ppath + '"></td>')
          .append('<td class="tur_' + ppath + '"></td>');
      });

      $('#TotalTable tr:first').append('<th>State</th>');
      $('#TotalTable tr:not(:first)').each(function(){
        $(this).append('<td></td>');
      });

      if (rodeoSettings.UseNewConsole){
        // New console
        GM_xmlhttpRequest({
          method: "GET",
          url: "https://picking-console." + V.Region2 + ".picking.aft.a2z.com/api/fcs/" + V.FCname + "/process-paths/information",
          headers: {
            'Accept':'application/json',
            'Content-Type':'application/json'
          },
          onload: function(response) {
            var js = JSON.parse(response.responseText);
            if (typeof js.status != 'undefined'){
              if (js.status == '405'){
                $('#nrs-info').html('<i class="nrs-warn"></i><a href="https://picking-console.eu.picking.aft.a2z.com/fc/' + V.FCname + '/process-paths" target="_blank">' + nrsl[V.BrowserLanguage]['e']['openpickpp'] + '</a>');
              }
            }
            if (typeof js.processPathInformationMap != 'undefined'){
              $.each(js.processPathInformationMap, function(ppName, obj){
                var _ProcessPath = ppName.toLowerCase();
				if (obj.Status == null){obj.Status = ''}
                var _Status = obj.Status.toLowerCase();

                if (_ProcessPath != ''){
                  if (_Status == 'active'){
                    $("th:contains('" + ppName + "')").css("background-color", "#ccffbf").parent().css("background-color", "#ccffbf");
                    $('.tr_' + _ProcessPath).css("background-color", "#ccffbf");
                    $('.th_' + _ProcessPath).css("background-color", "#ccffbf");
                    $('.totes_' + _ProcessPath).text(obj.ToteCount);
                    $('.pickers_' + _ProcessPath).text(obj.PickerCount);
                    $('.pickrate_' + _ProcessPath).text(Math.trunc(obj.UnitsPerHour/obj.PickerCount));
                    $('.uph_' + _ProcessPath).text(obj.UnitsPerHour);
                    $('.batches_' + _ProcessPath).text(obj.BatchCount);
                    $('.inscan_' + _ProcessPath).text(obj.UnitsInScanner);
                  }
                  $('#TotalTable tr').each(function() {
                    if ($.trim($(this).find('th:first').text()).toLowerCase() == _ProcessPath){
                      $(this).find('td:last').text(_Status);
                    }
                  });
                }
              });
			  
              GM_xmlhttpRequest({
                method: "GET",
                url: "https://process-path." + V.Region2 + ".picking.aft.a2z.com/api/processpath/" + V.FCname + "/processPathWithUserSettingsList",
                headers: {
                  'Accept':'application/json',
                  'Content-Type':'application/json'
                },
                onload: function(response) {
                  var js = JSON.parse(response.responseText);
                  if (typeof js.processPaths != 'undefined'){
                    $.each(js.processPaths, function(index, obj){
                      var _ProcessPath = obj.processPathName.toLowerCase();
                      $('.pra_' + _ProcessPath).text(obj.pickRateAverage);
                      $('.tur_' + _ProcessPath).text(obj.unitRateTarget);
                      $('.batchlimit_' + _ProcessPath).text(obj.openBatchQuantityLimit);
                      $('.totelimit_' + _ProcessPath).text(obj.containerQuantityLimit);
                    });
                  }
                }
              });
            }
          }
        });
      } else {
        // old console
        GM_xmlhttpRequest({
          method: "GET",
          url: "https://" + V.FCname + "-portal.amazon.com/gp/picking/processpaths-new.html?pickProcessFilter=All_Pick_Processes",
          headers: {'Content-Type': 'text/html; charset=utf-8'},
          onload: function(response) {
            $(response.responseText).find('#t1 tr').each(function(){
              var ppName = $.trim($(this).find("td[title=' Process Path ']").text());
              var _Status = $.trim($(this).find("td[title=' Status ']").text()).toLowerCase();
              var _InScanner = $.trim($(this).find("td[title=' In Scanner ']").text());
              var _Totes = $.trim($(this).find("td[title=' Totes ']").html());
              var _Pickers = $.trim($(this).find("td[title=' Pickers ']").text());
              var _UPH = $.trim($(this).find("td[title=' UPH ']").html());
              var _UPT = $.trim($(this).find("td[title=' UPT ']").text());
              var _ProcessPath = ppName.toLowerCase();

              if (_ProcessPath != ''){
                if (_Status == 'active'){
                  $("th:contains('" + ppName + "')").css("background-color", "#ccffbf").parent().css("background-color", "#ccffbf");
                  $('.tr_' + _ProcessPath).css("background-color", "#ccffbf");
                  $('.th_' + _ProcessPath).css("background-color", "#ccffbf");

                  $('.inscan_' + _ProcessPath).text(_InScanner);
                  $('.totes_' + _ProcessPath).text(_Totes);
                  $('.pickers_' + _ProcessPath).text(_Pickers);
                  $('.uph_' + _ProcessPath).text(_UPH);
                }
                $('#TotalTable tr').each(function() {
                  if ($.trim($(this).find('th:first').text()).toLowerCase() == _ProcessPath){
                    $(this).find('td:last').text(_Status);
                  }
                });
              }
            });
          }
        });
        GM_xmlhttpRequest({
          method: "GET",
          url: "https://" + V.FCname + "-portal.amazon.com/gp/picking/config/processPaths.html",
          headers: {'Content-Type': 'text; charset=utf-8'},
          onload: function(response) {
            $(response.responseText).find('#t1 tr').each(function(){
              var ppName = $.trim($(this).find("td[title=' Process Path ']").text());
              var _Status = $.trim($(this).find("td[title=' Status ']").text()).toLowerCase();
              var _TargetUnitRate = $.trim($(this).find("td[title=' Target Unit Rate ']").html());
              var _PickRateAve = $.trim($(this).find("td[title=' Pick Rate Ave ']").text());
              var _BatchLimit = $.trim($(this).find("td[title=' Batch Limit ']").text());
              var _ProcessPath = ppName.toLowerCase();
              $('.pra_' + _ProcessPath).text(_PickRateAve);
              $('.tur_' + _ProcessPath).text(_TargetUnitRate);
              $('.batchlimit_' + _ProcessPath).text(_BatchLimit);
            });
          }
        });
      }
    }
    /*
    -  Highlight Process Path
    ------------------------------*/
  }



  if (V.FCname == 'ORY1' && V.shipmentType == 'CUSTOMER_SHIPMENT'){
    var _url = 'https://monitorportal.amazon.com/mws?Action=GetMetricData';
    _url += '&Version=2007-07-07';
    _url += '&SchemaName1=Service&DataSet1=Prod&Marketplace1=ORY1&HostGroup1=ALL&Host1=ALL&ServiceName1=FCOutboundModelServiceCreation&MethodName1=ALL&Client1=ALL&MetricClass1=NONE&Instance1=NONE&Metric1=BufferLimit.PPMultiMedium.REBIN.MaxUnits&Period1=FiveMinute&Stat1=avg&Label1=FCOutboundModelServiceCreation%20ALL%20BufferLimit.PPMultiMedium.REBIN.MaxUnits';
    _url += '&SchemaName2=Service&Metric2=BufferLimit.PPMultiMedium.REBIN.MinUnits&Label2=FCOutboundModelServiceCreation%20ALL%20BufferLimit.PPMultiMedium.REBIN.MinUnits';
    _url += '&SchemaName3=Service&Metric3=PlannedLaborGroupHeadcount.REBIN%3APPMultiMedium&Label3=FCOutboundModelServiceCreation%20ALL%20PlannedLaborGroupHeadcount.REBIN%3APPMultiMedium';
    _url += '&SchemaName4=Service&ServiceName4=SkynetCapacityModelService&MethodName4=RetrieveRodeoBuffers&Metric4=WorkPoolSize.PPMultiMedium.PickingPicked&Label4=SkynetCapacityModelService%20RetrieveRodeoBuffers%20WorkPoolSize.PPMultiMedium.PickingPicked';
    _url += '&SchemaName5=Service&Metric5=WorkPoolSize.PPMultiMedium.RebinBuffered&Label5=SkynetCapacityModelService%20RetrieveRodeoBuffers%20WorkPoolSize.PPMultiMedium.RebinBuffered';
    _url += '&SchemaName6=Service&ServiceName6=FCOutboundModelServiceCreation&MethodName6=ALL&Metric6=BufferLimit.PPMultiMedium.PACK.MaxUnits&Label6=FCOutboundModelServiceCreation%20ALL%20BufferLimit.PPMultiMedium.PACK.MaxUnits';
    _url += '&SchemaName7=Service&Metric7=BufferLimit.PPMultiMedium.PACK.MinUnits&Label7=FCOutboundModelServiceCreation%20ALL%20BufferLimit.PPMultiMedium.PACK.MinUnits';
    _url += '&SchemaName8=Service&Metric8=PlannedLaborGroupHeadcount.PACK%3APPMultiMedium&Label8=FCOutboundModelServiceCreation%20ALL%20PlannedLaborGroupHeadcount.PACK%3APPMultiMedium';
    _url += '&SchemaName9=Service&ServiceName9=SkynetCapacityModelService&MethodName9=RetrieveRodeoBuffers&Metric9=WorkPoolSize.PPMultiMedium.Sorted&Label9=SkynetCapacityModelService%20RetrieveRodeoBuffers%20WorkPoolSize.PPMultiMedium.Sorted';
    _url += '&SchemaName10=Service&ServiceName10=FCOutboundModelServiceCreation&MethodName10=ALL&Metric10=BufferLimit.PPSingleZone.PACK.MaxUnits&Label10=FCOutboundModelServiceCreation%20ALL%20BufferLimit.PPSingleZone.PACK.MaxUnits';
    _url += '&SchemaName11=Service&Metric11=BufferLimit.PPSingleZone.PACK.MinUnits&Label11=FCOutboundModelServiceCreation%20ALL%20BufferLimit.PPSingleZone.PACK.MinUnits';
    _url += '&SchemaName12=Service&Metric12=PlannedLaborGroupHeadcount.PACK%3APPSingleZone&Label12=FCOutboundModelServiceCreation%20ALL%20PlannedLaborGroupHeadcount.PACK%3APPSingleZone';
    _url += '&SchemaName13=Service&ServiceName13=SkynetCapacityModelService&MethodName13=RetrieveRodeoBuffers&Metric13=WorkPoolSize.PPSingleZone.PickingPicked&Label13=SkynetCapacityModelService%20RetrieveRodeoBuffers%20WorkPoolSize.PPSingleZone.PickingPicked';
    _url += '&SchemaName14=Service&ServiceName14=FCOutboundModelServiceCreation&MethodName14=ALL&Metric14=BufferLimit.PPMultiWrapZone.PACK.MaxUnits&Label14=FCOutboundModelServiceCreation%20ALL%20BufferLimit.PPMultiWrapZone.PACK.MaxUnits';
    _url += '&SchemaName15=Service&Metric15=BufferLimit.PPMultiWrapZone.PACK.MinUnits&Label15=FCOutboundModelServiceCreation%20ALL%20BufferLimit.PPMultiWrapZone.PACK.MinUnits';
    _url += '&SchemaName16=Service&Metric16=PlannedLaborGroupHeadcount.PACK%3APPMultiWrapZone&Label16=FCOutboundModelServiceCreation%20ALL%20PlannedLaborGroupHeadcount.PACK%3APPMultiWrapZone';
    _url += '&SchemaName17=Service&ServiceName17=SkynetCapacityModelService&MethodName17=RetrieveRodeoBuffers&Metric17=WorkPoolSize.PPMultiWrapZone.RebinBuffered&Label17=SkynetCapacityModelService%20RetrieveRodeoBuffers%20WorkPoolSize.PPMultiWrapZone.RebinBuffered';
    _url += '&SchemaName18=Service&Metric18=WorkPoolSize.PPMultiWrapZone.PickingPicked&Label18=SkynetCapacityModelService%20RetrieveRodeoBuffers%20WorkPoolSize.PPMultiWrapZone.PickingPicked';
    _url += '&SchemaName19=Service&Metric19=WorkPoolSize.PPMultiWrapZone.Sorted&Label19=SkynetCapacityModelService%20RetrieveRodeoBuffers%20WorkPoolSize.PPMultiWrapZone.Sorted';
    _url += '&SchemaName20=Service&ServiceName20=FCOutboundModelServiceCreation&MethodName20=ALL&Metric20=BufferLimit.PPMultiWrapZone.REBIN.MaxUnits&Label20=FCOutboundModelServiceCreation%20ALL%20BufferLimit.PPMultiWrapZone.REBIN.MaxUnits';
    _url += '&SchemaName21=Service&Metric21=BufferLimit.PPMultiWrapZone.REBIN.MinUnits&Label21=FCOutboundModelServiceCreation%20ALL%20BufferLimit.PPMultiWrapZone.REBIN.MinUnits';
    _url += '&SchemaName22=Service&Metric22=PlannedLaborGroupHeadcount.REBIN%3APPMultiWrapZone&Label22=FCOutboundModelServiceCreation%20ALL%20PlannedLaborGroupHeadcount.REBIN%3APPMultiWrapZone';
    _url += '&FunctionExpression1=M1*M3%2BM6*M8%2BM10*M12%2BM14*M16%2BM20*M22&FunctionLabel1=MaxUnits%20%5Bcurrent%3A%20%7Blast%7D%5D&FunctionYAxisPreference1=left&FunctionColor1=fff';
    _url += '&FunctionExpression2=M2*M3%2BM7*M8%2BM11*M12%2BM15*M16%2BM21*M22&FunctionLabel2=MinUnits%20%5Bcurrent%3A%20%7Blast%7D%5D&FunctionYAxisPreference2=left&FunctionColor2=fff';
    _url += '&FunctionExpression3=M4%2BM5%2BM9%2BM13%2BM17%2BM18%2BM19&FunctionLabel3=Buffer%20%5Bcurrent%3A%20%7Blast%7D%5D&FunctionYAxisPreference3=left&FunctionColor3=%23ff0000&actionSource=dashboard';
    _url += '&HeightInPixels=350&WidthInPixels=1000&GraphTitle=ORY1%20-%20TOTAL%20WIP&ShowGaps=false';
    _url += '&TZ=Europe%2FParis@TZ%3A%20Paris&StartTime1=-PT4H&EndTime1=-PT0H';
    GM_xmlhttpRequest({
      method: "POST",
      url: _url,
      dataType: 'xml',
      onload: function(response) {
        var _MaxUnits = 0;
        var _MinUnits = 0;
        $(response.responseText).find('StatisticSeries').each(function(){
          if ($(this).find('Label').text().indexOf('MaxUnits') > -1){
            _MaxUnits = Number($(this).find('Datapoint').last().find('Val').text());
          }
          if ($(this).find('Label').text().indexOf('MinUnits') > -1){
            _MinUnits = Number($(this).find('Datapoint').last().find('Val').text());
          }
        });
        var _ActualBuffer = $("#TotalTable th:contains('WorkInProgress Subtotal')").parent().find('td:first');
        if (Number(_ActualBuffer.text()) >= _MinUnits && Number(_ActualBuffer.text()) <= _MaxUnits){
          _ActualBuffer.css('background','#aaffaa');
        } else {
          _ActualBuffer.css('background','#ffaaaa');
        }
        //console.log(Number(_ActualBuffer.text()),_MinUnits,_MaxUnits);
      }
    });
    return false;
  }


}  /* function ExSD() */


function noExSD(){
  // Columns location
  V.cols.OuScId = $(".result-table thead tr th:contains('" + nrsl[V.BrowserLanguage]['colnames']['OuterScannableID'] + "')").index(".result-table thead tr th") + 1;
  V.cols.ScId =   $(".result-table thead tr th:contains('" + nrsl[V.BrowserLanguage]['colnames']['ScannableID'] + "')").index(".result-table thead tr th") + 1;
  V.cols.Co =     $(".result-table thead tr th:contains('" + nrsl[V.BrowserLanguage]['colnames']['Condition'] + "')").index(".result-table thead tr th") + 1;
  V.cols.ShId =   $(".result-table thead tr th:contains('" + nrsl[V.BrowserLanguage]['colnames']['ShipmentID'] + "')").index(".result-table thead tr th") + 1;
  V.cols.PiBaId = $(".result-table thead tr th:contains('" + nrsl[V.BrowserLanguage]['colnames']['PickBatchID'] + "')").index(".result-table thead tr th") + 1;
  V.cols.WoPo =   $(".result-table thead tr th:contains('" + nrsl[V.BrowserLanguage]['colnames']['WorkPool'] + "')").index(".result-table thead tr th") + 1;
  V.cols.SKU =    $(".result-table thead tr th:contains('" + nrsl[V.BrowserLanguage]['colnames']['FNSKU'] + "')").index(".result-table thead tr th") + 1;
  V.cols.TrReId = $(".result-table thead tr th:contains('" + nrsl[V.BrowserLanguage]['colnames']['TransferRequestID'] + "')").index(".result-table thead tr th") + 1;
  if (rodeoSettings.PickingNotYetPickedDetails && document.URL.indexOf('WorkPool=PickingNotYetPicked') > -1 && $('.result-table tr').length <= rodeoSettings.PickingNotYetPickedLimit){
    V.PNYPok = true;
  }
  if (!V.isAuthenticated){
    $('#nrs-info').html('<i class="nrs-warn"></i><a href="https://fcmenu.amazon.com/" target="_blank">' + nrsl[V.BrowserLanguage]['e']['notloggedconsole'] + '</a>');
    throw 'Not logged in console';
  }
  
  
  
  if (V.shipmentType == 'CUSTOMER_SHIPMENT'){
    // Check needed columns
    if (V.cols.OuScId == 0){$('#nrs-info').html('<i class="nrs-warn"></i>' + nrsl[V.BrowserLanguage]['e']['missingcolumn'] + '<br />' + nrsl[V.BrowserLanguage]['colnames']['OuterScannableID']);throw 'One column is missing';}
    if (V.cols.ScId == 0)  {$('#nrs-info').html('<i class="nrs-warn"></i>' + nrsl[V.BrowserLanguage]['e']['missingcolumn'] + '<br />' + nrsl[V.BrowserLanguage]['colnames']['ScannableID']);throw 'One column is missing';}
    if (V.cols.Co == 0)    {$('#nrs-info').html('<i class="nrs-warn"></i>' + nrsl[V.BrowserLanguage]['e']['missingcolumn'] + '<br />' + nrsl[V.BrowserLanguage]['colnames']['Condition']);throw 'One column is missing';}
    if (V.cols.ShId == 0)  {$('#nrs-info').html('<i class="nrs-warn"></i>' + nrsl[V.BrowserLanguage]['e']['missingcolumn'] + '<br />' + nrsl[V.BrowserLanguage]['colnames']['ShipmentID']);throw 'One column is missing';}
    if (V.cols.PiBaId == 0){$('#nrs-info').html('<i class="nrs-warn"></i>' + nrsl[V.BrowserLanguage]['e']['missingcolumn'] + '<br />' + nrsl[V.BrowserLanguage]['colnames']['PickBatchID']);throw 'One column is missing';}
    if (V.cols.WoPo == 0)  {$('#nrs-info').html('<i class="nrs-warn"></i>' + nrsl[V.BrowserLanguage]['e']['missingcolumn'] + '<br />' + nrsl[V.BrowserLanguage]['colnames']['WorkPool']);throw 'One column is missing';}
    if (V.cols.SKU == 0)   {$('#nrs-info').html('<i class="nrs-warn"></i>' + nrsl[V.BrowserLanguage]['e']['missingcolumn'] + '<br />' + nrsl[V.BrowserLanguage]['colnames']['FNSKU']);throw 'One column is missing';}

    // Browse each rodeo row & pick up datas
    $('.result-table tr').each(function (index) {

      var _outerscannableid = $.trim($(this).find('td:nth-child(' + V.cols.OuScId + ')').text());
      var _scannableid =      $.trim($(this).find('td:nth-child(' + V.cols.ScId + ')').text());
      var _condition =        $.trim($(this).find('td:nth-child(' + V.cols.Co + ')').text());
      var _shipmentid =       $.trim($(this).find('td:nth-child(' + V.cols.ShId + ')').text());
      var _pickbatchid =      $.trim($(this).find('td:nth-child(' + V.cols.PiBaId + ')').text());
      var _workpool =         $.trim($(this).find('td:nth-child(' + V.cols.WoPo + ')').text());
      var _fnsku =            $.trim($(this).find('td:nth-child(' + V.cols.SKU + ')').text());
      
      // PickingNotYetPicked details
      if (V.PNYPok && index == 0){
        $(this).append('<th style="text-align:center">' + nrsl[V.BrowserLanguage]['e']['unitstate'] + '</th>');
      }
      if (V.PNYPok && index > 0){
        if (_workpool.indexOf('PickingNotYetPicked') > -1 && _workpool != 'PickingNotYetPickedHardCapped'){
          $(this).append('<td class="us_' + _shipmentid + _fnsku + _scannableid + '"></td>');
          if ($.inArray(_shipmentid + '|' + _fnsku + '|' + _scannableid, _PickingNotYetPicked) == -1){
            _PickingNotYetPicked.push(_shipmentid + '|' + _fnsku + '|' + _scannableid);
          }
        } else {
          $(this).append('<td class="us_xx">-</td>');
        }
      }
      // Add Wall Location
      if (rodeoSettings.AddWallsLocation){
        if ((_condition == '4' || _condition == '704') && _outerscannableid != ''){
          if ($.inArray(_outerscannableid + '|' + _pickbatchid, _WallsLocation) == -1){
            _WallsLocation.push(_outerscannableid + '|' + _pickbatchid);
          }
        }
      }
      // Add BoxRec
      if (rodeoSettings.AddBoxRec){
        if ((_condition == '7' || _condition == '15' || _condition == '704' || _condition == '13' || _condition == '1320') && _shipmentid != ''){
          if ($.inArray(_shipmentid, _BoxRec) == -1){
            _BoxRec.push(_shipmentid);
          }
        }
      }
      // Add Ship location
      if (rodeoSettings.AddShipLocation){
        if ((_condition == '13' || _condition == '1320') && _shipmentid != ''){
          if ($.inArray(_shipmentid, _ShipLocation) == -1){
            _ShipLocation.push(_shipmentid);
          }
        }
      }
      // Add Tracking ID
      if (rodeoSettings.AddTrackingID){
        if ((_condition == '13' || _condition == '1320') && _shipmentid != ''){
          if ($.inArray(_shipmentid, _TrackingID) == -1){
            _TrackingID.push(_shipmentid);
          }
        }
      }
      // Add cvAtPM00002 details
      if (rodeoSettings.cvAtPM00002LastPick || rodeoSettings.cvAtPM00002PickerName || rodeoSettings.cvAtPM00002PickerLocation){
        if (_outerscannableid == 'cvAtPM00002' || _outerscannableid.substring(0, 3) == 'pmP' || _outerscannableid.substring(0, 3) == 'ws-'){
          if ($.inArray(_scannableid + '|' + _shipmentid + '|' + _fnsku + '|0', _cvAtPM00002) == -1){
            _cvAtPM00002.push(_scannableid + '|' + _shipmentid + '|' + _fnsku + '|0');
          }
        }
      }

    });  /* $('.result-table tr').each */
    
    
    // Get all asins in Overage Walls
    if (rodeoSettings.HighlightOverageWall){
      $.each(rodeoSettings.OverageWallName, function(i, wallname) {
        GM_xmlhttpRequest({
          method: "GET",
          url: "http://fcresearch-" + V.Region2 + ".aka.amazon.com/" + V.FCname + "/results/inventory?s=" + wallname,
          headers: {'Content-Type': 'text/html; charset=utf-8'},
          onload: function(response) {
            $(response.responseText).find('#table-inventory tbody tr').each(function () {
              var asinInOverage = $.trim($(this).find('td:nth-child(3)').text());
              if ($.inArray(asinInOverage, TblAsinInOverageWall) == -1){
                TblAsinInOverageWall.push(asinInOverage);
              }
            });
            HighlightAsinInOverage(i);
          }
        });
      });
    }

    
  }  /* V.shipmentType == 'CUSTOMER_SHIPMENT' */

  
  
  
  if (V.shipmentType == 'TRANSSHIPMENT'){
    // Check needed columns
    if (V.cols.OuScId == 0){$('#nrs-info').html('<i class="nrs-warn"></i>' + nrsl[V.BrowserLanguage]['e']['missingcolumn'] + '<br />' + nrsl[V.BrowserLanguage]['colnames']['OuterScannableID']);throw 'One column is missing';}
    if (V.cols.ScId == 0)  {$('#nrs-info').html('<i class="nrs-warn"></i>' + nrsl[V.BrowserLanguage]['e']['missingcolumn'] + '<br />' + nrsl[V.BrowserLanguage]['colnames']['ScannableID']);throw 'One column is missing';}
    if (V.cols.TrReId == 0){$('#nrs-info').html('<i class="nrs-warn"></i>' + nrsl[V.BrowserLanguage]['e']['missingcolumn'] + '<br />' + nrsl[V.BrowserLanguage]['colnames']['TransferRequestID']);throw 'One column is missing';}
    if (V.cols.WoPo == 0)  {$('#nrs-info').html('<i class="nrs-warn"></i>' + nrsl[V.BrowserLanguage]['e']['missingcolumn'] + '<br />' + nrsl[V.BrowserLanguage]['colnames']['WorkPool']);throw 'One column is missing';}
    if (V.cols.SKU == 0)   {$('#nrs-info').html('<i class="nrs-warn"></i>' + nrsl[V.BrowserLanguage]['e']['missingcolumn'] + '<br />' + nrsl[V.BrowserLanguage]['colnames']['FNSKU']);throw 'One column is missing';}
    
    // Browse each rodeo row & pick up datas
    $('.result-table tr').each(function (index) {

      var _outerscannableid = $.trim($(this).find('td:nth-child(' + V.cols.OuScId + ')').text());
      var _scannableid =      $.trim($(this).find('td:nth-child(' + V.cols.ScId + ')').text());
      var _transferrequestid =$.trim($(this).find('td:nth-child(' + V.cols.TrReId + ')').text());
      var _workpool =         $.trim($(this).find('td:nth-child(' + V.cols.WoPo + ')').text());
      var _fnsku =            $.trim($(this).find('td:nth-child(' + V.cols.SKU + ')').text());
      var _apslink =          $.trim($(this).find('td:nth-child(' + V.cols.TrReId +') a.aps-link').attr('href'));
      var _shipmentid =       _apslink.split("/").pop();
      
      // PickingNotYetPicked details
      if (V.PNYPok && index == 0){
        $(this).append('<th style="text-align:center">' + nrsl[V.BrowserLanguage]['e']['unitstate'] + '</th>');
      }
      if (V.PNYPok && index > 0){
        if (_workpool.indexOf('PickingNotYetPicked') > -1 && _workpool != 'PickingNotYetPickedHardCapped'){
          $(this).append('<td class="us_' + _shipmentid + _fnsku + _scannableid + '"></td>');
          if ($.inArray(_shipmentid + '|' + _fnsku + '|' + _scannableid, _PickingNotYetPicked) == -1){
            _PickingNotYetPicked.push(_shipmentid + '|' + _fnsku + '|' + _scannableid);
          }
        } else {
          $(this).append('<td class="us_xx">-</td>');
        }
      }
      
      // Add cvAtPM00002 details
      if (rodeoSettings.cvAtPM00002LastPick || rodeoSettings.cvAtPM00002PickerName || rodeoSettings.cvAtPM00002PickerLocation){
        if (_outerscannableid == 'cvAtPM00002' || _outerscannableid.substring(0, 3) == 'pmP' || _outerscannableid.substring(0, 3) == 'ws-'){
          if ($.inArray(_scannableid + '|' + _shipmentid + '|' + _fnsku + '|' + _transferrequestid, _cvAtPM00002) == -1){
            _cvAtPM00002.push(_scannableid + '|' + _shipmentid + '|' + _fnsku + '|' + _transferrequestid);
          }
        }
      }
      
    });  /* $('.result-table tr').each */
    
  }  /* V.shipmentType == 'TRANSSHIPMENT' */

  ShowResults();

}  /* function noExSD() */

function HighlightAsinInOverage(){
  OverageWallChecked++;
  if (OverageWallChecked == rodeoSettings.OverageWallName.length){
    $('.result-table tbody tr').each(function() {
      var FnSku = $.trim($(this).find('td:nth-child(' + V.cols.SKU + ')').text());
      if ($.inArray(FnSku , TblAsinInOverageWall) != -1){
        $(this).css("background-color", "#ffbfbf");
      }
    });
  }
}

function ShowResults(){
  
  // New console links
  if (rodeoSettings.UseNewConsole){

    // PickingNotYetPicked details
    if (_PickingNotYetPicked.length > 0){
      $.each(_PickingNotYetPicked, function( i, unitspec ) {
        var unitShipment = unitspec.split('|')[0];
        var unitSKU = unitspec.split('|')[1];
        var unitBin = unitspec.split('|')[2];
        GM_xmlhttpRequest({
          method: 'GET',
          url: 'https://picking-console.' + V.Region2 + '.picking.aft.a2z.com/api/fcs/' + V.FCname + '/pick-research/type/' + V.newShipmentType + '/id/' + unitShipment,
          headers: {
            'Accept':'application/json',
            'Content-Type':'application/json'
          },
          onload: function(response){
            var js = JSON.parse(response.responseText);
            if (typeof js.pickResearchData != 'undefined'){

              var targetedFcSku = '';
              if (typeof js.pickResearchData.pickDemandItemsList != 'undefined'){
                $.each(js.pickResearchData.pickDemandItemsList, function(index, obj){
                  if (typeof obj.requestedSku != 'undefined' && obj.requestedSku == unitSKU){
                    targetedFcSku = obj.targetedSku;
                  }
                });
              }

              if (typeof js.pickResearchData.pickActionsList != 'undefined'){
                var _pickActions = js.pickResearchData.pickActionsList;
                var _Actions = {};
                $.each(_pickActions, function(index, obj){
                  if (obj.sourceScannableId == unitBin && (obj.fcSku == unitSKU || obj.fcSku == targetedFcSku)  && obj.consumerReferenceId == unitShipment){
                    _Actions[parseInt(obj.actionDate)] = obj;
                  }
                });
                _Actions = Object.fromEntries(Object.entries(_Actions).sort())
              
                if (Object.keys(_Actions).length == 0){
                  $('.result-table .us_' + unitShipment + unitSKU + unitBin).html('<div style="padding:0 3px">Scheduler Assigned</div>');
                  return;
                }
                
                var _return = '';
                $.each(_Actions, function(tmstp, obj){
                  switch(obj.actionType){
                    case 'ASSIGNED':
                      _return += '<div style="background:#93fffd">In Scanner: ' + obj.userId + '</div>';
                    break;
                    case 'PICKED':
                      if (obj.applicationName == 'FCPickCompleteService'){
                        _return += '<div style="background:#94ff98;padding:0 3px">Picked: ';
                        _return += '<a href="https://rodeo-' + V.Region + '.amazon.com/' + V.FCname + '/Search?searchKey=' + obj.destinationScannableId + '" target="_blank">' + obj.destinationScannableId + '</a></div>';
                      }
                    break;
                    case 'HOTPICK':
                      _return += '<div style="background:#ff8300;color:#ffffff;padding:0 3px">Hotpick</div>';
                    break;
                    default:
                      _return += '<div style="background:#ff0000;color:#ffffff;padding:0 3px">' + obj.actionType + ': ' + obj.userId + '</div>';
                  } 
                });
                $('.result-table .us_' + unitShipment + unitSKU + unitBin).html(_return);
              
              }
            }
          }
        });
      });
    }  /* _PickingNotYetPicked.length > 0 */
    
    // Add Wall Location
    if (_WallsLocation.length > 0){
      $.each(_WallsLocation, function( i, unitspec ){
        var unitOuterScanId = unitspec.split('|')[0];
        var unitBatchId = unitspec.split('|')[1];
        GM_xmlhttpRequest({
          method: 'POST',
          url: 'http://fcresearch-' + V.Region2 + '.aka.amazon.com/' + V.FCname + '/results/container-hierarchy?s=' + unitOuterScanId,
          headers: {'Content-Type': 'text/html; charset=utf-8'},
          onload: function(response) {
            var WallLocation = '';
            $(response.responseText).find('#container-hierarchy-up div.container-hierarchy-item a').each(function () {
              if ($(this).text() != unitOuterScanId){
                WallLocation = $(this).text();
              };
            });
            if (WallLocation == ''){
              $(response.responseText).find('ul.a-unordered-list a').each(function () {
                if ($(this).text() != '' && $(this).text() != unitOuterScanId){
                  WallLocation = $(this).text();
                };
              });
            }
            if (WallLocation == 'cvRsOut'){
              GM_xmlhttpRequest({
                method: 'GET',
                url: 'https://hero.' + V.Region2 + '.picking.aft.a2z.com/api/fcs/' + V.FCname + '/entities/type/BATCH/id/' + unitBatchId + '/events',
                headers: {
                  'Accept':'application/json, text/javascript',
                  'Content-Type':'application/json; charset=UTF-8'
                },
                onload: function(response) {
                  var js = JSON.parse(response.responseText);
                  if (typeof js.EventList != 'undefined'){
                    for (i = js.EventList.length-1; i >= 0; i--){
                      if (js.EventList[i].eventType == 'Batch Complete'){
                        var arrRebinStation = js.EventList[i].description.split(' ');
                        var RebinStation = arrRebinStation[arrRebinStation.length-1].slice(0, -1);
                        updateWallsLocation(unitOuterScanId, 'cvRsOut / ' + RebinStation);
                        break;
                      }
                    }
                  }
                }
              });
            } else {
              updateWallsLocation(unitOuterScanId, WallLocation);
            }
          }
        });
      });
    }  /* _WallsLocation.length > 0 */
    
    // Add BoxRec
    if (_BoxRec.length > 0){
      $.each(_BoxRec, function( i, shipment ) {
        GM_xmlhttpRequest({
          method: 'GET',
          url: 'https://hero.' + V.Region2 + '.picking.aft.a2z.com/api/fcs/' + V.FCname + '/entities/type/CUSTOMER_SHIPMENT/id/' + shipment + '/events',
          headers: {
            'Accept':'application/json, text/javascript',
            'Content-Type':'application/json; charset=UTF-8'
          },
          onload: function(response) {
            var js = JSON.parse(response.responseText);
            if (typeof js.EventList != 'undefined'){
              var EventD1 = '';
              var EventD2 = '';
              for (i = js.EventList.length-1; i >= 0; i--){
                if (js.EventList[i].eventType == 'CREATE_PACKAGE'){
                  EventD1 = js.EventList[i].eventDetailsKey;
                  EventD2 = js.EventList[i].requestId;
                  break;
                }
              }
              if (EventD1 != '' && EventD2 != ''){
                GM_xmlhttpRequest({
                  method: 'GET',
                  url: 'https://hero.' + V.Region2 + '.picking.aft.a2z.com/api/fcs/' + V.FCname + '/entities/type/CUSTOMER_SHIPMENT/id/' + shipment + '/events/id/' + EventD2 + '/details/key/' + EventD1,
                  headers: {
                    'Accept':'application/json, text/javascript',
                    'Content-Type':'application/json; charset=UTF-8'
                  },
                  onload: function(response) {
                    var js = JSON.parse(response.responseText);
                    if (typeof js.eventDetails != 'undefined'){
                      if (typeof js.eventDetails.message != 'undefined'){
                        var boxrec = js.eventDetails.message.match(/boxRecommendation=(.*?),/);
                        $('.result-table tbody tr').each(function () {
                          if ($.trim($(this).find('td:nth-child(' + V.cols.ShId + ')').text()) == shipment){
                            $(this).find('td:nth-child(' + V.cols.ScId + ') div').append(' / ' + boxrec[1]);
                          }
                        });
                      }
                    }
                  }
                });
              }
            }
          }
        });
      });
    }  /* _BoxRec.length > 0 */
    
    // Add Ship Location
    if (_ShipLocation.length > 0){
      $.each(_ShipLocation, function( i, shipment ) {
        GM_xmlhttpRequest({
          method: "GET",
          url: "https://trans-logistics-eu.amazon.com/sortcenter/tt/searchIds?nodeId=" + V.FCname + "&containerIdList=" + shipment,
          headers: {'Content-Type': 'application/json'},
          onload: function(response) {
            var js = JSON.parse($.trim(response.responseText));
            var _id = js['result']['queryIds'][0];
            GM_xmlhttpRequest({
              method: "GET",
              url: "https://trans-logistics-eu.amazon.com/sortcenter/tt/bulk?nodeId=" + V.FCname + "&isDebugEnabled=false&containerIdList=" + _id,
              headers: {'Content-Type': 'application/json'},
              onload: function(response) {
                var js = JSON.parse($.trim(response.responseText));
                var _etat = js.result.summaryList[0].lastScan.parentContainerLabel;
                $('.result-table tbody tr').each(function () {
                  if ($.trim($(this).find('td:nth-child(' + V.cols.ShId + ')').text()) == shipment){
                    $(this).find('td:nth-child(' + V.cols.OuScId + ')').append(' / ' + _etat);
                  }
                });
              }
            });
          }
        });
      });
    }
    
    // Add Tracking ID
    if (_TrackingID.length > 0){
      var ccounter = [];
      $.each(_TrackingID, function(i, shipment){
        eagleeyecounter ++;
        ccounter[eagleeyecounter] = setTimeout(function(){getTrackingID(shipment);}, (1200 * eagleeyecounter));
      });
    }
      
    // Add cvAtPM00002 details
    if (_cvAtPM00002.length > 0){
      // Pickers location
      if (rodeoSettings.cvAtPM00002PickerLocation){
        /* MAN1 Robotics */
        if (V.FCname == 'MAN1'){
          GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://roboscout.amazon.com/view_plot_data/?sites=(MAN1-paKivaA02)(MAN1-paKivaA03)(MAN1-paKivaA04)&current_day=true&startDateTime=today&endDateTime=today&mom_ids=290&osm_ids=4&oxm_ids=1699%2C146%2C147&ofm_ids=&viz=nvd3Table&extend_datetime_to_shift_start=true&instance_id=0&object_id=11355&BrowserTZ=Europe%2FBerlin&app_name=RoboScout',
            headers: {
              'Content-Type':'application/json',
              'Accept':'application/json'
            },
            onload: function(response){
              var js = JSON.parse(response.responseText);
              if (typeof js.data != 'undefined'){
                $.each(js.data, function(i, obj) {
                  var pickerinfos = obj.xValue.split(':');
                  PickersLocation[pickerinfos[2]] = 'station ' + pickerinfos[1];
                });
              }
              nextcvAtPM00002NewC();
            }
          });
        } else {
        /* Other FCs */
          GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://picking-console.' + V.Region2 + '.picking.aft.a2z.com/api/fcs/' + V.FCname + '/workforce',
            headers: {
              'Content-Type':'application/json',
              'Accept':'application/json'
            },
            onload: function(response){
              var js = JSON.parse(response.responseText);
              if (typeof js.pickerStatusList != 'undefined'){
                $.each( js.pickerStatusList, function(i, pickerStatus) {
                  PickersLocation[pickerStatus.userId] = pickerStatus.location;
                });
              }
              nextcvAtPM00002NewC();
            }
          });
        }
      } else {
        nextcvAtPM00002NewC();
      }
    }  /* _cvAtPM00002.length > 0 */

  }
  
  
  // Old console links
  if (!rodeoSettings.UseNewConsole){

    // PickingNotYetPicked details
    if (_PickingNotYetPicked.length > 0){
      $.each(_PickingNotYetPicked, function( i, unitspec ) {
        var unitShipment = unitspec.split('|')[0];
        var unitSKU = unitspec.split('|')[1];
        var unitBin = unitspec.split('|')[2];
        GM_xmlhttpRequest({
          method: 'GET',
          url: 'https://picking-nexus.' + V.Region + '.amazon.com/' + V.FCname + '/pickinspector/CUSTOMER_SHIPMENT/' + unitShipment,
          headers: {'Content-Type': 'text/html; charset=utf-8'},
          onload: function(response) {
            var Inspectorcol = false;
            var Actionscol = false;
            var _PickInspectorColName = ['status', 'shipment_id', 'requested_sku', 'user_id'];
            var _PickInspectorcolPos = {};
            var _PickActionsColName = ['action_time', 'action_type', 'shipment_id', 'fcsku', 'source_scannable_id'];
            var _PickActionscolPos = {};
            var _Actions = {};
            var _OrderedActions = {};
            $(response.responseText).find('#demand_item_table thead tr th').each(function(index){
              if ($.inArray(this.className, _PickInspectorColName) > -1){
                _PickInspectorcolPos[this.className] = index + 1;
              }
            });
            $(response.responseText).find('#pick_actions_table thead tr th').each(function(index){
              if ($.inArray(this.className, _PickActionsColName) > -1){
                _PickActionscolPos[this.className] = index + 1;
              }
            });
            if (Object.keys(_PickInspectorcolPos).length == _PickInspectorColName.length){Inspectorcol = true;}
            if (Object.keys(_PickActionscolPos).length == _PickActionsColName.length){Actionscol = true;}
            if (Inspectorcol){
              $(response.responseText).find('#demand_item_table tbody tr').each(function(){
                var _returnstatus = '';
                var _return = '';
                var _checkAction;
                var status = $.trim($(this).find('td:nth-child(' + _PickInspectorcolPos['status'] + ')').text());
                var shipment_id = $.trim($(this).find('td:nth-child(' + _PickInspectorcolPos['shipment_id'] + ')').text());
                var requested_sku = $.trim($(this).find('td:nth-child(' + _PickInspectorcolPos['requested_sku'] + ')').text());
                var user_id = $.trim($(this).find('td:nth-child(' + _PickInspectorcolPos['user_id'] + ')').text());
                if (shipment_id == unitShipment && requested_sku == unitSKU){
                  switch(status){
                    case 'In Scanner':
                      _returnstatus = '<div style="background:#93fffd">In Scanner: ' + user_id + '</div>';
                      _checkAction = true;
                    break;
                    case 'Picked':
                      _returnstatus = '<div style="background:#94ff98;padding:0 3px">Picked</div>';
                      _checkAction = false;
                    break;
                    default:
                      _returnstatus = status;
                      _checkAction = true;
                  } 
                  if (_checkAction && Actionscol){
                    $(response.responseText).find('#pick_actions_table tbody tr').each(function(){
                      var PA_action_time = $(this).find('td:nth-child(' + _PickActionscolPos['action_time'] + ')').text();
                      var PA_action_type = $(this).find('td:nth-child(' + _PickActionscolPos['action_type'] + ')').text();
                      var PA_shipment_id = $(this).find('td:nth-child(' + _PickActionscolPos['shipment_id'] + ')').text();
                      var PA_fcsku = $(this).find('td:nth-child(' + _PickActionscolPos['fcsku'] + ')').text();
                      var PA_source_scannable_id = $(this).find('td:nth-child(' + _PickActionscolPos['source_scannable_id'] + ')').text();
                      if (PA_shipment_id == unitShipment && PA_fcsku == unitSKU && PA_source_scannable_id == unitBin && PA_action_type.indexOf('PICK_ASSIGNMENT') == -1){
                        _Actions[PA_action_time] = PA_action_type;
                        //_return += '<div style="background:#ff0000;color:#ffffff;padding:0 3px">' + PA_action_type + '</div>';
                      }
                    });
                    Object.keys(_Actions).sort().forEach(function(key) {
                      _OrderedActions[key] = _Actions[key];
                    });
                    $.each(_OrderedActions, function( key, value ) {
                      _return += '<div style="background:#ff0000;color:#ffffff;padding:0 3px">' + value + '</div>';
                    });
                  }
                  _return = _return + _returnstatus;
                  $('.result-table .us_' + unitShipment + unitSKU + unitBin).html(_return);
                  return false;
                }
              });
            } else {
              // Columns not found
              $('.result-table .us_' + unitShipment + unitSKU + unitBin).text('?');
            }
          }
        });
      });
    }  /* _PickingNotYetPicked.length > 0 */
    
    // Add Wall Location
    if (_WallsLocation.length > 0){
      $.each(_WallsLocation, function( i, unitspec ){
        var unitOuterScanId = unitspec.split('|')[0];
        var unitBatchId = unitspec.split('|')[1];
        GM_xmlhttpRequest({
          method: 'POST',
          url: 'http://fcresearch-' + V.Region2 + '.aka.amazon.com/' + V.FCname + '/results/container-hierarchy?s=' + unitOuterScanId,
          headers: {'Content-Type': 'text/html; charset=utf-8'},
          onload: function(response) {
            var WallLocation = '';
            $(response.responseText).find('#container-hierarchy-up div.container-hierarchy-item a').each(function () {
              if ($(this).text() != unitOuterScanId){
                WallLocation = $(this).text();
              };
            });
            if (WallLocation == ''){
              $(response.responseText).find('ul.a-unordered-list a').each(function () {
                if ($(this).text() != '' && $(this).text() != unitOuterScanId){
                  WallLocation = $(this).text();
                };
              });
            }
            if (WallLocation == 'cvRsOut'){
              GM_xmlhttpRequest({
                method: "GET",
                url: "https://hero-ui-prod-eu.amazon.com/" + V.FCname + "/BATCH/" + unitBatchId,
                headers: {'Content-Type': 'text/html; charset=utf-8'},
                onload: function(response) {
                  var RebinStationTxt = $(response.responseText).find('table.event-list pre:contains("station"):last').text();
                  var RebinStationTbl = RebinStationTxt.split(String.fromCharCode(160));
                  var RebinStation = RebinStationTbl[RebinStationTbl.length-1].slice(0, -1);
                  updateWallsLocation(unitOuterScanId, 'cvRsOut / ' + RebinStation);
                }
              });
            } else {
              updateWallsLocation(unitOuterScanId, WallLocation);
            }
          }
        });
      });
    }  /* _WallsLocation.length > 0 */
    
    // Add BoxRec
    if (_BoxRec.length > 0){
      $.each(_BoxRec, function( i, shipment ) {
        GM_xmlhttpRequest({
          method: "GET",
          url: "https://hero-ui-prod-eu.amazon.com/" + V.FCname + "/CUSTOMER_SHIPMENT/" + shipment,
          headers: {'Content-Type': 'text/html; charset=utf-8'},
          onload: function(response) {
            var onclickattr = $(response.responseText).find('td:contains(CREATE_PACKAGE)').parent('tr').attr('onclick');
            var EventDetails = onclickattr.match(/'(.*?)'/g);
            EventDetails[1] = EventDetails[1].replace(/(^')|('$)/g, '');
            EventDetails[2] = EventDetails[2].replace(/(^')|('$)/g, '');
            GM_xmlhttpRequest({
              method: "GET",
              url: "https://hero-ui-prod-eu.amazon.com/get/EventDetails/" + EventDetails[1] + "/" + EventDetails[2],
              headers: {'Content-Type': 'text/html; charset=utf-8'},
              onload: function(response) {
                var boxrec = response.responseText.match(/boxRecommendation=(.*?),/);
                $('.result-table tbody tr').each(function () {
                  if ($.trim($(this).find('td:nth-child(' + V.cols.ShId + ')').text()) == shipment){
                    $(this).find('td:nth-child(' + V.cols.ScId + ') div').append(' / ' + boxrec[1]);
                  }
                });
              }
            });
          }
        });
      });
    }  /* _BoxRec.length > 0 */
    
    // Add Ship Location
    if (_ShipLocation.length > 0){
      $.each(_ShipLocation, function( i, shipment ) {
        GM_xmlhttpRequest({
          method: "GET",
          url: "https://trans-logistics-eu.amazon.com/sortcenter/tt/searchIds?nodeId=" + V.FCname + "&containerIdList=" + shipment,
          headers: {'Content-Type': 'application/json'},
          onload: function(response) {
            var js = JSON.parse($.trim(response.responseText));
            var _id = js['result']['queryIds'][0];
            GM_xmlhttpRequest({
              method: "GET",
              url: "https://trans-logistics-eu.amazon.com/sortcenter/tt/bulk?nodeId=" + V.FCname + "&isDebugEnabled=false&containerIdList=" + _id,
              headers: {'Content-Type': 'application/json'},
              onload: function(response) {
                var js = JSON.parse($.trim(response.responseText));
                var _etat = js.result.summaryList[0].lastScan.parentContainerLabel;
                $('.result-table tbody tr').each(function () {
                  if ($.trim($(this).find('td:nth-child(' + V.cols.ShId + ')').text()) == shipment){
                    $(this).find('td:nth-child(' + V.cols.OuScId + ')').append(' / ' + _etat);
                  }
                });
              }
            });
          }
        });
      });
    }
    
    // Add Tracking ID
    if (_TrackingID.length > 0){
      var ccounter = [];
      $.each(_TrackingID, function(i, shipment){
        eagleeyecounter ++;
        ccounter[eagleeyecounter] = setTimeout(function(){getTrackingID(shipment);}, (1200 * eagleeyecounter));
      });
    }
    
    // Add cvAtPM00002 details
    if (_cvAtPM00002.length > 0){
      // Pickers location
      if (rodeoSettings.cvAtPM00002PickerLocation){
        /* MAN1 Robotics */
        if (V.FCname == 'MAN1'){
          GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://roboscout.amazon.com/view_plot_data/?sites=(MAN1-paKivaA02)(MAN1-paKivaA03)(MAN1-paKivaA04)&current_day=true&startDateTime=today&endDateTime=today&mom_ids=290&osm_ids=4&oxm_ids=1699%2C146%2C147&ofm_ids=&viz=nvd3Table&extend_datetime_to_shift_start=true&instance_id=0&object_id=11355&BrowserTZ=Europe%2FBerlin&app_name=RoboScout',
            headers: {
              'Content-Type':'application/json',
              'Accept':'application/json'
            },
            onload: function(response){
              var js = JSON.parse(response.responseText);
              if (typeof js.data != 'undefined'){
                $.each(js.data, function(i, obj) {
                  var pickerinfos = obj.xValue.split(':');
                  PickersLocation[pickerinfos[2]] = 'station ' + pickerinfos[1];
                });
              }
              nextcvAtPM00002OldC();
            }
          });
        } else {
        /* Other FCs */
          GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://picking-nexus.' + V.Region + '.amazon.com/' + V.FCname + '/Workforce/ajax/information',
            headers: {
              'Content-Type':'application/json',
              'Accept':'application/json'
            },
            onload: function(response){
              var js = JSON.parse(response.responseText);
              if (typeof js.pickerStatusInfoList != 'undefined'){
                $.each( js.pickerStatusInfoList, function(i, pickerStatus) {
                  PickersLocation[pickerStatus.userId] = pickerStatus.location;
                });
              }
              nextcvAtPM00002OldC();
            }
          });
        }
      } else {
        nextcvAtPM00002OldC();
      }
    }  /* _cvAtPM00002.length > 0 */

  }
  
}



function getTrackingID(shipment){
  GM_xmlhttpRequest({
    method: 'GET',
    url: 'https://eagleeye-eu.amazon.com/shipment/' + shipment + '/false',
    headers: {
      'Accept':'application/json',
      'Content-Type':'application/json'
    },
    onload: function(response){
      var js = JSON.parse(response.responseText);
      console.log(js);
      if (typeof js['message'] != 'undefined'){
        if (typeof eagleeyeretry[shipment] == 'undefined'){
          eagleeyeretry[shipment] = 0;
        }
        eagleeyeretry[shipment] += 1;
        if (eagleeyeretry[shipment] <= maxretry){
          setTimeout(function(){ChercheTrackingID(shipment);}, 1000);
        }
        return false;
      }
      var trackid = js[0].package.trackingId;
      $('.result-table tbody tr').each(function () {
        if ($.trim($(this).find('td:nth-child(' + V.cols.ShId + ')').text()) == shipment){
          $(this).find('td:nth-child(' + V.cols.OuScId + ')').append(' / ' + trackid);
        }
      });
    }
  });
}
function nextcvAtPM00002NewC(){
  $.each(_cvAtPM00002, function(i, unitspec) {
    var unitTote = unitspec.split('|')[0];
    var unitShipment = unitspec.split('|')[1];
    var unitSKU = unitspec.split('|')[2];
    var unitTransferrequestid = unitspec.split('|')[3];
    
    

    GM_xmlhttpRequest({
      method: 'GET',
      url: 'https://picking-console.' + V.Region2 + '.picking.aft.a2z.com/api/fcs/' + V.FCname + '/pick-research/type/' + V.newShipmentType + '/id/' + unitShipment,
      headers: {
        'Accept':'application/json',
        'Content-Type':'application/json'
      },
      onload: function(response){
        var js = JSON.parse(response.responseText);
        if (typeof js.pickResearchData != 'undefined'){

          var targetedFcSku = '';
          if (typeof js.pickResearchData.pickDemandItemsList != 'undefined'){
            $.each(js.pickResearchData.pickDemandItemsList, function(index, obj){
              if (typeof obj.requestedSku != 'undefined' && obj.requestedSku == unitSKU){
                targetedFcSku = obj.targetedSku;
              }
            });
          }

          if (typeof js.pickResearchData.pickActionsList != 'undefined'){
            var _pickActions = js.pickResearchData.pickActionsList;
            var TotePicker = '';
            var ToteLastPick = '';
            var ToteBin = '';
            $.each(_pickActions, function(index, obj){
              if (obj.actionType == 'PICKED' && (obj.fcSku == unitSKU || obj.fcSku == targetedFcSku)  && obj.destinationScannableId == unitTote){
                TotePicker = obj.userId;
                ToteLastPick = unixtodate(obj.actionDate);
                ToteBin = obj.sourceScannableId;
                return false;
              }
            });
            $('.result-table tbody tr').each(function () {
              if ($.trim($(this).find('td:nth-child(' + V.cols.ScId + ')').text()) == unitTote 
                  && $.trim($(this).find('td:nth-child(' + V.cols.SKU + ')').text()) == unitSKU 
                  && ($.trim($(this).find('td:nth-child(' + V.cols.ShId + ')').text()) == unitShipment || $.trim($(this).find('td:nth-child(' + V.cols.TrReId + ')').text()) == unitTransferrequestid)){
                var _infos = '<br />';
                if (rodeoSettings.cvAtPM00002PickerName){
                  _infos += '<a href="https://fclm-portal.amazon.com/employee/timeDetails?warehouseId=' + V.FCname + '&employeeId=' + TotePicker + '" target="_blank">' + TotePicker + '</a> / ';
                }
                if (rodeoSettings.cvAtPM00002LastPick){
                  _infos += ToteLastPick;
                }
                if (rodeoSettings.cvAtPM00002PickerLocation){
                  if (typeof PickersLocation[TotePicker] != 'undefined'){
                    _infos += '</br>Currently at ' + PickersLocation[TotePicker];
                  } else {
                    _infos += '</br>Currently not picking';
                  }
                }
                $(this).find('td:nth-child(' + V.cols.OuScId + ')').append(_infos);
              }
            });
          }
        }
      }
    });
  });
}
function nextcvAtPM00002OldC(){
  $.each(_cvAtPM00002, function(i, unitspec) {
    var unitTote = unitspec.split('|')[0];
    var unitShipment = unitspec.split('|')[1];
    var unitSKU = unitspec.split('|')[2];
    var unitTransferrequestid = unitspec.split('|')[3];
    GM_xmlhttpRequest({
      method: 'GET',
      url: 'https://picking-nexus.' + V.Region + '.amazon.com/' + V.FCname + '/pickinspector/' + V.shipmentType + '/' + unitShipment,
      headers: {'Content-Type': 'text/html; charset=utf-8'},
      onload: function(response){
        var TotePicker = '';
        var ToteLastPick = '';
        var ToteBin = '';
        $(response.responseText).find('#pick_actions_table tbody tr').each(function(){
          if ($.trim($(this).find('td:nth-child(2)').text()) == 'Pick' && $.trim($(this).find('td:nth-child(6)').text()) == unitSKU && $.trim($(this).find('td:nth-child(10)').text()) == unitTote){
            TotePicker = $.trim($(this).find('td:nth-child(11)').text());
            ToteLastPick = $.trim($(this).find('td:nth-child(1)').text());
            ToteBin = $.trim($(this).find('td:nth-child(9)').text());
            return false;
          }
        });
        $('.result-table tbody tr').each(function () {
          if ($.trim($(this).find('td:nth-child(' + V.cols.ScId + ')').text()) == unitTote 
              && $.trim($(this).find('td:nth-child(' + V.cols.SKU + ')').text()) == unitSKU 
              && ($.trim($(this).find('td:nth-child(' + V.cols.ShId + ')').text()) == unitShipment || $.trim($(this).find('td:nth-child(' + V.cols.TrReId + ')').text()) == unitTransferrequestid)){
            var _infos = '<br />';
            if (rodeoSettings.cvAtPM00002PickerName){
              _infos += '<a href="https://fclm-portal.amazon.com/employee/timeDetails?warehouseId=' + V.FCname + '&employeeId=' + TotePicker + '" target="_blank">' + TotePicker + '</a> / ';
            }
            if (rodeoSettings.cvAtPM00002LastPick){
              _infos += ToteLastPick;
            }
            if (rodeoSettings.cvAtPM00002PickerLocation){
              if (typeof PickersLocation[TotePicker] != 'undefined'){
                _infos += '</br>Currently at ' + PickersLocation[TotePicker];
              } else {
                _infos += '</br>Currently not picking';
              }
            }
            $(this).find('td:nth-child(' + V.cols.OuScId + ')').append(_infos);
          }
        });
      }
    })
  });
}
function updateWallsLocation(unitOuterScanId, WallLocation){
  $('.result-table tbody tr').each(function(){
    if ($.trim($(this).find('td:nth-child(' + V.cols.OuScId + ')').text()) == unitOuterScanId){
      $(this).find('td:nth-child(' + V.cols.OuScId + ')').append(' / ' + WallLocation);
    }
  });
}
function unixtodate(unixtstp){
  var a = new Date(unixtstp * 1000);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = '0' + a.getHours();
  var min = '0' + a.getMinutes();
  var sec = '0' + a.getSeconds();
  return date + '-' + month + ' ' + hour.substr(-2) + ':' + min.substr(-2) + ':' + sec.substr(-2);
}
function nrs_setup(){
  SupportedLanguages = ['en','fr','es','de'];
  nrsl = {
    'en': {
      'colnames' : {
        'OuterScannableID': 'Outer Scannable ID',
        'ScannableID':      'Scannable ID',
        'Condition':        'Condition',
        'ShipmentID':       'Shipment ID',
        'PickBatchID':      'Pick Batch ID',
        'WorkPool':         'Work Pool',
        'FNSKU':            'FN SKU',
        'TransferRequestID':'Transfer Request ID'
      },
      'm':{
        'usenewconsolelinks':  'Use new console links',
        'highlightactivepp':   'Highlight active process path',
        'addwallslocation':    'Add rebinWalls location',
        'addboxrec':           'Add BoxRec',
        'ovrgwalls':           'Overage Walls',
        'highlightinovrgwall': 'Highlight in Overage Walls',
        'ovrgwallname':        'Overage Walls name (comma separated)',
        'addshiplocation':     'Add ship location',
        'addtrackingid':       'Add Tracking ID',
        'pnypunits':           'PickingNotYetPicked units',
        'adddetails':          'Add details',
        'rownumberlimit':      'Row number limit',
        'cvAtPM00002totes':    'cvAtPM00002 totes',
        'addlastpick':         'Add last pick',
        'addpickername':       'Add picker name',
        'addpickerlocation':   'Add picker location',
        'updatesettings':      'Update settings'
      },
      'e': {
        'unableretreiveurl':   'Unable to retreive url datas',
        'openpickpp':          'Open<br />Pick process paths',
        'notloggedconsole':    'Not logged in<br />console',
        'missingcolumn':       'Missing column',
        'unitstate':           'Unit State',
      }
    },
    'fr': {
      'colnames' : {
        'OuterScannableID': 'Identifiant scannable externe',
        'ScannableID':      'ID scannable',
        'Condition':        'État',
        'ShipmentID':       'Numéro d’expédition',
        'PickBatchID':      'Pick Batch ID',
        'WorkPool':         'Work Pool',
        'FNSKU':            'FN SKU',
        'TransferRequestID':'Transfer Request ID'
      },
      'm':{
        'usenewconsolelinks':  'Utiliser les liens de la nouvelle console',
        'highlightactivepp':   'Surligner les Process Path actifs',
        'addwallslocation':    'Ajouter l\'emplacement des armoires',
        'addboxrec':           'Ajouter la BoxRec',
        'ovrgwalls':           'Armoires Overage',
        'highlightinovrgwall': 'Surligner les articles présents',
        'ovrgwallname':        'Noms des Armoires (séparés par une ,)',
        'addshiplocation':     'Ajouter l\'emplacement au shipping',
        'addtrackingid':       'Ajouter le Tracking ID',
        'pnypunits':           'Unités PickingNotYetPicked',
        'adddetails':          'Ajouter les details',
        'rownumberlimit':      'Nombre de lignes max.',
        'cvAtPM00002totes':    'Totes en cvAtPM00002',
        'addlastpick':         'Ajouter heure du dernier pick',
        'addpickername':       'Ajouter nom du picker',
        'addpickerlocation':   'Ajouter position actuelle du picker',
        'updatesettings':      'Mise à jour réglages'
      },
      'e': {
        'unableretreiveurl':   'Impossible de récupérer les informations de l\'url',
        'openpickpp':          'Ouvrir<br />Pick process paths',
        'notloggedconsole':    'Non identifié<br />dans la console',
        'missingcolumn':       'Colonne manquante',
        'unitstate':           'Unit State',
      }
    },
    'es': {
      'colnames' : {
        'OuterScannableID': 'Id. escaneable externo',
        'ScannableID':      'Id. escaneable',
        'Condition':        'Estado',
        'ShipmentID':       'Id. de envío',
        'PickBatchID':      'Pick Batch ID',
        'WorkPool':         'Work Pool',
        'FNSKU':            'FN SKU',
        'TransferRequestID':'Transfer Request ID'
      },
      'm':{
        'usenewconsolelinks':  'Use new console links',
        'highlightactivepp':   'Highlight active process path',
        'addwallslocation':    'Add rebinWalls location',
        'addboxrec':           'Add BoxRec',
        'ovrgwalls':           'Overage Walls',
        'highlightinovrgwall': 'Highlight in Overage Walls',
        'ovrgwallname':        'Overage Walls name (comma separated)',
        'addshiplocation':     'Add ship location',
        'addtrackingid':       'Add Tracking ID',
        'pnypunits':           'PickingNotYetPicked units',
        'adddetails':          'Add details',
        'rownumberlimit':      'Row number limit',
        'cvAtPM00002totes':    'cvAtPM00002 totes',
        'addlastpick':         'Add last pick',
        'addpickername':       'Add picker name',
        'addpickerlocation':   'Add picker location',
        'updatesettings':      'Update settings'
      },
      'e': {
        'unableretreiveurl':   'Unable to retreive url datas',
        'openpickpp':          'Open<br />Pick process paths',
        'notloggedconsole':    'Not logged in<br />console',
        'missingcolumn':       'Missing column',
        'unitstate':           'Unit State',
      }
    },
    'de': {
      'colnames' : {
        'OuterScannableID': 'Äußere scannbare Nummer',
        'ScannableID':      'Scannbare ID',
        'Condition':        'Zustand',
        'ShipmentID':       'Versandnummer',
        'PickBatchID':      'Pick Batch ID',
        'WorkPool':         'Work Pool',
        'FNSKU':            'FN SKU',
        'TransferRequestID':'Transfer Request ID'
      },
      'm':{
        'usenewconsolelinks':  'Use new console links',
        'highlightactivepp':   'Highlight active process path',
        'addwallslocation':    'Add rebinWalls location',
        'addboxrec':           'Add BoxRec',
        'ovrgwalls':           'Overage Walls',
        'highlightinovrgwall': 'Highlight in Overage Walls',
        'ovrgwallname':        'Overage Walls name (comma separated)',
        'addshiplocation':     'Add ship location',
        'addtrackingid':       'Add Tracking ID',
        'pnypunits':           'PickingNotYetPicked units',
        'adddetails':          'Add details',
        'rownumberlimit':      'Row number limit',
        'cvAtPM00002totes':    'cvAtPM00002 totes',
        'addlastpick':         'Add last pick',
        'addpickername':       'Add picker name',
        'addpickerlocation':   'Add picker location',
        'updatesettings':      'Update settings'
      },
      'e': {
        'unableretreiveurl':   'Unable to retreive url datas',
        'openpickpp':          'Open<br />Pick process paths',
        'notloggedconsole':    'Not logged in<br />console',
        'missingcolumn':       'Missing column',
        'unitstate':           'Unit State',
      }
    }
  }
  V = {
    'BrowserLanguage': '',
    'Region': '',
    'Region2': '',
    'FCname': '',
    'Action': '',
    'shipmentType':'',
    'newShipmentType':'',
    'isAuthenticated': false,
    'login': '',
    'cols': {
      'OuScId':0,
      'ScId':0,
      'Co':0,
      'ShId':0,
      'PiBaId':0,
      'WoPo':0,
      'SKU':0,
      'TrReId':0
    },
    'PNYPok': false,
  };
  GM_addStyle (`
    #newrodeoscript{z-index:300;font-size:12px;position:fixed;width:250px;height:34px;top:0;left:500px;background:#eaeaea;box-shadow:1px 1px 3px rgba(0,0,0,0.5);padding:5px 22px 2px 10px;overflow:hidden;opacity:1;transition:width 0.5s,height 0.5s}
    #nrs-title{position:absolute;margin:0;padding:0;top: 2px;right:3px;font-size:9px;line-height:8px;color:#2416ca}
    #nrs-button{position:absolute;top:17px;right:1px;width:16px;height:16px;border:1px solid #979797;border-radius:3px;cursor:pointer;
      background:#9f9f9f url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAABCklEQVQ4ja3UPUpDQRTF8Z8fSOzFysJCAjYJWCcL0EJchC7ARYhVHraa0h24gZR2bkAhC7AJxErwo3hDTCbX9x6aA7eYuef+H4eZN6xYaw36p9hK63c84OuvH2yn4flqVw2s1wAPGu7NtJGtL3CJV7Rwjf3Ms4dHHOIKO3iK4LuY+In2aTlu1Juk2SUNKwB1NcxhLUwD4wcG6KQq0l7ue8N2Dj3CODMOgiRF5hmn2VD9zNwJPN3M059v1l2bfymKXAS+Gw0iVx1KoYzZTbDoUKaJsaC7wNi0bqPIK7/YlL/ePXrKR2AUwEap10ve899gkU4C4HHVQN21eWm4N9NmDfAZZxYf2ErgyvUNy1qMbT8lS7IAAAAASUVORK5CYII=");
      background-size:contain}
    #nrs-button:hover{background-color:#eaeaea}
    #nrs-info{position:relative;margin:-2px 0 0 0;padding:0 0 0 25px;line-height:14px;font-size:11px;min-height:19px;color:#333}
    #nrs-info a,#nrs-info a:hover{color:#333;text-decoration:underline}
    .nrs-warn{width:0;height:0;border-style:solid;border-width:0 10px 20px 10px;border-color:transparent transparent #f00 transparent;position:absolute;top:3px;left:0}
    .nrs-warn::before{content: "!";color:#000;position:absolute;left:-3px;top:4px;font-size:14px;font-style:normal;font-weight:bold}
    .expand{background:#3e3e3e !important;width:450px !important;height:610px !important}
    #newrodeoscript.expand #nrs-title{color:#11eaea}
    #newrodeoscript.expand #nrs-info,#newrodeoscript.expand #nrs-info a,#newrodeoscript.expand #nrs-info a:hover{color:#fff}
    #nrs-settings{margin-top:30px;}
    .nrs-tbl{border:none;width:100%;margin-left:7px}
    .nrs-tbl td{background:#000;border-bottom:1px solid #595959;line-height:24px}
    .nrs-tbl td:first-child{width:350px;text-align:left;color:#fff;font-size:12px;padding-left:5px}
    .nrsw-input {display:none}
    .nrsw-input:checked ~ .nrsw-div {background:#49a844;box-shadow:0 0 2px #49a844}
    .nrsw-input:checked ~ .nrsw-div .nrsw-lbl {left:27.5px;transform:rotate(360deg)}
    .nrsw-input:checked ~ .nrsw-div .nrsw-lbl::before {height:12.5px;top:calc(50% - 6.25px);left:calc(55% - 2.5px);background:#49a844}
    .nrsw-input:checked ~ .nrsw-div .nrsw-lbl::after {width:6.25px;top:calc(90% - 9px);left:calc(17.5%);background:#49a844}
    .nrsw-div {border-radius:50px;height:25px;width:50px;background:#cf1818;position:relative;box-shadow:0 0 2px #202020;margin:0 auto;transform:scale(0.8)}
    .nrsw-lbl {border-radius:50px;height:20px;width:20px;background:#ffffff;position:absolute;top:2.5px;left:2.5px;cursor:pointer}
    .nrsw-lbl::before {content:"";height:15px;width:5px;position:absolute;top:calc(50% - 7.5px);left:calc(50% - 2.5px);transform:rotate(45deg)}
    .nrsw-lbl::after {content:"";height:5px;width:15px;position:absolute;top:calc(50% - 2.5px);left:calc(50% - 7.5px);transform:rotate(45deg)}
    .nrsw-lbl::before,.nrsw-lbl::after {background:#202020;border-radius:5px}
    .nrsw-div, .nrsw-lbl, .nrsw-lbl::before, .nrsw-lbl::after {transition:200ms all ease-in-out 50ms;box-sizing:border-box;backface-visibility:hidden}
    #nrs-upd {margin:15px -6px 0 0;text-align:right}
    #nrs-update {padding:3px 15px 5px 15px;color:#333;border-radius:4px}
    .nrs-info {position:relative;top:3px;cursor:pointer;margin-left:10px;display:inline-block;transform:scale(0.8);width:20px;height:20px;border:2px solid;border-radius:40px}
    .nrs-info::after {content:"i";position:absolute;left:6px;top:-5px;font-style:normal;color:#fff;font-size:12px;font-weight:bold}
    .nrs-info:hover {background:#1e93d9}
    .infopopup {position:fixed;z-index:500;box-shadow:3px 3px 4px rgba(0,0,0,0.7);left:0;top:0}
  `);
  $('body').prepend(`
    <div id="newrodeoscript">
      <p id="nrs-title">rodeo script</p>
      <p id="nrs-info"></p>
    </div>
  `);
  
  // browser language
  try {
    var browser_language = get_language().toLowerCase();
    if (SupportedLanguages.indexOf(browser_language) < 0){
      browser_language = browser_language.replace(/-.*/, '');
      if (SupportedLanguages.indexOf(browser_language) < 0){
        $('#nrs-info').html('<i class="nrs-warn"></i>Unsupported<br />browser language');
        throw 'Unsupported browser language';
      }
    }
    V.BrowserLanguage = browser_language;
  } catch (e) {
    throw e;
  }
  
  var nrsmenu = `
    <div id="nrs-button"></div>
    <div id="nrs-settings">
      <table class="nrs-tbl">
        <tr><td>_%usenewconsolelinks%_</td><td>                                                                    <input type="checkbox" class="nrsw-input" id="nrs-set1" /><div class="nrsw-div"><label class="nrsw-lbl" for="nrs-set1"></label></div></td></tr>
      </table>
      <br />
      <table class="nrs-tbl">
        <tr><td>_%highlightactivepp%_ <i class="nrs-info"></i></td><td>                                            <input type="checkbox" class="nrsw-input" id="nrs-set2" /><div class="nrsw-div"><label class="nrsw-lbl" for="nrs-set2"></label></div></td></tr>
        <tr><td>_%addwallslocation%_ <i class="nrs-info"></i></td><td>                                             <input type="checkbox" class="nrsw-input" id="nrs-set3" /><div class="nrsw-div"><label class="nrsw-lbl" for="nrs-set3"></label></div></td></tr>
        <tr><td>_%addboxrec%_ <i class="nrs-info"></i></td><td>                                                    <input type="checkbox" class="nrsw-input" id="nrs-set4" /><div class="nrsw-div"><label class="nrsw-lbl" for="nrs-set4"></label></div></td></tr>

        <tr><td colspan="2"><p style="color:#00ffff;line-height:normal;margin:3px 0 0 0">_%ovrgwalls%_</p>
          <table style="width:93%;margin-left:5%">
            <tr><td>_%highlightinovrgwall%_ <i class="nrs-info"></i></td><td>                                      <input type="checkbox" class="nrsw-input" id="nrs-set5" /><div class="nrsw-div"><label class="nrsw-lbl" for="nrs-set5"></label></div></td></tr>
            <tr><td colspan="2" style="border:none">_%ovrgwallname%_<br />                                         <input type="text" value=""               id="nrs-set13" style="color:#000;width:100%" /></td></tr>
          </table>
        </td></tr>
        <tr><td>_%addshiplocation%_ <i class="nrs-info"></i></td><td>                                              <input type="checkbox" class="nrsw-input" id="nrs-set6" /><div class="nrsw-div"><label class="nrsw-lbl" for="nrs-set6"></label></div></td></tr>
        <tr><td>_%addtrackingid%_ <i class="nrs-info"></i></td><td>                                                <input type="checkbox" class="nrsw-input" id="nrs-set7" /><div class="nrsw-div"><label class="nrsw-lbl" for="nrs-set7"></label></div></td></tr>
        <tr><td colspan="2"><p style="color:#00ffff;line-height:normal;margin:3px 0 0 0">_%pnypunits%_</p>
          <table style="width:93%;margin-left:5%">
            <tr><td>_%adddetails%_ <i class="nrs-info"></i></td><td>                                               <input type="checkbox" class="nrsw-input" id="nrs-set8" /><div class="nrsw-div"><label class="nrsw-lbl" for="nrs-set8"></label></div></td></tr>
            <tr><td style="border:none">_%rownumberlimit%_</td><td style="border:none">                            <input type="number" min="1" max="300"    id="nrs-set9" value="" style="width:100%;color:#000;text-align:center" /></td></tr>
          </table>
        </td></tr>
        <tr><td colspan="2"><p style="color:#00ffff;line-height:normal;margin:3px 0 0 0">_%cvAtPM00002totes%_</p>
          <table style="width:93%;margin-left:5%">
            <tr><td>_%addlastpick%_ <i class="nrs-info"></i></td><td>                                              <input type="checkbox" class="nrsw-input" id="nrs-set10" /><div class="nrsw-div"><label class="nrsw-lbl" for="nrs-set10"></label></div></td></tr>
            <tr><td>_%addpickername%_ <i class="nrs-info"></i></td><td>                                            <input type="checkbox" class="nrsw-input" id="nrs-set11" /><div class="nrsw-div"><label class="nrsw-lbl" for="nrs-set11"></label></div></td></tr>
            <tr><td style="border:none">_%addpickerlocation%_ <i class="nrs-info"></i></td><td style="border:none"><input type="checkbox" class="nrsw-input" id="nrs-set12" /><div class="nrsw-div"><label class="nrsw-lbl" for="nrs-set12"></label></div></td></tr>
          </table>
        </td></tr>
      </table>
    </div>
    <div id="nrs-upd"><input type="button" value="_%updatesettings%_" id="nrs-update" /></div>
    <div class="infopopup" id="info_nrs-set2"><img src='data:image/png;base64,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'/></div>
    <div class="infopopup" id="info_nrs-set3"><img src='data:image/png;base64,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'/></div>
    <div class="infopopup" id="info_nrs-set4"><img src='data:image/png;base64,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'/></div>
    <div class="infopopup" id="info_nrs-set5"></div>
    <div class="infopopup" id="info_nrs-set6"><img src='data:image/png;base64,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'/></div>
    <div class="infopopup" id="info_nrs-set7"><img src='data:image/png;base64,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'/></div>
    <div class="infopopup" id="info_nrs-set8"><img src='data:image/png;base64,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'/></div>
    <div class="infopopup" id="info_nrs-set10"><img src='data:image/png;base64,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'/></div>
    <div class="infopopup" id="info_nrs-set11"><img src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAX4AAAE3CAIAAAAi770PAAAoSElEQVR42u2du27bzLaA9RJu/QwC/AQqgzSqd20YqdOextXfqXSRUwhQtQu1CZDGhbtd/W+g9vyJY+eyEzu20xzOfc2FEmVRskh9C4RAkcPbzOLHNWsua/D199O330/f1fLn9vfTj99Pt/d/qvVq483943e99+v9Y5Xstkpwr9J8u6+2mHX9e1+l+aOTqZXvOoFKo9b139865e8/X9VSnefpu0+mL21OXv2tfm/MCe//mBu71Yff2LM96Y32WubvD3Pde3OfTz8e/phzqjt5qJ5FLdXGr/qob/ZwdTPfdfqvD3++6zTf9IOHkz/YOzS3ffNb31V1Hn3dH+5UtyqX1E3e6jz5bh7Q5YO+bvX3sdr11SSz9/b03WajTlNdt8pqdedV+kfzjF9N5tzbmzHnvLU5QHlRXp0vr4G55HdzanOj9zoHbZHY51T3d6d23bhcNqfQh/z5YfNXPY/Z4rLbLt/c+atc/qHVwjzzd30VrzciO1ReVAVwo4+q8uvbg018e2/PaRKbrLnVeWcKW5f3nx8m8YN9qO/uzEarvpmnu9e3eu+Lxz6v0Vpfrr5IwoOrvY9aY/SFbKabS+tbEvpqVVC/BupmHmyp3JrnMqd1t3R7H051469utVDfA+VFefWivAa3KqmCq7kVw06z8etvy91vv+M09xZs5m4MjG/vPHctqg2Jb+7st+WbJb3Zrg/xp/InN5dzBWzv4d4zVZ3tm73oH5cXCuTmC2Dg/VXerb+lO/s4Wm/CY/o8vVF5lKS0CvTVPam9T72lutaN+xz98NliP6RxXun0MnP8c5lvrz2zeah7cfV7m1FKKX/r21bFRnlRXn0or0GVTTd3j7e6YG7vnszKzb1Zefxy93ijbUi1otdvdfobm+zRZsF9OInae6cLT//9Yrbr31t7Wr1yF508HOv+fjPwVhuteWz+fnUb/X2aY/X2P+Ykt3dGz9yD+PPbvLM29o075Fbf8xf/gO4ofdo/ZpfZUq18dXml/rqUxWPtU6vstjds79xkps6lG5mfPpNNJqhDHl0+K5vcHEV5UV49KK+By9bHa/fAX/RN21vXS7Vy/evBFdijSSCXG5GgWvlybzf6BGbvjc8Rceb0PG77jVcRcz++pMVt3Pj7vI9u/otTCFN4N2HjY6R5+pBrt0vductE+yDVX5WD2TP6p7h3uad3yWv5xevEF/EgPkP8A97E+eCV1W15uv71eCMygfKivDpdXgPzpwLVl7uHa7vD3oq/hrxYdfy1Z1icfTKluUyURnworkMynwtPSVne+CLXZ/MJ/FW89nwxmucSB425f/JXEbnz9MXdm/xu3Er1dbkmk90kxXwnntHeYZQP1UWTA5NH+xLnTKRMvx7lBydkrLsfyovy6np5DcQzP35Wj10x1d6x/Vz8Ugdcq1/Lws9275PZa4rNP+2Nu1Fzsc/uPq7tYu7+wSS2p/pluf7ZZoS5E3vIlyzrzfondeyD15vP7ibN18Y8pPn7+ae9qH8uqXCyPPyzfP5pSW8u4YvQrHi9qc7sdMUptNv16Vc4uV9R6e8eIs0On4WnJPG1yDqp6JQX5dWD8hp81jdU/f+kclmdxV7pp91YLVW66u8///1tElcrn9xes7Fa+b8fdqNJ89nd5Wd3025vtPGzOvnDJ7v4MgiX1ldX6vJJ3I+5itrlLmey1R8SLnH3qJPZW1K/P+XNPIi98nL2KH/D1z737/wD6kN0zn4yCv3L6M3DP+4M//ff39e/XJ789PdgFPpR5nzIDXNmly3+xnzZU16UVz/Ka+BPZx7Y/FZ3aVbMGdUWm+Pqvm3Knw/xg9nHE7/uYr8e/4n2JontJYxmuOxWOWhv5ldyVHQGk7j6dXdusiacX508PsM//30w9+8vbYr/U/lZ3JLehr20UWV9Aw+f/T3/tJcwmi03mtOGfC5sTNKb06bPTnlRXp0ur8H//O8HFhYWlh0vg+saqfZdI2QI0neVeKmnAD2gBwE9oIcSQlAJ0INukSEI6AE96BmCSoAe9AxBJUDPi6PnP3+9PtHy+q//tHyD1amTk/77zcmbf69OXyULsuSAjulZeKwWnkmer53TLSu5vCizW1E34ZVpOwq1s5fW5+zazxAyIjl0VQ4eHnqWw+Dl0OOSKWXeuMj2AT3VM/nnkOtpqsYPuxVd3hw98iG3p1rbfGnljf/nrzfr5XGq4WsU6KGhJ3u1/YerysHEIlKK9ebN67BB5fObN+HDW5/elocvGPtZqdHvqPyqrZtq8B6gJ1FJq5EyP6oV97GNMjMkeBO/zOm7vUnJJRZUVnK+aOK7Wv6x3+5rty2VKH0eV2VnUOjXr2VGiALNcrD+XIfj6zF5YbJbrZcy3r8MOntcNnrlj4srS+8/8zad08mklGvRs6kG7wV6oofwGZEw2ScTeRhndV4xCBq9ccm562clZ49L72oVevbX7FmGnlTdwlOF3IizM+JKlBGyQEVGLjnXIaFH1gEyTUy/hZ7UhY92bfrkAOkRWI2eFhS4K1aP0FTh7opTFr8cxmLapOTib3FWcslXPPtEl9CzzRrhTq0escWUT312ZhmRomf1uQ4OPUHFQsaLb1wjBa5NL9EUfeyb+Xo2/nTuia9HKN1J9KD6vc+snpKZVP+ubFRywg5N0BO/SrWvR9nXs8eO5nV8PSVLJc7OzayeA0VP5suXHgNRgU2rqzUKnKZPvpGpr6fe6mm1nWR/W7jMptd//RUZHwU7JEdPyF27Y5OSc8eqA17rly3O/zpPRY6eVpsmXwQ90WMEP0RNbsRWauLrEQW6zNdz2FZPr4UMQXqpEqCHEkJQCdDDm0aGIKAH9KBnCCoBetAzBAE9oAc9Q1CJLqKHOWJZWFheYG7mRY1U+xYIGYL0XSVe6ilAD+hBQA/ooYQQVAL0oFtkCAJ6QA961o5Mxu8G46ts899nw3eDI70MP7w3f32yjx+Oj96NLtTq+7cznWx29tHsuxqZo+LE1Zbjt3+bDasPieTy/HyKSoAepGcZYl77+cT/VaAx6DFoMCuGRC7ZxXxg0FNhxaR3KxXIDJLcSnKewiHv336YRFfsKHlAD+hBz6Q4o2Mw/hje7Yu5sUEqA2R0obDieTGwJPIgqNhk0DMfBay4dXceDQ5zVMCT3uVZZq6VHyLtrAJ6ukMe0AN60LO43mR4Ya0VXamp2DGRL7/bHls9tsLljJf5xCa7Go2vjFFT0URwpAJHxSlhGVWJvY2zsImzQxYLsTd/gOl0ikqAHqRzGSJY4P9WODCg8QZRqHPlFa6FsFD0Xm22TFq1eqqzFblTkef8/BKVAD1Ix60e85IPZ95D7Hc518xy9KiNx3q7Td+Or2dWw51ukQf0gB70rOzrubL1IAuX2CCyIPDu5CJ6dONUjJiNW7hEU9pR6uu5nE4vUQnQ097n1yn96mbX2hep9juZvktCgkcDPeuEdMjFvEWVuDx/dfJqd8Zfl9HjXQkFaijiTMaxBV5viucyebsiAehBeoWeCjxKQE8z68b1Q3ONtbKNYzjLGlPqHZAeFgk1/F/Fl/loGOwgVREYzwfGmep2iZPMR6HVBvQge/7STk8r6Cj6gJ71rJ6k48bCdRJJrZLaZtccPbbC5U6r/kYWU+ib63f5i17M7YFtmD8dR8+gpQXZokpo8BjDB/SsW+EypHB/lXUznrdg9UhvUU0Li0BbPchAT/sL6GmPPCdCTqegZ21fj3Xu2O3e39zA12MZEQYQWV/PeuhxiUHPLtBzuCDblkpg9TQ+iW5eVa+9a2e167KW1LCFy5xhdvY2qXC5Q5ajx/WXs4lBD+gBPb1GD9b1YaDnYjA4Usu/xoPRRbb34+B4OHhff/j5OejhKUAP6Fl/mRSJ0xA9l4PzKejhKUAP6FkM3r+1VszEkcX8NXzxoLErzuQ5fuu2VKzRWwaGOA491d4qTXKty/PBlAoXTwF6QI9hytlHUZkaO+NFwyhFT2nFLGdDDS+NnsnbAneqZTrF18NTgB7Q45aRs1neC2QYlDRBz+hI2E3OCAo4W9vRA3pAD+g5GF9PBR1bnypaPfpvET32wNjqeX8RanBhmQ7OL0EPTwF6QI+zbpb4eqxzZzg4G6/y/gw1tpyvx7iQpO1zOR1c0rjOU4Ae0LPjpXFtC/SAHtADeuhSCHpAD3oGelAJ0AN6QA/oAT2gBz0DPahEF9FTXZjlAJZBtjRMtuOFkjqUBavnsD5xe28xoRJUuEAPGYKAHtCDniGoBOhBzxAE9IAe9GwdCRPpRyIi8/nQgPGU2y2FACwdEklnonGBHtCDnjUX89r7wCF54GOz4qOSalGxPVoMfPxhEl2xo+QBPaAHPZMSAh9/DO+2C/6hY4GEwLA2bloU+NiEElIxQkYBK249DSIiwh/ZXQ3ijgQ7q4CeDkUgBT2gBz2L6k0h3qGbD79ix0S+/Bd5hKJQ4XLGy3xik12NxlfGqMlCp4nJ/03iJtHWxN78AabTKSoBepDOZYhggf/roxWJoB2uMpVXuBbCQtF7tdkyadXqqc5W5E5FnvPdxWIAPaCHEtqS1WNe8uHMe4j9LueaWY4etfFYb7fp2/H1zGq40y3ygB7Qg56VfT0uBlkSGdEn8y1Zka9Hokc3TsWI2biFSzSlHaW+nsvp9BKVAD3tfX5F7NAVza61L1LtdzJ9l4S0EfkPFu9QOuRi3qJKVBEATwgB2PQzW3zDXdBRGwe5SeDjTGzg4/oEoKc9TSAQ+x6ohAo9+oroo02tG9cPzTXWyjaO4SxrTKl3QNaFKr4QcZCrRt9hsINURWA8HxhnqtslTjIfhVabA0cPM2Ps/0s7Pa2gQ+Dj9a2epOPGwnUSSa2S2mbXHD22wiXDt0cWU+ib63f5i17M7YHEXN8v9PQEVa2rhAYPMdefV+EypHB/lXUznrdg9UhvUU0Li0BbPchAD+jZ35d2enoi5HQKetb29Vjnjt3u/c0NfD2WEWEAkfX1rIcelxj0gJ4uvrRYPY1PoptX1Wvv2lntuqwlNWzhMmeYnb1NKlzukOXocf3lbGLQA3pAT6/RcxACenzMv3/FMdft4kIAthGN67DRcxhPAXpAT9NlUiROQ/RcDs6noIenAD2gx0Uorgt8XBvm+G0Ujt0ER34v0FPtrdIk17o8H0ypcPEUoAf0GKaEyOgXOm76wgJlkqOntOJjt08ceiZvC9yplukUXw9PAXpAj1tGzmZ5L5BhUNIEPaMjYTc5IyjgrB1HD+gBPaCnj76eCjq2PlW0evTfInrsgbHV8/4i1ODCMh2cX4IengL0gB5n3Szx9VjnznBwNl7l/RlqbDlfj3EhSdvncjq4pHGdpwA9oGfHy2a1LdADekAP6KFLIegBPegZ6EElQA/oAT2gB8UGPehZr9CGSvQRPdWFWVi2vwyetZBvvV2werB6EKweKlyUEIJKgB50iwxBQA/oQc/akTCbdSQiPJaPzxXPe9tSHK7SIZF0JiQO6AE96FlzMa+9n70/jz5qVnxoQC1qgv0Wo49+mERX7Ch5QA/oQc+khOijH8O77Wbg1xPyh+iMNnhRFH3UxPNQE/WPAlbceksx1xf16OlQGEDQA3rQs6jeFIKOuUmpK3ZM5Mt/kYcJCRUuZ7zMJzbZ1Wh8ZYyaLH6RmIHbJG4S8kjszR9gOp2iEqAH6VyGxIHVzV8fMkTMnO8qU3mFayEsFL1Xmy2TVq2e6mw1kayn57ubEB30gB5KaEtWj3nJhzPvIfa7nGtmOXrUxmO93aZvx9czq+FOt8gDekAPelb29bhAQEl4Mp/Mt2RFvh6JHt04FSNm4xYu0ZR2lPp6LqfTS1QC9Gz8AsRegILW+i2JWruo7cJxUF+/iKK8J+LcqKWWlIPUs/2WDrmYt6gSVRiuE+JwNRFpxifbrZMy4UgeJlSY4tGpVqHHm+4hEGCCvyzmMuhB9vqlVfH/XhECcA3zXiHArTsKGE+B+1twNyrbW228mOfOCIee+Wgo7XlvrruWGlNZGFuyWDPHh1EOjgzpfAU9yH6+tNPTCjpEH13b6glwcRJe/kWxkTWpgqU1MsUy2dnEW1JZhcv5NRIjyFW4WqhzgR5k2yqhwUPg42dVuPSr7l/yqFtaweqRjb6yQiRjtMftL0nFajK21/K9ThxokvpX0uQMepA9fGmnpydCTqegZ01fjwOK3Z5zxK/UNb5kPiC/JbZ6QkOyNalCT7mi1wn0IF14abF6mp5DD/Ax/VaDxSEo4N/8rIUr6UGbNnjJLnDCYkp8PVELl69h2U4rUfc50IOAnj6hBz3rmNSM29w4fbmdMa1VdKnT4CGoBOihhDqPnkb+jP6QB/SAHvTsmehxtVff77kaoV6o/9qxFIuk74Lo+hA3LNp6bmm0RJ/IA3pAD3r2LPS49gFHIttJyvvpvO/f9mxI+y74rg/JeK7QkzP3YnRqoAToAT3o2TbQk3Z68i0D6fQXAVVR34X6oaQmZe736dhACdADetCzLVk9UZ0oQU/J6on6KNSjZ2GOSgev9Iw8oAf0oGfPQo/oqVCyepb4epZbPa7HQ+br6dAsYKAH9KBnvZFeuZhBD+hBzxBUAvSgZwgqwVOAHvQMQSVADyWEoBI8hUdPdWEWFhaWHS9YPVg9CFYPFS5KCEElQA+6RYYgoAf0oGcIKgF60LPOihoMURhZLiLz+dCAcVS/lkIAlg6JpDNDvUAP6EHPmot57f2MsXngY7Pio5Jq0cOy2gt8/GESXbGj5AE9oAc9kxICH38M77abakfP0ROm03fDQWXgYzNOPYomMhm79TSsiAhwZneFAet2PqBC/DVvZxXQ06Hh7aAH9KBnUb0pzFzhxqBX7JjIlz9MfyGtHjmjvk7pZ88YX/lwQ3EwNRFKJJ3lxyYuxl9bLLIpO5x0aHg76AE96JmsT2VhhWS8syM/PZibiyetcC2EhaL3arNl0qrVU52tyJ1uDW8HPaAHPauxesxLPpzlcaXDPMrL0GNCV4vgi+34emY13OnYxBqgB/SgZ0Vfj5v3qxhn0YLAu5OL6NGNU6XJTzdo4RJNaVk06m7N3Qx69hQ9wqiWLsx1G2LdRhHkr/wOZLUJMffwu9rP7IHp2X5Lx2ZQ3ZJKVBEATwgB2NS/kM7C67+HMvJBA+N8cXVmGCGnAVbf59lxeolSSp8+3uJDs4MeZN9fWhV69BXRR5taN97QcJaIaPUI1GjgkvSSNMGIdpM0xGWKnqQFV7o5QQ+y5y/t9LSCDoGPn2H1ZPaF9HqubogV5pJvColdlXnYg6PloMlIBHqQfX1pNXiIuf7MCpf25vi/FQjG8/WsHuWyEX1tg/vmneui8q6UcrsmD+hBtq8S09MTIadT0LO2r8dxxG73/uYmvp7UignunsTqKaXcmskDepDdqQRWT+OTyAbavGP+IsSQW9nC5UI4pWMLc/SUUqbVvSUReEEPAnq6j56dSivNVaCnJm8L0Ypblh5F46Jfz8Ggx1g65YZ89OxFpbGB2ac4gKDnsKwe9KwFTFSj0oemnnt1NgwVXumM05R3HSNUi+R8FAaXigqvIo6raNtuEPbkpel4ehWBFPSAHvRsTfQcuS4LcbT14EdLBmEo0Mgh797H7zpPRCNU5eQbiRejUwMlQA/oQc/atnqi8ZwJekIfqyxBsUNWip7yeFRNnm4NlAA9oAc92yV6ylaPRM9yq6c4WrWH5AE9oAc9axc9wXczK1s9qa9nEbqSikG8WWfODs0CBnpAD3r2gpIPzW3OtVx65WIGPaAHPWtf/PiV9btQLUEPKsFTgB7Qg6ASoIcSQlAJ0MObRoYgoGcH6KkuzMLCwrLjBasHqwfB6qHCRQkhqAToQbfIEAT0gB70DEElQA961llRE2IU+iiLyHw+NGA8mWRLIQBLh0TSmaFeoAf0oGfNxbz2YuL9dKC5WfGT3mrRI7baC3z8YRJdsaPkAT2gBz2TEgIffwzvtpswX89xESIUiRhqcmZ+g575KGDFrYeJ931Q9lVRRtJDpJ1VQE+HhreDHtCDnkX1pjC/chiS7ue4kDN+JVaPrXA542U+8VNkjK/SqXwsOFbHVssOWSzE3vwBOjS8HfSAHvRM1qekZaH/RlMIRmHpSxWuhbBQ9F5ttkxatXp8fKScPB0a3g56QA96VmP1mJd8OPMeYr8rhDNbhh618Vhvt+nb8fXMauMydmpiDdADetCzoq8nnmkwMYgsCGQMtRw9unEqRszGLVyiKS2blKNbczeDnj1FjzCqpQtz3YZYtzGLuZ6mzGoTzodanDHvQPVsv6VjM6huSSWqCIAnhABs6l8ozw5lYxJ4O79J4OMzH4ZU4snP1ClOXkjp08dbWokaCHqQXaiECj36iuijTa0bb2g4S0S0egRqNHBJekmaYAox1/OUUU1BJtjc5AE9yE5UYnpaQYfAx8+wejL7Qno9VzfECnPJN4XErsoUPVnYgxQ0GYlAD7KvL60GDzHXn1nhcpEJPAjG8/WsHuWyEX1tg/vmXRw1IUm5XZMH9CDbV4np6YmQ0ynoWdvX4zhit3t/cxNfTxa8ybt7EqunlHJrJg/oQXanElg9jU8iG2jzjvkLEQN3VQuXj+6UjC3M0VNKmVb3Mn8z6EFAT5/Qs1NppbkK9NTkbezC34b0KBoX/XoOBj3G0nmhME9YPcuksYHZpziAoOewrB70rAVMVKPSh6aee3U2DBVe6YzLAh/PR2FwaRL42AdKNt0g7MlL0/H0KgIp6AE96Nma6DlyXRbMShJzXQZW9+g5kkPevY/fdZ6IRqjKyTcSL0anBkqAHtCDnrVt9UTjORP0hD5WWYJih6wUPeXxqJo83RooAXpAD3q2S/SUrR6JnuVWT3G0ag/JA3pAD3rWLnqC72ZWtnpSX88idCUVg3izzpwdmgUM9IAe9OwFJR+a25xrufTKxQx6QA961r748Svrd6Fagh5UgqcAPaAHQSVADyWEoBKHh57qwiwsLCw7XrB6sHoQrB4qXJQQgkqAHnSLDEFAD+hBzxBUAvSgZ50VNSq90FFQhMfy8bniGd1aisNVOiSSzoy3AD2gBz1rLua1F7Nfp6M9zYqfeVKLHjbRXvTRD5Poih0lD+gBPeiZlBB99GN4t92s1XqgeQgTIgIZyemxDXrmo4AVt95SzPVFPXo6NMYU9IAe9CyqN4VJTsO4UD/QXE67k1g9tsLljJf5xI9TH1+l82lYcKwOcJQdsliIvfkDdGiMKegBPeiZrE9Jy0L/jebximJDlypcC2Gh6L3abJm0avWIoNgpeTo0xhT0gB70rMbqMS/5cOY9xH5XiCm0DD1q47HebtO34+uZ1QZH69TodtADetCzoq8nnu4rMYgsCGQgoxw9unEqRszGLVyiKS0bGd+tCVRBz76iR0YHdc6FVHELVYDkG/7c0Ddtz94Ai7cvHZvGcEsqUYXhOiEOV0ORlnyy3fopk2nxci6Uo6mAHuTA0KPi/70iBOB6Fr71MkbGtnEWhAgq9e2sSctL8DXYkAkhNEIUvEVG5or+RiFf/gY9SBde2ulpBR2ijz7H6smNl+BrWNS1s8ZIsr7Jkdqi/17ImcYLRyWNL8EhehS7OUEPst8vrQYPgY+fW+Ey3hz3N+qZVmP1RBaQwZOLbvy3DFCXQMS5jWxXlOTvssod6EH28aWdnp4IOZ2Cnmf4eqxzJwRpMi7kIg4Cj7yPZhbHclKVONsSHFs90SCg5C/oQTr60mL1rHEa7YJRBJG+GMEC52/Om2YXzsCRfp93ef3rOD9/GAeQDAvA6kFAz4Ggp1XJYNRrPXsBWbfdsGl63/dnaa2iPyFx6NfTL/SUW9nRsw6gp5E/o0fBuEBP36weSmhX6HEdi0Nk0flIVGB97fjYoWd594UwOOOork9Dr8IAgh7Qg549Bz2ucUB0njqSvav8wAvn3V/VfSFsr7NbuzVQAvSAHvRsG+jxXvmBI0sUWD245wOqlndfSMZ55X6fjg2UAD2gBz3bktUT1YkS9JSsnuXdF2I3c5g9o6fkAT2gBz17FnrEIPKS1bPE17Pc6ok7QEhHz3SKSvAUoOdw0fNC0isXM+gBPegZgkqAHvQMQSV4CtCDniGoBOihhBBUgqfw6KkuzMLCwrLjBasHqwfB6qHCRQkhqAToQbfIEAT0gB70DEElQA961llRgyHKcYfcaFIfGjCO6tdSCMDSIZF0ZqgX6AE96FlzMa+9n4c/D3xsVnxUUi16WFZ7gY8/TKIrdpQ8oAf0oGdSQuDjj+HddlPt6Dl6Qlx2NxxUBj4249SjUCKTsVtPY4qIaCJ2VxiwbucDWhZ8rYCeDg1vBz2gBz2L6k1h5go3Br1ix0S+/GH6C2n1yDn2dUo/e8b4yhg1WSQ1Ecc9neXHJq4LvpZO2eGkQ8PbQQ/oQc9kfUpaFvqvnzawEOE+r3AthIWi92qzZdKq1VOdrSYkbJeGt4Me0IOe1Vg95iUfzryH2O8K8ygvQ4+JW22nNGzP1zOrDUXdqYk1QA/oQc+Kvh4371cIGy0MIgsC704uokc3TpUmP92ghUs0pR2lvp5uzd0MevYRPcKiDjotnJryb1DTUoDA6JCg6MWofskMnqXX4MD1bL+lYzOobkklqgiAJ4QAbEaZYpAmO6FvMPKz+TezM1ydOQD5IOtnkTEfdpWjzeVnfttaAFLQg+xCJVTo0VdEH20gbiJe0/wRWSjK1J8dJ07HxSKdMDyJuV7Ayt+ykdjWDsamshA3HotIUuUJz0EPstcv7fS0gg6Bj9e1eorR0zO/ZuJ0iPp6WHgJTJgKl+BI7FlIGo99JClVz/Irsr4GepD9fWk1eIi5/pwKl+aCt2gqS2Q8X2H1ZCZP0UgR9azgNnKBLkXjseyukrcxgx5kr1/a6emJkNMp6FnP1+MQY/kS/M0FX0/SvdX6ekIC5+tx6AlmlHT6+MZjeaBt+n1batwBPcg+v7RYPQ1P4UJN+kbTpKXWBZDLm6uyCLmrW7ica0naVtG6DI+5oIULAT39RQ961gdpoxFwnZerD3FI6dcDetCzbklPIiCDHtCDnjUUVREejXUHZd/pOR7l4KqoVa8IP3JiPhrm3T79eNR3cU9lfX592snbWbnzZ19ir4Me0IOeNUdP4vZynv4wriIMd7DoOYqGYhV7kLq2BX9+v1Jy8Pcl9jroAT3o2RpWTzr26kiiJ5Cibrxo0oXCj4Ypjx0toac3sddBD+hBz9ZGj7BTVlk9w8JgFHu4a6MUZ1uJnt6QB/SAHvTsGVaP7YigfDrRFF9iewk9sgtFMJ2qrlVxp4p69HRrcDroAT3o2ctVzdqUvriYQQ/oQc9aFdeA9W7zAbeoBE8BetAzBJUAPZQQgkqAHt400IOAnhdAT3VhFhYWlh0vWD1YPQhWDxUuSghBJUAPukWGIKAH9KBn7YgadVXosyPCY/ley3ForZbicJUOiaQzvQ5BD+hBz5qLee1FXLM0+qhZ8aEBtejRFe1FH/0wia7YUfKAHtCDnkkJ0Uc/psGC7DjPMMW1mH9Wjroy6JmPAlbceksx1xf16OnQSAvQA3rQs6jeFKKYJcGC/MsvQ3cEqyeZ/mI+scmuRuMrY9SIcOkGHGJ0qEksBribxNkhi4XYmz9AhybzAT2gBz2T9aksCpCfft8bRHLoeVrhWggLRe/VZsukVatHxMVOydOhKTVAD+hBz2qsnjhYkAiFJgKZLUOP2nist9fNHPYsX8+sNkBIpybzAT2gBz0r+npc1LNhKRhZNP9OEr8oWCiqcSpGzMYtXKIp7Sj19XRrMh/Qs7fokV9gp/d5YCwXPKv8JVwdSMuqcpIgTP7Q0vwPsHj70rHJfLakElUYrhPicK3xpS2+3i72uZtLPJ/FbtkkvqVkpUssDSAlaxmgB9n3l1bF/3tFCMA1rBsf9sS218pmjmr2zLQ9JRDB9nD7+GEUBzDQCfL0/lqzeL7Of4+yhuRlTAQ9yD6qxPS0gg7RR59l9SR9NxYy8HHe8iorXKMkvPpYx4pK0svA7cl05WlDsuFaa7N8gh5k2yqhwUPg42dXuIx3xv1V1sp4Xm/1+C3CGeQadPP0AVjlIC2iIblVkwf0INtXienpiZDTKeh5jq/Hmht2u/c3l1peQxzLsOu4ziW0xOqJG5LbNXlAD7I7lcDqWec8Piyca2qN48kFxGQtVj6GXNQW6z3HafrE1xO7mUNDcmRhgR4E9PQVPa2K9BMvsbNaJQvoaVIuphv0v8bvCo2GK0qkT1FweqUSoMdL7qgGPXshkyJxGpZID8kDevpn9VBCOxHX6zKMq5JNjekICdHzMwyqOBIdKcTQitxo7SN5QA/oQc+eacUIN7z334deoDUMSs2fKGr7pPvj0UEP6KGEti2+cSCZDaMhelyTQtSAUGxV7NSoUNADeiih3VS7bH2qaPWIqVET9Ij+5VGHrEE+IKaf5AE9oAc9e474MShlX4917gw/nI2Xe3+qXg7v5CRh2oUU2T7dGo8OekAPJdQP6aWLGfSAHvQMQSVAD3qGoBI8BehBzxBUAvRQQggqwVN49FQXZmFhYdnxgtWD1YNg9VDhooQQVAL0oFtkCAJ6QA96hqASoAc966zYECCpiMh8PtRHPN92SyEAS4dE0pnez6AH9KBnzcW89n6EZx742Kz4qKRa9HCt9gIff5hEV+woeUAP6EHPpITAxx/Psthkerh5iArrhozKwMcmeJEajz4KWHHrYe5aH5Q94KkYRCQ7RNpZBfR0aMQX6AE96FlUbwrzeKWxydzLf5GHJwoVrjAVhk12NRpf+YkyBEcqcIiZ/03iLHRadshiIfbmD9ChScVAD+hBz2R9SloWcWwybxCFOlde4VoIC0Xv1WbLpFWrpziJqiFPh6b2AT2gBz2rsXri2GQy/HyYaXAZekJMtDBzWAu+nlltxJFOTSoGekAPelb09cSxEhODyILAu5OL6Akx0TxiNm7hEk1p2Wyq3ZpUDPTsG3rkh1eEMy6p47LgKotFSXHr02Q+ixDTvY3wx7B4+9KxScW2pBJVBMATQgCu/sAW3+owv29N/OLI5l91iTzKaCGNC0aah/ECPUiHXloVevQV0UdXWzc+DJNtppWtG8NZ1oxSdDd4QMxHtoXlauSbWlInZag1uFPpkwcwFdEzH8lZh0EPsqcv7fS0gg6Bj9exevKQoaZ7SGy5xC7GFD1Hrt33yHoZik2zbsvfZ2ODvNiXGQMxPfMG5g/oQbatEho8xFxft8JlvDnurzJJxvM1rZ4ruWIRkzfNuqArtik3tBZHHfOV9yc+IehB9vulnZ6eCDmdgp41fD3BBlHbvb+5ga+nDj0FX09o8S24hBa1JwQ9SDdeWqyeBof78JXO+rDrrvLl/M15C1dT9JRauER7Vo6eNLwU6EFAT//Q80ISamHd17N9zeFB1AFa2JhLmhobJuhLMFL69RwaenKXNnq2LfQEN39dR4r10dObMMig5/CsHvRsA4m7Qbj6qW8QMPVi0zEiGgTvjvJkqesPoRLMR8O0ft078oAe0IOePddmdA2OSceF0D5YsHokekr9ITSwkh4P0pHRnwDsoAf0oGfriOgG4ebrsd6c4PhfUuGKrJ6GjZKCPD0KwA56QA969oxqV2TmeCNoPatnbfT0iTygB/SgZ2uI7AYhfD1HfopC4euJep+7jhQboadDE4GBHtCDnvVG+uNiBj2gBz1DUAnQg54hqARPAXrQMwSVAD2UEIJK8BQePdWFWVhYWHa8YPVg9SBYPVS4KCEElQA96BYZgoAe0IOeIagE6EHPOitqyGhh5h0Rmc+HBown3m4pBGDpkEg6M84L9Gwi/w+dFtlfKt7RNgAAAABJRU5ErkJggg=='/></div>
    <div class="infopopup" id="info_nrs-set12"><img src='data:image/png;base64,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'/></div>
  `;
  $.each(nrsl[V.BrowserLanguage]['m'], function(key, value){
    nrsmenu = nrsmenu.replace('_%' + key + '%_', value);
  });
  $('#newrodeoscript').append(nrsmenu);
  $('.infopopup').hide();
  
  // user settings || default settings
  try {
    rodeoSettings = setSettings( JSON.parse( GM_getValue("newrodeosettings", "{}") ) );
    GM_setValue('newrodeosettings', JSON.stringify(rodeoSettings));

    if (rodeoSettings.UseNewConsole){$('#nrs-set1').prop('checked', true);}
    if (rodeoSettings.HighlightActivePP){$('#nrs-set2').prop('checked', true);}
    if (rodeoSettings.AddWallsLocation){$('#nrs-set3').prop('checked', true);}
    if (rodeoSettings.AddBoxRec){$('#nrs-set4').prop('checked', true);}
    if (rodeoSettings.HighlightOverageWall){$('#nrs-set5').prop('checked', true);}
    $('#nrs-set13').val(rodeoSettings.OverageWallName.join());
    if (rodeoSettings.AddShipLocation){$('#nrs-set6').prop('checked', true);}
    if (rodeoSettings.AddTrackingID){$('#nrs-set7').prop('checked', true);}
    if (rodeoSettings.PickingNotYetPickedDetails){$('#nrs-set8').prop('checked', true);}
    $('#nrs-set9').val(rodeoSettings.PickingNotYetPickedLimit);
    if (rodeoSettings.cvAtPM00002LastPick){$('#nrs-set10').prop('checked', true);}
    if (rodeoSettings.cvAtPM00002PickerName){$('#nrs-set11').prop('checked', true);}
    if (rodeoSettings.cvAtPM00002PickerLocation){$('#nrs-set12').prop('checked', true);}
    $('#nrs-button').click(function(){
      $("#newrodeoscript").toggleClass('expand');
    });
    $('.nrs-info').hover(function(){
      divinfo = '#info_' + $(this).parent().parent().find(':input').prop('id');
      //console.log(divinfo);
      $(divinfo).show();
      infomove($(this),divinfo);
    },function(){
      $(divinfo).hide();
	});
    

    
    $('#nrs-update').click(function(){
      rodeoSettings.UseNewConsole = $('#nrs-set1').prop('checked');
      rodeoSettings.HighlightActivePP = $('#nrs-set2').prop('checked');
      rodeoSettings.AddWallsLocation = $('#nrs-set3').prop('checked');
      rodeoSettings.AddBoxRec = $('#nrs-set4').prop('checked');
      rodeoSettings.HighlightOverageWall = $('#nrs-set5').prop('checked');
      rodeoSettings.OverageWallName = $('#nrs-set13').val().split(',');
      rodeoSettings.AddShipLocation = $('#nrs-set6').prop('checked');
      rodeoSettings.AddTrackingID = $('#nrs-set7').prop('checked');
      rodeoSettings.PickingNotYetPickedDetails = $('#nrs-set8').prop('checked');
      if ($('#nrs-set9').val() > 300){
        rodeoSettings.PickingNotYetPickedLimit = 300;
      } else {
        rodeoSettings.PickingNotYetPickedLimit = $('#nrs-set9').val();
      }
      rodeoSettings.cvAtPM00002LastPick = $('#nrs-set10').prop('checked');
      rodeoSettings.cvAtPM00002PickerName = $('#nrs-set11').prop('checked');
      rodeoSettings.cvAtPM00002PickerLocation = $('#nrs-set12').prop('checked');
      GM_setValue('newrodeosettings', JSON.stringify(rodeoSettings));
      $("#newrodeoscript").toggleClass('expand');
      location.reload();
    });
  } catch (e) {
    throw e;
  }

  // FC, region, action, shipmentType
  try {
    var _urlmatch = document.URL.match(/https:\/\/rodeo-(.*?).amazon.com\/(.*?)\/(.*?)\?/); 
    if (!_urlmatch){
      $('#nrs-info').html('<i class="nrs-warn"></i>script error');
      throw nrsl[V.BrowserLanguage]['e']['unableretreiveurl'];
    }
    V.Region = _urlmatch[1];
    V.FCname = _urlmatch[2];
    V.Action = _urlmatch[3];
    V.Region2 = {'dub':'eu','iad':'na','nrt':'jp'}[V.Region];
    V.shipmentType = 'CUSTOMER_SHIPMENT';
    V.newShipmentType = 'customer-shipment';
    if (document.URL.indexOf('shipmentType=TRANSSHIPMENTS') > -1){
      V.shipmentType = 'TRANSSHIPMENT';
      V.newShipmentType = 'transshipment';
    }
  } catch (e) {
    throw e;
  }
  
  // console authentication
  try {
    var login = readCookie("fcmenu-employeeLogin");
    if (login && login != '' && login != '\"\"'){
      V.isAuthenticated = true;
      V.login = login;
    }
  } catch (e) {
    throw e;
  }
}
function infomove(btninfo, divinfo){
  $(btninfo).bind('mousemove',function(event){
    var xpos = event.pageX + 20;
    var ypos = event.pageY - 100;
    $(divinfo).css({
      'left':xpos,
      'top' :ypos
    });
  });
}
function get_language() {
  if (typeof navigator === 'undefined'){
    return 'en';
  }
  if (navigator.languages){
    return navigator.languages[0];
  }
  return navigator.language || navigator.userLanguage;
}
function setSettings(opts) {
  opts = $.extend({
    'UseNewConsole': true,
    'HighlightActivePP': true,
    'AddWallsLocation': true,
    'AddBoxRec': true,
    'HighlightOverageWall': false,
    'OverageWallName': ['chC8_Overage1','chC8_Overage2','chC8_Overage3','chC8_Overage4'],
    'AddShipLocation': false,
    'AddTrackingID': false,
    'PickingNotYetPickedDetails': true,
    'PickingNotYetPickedLimit': 200,
    'cvAtPM00002LastPick': true,
    'cvAtPM00002PickerName': true,
    'cvAtPM00002PickerLocation': true,
  }, opts);
  return opts;
}
function readCookie(name) {
  var nameEQ = name + '=';
  var ca = document.cookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return false;
}








