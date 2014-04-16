/*global define,Modernizr,dojoConfig,dijit,dojo,alert,esri ,event,_self*/
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true */
/*
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
        "dojo/dom-attr",
        "dojo/_base/lang",
        "dojo/on",
        "dojo/dom-geometry",
        "dojo/dom",
        "dojo/dom-class",
        "dojo/string",
        "dojo/window",
        "dojo/topic",
        "esri/tasks/query",
        "esri/tasks/QueryTask",
        "dojo/query",
        "dojo/_base/array",
        "dojo/Deferred",
        "dojo/DeferredList",
        "dojo/promise/all",
        "dojo/_base/Color",
        "esri/symbol",
        "esri/geometry",
        "esri/tasks/FeatureSet",
        "esri/SpatialReference",
        "esri/graphic",
        "dojo/i18n!nls/localizedStrings",
        "dijit/form/Button",
        "dijit/form/ComboBox",
        "dijit/form/CheckBox",
        "esri/tasks/BufferParameters",
        "esri/tasks/GeometryService",
         "esri/tasks/Geoprocessor",
        "dojo/data/ItemFileReadStore",
        "esri/InfoWindowBase",
        "dojo/text!./templates/infoWindow.html",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        "dijit/_WidgetsInTemplateMixin"

    ],
     function (declare, domConstruct, domStyle, domAttr, lang, on, domGeom, dom, domClass, string, window, topic, Query, QueryTask, query, array, Deferred, DeferredList, all, Color, Symbol, Geometry, TaskFeatureSet, SpatialReference, Graphic, nls, Button, ComboBox, CheckBox, BufferParameters, GeometryService, Geoprocessor, ItemFileReadStore, InfoWindowBase, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin) {

         //========================================================================================================================//
         return declare([InfoWindowBase, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
             nls: nls,
             attachInfoWindowEvents: function () {
                 this.own(on(this.esriCTShowDetailsView, "click", lang.hitch(this, function () {
                     if (this.esriCTShowDetailsView.getAttribute("checked") === "info") {
                         this.esriCTShowDetailsView.setAttribute("checked", "notify");
                         domStyle.set(this.divInfoDetails, "display", "none");
                         domStyle.set(this.divInfoNotify, "display", "block");
                         this.esriCTShowDetailsView.src = dojoConfig.baseURL + "/js/library/themes/images/details.png";
                         this.esriCTShowDetailsView.title = nls.details;
                         dijit.byId('selectAvery').store.fetch({ query: { name: "5160" }, onComplete: function (items) {
                             dijit.byId('selectAvery').setDisplayedValue(items[0].name[0]);
                             dijit.byId('selectAvery').item = items[0];
                         }
                         });

                         dijit.byId('chkOwners').setChecked(false);
                         dijit.byId('chkOccupants').setChecked(false);
                         dijit.byId('chkPdf').setChecked(false);
                         dijit.byId('chkCsv').setChecked(false);
                         domStyle.set(this.spanFileUploadMessage, "display", "none");
                         this.textoccupant.value = dojo.configData.AveryLabelSettings[0].OccupantLabel;
                     } else {
                         this.esriCTShowDetailsView.setAttribute("checked", "info");
                         this.esriCTShowDetailsView.src = dojoConfig.baseURL + "/js/library/themes/images/navigation.png";
                         this.esriCTShowDetailsView.title = "Notify";
                         domStyle.set(this.divInfoDetails, "display", "block");
                         domStyle.set(this.divInfoNotify, "display", "none");
                     }
                 })));
             },

             _getAveryTemplates: function () {
                 var averyTemplates = dojo.configData.AveryLabelSettings[0].AveryLabelTemplates,
                  averyTypes, itemstore, i;
                 averyTypes = { identifier: 'id', items: [] };
                 for (i = 0; i < averyTemplates.length; i++) {
                     averyTypes.items[i] = { id: averyTemplates[i].value, name: averyTemplates[i].name };
                 }
                 itemstore = new ItemFileReadStore({ data: averyTypes });
                 new ComboBox({
                     autocomplete: false,
                     hasdownarrow: true,
                     id: 'selectAvery',
                     store: itemstore,
                     searchAttr: "name",
                     style: "width: 130px;color: #FFF !important",
                     onChange: lang.hitch(this, function () {
                         this._validateAveryFormat();
                     })
                 }, this.cmbAveryLabels);
                 dijit.byId("selectAvery").textbox.readOnly = true;
             },

             //Validate avery format
             _validateAveryFormat: function () {
                 if (!dijit.byId('selectAvery').item) {
                     dijit.byId('selectAvery').setValue('');
                 }
             },

             createBuffer: function () {
                 var _this = this, geometryService, maxBufferDistance, params, polyLine, j;
                 topic.publish("hideMapTip");
                 this.map.getLayer("tempBufferLayer").clear();
                 geometryService = new GeometryService(dojo.configData.GeometryService);
                 maxBufferDistance = parseFloat(dojo.configData.MaxBufferDistance);
                 params = new BufferParameters();
                 this.dist = this.txtBuffer;
                 this.pdfFormat = dijit.byId('chkPdf').checked;
                 this.csvFormat = dijit.byId('chkCsv').checked;
                 this.occupants = dijit.byId('chkOccupants').checked;
                 this.owners = dijit.byId('chkOwners').checked;
                 if (this.dist.value !== "") {
                     if (!(this.isNumeric)) {
                         this.dist.value = "";
                         this.dist.focus();
                         topic.publish("showErrorMessage", 'spanFileUploadMessage', nls.errorMessages.enterNumeric, '#FF0000');
                     } else if (!(this._isBufferValid(this.dist.value))) {
                         topic.publish("showErrorMessage", 'spanFileUploadMessage', 'Valid buffer range is between 1 to ' + maxBufferDistance + ' feet.', '#FF0000');
                         return;
                     }

                     if ((this.owners === "checked" || this.owners) || (this.occupants === "checked" || this.occupants)) {
                         if ((this.pdfFormat === "checked" || this.pdfFormat) || (this.csvFormat === "checked" || this.csvFormat)) {
                             if (dijit.byId('selectAvery').item !== null) {
                                 this.averyFormat = dijit.byId('selectAvery').item.id[0];
                                 if (this.map.getLayer("roadCenterLinesLayerID").getSelectedFeatures().length > 0) {
                                     if (this.map.getLayer("roadCenterLinesLayerID").graphics) {
                                         polyLine = new Geometry.Polyline(this.map.spatialReference);
                                         for (j = 0; j < this.map.getLayer("roadCenterLinesLayerID").graphics.length; j++) {
                                             if (this.map.getLayer("roadCenterLinesLayerID").graphics[j].visible) {
                                                 polyLine.addPath(this.map.getLayer("roadCenterLinesLayerID").graphics[j].geometry.paths[0]);
                                             }
                                         }
                                         params.geometries = [polyLine];
                                     } else {
                                         alert(nls.errorMessages.createBuffer);
                                     }
                                     params.distances = [this.dist.value];
                                     params.unit = GeometryService.UNIT_FOOT;
                                     geometryService.buffer(params, function (geometries) {
                                         _this._showBufferRoad(geometries);
                                     });
                                     dojo.selectedMapPoint = null;
                                     dojo.displayInfo = null;
                                     this.map.infoWindow.hide();
                                 } else {
                                     this._bufferParameters(this.dist);
                                 }
                             } else {
                                 topic.publish("showErrorMessage", 'spanFileUploadMessage', nls.errorMessages.inValidAveryFormat, '#FF0000');
                                 topic.publish("hideProgressIndicator");
                             }
                         } else {
                             topic.publish("showErrorMessage", 'spanFileUploadMessage', nls.errorMessages.fileSelect, '#FF0000');
                             topic.publish("hideProgressIndicator");
                         }
                     } else {
                         topic.publish("showErrorMessage", 'spanFileUploadMessage', nls.errorMessages.selectProperty, '#FF0000');
                         topic.publish("hideProgressIndicator");
                     }
                 } else {
                     topic.publish("showErrorMessage", 'spanFileUploadMessage', nls.errorMessages.enterBufferDist, '#FF0000');
                     topic.publish("hideProgressIndicator");
                 }
             },

             _showBufferRoad: function (geometries) {
                 var _this = this, taxParcelQueryUrl, qTask, symbol;
                 topic.publish("hideMapTip");
                 if (dojo.mouseMoveHandle) {
                     dojo.mouseMoveHandle.remove();
                 }
                 topic.publish("showProgressIndicator");
                 taxParcelQueryUrl = dojo.configData.ParcelLayerSettings.LayerUrl;
                 qTask = new QueryTask(taxParcelQueryUrl);
                 symbol = new Symbol.SimpleFillSymbol(Symbol.SimpleFillSymbol.STYLE_SOLID,
                 new Symbol.SimpleLineSymbol(Symbol.SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0, 0.65]), 2), new Color([255, 0, 0, 0.35]));
                 array.forEach(geometries, lang.hitch(this, function (geometry) {
                     _this._addGraphic(_this.map.getLayer("tempBufferLayer"), symbol, geometry);
                 }));

                 query = new Query();
                 query.geometry = geometries[0];
                 query.outFields = dojo.configData.QueryOutFields.split(",");
                 query.maxAllowableOffset = dojo.configData.MaxAllowableOffset;
                 query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_INTERSECTS;
                 query.returnGeometry = true;
                 qTask.execute(query, lang.hitch(this, function (featureSet) {
                     this._queryCallback(featureSet, true);
                 }));
             },

             //Check if buffer range is valid
             _isBufferValid: function (dist) {
                 var maxBufferDistance = parseFloat(dojo.configData.MaxBufferDistance), isValid = true, length;
                 length = parseFloat(dist);
                 if ((length < 1) || (length > maxBufferDistance)) {
                     isValid = false;
                 }
                 return isValid;
             },

             //Check for valid numeric strings
             isNumeric: function (dist) {
                 if (!/\D/.test(dist)) {
                     return true;
                 }
                 else if (/^\d+\.\d+$/.test(dist)) {
                     return true;
                 }
                 else {
                     return false;
                 }
             },

             //Validate the numeric text box control
             onlyNumbers: function (evt) {
                 var charCode;
                 charCode = (evt.which) ? evt.which : event.keyCode;
                 if (charCode > 31 && (charCode < 48 || charCode > 57)) {
                     return false;
                 }
                 return true;
             },

             _bufferParameters: function (dist) {
                 var geometryService, params, polygon, ringsLength, i, j;
                 geometryService = new GeometryService(dojo.configData.GeometryService);
                 params = new BufferParameters();
                 if (this.map.getLayer("esriGraphicsLayerMapSettings").graphics) {
                     polygon = new Geometry.Polygon(this.map.spatialReference);
                     for (i = 0; i < this.map.getLayer("esriGraphicsLayerMapSettings").graphics.length; i++) {
                         ringsLength = this.map.getLayer("esriGraphicsLayerMapSettings").graphics[i].geometry.rings.length;
                         for (j = 0; j < ringsLength; j++) {
                             polygon.addRing(this.map.getLayer("esriGraphicsLayerMapSettings").graphics[i].geometry.rings[j]);
                         }
                     }
                     params.geometries = [polygon];
                 } else {
                     alert(nls.errorMessages.createBuffer);
                 }
                 params.distances = [dist.value];
                 params.unit = GeometryService.UNIT_FOOT;
                 params.outSpatialReference = this.map.spatialReference;
                 geometryService.buffer(params, lang.hitch(this, this._showBuffer),
                     function (err) {
                         topic.publish("hideProgressIndicator");
                         alert("Query " + err);
                     });
                 dojo.selectedMapPoint = null;
                 this.map.infoWindow.hide();
                 topic.publish("showProgressIndicator");
             },

             _showBuffer: function (geometries) {
                 var _this = this, maxAllowableOffset, taxParcelQueryUrl, qTask, symbol;
                 dojo.displayInfo = null;
                 maxAllowableOffset = dojo.configData.MaxAllowableOffset;
                 dojo.selectedMapPoint = null;
                 topic.publish("showProgressIndicator");
                 taxParcelQueryUrl = dojo.configData.ParcelLayerSettings.LayerUrl;
                 qTask = new QueryTask(taxParcelQueryUrl);
                 query = new Query();
                 query.outFields = dojo.configData.QueryOutFields.split(",");
                 symbol = new Symbol.SimpleFillSymbol(Symbol.SimpleFillSymbol.STYLE_SOLID,
                 new Symbol.SimpleLineSymbol(Symbol.SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0, 0.65]), 2), new Color([255, 0, 0, 0.35]));
                 array.forEach(geometries, lang.hitch(this, function (geometry) {
                     _this._addGraphic(_this.map.getLayer("tempBufferLayer"), symbol, geometry);
                 }));
                 query.geometry = geometries[0];
                 query.maxAllowableOffset = maxAllowableOffset;
                 query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_INTERSECTS;
                 query.returnGeometry = true;

                 //executing query task for selecting intersecting features
                 qTask.execute(query, lang.hitch(this, function (featureSet) {
                     this._queryCallback(featureSet, false);
                 }));

             },

             _addGraphic: function (layer, symbol, point, attr) {
                 var graphic = new Graphic(point, symbol, attr, null), featureSet, features = [];
                 features.push(graphic);
                 featureSet = new esri.tasks.FeatureSet();
                 featureSet.features = features;
                 layer.add(featureSet.features[0]);
             },

             _queryCallback: function (featureSet, road) {
                 var features = featureSet.features,
                 poly, feature, strAveryParam, strCsvParam;
                 if (this.map.getLayer("esriGraphicsLayerMapSettings")) {
                     this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                 }
                 if (featureSet.features.length === 0) {
                     if (!road) {
                         alert(nls.errorMessages.noParcel);
                     } else {
                         alert(nls.noAdjacentParcel + this.dist.value + nls.feet);
                     }
                     topic.publish("hideProgressIndicator");
                 } else {
                     try {
                         poly = new Geometry.Polygon(this.map.spatialReference);
                         for (feature in features) {
                             poly.addRing(features[feature].geometry.rings[0]);
                         }
                         this.map.setExtent(poly.getExtent().expand(3));
                         topic.publish("drawPolygon", features, false);
                         dojo.interactiveParcel = false;
                         strAveryParam = "";
                         strCsvParam = "";
                         if (this.pdfFormat === "checked" || this.pdfFormat) {
                             strAveryParam = this._createAveryParam(features);
                         }
                         if (this.csvFormat === "checked" || this.csvFormat) {
                             strCsvParam = this._createCsvParam(features);
                         }
                         this._executeGPTask(this.pdfFormat, this.csvFormat, strAveryParam, strCsvParam);
                     } catch (err) {
                         alert(err.message);
                     }
                 }
             },

             _createCsvParam: function (features) {
                 var csvFieldsCollection = dojo.configData.AveryLabelSettings[0].CsvFieldsCollection,
                  occupantFields = dojo.configData.AveryLabelSettings[0].OccupantFields.split(","), strCsvParam = '',
                  featureCount, fieldCount, i, csvFields, subFields, count;
                 for (featureCount = 0; featureCount < features.length; featureCount++) {//looping through populated features for owners
                     if (this.owners === "checked" || this.owners) {
                         for (fieldCount = 0; fieldCount < csvFieldsCollection.length; fieldCount++) { //looping through configurable avery fields
                             csvFields = csvFieldsCollection[fieldCount];
                             if (csvFields.split(',').length > 1) {
                                 subFields = csvFields.split(',');
                                 strCsvParam += "\"";
                                 for (i = 0; i < subFields.length; i++) {
                                     if (features[featureCount].attributes[subFields[i]]) {
                                         strCsvParam += features[featureCount].attributes[subFields[i]].replace(',', '') + " ";
                                     } else {
                                         strCsvParam += features[featureCount].attributes[subFields[i]] + " ";
                                     }
                                 }
                                 strCsvParam = strCsvParam.slice(0, -1) + "\",";
                             } else {
                                 if (features[featureCount].attributes[csvFields]) {
                                     strCsvParam += features[featureCount].attributes[csvFields].replace(',', '') + ",";
                                 }
                                 else {
                                     strCsvParam += features[featureCount].attributes[csvFields] + ",";
                                 }
                             }
                         }
                         strCsvParam += "$";
                     }
                 }
                 for (featureCount = 0; featureCount < features.length; featureCount++) {
                     if (this.occupants === "checked" || this.occupants) {
                         if (features[featureCount].attributes[occupantFields[1]]) {
                             for (fieldCount = 0; fieldCount < occupantFields.length; fieldCount++) {
                                 csvFields = occupantFields[fieldCount];
                                 if (fieldCount === 1) {
                                     strCsvParam += lang.trim(this.textoccupant.value) + ",";
                                 }
                                 if (csvFields.split(',').length > 1) {
                                     subFields = csvFields.split(',');
                                     strCsvParam += "\"";
                                     for (i = 0; i < subFields.length; i++) {
                                         strCsvParam += features[featureCount].attributes[subFields[i]].replace(',', '') + " ";
                                     }
                                     strCsvParam = strCsvParam.slice(0, -1) + "\",";
                                 } else {
                                     if (features[featureCount].attributes[csvFields]) {
                                         strCsvParam += features[featureCount].attributes[csvFields].replace(',', '') + ",";
                                     }
                                     else {
                                         strCsvParam += features[featureCount].attributes[csvFields] + ",";
                                     }
                                 }
                             }
                             //Additional loop for appending additional commas
                             for (count = 0; count < (csvFieldsCollection.length - occupantFields.length); count++) {
                                 strCsvParam += ",";
                             }
                             strCsvParam = strCsvParam.slice(0, -1);
                             strCsvParam += "$";
                         }
                     }
                 }
                 strCsvParam = strCsvParam.slice(0, -1);
                 return strCsvParam;
             },

             _createAveryParam: function (features) {
                 var averyFieldsCollection = dojo.configData.AveryLabelSettings[0].AveryFieldsCollection, featureCount, fieldCount, occupantFields, strAveryParam
                 , averyFields, subFields,i;
                 occupantFields = dojo.configData.AveryLabelSettings[0].OccupantFields.split(",");
                 try {
                     strAveryParam = '';
                     for (featureCount = 0; featureCount < features.length; featureCount++) {
                         averyFields;
                         if (this.owners === "checked" || this.owners) {
                             for (fieldCount = 0; fieldCount < averyFieldsCollection.length; fieldCount++) {
                                 averyFields = averyFieldsCollection[fieldCount];
                                 if (averyFields.split(',').length > 1) {
                                     subFields = averyFields.split(',');
                                     for (i = 0; i < subFields.length; i++) {
                                         if (features[featureCount].attributes[subFields[i]]) {
                                             strAveryParam += features[featureCount].attributes[subFields[i]].replace(',', '') + " ";
                                         }
                                     }
                                     strAveryParam = strAveryParam.slice(0, -1) + "~";
                                 }
                                 else {
                                     if (features[featureCount].attributes[averyFields]) {
                                         strAveryParam += features[featureCount].attributes[averyFields].replace(',', '') + "~";
                                     }
                                 }
                             }
                             strAveryParam += "$";
                         }
                     }
                     for (featureCount = 0; featureCount < features.length; featureCount++) {
                         if (this.occupants === "checked" || this.occupants) {
                             if (features[featureCount].attributes[occupantFields[1]]) {
                                 for (fieldCount = 0; fieldCount < occupantFields.length; fieldCount++) {
                                     averyFields = occupantFields[fieldCount];
                                     if (fieldCount === 1) {
                                         strAveryParam += lang.trim(this.textoccupant.value) + "~";
                                     }
                                     if (averyFields.split(',').length > 1) {
                                         subFields = averyFields.split(',');
                                         for (i = 0; i < subFields.length; i++) {
                                             if (features[featureCount].attributes[subFields[i]]) {
                                                 strAveryParam += features[featureCount].attributes[subFields[i]].replace(',', '') + " ";
                                             }
                                         }
                                         strAveryParam = strAveryParam.slice(0, -1) + "~";
                                     }
                                     else {
                                         if (features[featureCount].attributes[averyFields]) {
                                             strAveryParam += features[featureCount].attributes[averyFields].replace(',', '') + "~";
                                         }
                                     }
                                 }
                                 strAveryParam += "$";
                             }
                         }
                     }
                     return strAveryParam;
                 }
                 catch (err) {
                     alert(err.Message);
                 }
             },

             _executeGPTask: function (pdf, csv, strAveryParam, strCsvParam) {
                 var gpTaskAvery, gpTaskCsv,params, csvParams;
                 gpTaskAvery = new Geoprocessor(dojo.configData.AveryLabelSettings[0].PDFServiceTask);
                 gpTaskCsv = new Geoprocessor(dojo.configData.AveryLabelSettings[0].CSVServiceTask);
                 topic.publish("showProgressIndicator");
                 if (pdf) {
                     _self = this;
                     params = { "Label_Format": this.averyFormat, "Address_Items": strAveryParam };
                     gpTaskAvery.submitJob(params, _self._completeGPJob, _self._statusCallback, _self._errCallback);
                 }
                 if (csv) {
                     _self = this;
                     csvParams = { "Address_Items": strCsvParam };
                     gpTaskCsv.submitJob(csvParams, _self._completeCsvGPJob, _self._statusCallback);
                 }
                 topic.publish("hideProgressIndicator");
             },

             //PDF generation callback completion event handler
             _completeGPJob: function (jobInfo) {
                 var gpTaskAvery = new Geoprocessor(dojo.configData.AveryLabelSettings[0].PDFServiceTask);
                 if (jobInfo.jobStatus !== "esriJobFailed") {
                     gpTaskAvery.getResultData(jobInfo.jobId, "Output_File", _self._downloadFile);
                     if (this.window.location.toString().split("$displayInfo=").length > 1) {
                         if (!dojo.shareinfo) {
                             dojo.shareinfo = true;
                             topic.publish("shareInfoWindow");
                         }
                     }
                     topic.publish("hideProgressIndicator");
                 }
             },

             _completeCsvGPJob: function (jobInfo) {
                 var gpTaskAvery = new Geoprocessor(dojo.configData.AveryLabelSettings[0].CSVServiceTask);
                 if (jobInfo.jobStatus !== "esriJobFailed") {
                     gpTaskAvery.getResultData(jobInfo.jobId, "Output_File", _self._downloadCSVFile);
                     if (this.window.location.toString().split("$displayInfo=").length > 1) {
                         if (!dojo.shareinfo) {
                             dojo.shareinfo = true;
                             topic.publish("shareInfoWindow");
                         }
                     }

                     topic.publish("hideProgressIndicator");
                 }
             },

             //Pdf generation status callback event handler
             _statusCallback: function (jobInfo) {
                 var status = jobInfo.jobStatus;
                 if (status === "esriJobFailed") {
                     alert(nls.errorMessages.noDataAvailable);
                 }
             },

             //function to call when the error exists
             _errCallback: function (err) {
                 alert(err.message);
                 if (this.window.location.toString().split("$displayInfo=").length > 1) {
                     if (!dojo.shareinfo) {
                         dojo.shareinfo = true;
                         topic.publish("shareInfoWindow");
                     }
                 }
                 topic.publish("hideProgressIndicator");
             },

             //Function to open generated Pdf in a new window
             _downloadFile: function (outputFile) {
                 this.window.open(outputFile.value.url);
             },

             _downloadCSVFile: function (outputFile) {
                 if (navigator.appVersion.indexOf("Mac") !== -1) {
                     window.open(outputFile.value.url);
                 } else {
                     this.window.location = outputFile.value.url;
                 }
             }
         });
     });
