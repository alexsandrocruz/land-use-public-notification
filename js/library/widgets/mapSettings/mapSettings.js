/*global dojo, define, document */
/*jslint sloppy:true */
/** @license
| Version 10.2
| Copyright 2013 Esri
|
| Licensed under the Apache License, Version 2.0 (the "License");
| you may not use this file except in compliance with the License.
| You may obtain a copy of the License at
|
|    http://www.apache.org/licenses/LICENSE-2.0
|
| Unless required by applicable law or agreed to in writing, software
| distributed under the License is distributed on an "AS IS" BASIS,
| WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
| See the License for the specific language governing permissions and
| limitations under the License.
*/
//============================================================================================================================//
define([
    "dojo/_base/declare",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/_base/lang",
    "dojo/on",
    "dojo/dom",
    "dojo/query",
    "dojo/dom-class",
    "dojo/dom-geometry",
    "esri/tasks/query",
    "esri/tasks/QueryTask",
    "dijit/_WidgetBase",
    "esri/map",
    "esri/layers/FeatureLayer",
    "esri/layers/GraphicsLayer",
    "esri/geometry/Extent",
    "widgets/baseMapGallery/baseMapGallery",
    "dojo/i18n!nls/localizedStrings",
    "esri/dijit/HomeButton",
     "../scrollBar/scrollBar",
    "esri/SpatialReference",
    "widgets/infoWindow/infoWindow",
    "dojo/topic",
    "widgets/locator/locator",
    "esri/geometry",
    "esri/tasks/GeometryService",
    "dojo/_base/Color",
    "esri/symbol",
    "esri/renderers/Renderer",
    "dojo/domReady!"
    ],
     function (declare, domConstruct, domStyle, lang, on, dom, dojoQuery, domClass, domGeom, Query, QueryTask, _WidgetBase, esriMap, FeatureLayer, GraphicsLayer, geometryExtent, baseMapGallery, nls, HomeButton, ScrollBar, spatialReference, infoWindow, topic, Locator, Geometry, GeometryService, Color, Symbol, Renderer) {
         //========================================================================================================================//

         return declare([_WidgetBase], {
             nls: nls,
             map: null,
             tempGraphicsLayerId: "esriGraphicsLayerMapSettings",
             roadCenterLinesLayerID: "roadCenterLinesLayerID",
             tempBufferLayer: "tempBufferLayer",
             bufferArray: [],
             infoWindowContainerScrollbar: null,


             /**
             * initialize map object
             *
             * @class
             * @name widgets/mapSettings/mapSettings
             */
             postCreate: function () {
                 dojo.graphicLayerClicked = false,     //Flag for storing state of Graphics Layer Clicked
                 dojo.findTasksGraphicClicked = false, //flag for handling to draw polygon
                 dojo.parcelArray = [];                //Array to store the shared parcels
                 dojo.roadArray = [];
                 dojo.overLayArray = [];               //Array to store shared overlay layer
                 dojo.polygon = true;
                 dojo.shareinfo = false;               //Flag set for info window display
                 dojo.interactiveParcel = false,
                 dojo.mouseMoveHandle;
                 topic.subscribe("clearAll", lang.hitch(this, this.clearAll));
                 topic.subscribe("addShareParcelsToMap", lang.hitch(this, this.addShareParcelsToMap));
                 topic.subscribe("addShareOverLayToMap", lang.hitch(this, this.addShareOverLayToMap));
                 topic.subscribe("shareInfoWindow", lang.hitch(this, this.shareInfoWindow));
                 topic.subscribe("shareOverInfoWindow", lang.hitch(this, this.shareOverInfoWindow));
                 topic.subscribe("showRoadDetails", lang.hitch(this, this.showRoadDetails));
                 topic.subscribe("queryForAdjacentRoad", lang.hitch(this, this.queryForAdjacentRoad));
                 topic.subscribe("createDataForOverlappedParcels", lang.hitch(this, this.createDataForOverlappedParcels));



                 /**
                 * set map extent to default extent specified in configuration file
                 * @param {string} dojo.configData.DefaultExtent Default extent of map specified in configuration file
                 */
                 var extentPoints = dojo.configData && dojo.configData.DefaultExtent && dojo.configData.DefaultExtent.split(",");

                 /**
                 * load map
                 * @param {string} dojo.configData.BaseMapLayers Basemap settings specified in configuration file
                 */
                 var layer = new esri.layers.ArcGISTiledMapServiceLayer(dojo.configData.BaseMapLayers[0].MapURL, { id: dojo.configData.BaseMapLayers[0].Key, visible: true });

                 var customInfoWindow = new infoWindow({ infoWindowWidth: dojo.configData.InfoPopupWidth, infoWindowHeight: dojo.configData.InfoPopupHeight });
                 this.map = new esriMap("esriCTParentDivContainer", {
                     infoWindow: customInfoWindow,
                     basemap: layer
                 });
                 this.map.addLayer(layer);

                 var gLayer = new GraphicsLayer();
                 gLayer.id = this.tempBufferLayer;
                 this.map.addLayer(gLayer);

                 var glayer = new GraphicsLayer();
                 glayer.id = this.tempGraphicsLayerId;
                 this.map.addLayer(glayer);

                 this.map.on("click", lang.hitch(this, function (evt) {
                     dojo.overLayerID = false;
                     this.btnDiv = dojoQuery(".scrollbar_footer")[0];
                     domStyle.set(this.btnDiv, "display", "none");
                     this._executeQueryTask(evt);
                 }));

                 var roadLineColor = dojo.configData.RoadCenterLayerSettings.RoadHighlightColor;
                 var roadLineSymbol = new Symbol.SimpleLineSymbol();
                 roadLineSymbol.setWidth(5);
                 var roadLinefillColor = new Color(roadLineColor);
                 roadLineSymbol.setColor(roadLinefillColor);
                 var roadLineRenderer = new esri.renderer.SimpleRenderer(roadLineSymbol);
                 var roadCenterLinesLayer = new FeatureLayer(dojo.configData.RoadCenterLayerSettings.LayerUrl, {
                     mode: FeatureLayer.MODE_SELECTION,
                     outFields: ["*"]
                 });

                 roadCenterLinesLayer.id = this.roadCenterLinesLayerID;
                 roadCenterLinesLayer.setRenderer(roadLineRenderer);
                 this.map.addLayer(roadCenterLinesLayer);

                 this.own(on(roadCenterLinesLayer, "click", lang.hitch(this, function (evt) {
                     var roadLayerSettings = dojo.configData.RoadCenterLayerSettings;
                     topic.publish("createInfoWindowContent", evt.graphic, evt.mapPoint, roadLayerSettings);
                     evt.cancelBubble = true;
                     if (evt.stopPropagation) evt.stopPropagation();
                 })));

                 this.own(on(glayer, "click", function (evt) {
                     dojo.graphicLayerClicked = true;
                     dojo.findTasksGraphicClicked = false;
                 }));

                 /**
                 * load esri 'Home Button' widget
                 */
                 var home = this._addHomeButton(this.map);

                 /* * set position of home button widget after map is successfully loaded
                 * @param {array} dojo.configData.OperationalLayers List of operational Layers specified in configuration file
                 */
                 this.map.on("load", lang.hitch(this, function () {
                     _self = this;
                     var taxParcelQueryUrl = dojo.configData.ParcelLayerSettings.LayerUrl;
                     var extent = this._getQueryString('extent');
                     if (extent == "") {
                         var mapDefaultExtent = new geometryExtent({ "xmin": parseFloat(extentPoints[0]), "ymin": parseFloat(extentPoints[1]), "xmax": parseFloat(extentPoints[2]), "ymax": parseFloat(extentPoints[3]), "spatialReference": { "wkid": this.map.spatialReference.wkid} });
                         this.map.setExtent(mapDefaultExtent);
                     } else {
                         var mapDefaultExtent = extent.split(',');
                         mapDefaultExtent = new geometryExtent({ "xmin": parseFloat(mapDefaultExtent[0]), "ymin": parseFloat(mapDefaultExtent[1]), "xmax": parseFloat(mapDefaultExtent[2]), "ymax": parseFloat(mapDefaultExtent[3]), "spatialReference": { "wkid": this.map.spatialReference.wkid} });
                         this.map.setExtent(mapDefaultExtent);
                     }
                     domConstruct.place(home.domNode, dojoQuery(".esriSimpleSliderIncrementButton")[0], "after");
                     home.extent = mapDefaultExtent;
                     home.startup();
                     if (dojo.configData.BaseMapLayers.length > 1) {
                         var basMapObjectGallery = this._addbasMapObjectGallery();
                     }

                     var query;
                     if (window.location.toString().split("$parcelID=").length > 1) {
                         topic.publish("getValuesToBuffer", true);
                         if (window.location.toString().split("$displayInfo=").length > 1) {
                             dojo.parcelArray = window.location.toString().split("$parcelID=")[1].split("$displayInfo=")[0].split(",");
                         }
                         else {
                             dojo.parcelArray = window.location.toString().split("$parcelID=")[1].split(",");
                         }

                         query = new esri.tasks.Query();
                         var parcelGroup = "";
                         for (var p = 0; p < dojo.parcelArray.length; p++) {
                             if (p == (dojo.parcelArray.length - 1)) {
                                 parcelGroup += "'" + dojo.parcelArray[p] + "'";
                             }
                             else {
                                 parcelGroup += "'" + dojo.parcelArray[p] + "',";
                             }
                         }
                         query.where = dojo.configData.AveryLabelSettings[0].ParcelInformation.ParcelIdentification + " in (" + parcelGroup + ")";
                         query.returnGeometry = true;
                         query.outFields = ["*"];
                         var qTask = new QueryTask(taxParcelQueryUrl);
                         qTask.execute(query, function (featureset) {
                             topic.publish("addShareParcelsToMap", featureset, 0);
                         });
                     }
                     else if (window.location.toString().split("$roadID=").length > 1) {
                         topic.publish("getValuesToBuffer", false);
                         if (window.location.toString().split("$displayInfo=").length > 1) {
                             dojo.roadArray = window.location.toString().split("$roadID=")[1].split("$displayInfo=")[0].split(",");
                         }
                         else {
                             dojo.roadArray = window.location.toString().split("$roadID=")[1].split(",");
                         }

                         query = new esri.tasks.Query();
                         query.returnGeometry = true;
                         query.objectIds = [dojo.roadArray.join(",")];
                         _self.map.getLayer("roadCenterLinesLayerID").selectFeatures(query, esri.layers.FeatureLayer.SELECTION_ADD, function (featureSet) {
                             polyLine = new esri.geometry.Polyline(_self.map.spatialReference);
                             var numSegments = _self.map.getLayer("roadCenterLinesLayerID").graphics.length;
                             if (0 < numSegments) {
                                 for (var j = 0; j < numSegments; j++) {
                                     if (_self.map.getLayer("roadCenterLinesLayerID").graphics[j]) {
                                         polyLine.addPath(_self.map.getLayer("roadCenterLinesLayerID").graphics[j].geometry.paths[0]);
                                     }
                                 }
                                 _self.map.setExtent(polyLine.getExtent().expand(2));
                             }
                             topic.publish("createRoadBuffer");
                         }, function (err) {
                             topic.publish("hideProgressIndicator");
                             alert(err.message);
                         });
                     }
                     else if (window.location.toString().split("$overlayID=").length > 1) {
                         var overLayQueryUrl = dojo.configData.OverlayLayerSettings[0].LayerUrl;
                         topic.publish("getoverlayValuesToBuffer", true);
                         if (window.location.toString().split("$displayInfo=").length > 1) {
                             dojo.overLayArray = window.location.toString().split("$overlayID=")[1].split("$displayInfo=")[0].split(",");
                         }
                         else {
                             dojo.overLayArray = window.location.toString().split("$overlayID=")[1].split(",");
                         }
                         query = new esri.tasks.Query();
                         var parcelGroup = "";
                         for (var p = 0; p < dojo.overLayArray.length; p++) {
                             if (p == (dojo.overLayArray.length - 1)) {
                                 parcelGroup += "" + dojo.overLayArray[p] + "";
                             }
                             else {
                                 parcelGroup += "" + dojo.overLayArray[p] + ",";
                             }
                         }
                         if (window.location.toString().split("$dist=").length > 1) {
                             parcelGroup = parcelGroup.split("$Where=")[0];
                         }
                         dojo.whereclause = window.location.toString().split("$Where=")[1];
                         query.where = dojo.whereclause + " = (" + parcelGroup + ")";
                         query.returnGeometry = true;
                         query.outFields = ["*"];
                         var qTask = new QueryTask(overLayQueryUrl);
                         qTask.execute(query, function (featureset) {
                             topic.publish("addShareOverLayToMap", featureset, 0);
                         });
                     }
                     else {
                         topic.publish("hideProgressIndicator");
                     }
                 }));

                 var _self = this;
                 this.map.on("extent-change", function () {
                     topic.publish("setMapTipPosition", dojo.selectedMapPoint, _self.map);
                 });
             },

             _getQueryString: function (key) {
                 var _default;
                 if (!_default) {
                     _default = "";
                 }
                 key = key.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
                 var regex = new RegExp("[\\?&]" + key + "=([^&#]*)");
                 var qs = regex.exec(window.location.href);
                 if (!qs) {
                     return _default;
                 } else {
                     return qs[1];
                 }
             },

             /**
             * load esri 'Home Button' widget which sets map extent to default extent
             * @return {object} Home button widget
             * @memberOf widgets/mapSettings/mapSettings
             */
             _addHomeButton: function (map) {
                 var home = new HomeButton({
                     map: map
                 }, domConstruct.create("div", {}, null));
                 return home;
             },

             /*
             * load esri 'Basemap Toggle' widget which allow toggle between configured base map
             * @memberOf widgets/mapSettings/mapSettings
             */
             _addbasMapObjectGallery: function () {
                 var basMapObject = new baseMapGallery({
                     map: this.map
                 }, domConstruct.create("div", {}, null));
                 return basMapObject;
             },

             _executeQueryTask: function (evt) {
                 if (!dojo.graphicLayerClicked || dojo.findTasksGraphicClicked) {
                     dojo.roadArray = [];
                     dojo.overLayArray = [];
                     if (!evt.ctrlKey) {
                         topic.publish("showProgressIndicator");
                         dojo.isSpanClicked = false;
                         topic.publish("hideMapTip");
                         if (dojo.mouseMoveHandle) {
                             dojo.mouseMoveHandle.remove();
                         }
                         topic.publish("clearAll", evt);
                         dojo.interactiveParcel = false;
                         dojo.parcelArray = [];
                         this._queryForParcel(evt);
                         if (this.map.getLayer("roadCenterLinesLayerID")) {
                             this.map.getLayer("roadCenterLinesLayerID").clear();
                         }
                     }
                     if (dojo.interactiveParcel) {
                         if (evt.ctrlKey) {
                             if (dojo.polygon) {
                                 topic.publish("hideMapTip");
                                 dojo.mouseMoveHandle = this.map.on("mouse-move", lang.hitch(this, function (evt) {
                                     topic.publish("showMapTipForParcels", evt);
                                 }));
                                 this._queryForParcel(evt);
                             }
                         }
                     }

                     if (dojo.findTasksGraphicClicked) {
                         dojo.findTasksGraphicClicked = false;
                         dojo.graphicLayerClicked = false;
                     }
                 }
                 else {
                     this._showFeatureDetails(evt.graphic, evt.mapPoint);
                     dojo.graphicLayerClicked = false;
                 }

                 if (evt.ctrlKey) {
                     if (!dojo.polygon) {
                         selectedPoint = null;
                         displayInfo = null;
                         this.map.infoWindow.hide();
                         topic.publish("hideMapTip");
                         if (dojo.mouseMoveHandle) {
                             dojo.mouseMoveHandle.remove();
                         }
                         topic.publish("showProgressIndicator");
                         dojo.mouseMoveHandle = this.map.on("mouse-move", lang.hitch(this, function (evt) {
                             topic.publish("showMapTipForRoad", evt);
                         }));
                         topic.publish("queryForAdjacentRoad", evt);
                     }
                 }
             },

             _queryForParcel: function (evt) {
                 var _this = this;
                 var taxParcelQueryUrl = dojo.configData.ParcelLayerSettings.LayerUrl;
                 var qTask = new QueryTask(taxParcelQueryUrl);
                 var mapPointForQuery = new Geometry.Point(evt.mapPoint.x, evt.mapPoint.y, this.map.spatialReference);
                 var query = new Query();
                 query.returnGeometry = true;
                 query.outFields = dojo.configData.QueryOutFields.split(",");
                 query.geometry = mapPointForQuery;
                 qTask.execute(query, function (fset) {
                     if (fset.features.length) {
                         _this._showFeatureSet(fset, evt);
                     }
                     else {
                         alert(nls.errorMessages.noParcel);
                         topic.publish("hideProgressIndicator");
                     }
                 }, function (err) {
                     alert(nls.errorMessages.unableToPerform);
                     topic.publish("hideProgressIndicator");
                 });
             },

             queryForAdjacentRoad: function (evt) {
                 var _self = this;
                 var roadCenterLinesLayerURL = dojo.configData.RoadCenterLayerSettings.LayerUrl;
                 var geometryService = new GeometryService(dojo.configData.GeometryService);
                 var temp = evt.mapPoint.getExtent();
                 var params = new esri.tasks.BufferParameters();
                 params.geometries = [evt.mapPoint];
                 params.distances = [50];
                 params.unit = GeometryService.UNIT_FOOT;
                 params.outSpatialReference = this.map.spatialReference;
                 geometryService.buffer(params, function (geometries) {
                     var query = new Query();
                     query.geometry = geometries[0];
                     query.where = "1=1";
                     query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_INTERSECTS;
                     query.returnGeometry = true;

                     queryTask = new QueryTask(roadCenterLinesLayerURL);
                     queryTask.execute(query, function (featureset) {
                         if (featureset.features.length > 0) {
                             var query = new Query();
                             query.where = dojo.configData.RoadCenterLayerSettings.SearchDisplayFields + "= '" + featureset.features[0].attributes[dojo.configData.RoadCenterLayerSettings.SearchDisplayFields] + "'";
                             _self.map.getLayer("roadCenterLinesLayerID").selectFeatures(query, esri.layers.FeatureLayer.SELECTION_ADD, function (featureSet) {
                                 var polyLine = new esri.geometry.Polyline(_self.map.spatialReference);
                                 for (var j = 0; j < _self.map.getLayer("roadCenterLinesLayerID").graphics.length; j++) {
                                     _self.map.getLayer("roadCenterLinesLayerID").graphics[j].show();
                                     polyLine.addPath(_self.map.getLayer("roadCenterLinesLayerID").graphics[j].geometry.paths[0]);
                                     dojo.roadArray.push(_self.map.getLayer("roadCenterLinesLayerID").graphics[j].attributes[_self.map.getLayer("roadCenterLinesLayerID").objectIdField]);
                                 }
                                 _self.map.setExtent(polyLine.getExtent().expand(1.5));
                             });
                             topic.publish("hideProgressIndicator");
                         }
                         else {
                             topic.publish("hideProgressIndicator");
                             alert(nls.errorMessages.noRoad);
                         }
                     });
                 }, function (error) {
                     topic.publish("hideProgressIndicator");
                     alert(error.message);
                 });
             },

             _showFeatureSet: function (fset, evt) {
                 this.map.infoWindow.hide();
                 var rendererColor = dojo.configData.OverlayLayerSettings[0].OverlayHighlightColor;
                 var centerPoint = evt.mapPoint;
                 if (fset.features.length > 1) {
                     var featureSet = fset;
                     this.overlapCount = 0;
                     var contentDiv = this._createContent(featureSet.features);
                     this._showOverlappingParcels(featureSet.features, contentDiv, evt, featureSet.features[0].attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.ParcelIdentification]);
                     var features = featureSet.features;
                     topic.publish("drawPolygon", features, false);
                     this.map.setExtent(this._centerMapPoint(evt.mapPoint, fset.features[0].geometry.getExtent().expand(9)));
                 }
                 else {
                     var feature = fset.features[0];
                     var layer = this.map.getLayer("esriGraphicsLayerMapSettings");
                     var lineColor = new Color();
                     lineColor.setColor(rendererColor);
                     var fillColor = new Color();
                     fillColor.setColor(rendererColor);
                     fillColor.a = 0.25;
                     var symbol = new Symbol.SimpleFillSymbol(Symbol.SimpleFillSymbol.STYLE_SOLID, new Symbol.SimpleLineSymbol(Symbol.SimpleLineSymbol.STYLE_SOLID, lineColor, 3), fillColor);
                     feature.setSymbol(symbol);
                     dojo.parcelArray.push(feature.attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.ParcelIdentification]); //showfeatureset
                     dojo.displayInfo = feature.attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.ParcelIdentification] + "$infoParcel";
                     this._showUniqueParcel(feature, centerPoint, evt);
                     topic.publish("hideProgressIndicator");
                     this.map.setExtent(this._centerMapPoint(evt.mapPoint, fset.features[0].geometry.getExtent().expand(9)));
                     layer.add(feature);
                     dojo.polygon = true;
                 }
             },

             _showUniqueParcel: function (feature, centerPoint, mapPoint) {
                 var parcelLayerSettings = dojo.configData.ParcelLayerSettings;
                 if (mapPoint.ctrlKey) {
                     if (dijit.byId('toolTipDialog')) {
                         dojo.selectedMapPoint = null;
                         this.map.infoWindow.hide();
                         if (!this.map.getLayer("roadCenterLinesLayerID").graphics.length) {
                             this.map.getLayer("esriGraphicsLayerMapSettings").remove(feature);
                         }
                     }

                     if (this.map.getLayer("esriGraphicsLayerMapSettings").graphics.length) {
                         topic.publish("hideMapTip");
                         dojo.mouseMoveHandle.remove();
                         topic.publish("clearAll", mapPoint);
                     }
                 } else {
                     topic.publish("createInfoWindowContent", feature, centerPoint, parcelLayerSettings);
                 }
             },

             _createContent: function (featureList) {
                 var _this = this;
                 domConstruct.empty(dojoQuery(".scrollbar_footer")[0]);
                 domConstruct.empty(dojoQuery(".esriCTAdjacentParcel")[0]);
                 var adjacentLabel = dojoQuery(".esriCTAdjacentParcel")[0];
                 if (dojoQuery(".divDataDisplay")[0]) {
                     domConstruct.empty(dojoQuery(".divDataDisplay")[0]);
                 }
                 this.overlapCount = 0;
                 this.detailsTab = domConstruct.create("div", { "class": "esriCTFullHeightWidth" }, null);
                 this.buttonDetails = domConstruct.create("div", {}, this.detailsTab);
                 this.scrollbar_container = domConstruct.create("div", { "data-dojo-attach-point": "scrollbar_container2", "class": "scrollbar_container" }, this.detailsTab);
                 this.divParcelList = domConstruct.create("div", { "class": "scrollbar_content1", "display": "block" }, this.scrollbar_container);
                 this.divParcelList.setAttribute("id", "divParcelList");
                 this.divDescription = domConstruct.create("div", { "class": "scrollbar_content1", "display": "none" }, this.scrollbar_container);
                 this.divDescription.setAttribute("id", "divDescription");
                 this.btnDiv = dojoQuery(".scrollbar_footer")[0];
                 domStyle.set(this.btnDiv, "display", "none");
                 this.own(on(this.btnDiv, "click", lang.hitch(this, function () {
                     this._showParcel(featureList[divParcelId.id].attributes);
                 })));
                 var customButtondiv = domConstruct.create("div", { "class": "customButton", "cursor": "pointer" }, this.btnDiv);
                 var btnInnerDiv = domConstruct.create("div", { "class": "customButtonInner", "cursor": "pointer" }, customButtondiv);
                 var btnTbody = domConstruct.create("div", {}, btnInnerDiv);
                 var btnColumns = domConstruct.create("div", { "class": "backBtn", "innerHTML": nls.backBtn }, btnTbody);

                 var divDisplayTable = domConstruct.create("div", { "class": "tblTransparent" }, this.divParcelList);
                 for (var i = 0; i < featureList.length; i++) {
                     this.overlapCount++;
                     var attributes = featureList[i].attributes;
                     var divDisplayRow = domConstruct.create("div", { "class": "esriCTtrBufferRow" }, divDisplayTable);
                     var divDisplayColumn = domConstruct.create("div", { "class": "tdParcel" }, divDisplayRow);
                     var divParcelId = domConstruct.create("div", { "id": i, "innerHTML": attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.ParcelIdentification], "textDecoration": "underline" }, divDisplayColumn);
                     this.own(on(divParcelId, "click", function () {
                         _this._showParcelDetail(featureList[this.id].attributes);
                     }));
                     var divDisplayColumn1 = domConstruct.create("div", { "class": "tdSiteAddress", "innerHTML": attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.SiteAddress] }, divDisplayRow);
                 }

                 var divDisplayRow = domConstruct.create("div", {}, adjacentLabel);
                 var divDisplayColumn1 = domConstruct.create("div", {}, divDisplayRow);
                 var divInfoImg = domConstruct.create("img", { "id": "imgAdjacentParcels1", "class": "imgAdjacentParcels1" }, divDisplayColumn1);
                 this.own(on(divInfoImg, "click", lang.hitch(this, function () {
                     this.polygon = true;
                     this.interactiveParcel = true;
                     dojo.selectedMapPoint = null;
                     dojo.displayInfo = null;
                     if (dojo.isSpanClicked == true) {
                         return;
                     }
                     dojo.mouseMoveHandle = this.map.on("mouse-move", lang.hitch(function (evt) {
                         topic.publish("showMapTipForParcels", evt);
                     }));
                     dojo.isSpanClicked = true;
                 })));
                 divInfoImg.src = dojoConfig.baseURL + "/js/library/themes/images/add.png";

                 var divDisplayColumn2 = domConstruct.create("div", { "class": "divDisplaySpan" }, divDisplayRow);
                 var divSpan = domConstruct.create("span", { "id": "spanAdjacentParcels1", "class": "esrictDivSpan1", "display": "block", "innerHTML": nls.adjacentParcels }, divDisplayColumn2);
                 this.own(on(divSpan, "click", lang.hitch(this, function () {
                     dojo.polygon = true;
                     this.interactiveParcel = true;
                     dojo.selectedMapPoint = null;
                     dojo.displayInfo = null;
                     this.map.infoWindow.hide();
                     if (dojo.isSpanClicked == true) {
                         return;
                     }

                     dojo.mouseMoveHandle = this.map.on("mouse-move", lang.hitch(function (evt) {
                         topic.publish("showMapTipForParcels", evt);
                     }));
                     dojo.isSpanClicked = true;

                 })));
                 return this.detailsTab;
             },

             _createContentForGraphics: function (featureList) {
                 var _this = this;
                 domConstruct.empty(dojoQuery(".scrollbar_footer")[0]);
                 domConstruct.empty(dojoQuery(".esriCTAdjacentParcel")[0]);
                 var adjacentLabel = dojoQuery(".esriCTAdjacentParcel")[0];
                 if (dojoQuery(".divDataDisplay")[0]) {
                     domConstruct.empty(dojoQuery(".divDataDisplay")[0]);
                 }
                 this.overlapCount = 0;
                 this.detailsTab = domConstruct.create("div", { "class": "esriCTFullHeightWidth" }, null);
                 this.buttonDetails = domConstruct.create("div", {}, this.detailsTab);
                 this.scrollbar_container = domConstruct.create("div", { "data-dojo-attach-point": "scrollbar_container2", "class": "scrollbar_container" }, this.detailsTab);
                 this.divParcelList = domConstruct.create("div", { "class": "scrollbar_content1", "display": "block" }, this.scrollbar_container);
                 this.divParcelList.setAttribute("id", "divParcelList");
                 this.divDescription = domConstruct.create("div", { "class": "scrollbar_content1", "display": "none" }, this.scrollbar_container);
                 this.divDescription.setAttribute("id", "divDescription");
                 this.btnDiv = dojoQuery(".scrollbar_footer")[0];
                 domStyle.set(this.btnDiv, "display", "none");
                 this.own(on(this.btnDiv, "click", lang.hitch(this, function () {
                     this._showParcel(featureList[divParcelId.id].attributes);
                 })));
                 var customButtondiv = domConstruct.create("div", { "class": "customButton", "cursor": "pointer" }, this.btnDiv);
                 var btnInnerDiv = domConstruct.create("div", { "class": "customButtonInner", "cursor": "pointer" }, customButtondiv);
                 var btnTbody = domConstruct.create("div", {}, btnInnerDiv);
                 var btnColumns = domConstruct.create("div", { "class": "backBtn", "innerHTML": nls.backBtn }, btnTbody);

                 var divDisplayTable = domConstruct.create("div", { "class": "tblTransparent" }, this.divParcelList);
                 for (var parcelID in featureList.attributes) {
                     this.overlapCount++;
                     var attributes = featureList.attributes[parcelID];
                     var divDisplayRow = domConstruct.create("div", { "class": "esriCTtrBufferRow" }, divDisplayTable);
                     var divDisplayColumn = domConstruct.create("div", { "class": "tdParcel" }, divDisplayRow);
                     var divParcelId = domConstruct.create("div", { "innerHTML": attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.ParcelIdentification], "textDecoration": "underline" }, divDisplayColumn);
                     this.own(on(divParcelId, "click", function () {
                         _this._showParcelDetail(featureList.attributes[this.innerHTML]);
                     }));
                     var divDisplayColumn1 = domConstruct.create("div", { "class": "tdSiteAddress", "innerHTML": attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.SiteAddress] }, divDisplayRow);
                 }

                 var divDisplayRow = domConstruct.create("div", {}, adjacentLabel);
                 var divDisplayColumn1 = domConstruct.create("div", {}, divDisplayRow);
                 var divInfoImg = domConstruct.create("img", { "id": "imgAdjacentParcels1", "class": "imgAdjacentParcels1" }, divDisplayColumn1);
                 this.own(on(divInfoImg, "click", lang.hitch(this, function () {
                     this.polygon = true;
                     this.interactiveParcel = true;
                     dojo.selectedMapPoint = null;
                     dojo.displayInfo = null;
                     if (this.isSpanClicked == true) {
                         return;
                     }
                 })));
                 divInfoImg.src = dojoConfig.baseURL + "/js/library/themes/images/add.png";

                 var divDisplayColumn2 = domConstruct.create("div", { "class": "divDisplaySpan" }, divDisplayRow);
                 var divSpan = domConstruct.create("span", { "id": "spanAdjacentParcels1", "class": "esrictDivSpan1", "display": "block", "innerHTML": nls.adjacentParcels }, divDisplayColumn2);
                 this.own(on(divSpan, "click", lang.hitch(this, function () {
                     dojo.polygon = true;
                     this.interactiveParcel = true;
                     dojo.selectedMapPoint = null;
                     dojo.displayInfo = null;
                     this.map.infoWindow.hide();
                     if (dojo.isSpanClicked == true) {
                         return;
                     }

                     dojo.mouseMoveHandle = this.map.on("mouse-move", lang.hitch(function (evt) {
                         topic.publish("showMapTipForParcels", evt);
                     }));
                     dojo.isSpanClicked = true;

                 })));
                 return this.detailsTab;
             },

             _showParcelDetail: function (attr) {
                 if (dojoQuery(".esrictDivSpan1")[0]) {
                     var adjacentParcel = dojoQuery(".esrictDivSpan1")[0];
                     domStyle.set(adjacentParcel, "display", "none");
                     var imgAdjacentParcels = dojoQuery(".imgAdjacentParcels1")[0];
                     domStyle.set(imgAdjacentParcels, "display", "none");
                 }
                 if (dojoQuery(".esrictDivSpan")[0]) {
                     var adjacentParcel = dojoQuery(".esrictDivSpan")[0];
                     domStyle.set(adjacentParcel, "display", "none");
                     var imgAdjacentParcels = dojoQuery(".imgAdjacentParcels")[0];
                     domStyle.set(imgAdjacentParcels, "display", "none");
                 }
                 var infoPopupFieldsCollection = dojo.configData.ParcelLayerSettings.InfoWindowSettings[0].InfoWindowData;
                 var parcelInformation = dojo.configData.AveryLabelSettings[0].ParcelInformation;
                 var showNullAs = dojo.configData.ShowNullValueAs;
                 domStyle.set(this.divParcelList, "display", "none");
                 domStyle.set(this.divDescription, "display", "block");
                 domStyle.set(this.btnDiv, "display", "block");
                 topic.publish("removeChildren", this.divDescription);
                 var divParcelRow = domConstruct.create("div", { "class": "esriCTDivTransparent" }, null);
                 var divParcelDetails = domConstruct.create("div", { "class": "esriCTDisplayRow" }, null);
                 for (var key = 0; key < infoPopupFieldsCollection.length; key++) {
                     var divParcelInformation = domConstruct.create("div", { "class": "esriCTDisplayRow" }, divParcelRow);
                     var divInfoPopupDisplayText = domConstruct.create("div", { "innerHTML": infoPopupFieldsCollection[key].DisplayText, "class": "esriCTDisplayField" }, null);
                     var divInfoPopupField = domConstruct.create("div", { "class": "esriCTValueField" }, null);
                     var fieldName = infoPopupFieldsCollection[key].FieldName;
                     var fieldNames = fieldName.split(',');
                     if (fieldNames.length > 1) {
                         var notApplicableCounter = 0;
                         for (var i = 0; i < fieldNames.length; i++) {
                             if (!attr[fieldNames[i]]) {
                                 notApplicableCounter++;
                             }
                         }
                         if (notApplicableCounter == fieldNames.length) {
                             divInfoPopupField.innerHTML += showNullAs;
                         } else {
                             for (i = 0; i < fieldNames.length; i++) {
                                 if (attr[fieldNames[i]]) {
                                     divInfoPopupField.innerHTML += attr[fieldNames[i]] + " ";
                                 }
                             }
                             divInfoPopupField.innerHTML = divInfoPopupField.innerHTML.slice(0, -1);
                         }
                     } else {
                         if (attr[fieldName] == null) {
                             divInfoPopupField.innerHTML = showNullAs;
                         } else {
                             divInfoPopupField.innerHTML = attr[fieldName];
                         }
                     }
                     divParcelInformation.appendChild(divInfoPopupDisplayText);
                     divParcelInformation.appendChild(divInfoPopupField);
                 }
                 divDescription.appendChild(divParcelRow);
                 this.content = divDescription;
                 if (attr[parcelInformation.SiteAddress]) {
                     if (attr[parcelInformation.SiteAddress].length > 35) {
                         var title = attr[parcelInformation.SiteAddress];
                         this.map.infoWindow.setTitle(title);
                     } else {
                         title = attr[parcelInformation.SiteAddress];
                         this.map.infoWindow.setTitle(title);
                     }
                 } else {
                     this.map.infoWindow.setTitle(showNullAs);
                 }
             },

             _showParcel: function () {
                 if (dojoQuery(".esrictDivSpan1")[0]) {
                     var adjacentParcel = dojoQuery(".esrictDivSpan1")[0];
                     domStyle.set(adjacentParcel, "display", "block");
                     var imgAdjacentParcels = dojoQuery(".imgAdjacentParcels1")[0];
                     domStyle.set(imgAdjacentParcels, "display", "block");
                 }
                 var scrollbar_container = this.scrollbar_container;
                 domStyle.set(this.divParcelList, "display", "block");
                 domStyle.set(this.divDescription, "display", "none");
                 domStyle.set(this.btnDiv, "display", "none");
                 this.content = divParcelList;
             },

             _showOverlappingParcels: function (feature, contentDiv, evt, parcelFeature) {
                 if (evt.mapPoint) {
                     dojo.selectedMapPoint = evt.mapPoint;
                 }
                 else {
                     dojo.selectedMapPoint = evt;
                 }
                 var extentChanged = this.map.setExtent(this._getBrowserMapExtent(dojo.selectedMapPoint));
                 extentChanged.then(lang.hitch(this, function () {
                     var screenPoint = this.map.toScreen(dojo.selectedMapPoint);
                     screenPoint.y = this.map.height - screenPoint.y;
                     this.map.infoWindow.show(contentDiv, screenPoint);
                 }));
                 var infoTitle = this.overlapCount + " " + nls.parcelsCount;
                 this.map.infoWindow.setTitle(infoTitle);
                 topic.publish("hideProgressIndicator");
             },

             //Get the extent of point
             _centerMapPoint: function (mapPoint, extent) {
                 var width = extent.getWidth();
                 var height = extent.getHeight();
                 var xmin = mapPoint.x - (width / 2);
                 var ymin = mapPoint.y - (height / 4);
                 var xmax = xmin + width;
                 var ymax = ymin + height;
                 return new Geometry.Extent(xmin, ymin, xmax, ymax, this.map.spatialReference);
             },

             /**
             * return current map instance
             * @return {object} Current map instance
             * @memberOf widgets/mapSettings/mapSettings
             */
             getMapInstance: function () {
                 return this.map;
             },

             _getBrowserMapExtent: function (mapPoint) {
                 var width = this.map.extent.getWidth();
                 var height = this.map.extent.getHeight();
                 var xmin = mapPoint.x - (width / 2);
                 var ymin = mapPoint.y - (height / 2.7);
                 var xmax = xmin + width;
                 var ymax = ymin + height;
                 return new Geometry.Extent(xmin, ymin, xmax, ymax, this.map.spatialReference);
             },

             _showFeatureDetails: function (feature, mapPoint) {
                 var parcelLayerSettings = dojo.configData.ParcelLayerSettings;
                 var parcelInformation = dojo.configData.AveryLabelSettings[0].ParcelInformation;
                 if (feature.attributes) {
                     if (feature.attributes[parcelInformation.ParcelIdentification] ||
                         feature.attributes[parcelLayerSettings.SearchDisplayFields.split(",")[0]]) {
                         topic.publish("createInfoWindowContent", feature, mapPoint, parcelLayerSettings);
                         topic.publish("hideProgressIndicator");
                     }
                     else {
                         topic.publish("createDataForOverlappedParcels", feature, mapPoint);
                     }
                 }
             },

             createDataForOverlappedParcels: function (feature, mapPoint) {
                 var parcelInformation = dojo.configData.AveryLabelSettings[0].ParcelInformation;
                 overlapCount = 0;
                 var contentDiv = this._createContentForGraphics(feature);

                 for (var parcel in feature.attributes) {
                     var attr = feature.attributes[parcel];
                     break;
                 }
                 dojo.displayInfo = attr[parcelInformation.ParcelIdentification] + "$infoParcel";
                 this._showOverlappingParcels(feature, contentDiv, mapPoint, attr[parcelInformation.ParcelIdentification]);
             },

             clearAll: function (evt) {
                 dojo.selectedMapPoint = null;
                 this.map.infoWindow.hide();
                 this.map.graphics.clear();
                 for (var i = 0; i < this.map.graphicsLayerIds.length; i++) {
                     if (evt) {
                         if (evt.ctrlKey) {
                             if (this.map.graphicsLayerIds[i] == "esriGraphicsLayerMapSettings") {
                                 continue;
                             }
                             if (this.map.graphicsLayerIds[i] == "roadCenterLinesLayerID") {
                                 continue;
                             }
                         }
                     } else {
                         if (this.map.getLayer("roadCenterLinesLayerID")) {
                             this.map.getLayer("roadCenterLinesLayerID").clearSelection();
                         }
                     }

                     if (this.map.graphicsLayerIds[i] == "roadCenterLinesLayerID") {
                         continue;
                     } else {
                         this.map.getLayer(this.map.graphicsLayerIds[i]).clear();
                     }
                 }
             },

             addShareOverLayToMap: function (fset, q) {
                 var _self = this;
                 var rendererColor = dojo.configData.OverlayLayerSettings[0].OverlayHighlightColor;
                 var overLayQueryUrl = dojo.configData.OverlayLayerSettings[0].LayerUrl;
                 var queryTask = new QueryTask(overLayQueryUrl);
                 var feature = fset.features[q];
                 if (fset.features[q]) {
                     if (fset.features.length > 1) {
                         topic.publish("drawPolygon", featureset.features, true);
                         q++;
                         topic.publish("addShareOverLayToMap", fset, q);

                     }
                     else {
                         var layer = _self.map.getLayer("esriGraphicsLayerMapSettings");
                         var lineColor = new dojo.Color();
                         lineColor.setColor(rendererColor);
                         var fillColor = new dojo.Color();
                         fillColor.setColor(rendererColor);
                         fillColor.a = 0.25;
                         var symbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
                    new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, lineColor, 3), fillColor);
                         feature.setSymbol(symbol);
                         layer.add(feature);
                         q++;
                         topic.publish("addShareOverLayToMap", fset, q);
                     }
                 }
                 else {
                     geometryForBuffer = fset.features[q - 1].geometry;
                     if (window.location.toString().split("$dist=").length > 1) {
                         dojo.overLayerID = true;
                         topic.publish("createRoadBuffer");
                     }
                     else {
                         if (window.location.toString().split("$displayInfo=").length > 1) {
                             if (!dojo.shareinfo) {
                                 dojo.shareinfo = true;
                                 topic.publish("shareOverInfoWindow");
                             }
                         }
                         topic.publish("hideProgressIndicator");
                     }
                 }
             },

             addShareParcelsToMap: function (fset, q) {
                 var _self = this;
                 var parcelInformation = dojo.configData.AveryLabelSettings[0].ParcelInformation;
                 var rendererColor = dojo.configData.ParcelLayerSettings.ParcelHighlightColor;
                 var taxParcelQueryUrl = dojo.configData.ParcelLayerSettings.LayerUrl;
                 var qTask = new QueryTask(taxParcelQueryUrl);
                 if (fset.features[q]) {
                     var feature = fset.features[q];
                     var query = new esri.tasks.Query();
                     query.where = parcelInformation.LowParcelIdentification + " = '" + feature.attributes[parcelInformation.LowParcelIdentification] + "'";
                     query.returnGeometry = true;
                     query.outFields = ["*"];
                     qTask.execute(query, function (featureset) {
                         if (featureset.features.length > 1) {
                             topic.publish("drawPolygon", featureset.features, true);
                             q++;
                             topic.publish("addShareParcelsToMap", fset, q);

                         }
                         else {
                             var layer = _self.map.getLayer("esriGraphicsLayerMapSettings");
                             var lineColor = new dojo.Color();
                             lineColor.setColor(rendererColor);
                             var fillColor = new dojo.Color();
                             fillColor.setColor(rendererColor);
                             fillColor.a = 0.25;
                             var symbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
                    new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, lineColor, 3), fillColor);
                             feature.setSymbol(symbol);
                             layer.add(feature);
                             q++;
                             topic.publish("addShareParcelsToMap", fset, q);
                         }
                     });
                 }
                 else {
                     polygon = true;
                     geometryForBuffer = fset.features[q - 1].geometry;
                     if (window.location.toString().split("$dist=").length > 1) {
                         dojo.overLayerID = false;
                         topic.publish("createRoadBuffer");
                     }
                     else {
                         if (window.location.toString().split("$displayInfo=").length > 1) {
                             if (!dojo.shareinfo) {
                                 dojo.shareinfo = true;
                                 topic.publish("shareInfoWindow", feature);
                             }
                         }
                         topic.publish("hideProgressIndicator");
                     }
                 }

             },

             shareOverInfoWindow: function () {
                 var parcelGroup = "";
                 for (var p = 0; p < dojo.overLayArray.length; p++) {
                     if (p == (dojo.overLayArray.length - 1)) {
                         parcelGroup += "" + dojo.overLayArray[p] + "";
                     }
                     else {
                         parcelGroup += "" + dojo.overLayArray[p] + ",";
                     }
                 }
                 var point = new esri.geometry.Point(Number(window.location.toString().split("$point=")[1].split(",")[0]), Number(window.location.toString().split("$point=")[1].split("$Where=")[0].split(",")[1]), this.map.spatialReference);
                 var overLayQueryUrl = dojo.configData.OverlayLayerSettings[0].LayerUrl;
                 var whereclause = window.location.toString().split("$Where=")[1];
                 query = new esri.tasks.Query();
                 query.where = whereclause + " = (" + parcelGroup + ")";
                 query.returnGeometry = true;
                 query.outFields = ["*"];
                 var qTask = new QueryTask(overLayQueryUrl);
                 if (window.location.toString().split("$displayInfo=")[1].split("$infoParcel").length > 1) {
                     qTask.execute(query, function (featureset) {
                         topic.publish("createInfoWindowContent", featureset.features[0], point, dojo.configData.OverlayLayerSettings[0]);
                     });
                 }
                 else {
                     query = new esri.tasks.Query();
                     query.returnGeometry = true;
                     query.outFields = ["*"];
                     query.objectIds = [window.location.toString().split("$displayInfo=")[1].split("$infoRoad")[0]];
                     var roadTask = new esri.tasks.QueryTask(roadCenterLinesLayerURL);
                     roadTask.execute(query, function (featureset) {
                         topic.publish("showRoadDetails", featureset.features[0].attributes, point);
                     });
                 }
             },

             shareInfoWindow: function () {
                 var roadCenterLinesLayerURL = dojo.configData.RoadCenterLayerSettings.LayerUrl;
                 var _self = this;
                 var parcelInformation = dojo.configData.AveryLabelSettings[0].ParcelInformation;
                 var point = new esri.geometry.Point(Number(window.location.toString().split("$point=")[1].split(",")[0]), Number(window.location.toString().split("$point=")[1].split(",")[1]), this.map.spatialReference);
                 var query;
                 var taxParcelQueryUrl = dojo.configData.ParcelLayerSettings.LayerUrl;
                 var qTask = new esri.tasks.QueryTask(taxParcelQueryUrl);
                 if (window.location.toString().split("$displayInfo=")[1].split("$infoParcel").length > 1) {
                     query = new esri.tasks.Query();
                     query.where = parcelInformation.ParcelIdentification + " = '" + window.location.toString().split("$displayInfo=")[1].split("$infoParcel")[0] + "'";
                     query.returnGeometry = true;
                     query.outFields = ["*"];
                     qTask.execute(query, function (featureset) {
                         var overlapQuery = new esri.tasks.Query();
                         overlapQuery.where = parcelInformation.LowParcelIdentification + " = '" + featureset.features[0].attributes[parcelInformation.LowParcelIdentification] + "'";
                         overlapQuery.returnGeometry = true;
                         overlapQuery.outFields = ["*"];
                         qTask.execute(overlapQuery, function (featureSet) {
                             if (featureSet.features.length > 1) {
                                 overlapCount = 0;
                                 var contentDiv = _self._createContent(featureSet.features);
                                 _self._showOverlappingParcels(featureSet.features, contentDiv, point, featureSet.features[0].attributes[parcelInformation.ParcelIdentification]);
                             }
                             else {
                                 _self._showFeatureDetails(featureset.features[0], point);
                             }
                         });
                     });
                 }

                 else {
                     query = new esri.tasks.Query();
                     query.returnGeometry = true;
                     query.outFields = ["*"];
                     query.objectIds = [window.location.toString().split("$displayInfo=")[1].split("$infoRoad")[0]];
                     var roadTask = new esri.tasks.QueryTask(roadCenterLinesLayerURL);
                     roadTask.execute(query, function (featureset) {
                         topic.publish("showRoadDetails", featureset.features[0].attributes, point);
                     });
                 }
             },

             showRoadDetails: function (attributes, mapPoint, geometry) {
                 dojo.selectedMapPoint = mapPoint;
                 var attr = attributes.attributes;
                 var roadLayerSettings = dojo.configData.RoadCenterLayerSettings;
                 dojo.displayInfo = attr[this.map.getLayer("roadCenterLinesLayerID").objectIdField] + "$infoRoad";
                 topic.publish("createInfoWindowContent", attributes, mapPoint, roadLayerSettings, geometry);
             },

             _trimString: function (str, len) {
                 return (str.length > len) ? str.substring(0, len) + "..." : str;
             }

         });
     });
