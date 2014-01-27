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
    "esri/SpatialReference",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "widgets/infoWindow/infoWindow",
    "dojo/topic",
    "widgets/locator/locator",
    "esri/geometry",
    "dojo/_base/Color",
    "esri/symbol",
    "dojo/domReady!"
    ],
     function (declare, domConstruct, domStyle, lang, on, dom, dojoquery, domClass, domGeom, Query, QueryTask, _WidgetBase, esriMap, FeatureLayer, GraphicsLayer, geometryExtent, baseMapGallery, nls, HomeButton, spatialReference, arcGISDynamicMapServiceLayer, infoWindow, topic, Locator, Geometry, Color, Symbol) {
         //========================================================================================================================//

         return declare([_WidgetBase], {
             nls: nls,
             map: null,
             tempGraphicsLayerId: "esriGraphicsLayerMapSettings",
             roadCenterLinesLayerID: "roadCenterLinesLayerID",
             bufferArray: [],
             /**
             * initialize map object
             *
             * @class
             * @name widgets/mapSettings/mapSettings
             */
             postCreate: function () {
                 /**
                 * set map extent to default extent specified in configuration file
                 * @param {string} dojo.configData.DefaultExtent Default extent of map specified in configuration file
                 */
                 var extentPoints = dojo.configData && dojo.configData.DefaultExtent && dojo.configData.DefaultExtent.split(","),
                 graphicsLayer = new GraphicsLayer();
                 graphicsLayer.id = this.tempGraphicsLayerId;
                 /**
                 * load map
                 * @param {string} dojo.configData.BaseMapLayers Basemap settings specified in configuration file
                 */
                 var layer = new esri.layers.ArcGISTiledMapServiceLayer(dojo.configData.BaseMapLayers[0].MapURL, { id: dojo.configData.BaseMapLayers[0].Key, visible: true });

                 var infoWindow1 = new infoWindow({ infoWindowWidth: dojo.configData.InfoPopupWidth, infoWindowHeight: dojo.configData.InfoPopupHeight });
                 this.map = new esriMap("esriCTParentDivContainer", {
                     infoWindow: infoWindow1,
                     basemap: layer
                 });
                 this.map.addLayer(layer);

                 this.map.addLayer(graphicsLayer);

                 this.map.on("click", lang.hitch(this, function (evt) {
                     this._executeQueryTask(evt);
                 }));

                 var roadLineColor = dojo.configData.RoadCenterLayerSettings.RoadHighlightColor;
                 var roadLineSymbol = new esri.symbol.SimpleLineSymbol();
                 roadLineSymbol.setWidth(5);
                 var roadLinefillColor = new dojo.Color(roadLineColor);
                 roadLineSymbol.setColor(roadLinefillColor);
                 var roadLineRenderer = new esri.renderer.SimpleRenderer(roadLineSymbol);
                 var roadCenterLinesLayer = new FeatureLayer(dojo.configData.RoadCenterLayerSettings.LayerUrl, {
                     mode: FeatureLayer.MODE_SELECTION,
                     outFields: ["*"]
                 });
                 roadCenterLinesLayer.id = this.roadCenterLinesLayerID;
                 roadCenterLinesLayer.setRenderer(roadLineRenderer);
                 this.map.addLayer(roadCenterLinesLayer);

                 //Adding query graphics layer on map
                 var gLayer = GraphicsLayer({ id: "queryGraphicLayer" });
                 this.map.addLayer(gLayer);

                 /**
                 * load esri 'Home Button' widget
                 */
                 var home = this._addHomeButton(this.map);

                 /** set position of home button widget after map is successfuly loaded
                 * @param {array} dojo.configData.OperationalLayers List of operational Layers specified in configuration file
                 */
                 this.map.on("load", lang.hitch(this, function () {
                     var mapDefaultExtent = new geometryExtent({ "xmin": parseFloat(extentPoints[0]), "ymin": parseFloat(extentPoints[1]), "xmax": parseFloat(extentPoints[2]), "ymax": parseFloat(extentPoints[3]), "spatialReference": { "wkid": this.map.spatialReference.wkid} });
                     this.map.setExtent(mapDefaultExtent);
                     domConstruct.place(home.domNode, dojoquery(".esriSimpleSliderIncrementButton")[0], "after");
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
                 this._queryForParcel(evt);
                 if (this.map.getLayer("roadCenterLinesLayerID")) {
                     this.map.getLayer("roadCenterLinesLayerID").clear();
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
                         _this.map.infoWindow.hide(evt.mapPoint);
                         alert(nls.errorMessages.noParcel);
                     }
                 }, function (err) {
                     alert(nls.errorMessages.unableToPerform);
                     _this._hideLoadingMessage();
                 });

             },

             _showFeatureSet: function (fset, evt) {
                 this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                 var rendererColor = dojo.configData.OverlayLayerSettings[0].OverlayHighlightColor;
                 var centerPoint = evt.mapPoint;
                 var parcelLayerSettings = dojo.configData.ParcelLayerSettings;
                 if (fset.features.length > 1) {
                     var screenPoint = evt.screenPoint;
                     var featureSet = fset;
                     var overlapCount = 0;
                     var contentDiv = this._createContent(featureSet.features);
                     this._showOverlappingParcels(featureSet.features, contentDiv, evt, featureSet.features[0].attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.ParcelIdentification]);
                     var features = featureSet.features;
                     this._drawPolygon(features, false);
                     var geometryForBuffer = features[0].geometry;
                     this.map.setExtent(this._centerMapPoint(evt.mapPoint, fset.features[0].geometry.getExtent().expand(9)));
                 } else {
                     var parcelArray = [];
                     var displayInfo = null;
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
                     displayInfo = feature.attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.ParcelIdentification] + "$infoParcel";
                     topic.publish("createInfoWindowContent", feature, centerPoint, parcelLayerSettings);
                     this.map.setExtent(this._centerMapPoint(evt.mapPoint, fset.features[0].geometry.getExtent().expand(9)));
                     layer.add(feature);
                 }
             },

             _createContent: function (featureList) {
                 var overlapCount = 0;
                 var infoPopupHeight = dojo.configData.InfoPopupHeight;
                 var infoPopupWidth = dojo.configData.InfoPopupWidth;
                 var detailsTab = domConstruct.create("div", { "width": "100%", "height": "100%" }, null);
                 var scrollbar_container = domConstruct.create("div", { "id": "scrollbar_container2", "className": "scrollbar_container" }, detailsTab);
                 scrollbar_container.style.height = (infoPopupHeight - 80) + "px";
                 var divParcelList = domConstruct.create("div", { "id": "divParcelList", "className": "scrollbar_content", "display": "block" }, scrollbar_container);
                 divParcelList.style.height = (infoPopupHeight - 80) + "px";
                 var divDescription = domConstruct.create("div", { "id": "divDescription", "className": "scrollbar_content", "display": "none" }, scrollbar_container);
                 var divFooter = domConstruct.create("div", { "id": "divFooter", "className": "scrollbar_footer", "display": "none" }, scrollbar_container);
                 var btnDiv = domConstruct.create("div", { "id": "btnDiv", "className": "customButton", "cursor": "pointer" }, divFooter);
                 var btnInnerDiv = domConstruct.create("div", { "className": "customButtonInner", "cursor": "pointer" }, btnDiv);
                 var btnTbody = domConstruct.create("div", { "width": "100%", "height": "100%" }, btnInnerDiv); //didnt create table
                 var btnColumns = domConstruct.create("div", {}, btnTbody);

                 var divDisplayTable = domConstruct.create("div", { "class": "tblTransparent", "id": "tblParcels" }, divParcelList); // previous var table
                 for (var i = 0; i < featureList.length; i++) {
                     overlapCount++;
                     var attributes = featureList[i].attributes;
                     var divDisplayRow = domConstruct.create("div", {}, divDisplayTable);
                     var divDisplayColumn = domConstruct.create("div", { "class": "tdParcel" }, divDisplayRow); //td1
                     var divParcelId = domConstruct.create("div", { "id": "i", "innerHTML": attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.ParcelIdentification], "textDecoration": "underline" }, divDisplayColumn);
                     divParcelId.onclick = function () {
                         this._showParcelDetail(featureList[this.id].attributes);
                     };
                     var divDisplayColumn1 = domConstruct.create("div", { "class": "tdSiteAddress", "innerHTML": "&nbsp&nbsp" + attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.SiteAddress] }, divDisplayRow); //td2
                 }
                 var div = domConstruct.create("div", {}, detailsTab);
                 var divDisplayTable1 = domConstruct.create("div", {}, div); // second var table
                 var divDisplayRow1 = domConstruct.create("div", {}, divDisplayTable1);
                 var divDisplayColumn2 = domConstruct.create("div", { "class": "tdParcel", "cursor": "pointer", "height": "20" }, divDisplayRow1);
                 var img = domConstruct.create("img", { "id": "imgAdjacentParcels", "class": "imgAdjacentParcels" }, divDisplayColumn2);
                 var divColumn = domConstruct.create("div", {}, divDisplayRow1);
                 var span = domConstruct.create("span", { "id": "spanAdjacentParcels", "class": "spanAdjacentParcels", "innerHTML": "Add adjacent parcel" }, divColumn);
                 return detailsTab;
             },

             //Hide tooltip dialog
             _hideMapTip: function () {
                 if (dijit.byId('toolTipDialog')) {
                     dijit.byId('toolTipDialog').destroy();
                 }
             },

             _showOverlappingParcels: function (feature, contentDiv, evt, parcelFeature) {
                 var selectedPoint = evt.mapPoint;
                 this.map.getLayer("queryGraphicLayer").remove(feature);
                 var screenPoint = this.map.toScreen(selectedPoint);
                 screenPoint.y = this.map.height - screenPoint.y;
                 this.map.infoWindow.setLocation(screenPoint);
                 this.map.infoWindow.show(contentDiv, screenPoint);
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
             }
         });
     });
