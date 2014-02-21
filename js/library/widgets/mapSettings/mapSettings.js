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
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "widgets/infoWindow/infoWindow",
    "dojo/topic",
    "widgets/locator/locator",
    "esri/geometry",
    "dojo/_base/Color",
    "esri/symbol",
    "esri/renderers/Renderer",
    "dojo/domReady!"
    ],
     function (declare, domConstruct, domStyle, lang, on, dom, dojoQuery, domClass, domGeom, Query, QueryTask, _WidgetBase, esriMap, FeatureLayer, GraphicsLayer, geometryExtent, baseMapGallery, nls, HomeButton, ScrollBar, spatialReference, arcGISDynamicMapServiceLayer, infoWindow, topic, Locator, Geometry, Color, Symbol, Renderer) {
         //========================================================================================================================//

         return declare([_WidgetBase], {
             nls: nls,
             map: null,
             tempGraphicsLayerId: "esriGraphicsLayerMapSettings",
             roadCenterLinesLayerID: "roadCenterLinesLayerID",
             tempBufferLayer: "tempBufferLayer",
             bufferArray: [],
             infoWindowContainerScrollbar: null,
             graphicLayerClicked: false,  //Flag for storing state of Graphics Layer Clicked
             findTasksGraphicClicked: false, //flag for handling to draw polygon
             interactiveParcel: false,

             /**
             * initialize map object
             *
             * @class
             * @name widgets/mapSettings/mapSettings
             */
             postCreate: function () {
                 dojo.polygon = true;
                 dojo.mouseMoveHandle;
                 topic.subscribe("clearAll", lang.hitch(this, this.clearAll));
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
                     var mapDefaultExtent = new geometryExtent({ "xmin": parseFloat(extentPoints[0]), "ymin": parseFloat(extentPoints[1]), "xmax": parseFloat(extentPoints[2]), "ymax": parseFloat(extentPoints[3]), "spatialReference": { "wkid": this.map.spatialReference.wkid} });
                     this.map.setExtent(mapDefaultExtent);
                     domConstruct.place(home.domNode, dojoQuery(".esriSimpleSliderIncrementButton")[0], "after");
                     home.extent = mapDefaultExtent;
                     home.startup();
                     if (dojo.configData.BaseMapLayers.length > 1) {
                         var basMapObjectGallery = this._addbasMapObjectGallery();
                     }
                 }));
                 var _self = this;
                 this.map.on("extent-change", function () {
                     topic.publish("setMapTipPosition", dojo.selectedMapPoint, _self.map);
                 });
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
                     if (!evt.ctrlKey) {
                         topic.publish("showProgressIndicator");
                         dojo.isSpanClicked = false;
                         topic.publish("hideMapTip");
                         if (dojo.mouseMoveHandle) {
                             dojo.mouseMoveHandle.remove();
                         }
                         topic.publish("clearAll", evt);
                         this._queryForParcel(evt);
                         if (this.map.getLayer("roadCenterLinesLayerID")) {
                             this.map.getLayer("roadCenterLinesLayerID").clear();
                         }
                     }

                     if (evt.ctrlKey) {
                         if (dojo.polygon) {
                             topic.publish("hideMapTip");
                             dojo.mouseMoveHandle = this.map.on("mouse-move", lang.hitch(this, function (evt) {
                                 topic.publish("showMapTipForParcels", evt);
                             }));
                             this._queryForParcel(evt);
                         }
                     }
                 } else {
                     this._showFeatureDetails(evt.graphic, evt.mapPoint);
                     dojo.graphicLayerClicked = false;
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

             _showFeatureSet: function (fset, evt) {
                 this.map.infoWindow.hide();
                 var rendererColor = dojo.configData.OverlayLayerSettings[0].OverlayHighlightColor;
                 var centerPoint = evt.mapPoint;
                 var parcelLayerSettings = dojo.configData.ParcelLayerSettings;
                 if (fset.features.length > 1) {
                     var featureSet = fset;
                     this.overlapCount = 0;
                     var contentDiv = this._createContent(featureSet.features);
                     this._showOverlappingParcels(featureSet.features, contentDiv, evt, featureSet.features[0].attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.ParcelIdentification]);
                     var features = featureSet.features;
                     topic.publish("drawPolygon", features, false);
                     this.map.setExtent(this._centerMapPoint(evt.mapPoint, fset.features[0].geometry.getExtent().expand(9)));
                 } else {
                     var parcelArray = [];
                     var feature = fset.features[0];
                     var layer = this.map.getLayer("esriGraphicsLayerMapSettings");
                     var lineColor = new Color();
                     lineColor.setColor(rendererColor);
                     var fillColor = new Color();
                     fillColor.setColor(rendererColor);
                     fillColor.a = 0.25;
                     var symbol = new Symbol.SimpleFillSymbol(Symbol.SimpleFillSymbol.STYLE_SOLID, new Symbol.SimpleLineSymbol(Symbol.SimpleLineSymbol.STYLE_SOLID, lineColor, 3), fillColor);
                     feature.setSymbol(symbol);
                     parcelArray.push(feature.attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.ParcelIdentification]);
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
                         dojo.isSpanClicked = false;
                         topic.publish("hideMapTip");
                         dojo.mouseMoveHandle.remove();
                         topic.publish("clearAll", mapPoint);
                         this.interactiveParcel = false;
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

                 var divDisplayTable = domConstruct.create("div", { "class": "tblTransparent", "id": "tblParcels" }, this.divParcelList);
                 for (var i = 0; i < featureList.length; i++) {
                     this.overlapCount++;
                     var attributes = featureList[i].attributes;
                     var divDisplayRow = domConstruct.create("div", { "class": "esriCTtrBufferRow" }, divDisplayTable);
                     var divDisplayColumn = domConstruct.create("div", { "class": "tdParcel" }, divDisplayRow);
                     var divParcelId = domConstruct.create("div", { "id": i, "innerHTML": attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.ParcelIdentification], "textDecoration": "underline" }, divDisplayColumn);
                     this.own(on(divParcelId, "click", function () {
                         _this._showParcelDetail(featureList[this.id].attributes);
                     }));
                     var divDisplayColumn1 = domConstruct.create("div", { "class": "tdSiteAddress", "innerHTML": "&nbsp&nbsp" + attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.SiteAddress] }, divDisplayRow);
                 }

                 var divDisplayRow = domConstruct.create("div", {}, adjacentLabel);
                 var divDisplayColumn1 = domConstruct.create("div", {}, divDisplayRow);
                 var divInfoImg = domConstruct.create("img", { "id": "imgAdjacentParcels1", "class": "imgAdjacentParcels1" }, divDisplayColumn1);
                 this.own(on(divInfoImg, "click", lang.hitch(this, function () {
                     this.polygon = true;
                     this.interactiveParcel = true;
                     dojo.selectedMapPoint = null;
                     displayInfo = null;
                     if (this.isSpanClicked == true) {
                         return;
                     }
                 })));
                 divInfoImg.src = dojoConfig.baseURL + "/js/library/themes/images/add.png";

                 var divDisplayColumn2 = domConstruct.create("div", { "class": "divDisplaySpan" }, divDisplayRow);
                 var divSpan = domConstruct.create("span", { "id": "spanAdjacentParcels1", "class": "esrictDivSpan1", "display": "block", "innerHTML": nls.spanAdjacentParcels }, divDisplayColumn2);
                 this.own(on(divSpan, "click", lang.hitch(this, function () {
                     this.polygon = true;
                     this.interactiveParcel = true;
                     dojo.selectedMapPoint = null;
                     displayInfo = null;
                     this.map.infoWindow.hide();
                     if (dojo.isSpanClicked == true) {
                         return;
                     }

                     var _self = this;
                     dojo.mouseMoveHandle = this.map.on("mouse-move", lang.hitch(function (evt) {
                         topic.publish("showMapTipForParcels", evt);
                     }));
                     dojo.isSpanClicked = true;

                 })));
                 return this.detailsTab;
             },

             _showParcelDetail: function (attr) {
                 debugger;
                 if (dojoQuery(".esrictDivSpan1")[0]) {
                     var adjacentParcel = dojoQuery(".esrictDivSpan1")[0];
                     domStyle.set(adjacentParcel, "display", "none");
                     var imgAdjacentParcels = dojoQuery(".imgAdjacentParcels1")[0];
                     domStyle.set(imgAdjacentParcels, "display", "none");
                 }
                 //                 var adjacentLabel = dojoQuery(".esriCTAdjacentParcel")[0];
                 //                 domStyle.set(adjacentLabel, "display", "none");
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
                 var divParcelDetails = domConstruct.create("div", { "id": "tblParcels", "class": "esriCTDisplayRow" }, null);
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
                 debugger;
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
                 dojo.selectedMapPoint = evt.mapPoint;
                 this.map.getLayer("esriGraphicsLayerMapSettings").remove(feature);
                 var extentChanged = this.map.setExtent(this._getBrowserMapExtent(dojo.selectedMapPoint));
                 extentChanged.then(lang.hitch(this, function () {
                     var screenPoint = this.map.toScreen(dojo.selectedMapPoint);
                     screenPoint.y = this.map.height - screenPoint.y;
                     this.map.infoWindow.show(contentDiv, screenPoint);
                 }));
                 var infoTitle = this.overlapCount + nls.parcelsCount;
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
                 }
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
             }
         });
     });
