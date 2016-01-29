/*global define,Modernizr,dojoConfig,dijit,dojo,alert,esri ,event*/
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true,indent:4 */
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
    "dojo/i18n!application/js/library/nls/localizedStrings",
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
], function (declare, domConstruct, domStyle, domAttr, lang, on, domGeom, dom, domClass, string, window, topic, Query, QueryTask, query, array, Deferred, DeferredList, all, Color, Symbol, Geometry, TaskFeatureSet, SpatialReference, Graphic, sharedNls, Button, ComboBox, CheckBox, BufferParameters, GeometryService, Geoprocessor, ItemFileReadStore, InfoWindowBase, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin) {

    //========================================================================================================================//
    return declare([InfoWindowBase, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        /**
        * create infowindow view  widget
        *
        * @class
        * @name widgets/infoWindow/infoWindowView
        */
        sharedNls: sharedNls,
        featureSet: null,
        attachInfoWindowEvents: function () {
            this.own(on(this.esriCTShowDetailsView, "click", lang.hitch(this, function () {
                if (!dojo.polygonGeometry) {
                    topic.publish("OnToggleInfoWindoContent");
                }
            })));
            on(this.selectedParcel, "click", lang.hitch(this, function () {
                dojo.polygon = true;
                dojo.interactiveParcel = true;
                dojo.selectedMapPoint = null;
                dojo.displayInfo = null;
                if (dojo.isSpanClicked === true) {
                    return;
                }
                dojo.mouseMoveHandle = this.map.on("mouse-move", lang.hitch(function (evt) {
                    topic.publish("showMapTipForParcels", evt);
                }));
                dojo.isSpanClicked = true;
            }));
            topic.subscribe("OnToggleInfoWindoContent", lang.hitch(this, this._toggleInfoWindowContent));
            topic.subscribe("OnSetBufferDistanceVisibility", lang.hitch(this, this._setBufferDistanceVisibility));
        },

        _toggleInfoWindowContent: function () {
            if (this.esriCTShowDetailsView.getAttribute("checked") === "info") {
                this.esriCTShowDetailsView.setAttribute("checked", "notify");
                domStyle.set(this.divInfoDetails, "display", "none");
                domStyle.set(this.divInfoNotify, "display", "block");
                this.esriCTShowDetailsView.src = dojoConfig.baseURL + "/js/library/themes/images/details.png";
                this.esriCTShowDetailsView.title = dojo.configData.Details;
                dijit.byId('selectAvery').store.fetch({
                    query: { name: "5160" },
                    onComplete: function (items) {
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
                if (dojo.polygonGeometry) {
                    domStyle.set(this.selectedParcel, "display", "block");
                    domStyle.set(this.esriCTShowDetailsView, "display", "none");
                    domStyle.set(this.esriCTheadderPanel, "display", "none");
                } else {
                    domStyle.set(this.selectedParcel, "display", "none");
                    domStyle.set(this.esriCTheadderPanel, "display", "block");
                }
            } else {
                this.esriCTShowDetailsView.setAttribute("checked", "info");
                this.esriCTShowDetailsView.src = dojoConfig.baseURL + "/js/library/themes/images/navigation.png";
                this.esriCTShowDetailsView.title = dojo.configData.Notify;
                domStyle.set(this.divInfoDetails, "display", "block");
                domStyle.set(this.divInfoNotify, "display", "none");
            }
        },

        /**
        * Get template formats from configuration file
        * @memberOf widgets/infoWindow/infoWindowView
        */
        _getAveryTemplates: function () {
            var averyTemplates, averyTypes, averyComboBox, itemstore, i;

            averyTemplates = dojo.configData.AveryLabelSettings[0].AveryLabelTemplates;
            averyTypes = { identifier: 'id', items: [] };

            for (i = 0; i < averyTemplates.length; i++) {
                averyTypes.items[i] = { id: averyTemplates[i].value, name: averyTemplates[i].name };
            }
            itemstore = new ItemFileReadStore({ data: averyTypes });
            averyComboBox = new ComboBox({
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
            averyComboBox.textbox.readOnly = true;
        },

        /**
        * Validate avery format
        * @memberOf widgets/infoWindow/infoWindowView
        */
        _validateAveryFormat: function () {
            if (!dijit.byId('selectAvery').item) {
                dijit.byId('selectAvery').setValue('');
            }
        },

        /**
        * Get buffer region around located parcel/address.
        * @memberOf widgets/infoWindow/infoWindowView
        */
        createBuffer: function () {
            var _this = this, geometryService, maxBufferDistance, params, polyLine, j, bufferLimit, distance;
            topic.publish("hideMapTip");
            if (dojo.mouseMoveHandle) {
                dojo.mouseMoveHandle.remove();
            }
            this.map.getLayer("tempBufferLayer").clear();
            geometryService = new GeometryService(dojo.configData.GeometryService);
            maxBufferDistance = parseFloat(dojo.configData.MaxBufferDistance);
            params = new BufferParameters();
            params.geodesic = true;
            this.dist = this.txtBuffer;
            distance = this.dist.value;
            this.pdfFormat = dijit.byId('chkPdf').checked;
            this.csvFormat = dijit.byId('chkCsv').checked;
            this.occupants = dijit.byId('chkOccupants').checked;
            this.owners = dijit.byId('chkOwners').checked;
            if (this.dist.value !== "") {
                if (!(this.isNumeric)) {
                    this.dist.value = "";
                    this.dist.focus();
                    topic.publish("showErrorMessage", 'spanFileUploadMessage', sharedNls.errorMessages.enterNumeric, '#FF0000');
                } else if (!(this._isBufferValid(this.dist.value))) {
                    bufferLimit = string.substitute(sharedNls.errorMessages.bufferRange, [maxBufferDistance]);
                    topic.publish("showErrorMessage", 'spanFileUploadMessage', bufferLimit, '#FF0000');
                    return;
                }

                if ((this.owners === "checked" || this.owners) || (this.occupants === "checked" || this.occupants)) {
                    if ((this.pdfFormat === "checked" || this.pdfFormat) || (this.csvFormat === "checked" || this.csvFormat)) {
                        if (dijit.byId('selectAvery').item !== null) {
                            this.averyFormat = dijit.byId('selectAvery').item.id[0];
                            if (this.map.getLayer("roadCenterLinesLayerID").graphics.length > 0) {
                                if (this.map.getLayer("roadCenterLinesLayerID").graphics) {
                                    polyLine = new Geometry.Polyline(this.map.spatialReference);
                                    for (j = 0; j < this.map.getLayer("roadCenterLinesLayerID").graphics.length; j++) {
                                        if (this.map.getLayer("roadCenterLinesLayerID").graphics[j].visible) {
                                            polyLine.addPath(this.map.getLayer("roadCenterLinesLayerID").graphics[j].geometry.paths[0]);
                                        }
                                    }
                                    params.geometries = [polyLine];
                                } else {
                                    alert(sharedNls.errorMessages.createBuffer);
                                }
                                params.distances = [this.dist.value];
                                params.unit = GeometryService.UNIT_FOOT;
                                if (parseInt(this.dist.value, 10) !== 0) {
                                    geometryService.buffer(params, function (geometries) {
                                        _this._showBufferRoad(geometries, distance);
                                    });
                                } else {
                                    _this._showBufferRoad([polyLine], distance);
                                }
                                dojo.selectedMapPoint = null;
                                dojo.displayInfo = null;
                                this.map.infoWindow.hide();
                            } else {
                                this._bufferParameters(this.dist);
                            }
                        } else {
                            topic.publish("showErrorMessage", 'spanFileUploadMessage', sharedNls.errorMessages.inValidAveryFormat, '#FF0000');
                            topic.publish("hideProgressIndicator");
                        }
                    } else {
                        topic.publish("showErrorMessage", 'spanFileUploadMessage', sharedNls.errorMessages.fileSelect, '#FF0000');
                        topic.publish("hideProgressIndicator");
                    }
                } else {
                    topic.publish("showErrorMessage", 'spanFileUploadMessage', sharedNls.errorMessages.selectProperty, '#FF0000');
                    topic.publish("hideProgressIndicator");
                }
            } else {
                topic.publish("showErrorMessage", 'spanFileUploadMessage', sharedNls.errorMessages.enterBufferDist, '#FF0000');
                topic.publish("hideProgressIndicator");
            }
        },

        /**
        * Function to draw buffer for road(s)
        * @memberOf widgets/infoWindow/infoWindowView
        */
        _showBufferRoad: function (geometries, bufferDistance) {
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
                if (parseInt(bufferDistance, 10) !== 0) {
                    _this._addGraphic(_this.map.getLayer("tempBufferLayer"), symbol, geometry);
                }
            }));

            query = new Query();
            query.geometry = geometries[0];
            query.outFields = dojo.configData.QueryOutFields.split(",");
            query.maxAllowableOffset = dojo.configData.MaxAllowableOffset;
            if (parseInt(bufferDistance, 10) === 0) {
                query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_CONTAINS;
            } else {
                query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_INTERSECTS;
            }
            query.returnGeometry = true;
            qTask.execute(query, lang.hitch(this, function (featureSet) {
                this._queryCallback(featureSet, true, false);
            }));
        },

        /**
        * Check if buffer range is valid
        * @param {integer} distance of the buffer to be drawn
        * @return{boolean} return the entered distance for buffer is valid or not
        * @memberOf widgets/infoWindow/infoWindowView
        */
        _isBufferValid: function (dist) {
            var maxBufferDistance = parseFloat(dojo.configData.MaxBufferDistance), isValid = true, length;
            length = parseFloat(dist);
            if ((length < 0) || (length > maxBufferDistance)) {
                isValid = false;
            }
            return isValid;
        },

        /**
        * Check for valid numeric strings
        * @param {integer} distance of the buffer to be drawn
        * @return{boolean} return the numeric string is valid or not
        * @memberOf widgets/infoWindow/infoWindowView
        */
        isNumeric: function (dist) {
            var returnValue;
            if (!/\D/.test(dist)) {
                returnValue = true;
            } else if (/^\d+\.\d+$/.test(dist)) {
                returnValue = true;
            } else {
                returnValue = false;
            }
            return returnValue;
        },

        /**
        * Validate the numeric text box control
        * @param {object} event of the key pressed
        * @return{boolean} return the keycode is valid or not
        * @memberOf widgets/infoWindow/infoWindowView
        */
        onlyNumbers: function (evt) {
            var charCode;
            charCode = evt.which || event.keyCode;
            if (charCode > 31 && (charCode < 48 || charCode > 57)) {
                return false;
            }
            return true;
        },

        /**
        *Fetch parameters to buffer
        * @param {integer} distance of the buffer around graphic
        * @memberOf widgets/infoWindow/infoWindowView
        */
        _bufferParameters: function (dist) {
            var geometryService, params, polygon, ringsLength, i, j, polyLine, featureSet, overlayInfowindow;
            geometryService = new GeometryService(dojo.configData.GeometryService);
            params = new BufferParameters();
            params.geodesic = true;
            featureSet = new esri.tasks.FeatureSet();
            if (this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].attributes.overLay) {
                overlayInfowindow = true;
            }
            if (this.map.getLayer("esriGraphicsLayerMapSettings").graphics) {
                featureSet.features = this.map.getLayer("esriGraphicsLayerMapSettings").graphics;
                if (this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0] && this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].geometry.type === "polygon") {
                    polygon = new Geometry.Polygon(this.map.spatialReference);
                    for (i = 0; i < this.map.getLayer("esriGraphicsLayerMapSettings").graphics.length; i++) {
                        ringsLength = this.map.getLayer("esriGraphicsLayerMapSettings").graphics[i].geometry.rings.length;
                        for (j = 0; j < ringsLength; j++) {
                            polygon.addRing(this.map.getLayer("esriGraphicsLayerMapSettings").graphics[i].geometry.rings[j]);
                        }
                    }
                    if (dojo.polygonGeometry) {
                        polygon = dojo.polygonGeometry;
                        //This parameter will be used to create buffer when application is shared
                        if (dojo.newBufferDistance) {
                            dojo.newBufferDistance = parseInt(dojo.newBufferDistance, 10) + parseInt(dist.value, 10);
                        } else {
                            dojo.newBufferDistance = dist.value;
                        }
                        //This parameter will be used to show the current buffer value when application is shared
                        dojo.currentBufferDistance = dist.value;
                    }
                    params.geometries = [polygon];
                    params.distances = [dist.value];
                    params.unit = GeometryService.UNIT_FOOT;
                    params.outSpatialReference = this.map.spatialReference;
                    if (parseInt(dist.value, 10) !== 0) {
                        geometryService.buffer(params, lang.hitch(this, this._showBuffer),
                            function (err) {
                                topic.publish("hideProgressIndicator");
                                alert("Query " + err);
                            });
                    } else {
                        this._showBuffer(polygon, overlayInfowindow);
                    }
                }

                if (this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0] && this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].geometry.type === "point") {
                    params.geometries = [this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].geometry];
                    params.distances = [dist.value];
                    params.unit = GeometryService.UNIT_FOOT;
                    params.outSpatialReference = this.map.spatialReference;
                    if (parseInt(dist.value, 10) !== 0) {
                        geometryService.buffer(params, lang.hitch(this, this._showBuffer),
                            function (err) {
                                topic.publish("hideProgressIndicator");
                                alert("Query " + err);
                            });
                    } else {
                        this._showBuffer(polygon, overlayInfowindow);
                    }
                }

                if (this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0] && this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].geometry.type === "polyline") {
                    polyLine = new Geometry.Polyline(this.map.spatialReference);
                    polyLine.addPath(this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].geometry.paths[0]);
                    params.geometries = [polyLine];
                    params.distances = [dist.value];
                    params.unit = GeometryService.UNIT_FOOT;
                    params.outSpatialReference = this.map.spatialReference;
                    if (parseInt(dist.value, 10) !== 0) {
                        geometryService.buffer(params, lang.hitch(this, this._showBuffer),
                            function (err) {
                                topic.publish("hideProgressIndicator");
                                alert("Query " + err);
                            });
                    } else {
                        this._showBuffer(polygon, overlayInfowindow);
                    }
                }

            } else {
                alert(sharedNls.errorMessages.createBuffer);
            }
            topic.publish("showProgressIndicator");
            dojo.selectedMapPoint = null;
            this.map.infoWindow.hide();
        },

        /**
        *Function to draw buffer for parcel(s)
        * @param {object} geometry of the graphic around which buffer will be drawn
        * @memberOf widgets/infoWindow/infoWindowView
        */
        _showBuffer: function (geometries, overlayInfowindow, isPolygonExists) {
            var _this = this, maxAllowableOffset, taxParcelQueryUrl, qTask, symbol;
            dojo.displayInfo = null;
            maxAllowableOffset = dojo.configData.MaxAllowableOffset;
            dojo.selectedMapPoint = null;
            topic.publish("showProgressIndicator");
            topic.publish("hideMapTip");
            if (dojo.mouseMoveHandle) {
                dojo.mouseMoveHandle.remove();
            }
            taxParcelQueryUrl = dojo.configData.ParcelLayerSettings.LayerUrl;
            qTask = new QueryTask(taxParcelQueryUrl);
            query = new Query();
            query.outFields = dojo.configData.QueryOutFields.split(",");
            symbol = new Symbol.SimpleFillSymbol(Symbol.SimpleFillSymbol.STYLE_SOLID,
                new Symbol.SimpleLineSymbol(Symbol.SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0, 0.65]), 2), new Color([255, 0, 0, 0.35]));
            array.forEach(geometries, lang.hitch(this, function (geometry) {
                _this._addGraphic(_this.map.getLayer("tempBufferLayer"), symbol, geometry);
                if (dojo.polygonGeometry) {
                    dojo.polygonGeometry = geometry;
                }
            }));

            if (geometries[0]) {
                query.geometry = geometries[0];
                query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_INTERSECTS;
            } else {
                query.geometry = geometries;
                if (overlayInfowindow) {
                    query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_INTERSECTS;
                } else {
                    query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_CONTAINS;
                }
            }
            query.maxAllowableOffset = maxAllowableOffset;
            query.returnGeometry = true;

            //executing query task for selecting intersecting/contains features
            qTask.execute(query, lang.hitch(this, function (featureSet) {
                //varsha: set feature set in global variable
                this.featureSet = featureSet;
                this._queryCallback(featureSet, false, isPolygonExists);
                dojo.selectedFeatures = [];
                dojo.selectedFeatures = featureSet.features;
            }));

        },

        /**
        * add graphics on the map
        * @param {string} layer url on which we need to add the graphics
        * @param {object} symbol contains details of the symbol to be added
        * @param {object} point where we add symbol
        * @param {object} feature to which we add the graphic symbol
        * @memberOf widgets/infoWindow/infoWindowView
        */
        _addGraphic: function (layer, symbol, point, attr) {
            var graphic = new Graphic(point, symbol, attr, null), featureSet, features = [];
            features.push(graphic);
            featureSet = new esri.tasks.FeatureSet();
            featureSet.features = features;
            layer.add(featureSet.features[0]);
        },

        /**
        * Handle queryTask callback for avery label and csv generation.
        * @param {object} symbol contains details of the symbol to be added
        * @param {boolean} check query is for road or any other layer
        * @memberOf widgets/infoWindow/infoWindowView
        */
        _queryCallback: function (featureSet, road, isPolygonExists) {
            //Varsha: draw polygon on map if it is created from draw tool else get GP task parameters
            if (isPolygonExists) {
                topic.publish("hideProgressIndicator");
                //this.map.setExtent(dojo.polygonGeometry.getExtent().expand(3));
                topic.publish("drawPolygon", featureSet.features, false);
                //set buffer distance to 0 if polygon tool is activated
                this.txtBuffer.value = 0;
                topic.publish("createInfoWindowContent", featureSet.features[0], dojo.polygonGeometry.getExtent().getCenter(), dojo.configData.ParcelLayerSettings);
                this._toggleInfoWindowContent();

            }
            //Check for the flag to make sure the report is downloaded
            if (dojo.isDownloadReport) {
                //Varsha: generate GP task params if download button is clicked
                if (featureSet.features.length === 0) {
                    //clear features from map
                    if (this.map.getLayer("esriGraphicsLayerMapSettings")) {
                        this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                    }
                    if (!road) {
                        alert(sharedNls.errorMessages.noParcel);
                    } else {
                        alert(dojo.configData.NoAdjacentParcel + " " + this.dist.value + " " + dojo.configData.FeetCaption);
                    }
                    topic.publish("hideProgressIndicator");
                } else {
                    this._checkInfowindowParams(featureSet, road, isPolygonExists);
                }
            }
        },

        _checkInfowindowParams: function (featureSet, road, isPolygonExists) {
            var features = featureSet.features, poly, feature, strAveryParam, strCsvParam, i;
            try {
                this.pdfFormat = dijit.byId('chkPdf').checked;
                this.csvFormat = dijit.byId('chkCsv').checked;
                this.occupants = dijit.byId('chkOccupants').checked;
                this.owners = dijit.byId('chkOwners').checked;
                if (dijit.byId('selectAvery').item !== null) {
                    this.averyFormat = dijit.byId('selectAvery').item.id[0];
                }
                //create polygon with buffer geometry when features is select to generate report
                if (this.map.getLayer("esriGraphicsLayerMapSettings")) {
                    this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                }
                poly = new Geometry.Polygon(this.map.spatialReference);
                for (feature in features) {
                    if (features.hasOwnProperty(feature)) {
                        poly.addRing(features[feature].geometry.rings[0]);
                    }
                }
                //show polygon extent on map
                this.map.setExtent(poly.getExtent().expand(3));
                topic.publish("drawPolygon", features, false);

                //Hide info window if buffer distance is zero
                if (parseInt(this.txtBuffer.value, 10) === 0) {
                    setTimeout(lang.hitch(this, function () {
                        this.map.infoWindow.hide();
                    }), 1000);
                }

                dojo.interactiveParcel = false;
                strAveryParam = "";
                strCsvParam = "";
                //Fix to show warning message when app tries to open PDF with large number of labels in Internet Explorer
                if (this.pdfFormat === "checked" || this.pdfFormat) {
                    if ((navigator && navigator.appVersion.indexOf("MSIE") !== -1 || !!navigator.userAgent.match(/Trident.*rv[ :]*11\./)) && features.length > 1000) {
                        alert(sharedNls.unableToLoadPDF);
                    }
                    strAveryParam = this._createAveryParam(features);
                }
                if (this.csvFormat === "checked" || this.csvFormat) {
                    strCsvParam = this._createCsvParam(features);
                }
                if (isPolygonExists) {
                    dojo.parcelArray = [];
                    for (i = 0; i < features.length; i++) {
                        dojo.parcelArray.push(features[i].attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.ParcelIdentification]);
                    }
                }
                this._executeGPTask(this.pdfFormat, this.csvFormat, strAveryParam, strCsvParam);
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * Create dynamic csv parameter string
        * @param {object} contains set of fetures inside the buffer region
        * @return {string} returns dynamic csv parameter string
        * @memberOf widgets/infoWindow/infoWindowView
        */
        _createCsvParam: function (features) {
            var csvFieldsCollection, occupantFields, strCsvParam = '',
                featureCount, fieldCount, i, csvFields, subFields, count;

            csvFieldsCollection = dojo.configData.AveryLabelSettings[0].CsvFieldsCollection;
            occupantFields = dojo.configData.AveryLabelSettings[0].OccupantFields.split(",");

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
                            } else {
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
                                } else {
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

        /**
        * Create dynamic avery parameter string
        * @param {object} contains set of fetures inside the buffer region
        * @return {string} returns dynamic avery parameter string
        * @memberOf widgets/infoWindow/infoWindowView
        */
        _createAveryParam: function (features) {
            var averyFieldsCollection = dojo.configData.AveryLabelSettings[0].AveryFieldsCollection, featureCount, fieldCount, occupantFields, strAveryParam,
                averyFields, subFields, i;
            occupantFields = dojo.configData.AveryLabelSettings[0].OccupantFields.split(",");
            try {
                strAveryParam = '';
                for (featureCount = 0; featureCount < features.length; featureCount++) {
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
                            } else {
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
                                } else {
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
            } catch (err) {
                alert(err.Message);
            }
        },

        /**
        * Submit Geo-Processing task
        * @param {boolean} pdf option is selected or not
        * @param {boolean} csv option is selected or not
        * @param {string} contains dynamic avery parameter string
        * @param {string} contains dynamic csv parameter string
        * @memberOf widgets/infoWindow/infoWindowView
        */
        _executeGPTask: function (pdf, csv, strAveryParam, strCsvParam) {
            var gpTaskAvery, gpTaskCsv, params, csvParams;
            gpTaskAvery = new Geoprocessor(dojo.configData.AveryLabelSettings[0].PDFServiceTask);
            gpTaskCsv = new Geoprocessor(dojo.configData.AveryLabelSettings[0].CSVServiceTask);
            topic.publish("showProgressIndicator");
            if (pdf) {
                params = { "Label_Format": this.averyFormat, "Address_Items": strAveryParam };
                gpTaskAvery.submitJob(params, lang.hitch(this, this._completeGPJob), this._statusCallback, this._errCallback);
            }
            if (csv) {
                csvParams = { "Address_Items": strCsvParam };
                gpTaskCsv.submitJob(csvParams, lang.hitch(this, this._completeCsvGPJob), this._statusCallback);
            }
            setTimeout(function () {
                topic.publish("hideProgressIndicator");
            }, 1000);
        },


        /**
        * PDF generation callback completion event handler
        * @param {object} jobinfo contains status regarding geoprocessing task completion
        * @memberOf widgets/infoWindow/infoWindowView
        */
        _completeGPJob: function (jobInfo) {
            var gpTaskAvery;
            gpTaskAvery = new Geoprocessor(dojo.configData.AveryLabelSettings[0].PDFServiceTask);
            if (jobInfo.jobStatus !== "esriJobFailed") {
                gpTaskAvery.getResultData(jobInfo.jobId, "Output_File", this._downloadFile);
                if (this.window.location.toString().split("$displayInfo=").length > 1) {
                    if (!dojo.shareinfo) {
                        dojo.shareinfo = true;
                        topic.publish("shareInfoWindow");
                    }
                }
                topic.publish("hideProgressIndicator");
            }
        },

        /**
        * Csv generation callback completion event handler
        * @param {object} jobinfo contains status regarding geoprocessing task completion
        * @memberOf widgets/infoWindow/infoWindowView
        */
        _completeCsvGPJob: function (jobInfo) {
            var gpTaskAvery = new Geoprocessor(dojo.configData.AveryLabelSettings[0].CSVServiceTask);
            if (jobInfo.jobStatus !== "esriJobFailed") {
                gpTaskAvery.getResultData(jobInfo.jobId, "Output_File", this._downloadCSVFile);
                if (this.window.location.toString().split("$displayInfo=").length > 1) {
                    if (!dojo.shareinfo) {
                        dojo.shareinfo = true;
                        topic.publish("shareInfoWindow");
                    }
                }
                topic.publish("hideProgressIndicator");
            }
        },

        /**
        * Pdf generation status callback event handler
        * @param {object} jobinfo contains status regarding geoprocessing task
        * @memberOf widgets/infoWindow/infoWindowView
        */
        _statusCallback: function (jobInfo) {
            var status = jobInfo.jobStatus;
            if (status === "esriJobFailed") {
                alert(sharedNls.errorMessages.noDataAvailable);
            }
        },


        /**
        * function to call when the error exists
        * @param {string} error message when gp service fails
        * @memberOf widgets/infoWindow/infoWindowView
        */
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

        /**
        * Function to open generated Pdf in a new window
        * @param {object} object of downloaded outputfile
        * @memberOf widgets/infoWindow/infoWindowView
        */
        _downloadFile: function (outputFile) {
            this.window.open(outputFile.value.url);
        },


        /**
        * Function to open generated csv in a new window
        * @param {object} object of downloaded outputfile
        * @memberOf widgets/infoWindow/infoWindowView
        */
        _downloadCSVFile: function (outputFile) {
            if (navigator.appVersion.indexOf("Mac") !== -1) {
                window.open(outputFile.value.url);
            } else {
                this.window.location = outputFile.value.url;
            }
        },

        /**
        * Function generate buffer parameters
        * @param {object} geometry of polygon present on map
        * @memberOf widgets/infoWindow/infoWindowView
        */
        generateBufferParmas: function (polygonGeometry) {
            var params, distance, geometryService, polygon;
            this.dist = this.txtBuffer;
            distance = this.dist.value;
            this.pdfFormat = dijit.byId('chkPdf').checked;
            this.csvFormat = dijit.byId('chkCsv').checked;
            this.occupants = dijit.byId('chkOccupants').checked;
            this.owners = dijit.byId('chkOwners').checked;
            //Check for URL parameters and mixin the properties
            if (location.href && ((location.href.toString().split("$newBufferDistance=")[1]).split('$')[0] &&
                     (location.href.toString().split("$currentBufferDistance=")[1]).split('$')[0])) {
                distance = (location.href.toString().split("$newBufferDistance=")[1]).split('$')[0];
                this.dist.value = (location.href.toString().split("$currentBufferDistance=")[1]).split('$')[0];
            }
            geometryService = new GeometryService(dojo.configData.GeometryService);
            params = new BufferParameters();
            params.geodesic = true;
            params.distances = [distance];
            params.unit = GeometryService.UNIT_FOOT;
            polygon = new Geometry.Polygon(this.map.spatialReference);
            polygon = polygonGeometry;
            params.geometries = [polygon];
            params.outSpatialReference = this.map.spatialReference;
            if (parseInt(distance, 10) !== 0) {
                geometryService.buffer(params, lang.hitch(this, this._showBuffer),
                    function (err) {
                        topic.publish("hideProgressIndicator");
                        alert("Query " + err);
                    });
            }
        }
    });
});
