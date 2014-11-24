/*global define,dojo,dojoConfig,alert,esri,dijit,Graphic */
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
    "dojo/_base/lang",
    "dojo/on",
    "dojo/dom",
    "dojo/query",
    "../scrollBar/scrollBar",
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
    "esri/urlUtils",
    "widgets/infoWindow/infoWindow",
    "dojo/topic",
    "widgets/locator/locator",
    "esri/geometry",
    "esri/graphic",
    "esri/tasks/GeometryService",
    "dojo/_base/Color",
    "esri/symbol",
    "esri/domUtils",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/renderers/Renderer",
    "dojo/domReady!"
], function (declare, domConstruct, domStyle, lang, on, dom, dojoQuery, ScrollBar, domClass, domGeom, Query, QueryTask, _WidgetBase, EsriMap, FeatureLayer, GraphicsLayer, GeometryExtent, BaseMapGallery, sharedNls, HomeButton, SpatialReference, urlUtils, InfoWindow, topic, Locator, Geometry, Graphic, GeometryService, Color, Symbol, domUtils, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, Renderer) {
    //========================================================================================================================//

    return declare([_WidgetBase], {
        sharedNls: sharedNls,
        map: null,
        tempGraphicsLayerId: "esriGraphicsLayerMapSettings",
        roadCenterLinesLayerID: "roadCenterLinesLayerID",
        tempBufferLayer: "tempBufferLayer",
        bufferArray: [],
        infoWindowContainerScrollbar: null,
        divDescription: null,
        divParcelList: null,


        /**
        * initialize map object
        *
        * @class
        * @name widgets/mapSettings/mapSettings
        */
        postCreate: function () {

            dojo.graphicLayerClicked = false;     //Flag for storing state of Graphics Layer Clicked
            dojo.findTasksGraphicClicked = false; //flag for handling to draw polygon
            dojo.parcelArray = [];                //Array to store the shared parcels
            dojo.roadArray = [];
            dojo.overLayArray = [];               //Array to store shared overlay layer
            dojo.polygon = true;
            dojo.shareinfo = false;               //Flag set for info window display
            dojo.interactiveParcel = false;
            topic.subscribe("clearAll", lang.hitch(this, this.clearAll));
            topic.subscribe("addShareParcelsToMap", lang.hitch(this, this.addShareParcelsToMap));
            topic.subscribe("addShareOverLayToMap", lang.hitch(this, this.addShareOverLayToMap));
            topic.subscribe("shareInfoWindow", lang.hitch(this, this.shareInfoWindow));
            topic.subscribe("shareOverInfoWindow", lang.hitch(this, this.shareOverInfoWindow));
            topic.subscribe("showRoadDetails", lang.hitch(this, this.showRoadDetails));
            topic.subscribe("queryForAdjacentRoad", lang.hitch(this, this.queryForAdjacentRoad));
            topic.subscribe("createDataForOverlappedParcels", lang.hitch(this, this.createDataForOverlappedParcels));
            topic.subscribe("addGraphic", lang.hitch(this, this.addGraphic));

            /**
            * set map extent to default extent specified in configuration file
            * @param {string} dojo.configData.DefaultExtent Default extent of map specified in configuration file
            */
            var extentPoints, gLayer, glayer, layer, customInfoWindow, roadLineColor, roadLineSymbol, roadLinefillColor, roadLineRenderer, roadCenterLinesLayer, home;
            extentPoints = dojo.configData && dojo.configData.DefaultExtent && dojo.configData.DefaultExtent.split(",");

            /**
            * load map
            * @param {string} dojo.configData.BaseMapLayers Basemap settings specified in configuration file
            */

            customInfoWindow = new InfoWindow({ infoWindowWidth: dojo.configData.InfoPopupWidth, infoWindowHeight: dojo.configData.InfoPopupHeight });
            this.map = new EsriMap("esriCTParentDivContainer", {
                infoWindow: customInfoWindow,
                showAttribution: true
            });

            layer = new esri.layers.ArcGISTiledMapServiceLayer(dojo.configData.BaseMapLayers[0].MapURL, { id: "esriCTbasemap", visible: true });
            this.map.addLayer(layer, 0);


            gLayer = new GraphicsLayer();
            gLayer.id = this.tempBufferLayer;
            this.map.addLayer(gLayer);

            glayer = new GraphicsLayer();
            glayer.id = this.tempGraphicsLayerId;
            this.map.addLayer(glayer);

            this.map.on("click", lang.hitch(this, function (evt) {
                dojo.overLayerID = false;
                this.btnDiv = dojoQuery(".scrollbar_footer")[0];
                domStyle.set(this.btnDiv, "display", "none");
                if (evt.graphic && evt.graphic.attributes && evt.graphic.attributes.overLay) {
                    dojo.graphicLayerClicked = false;
                    dojo.selectedMapPoint = evt.mapPoint;
                    topic.publish("setMapTipPosition", dojo.selectedMapPoint, this.map);
                    domUtils.show(this.map.infoWindow.domNode);
                    return;
                }
                this._executeQueryTask(evt);
            }));

            roadLineColor = dojo.configData.RoadCenterLayerSettings.RoadHighlightColor;
            roadLineSymbol = new Symbol.SimpleLineSymbol();
            roadLineSymbol.setWidth(5);
            roadLinefillColor = new Color(roadLineColor);
            roadLineSymbol.setColor(roadLinefillColor);
            roadLineRenderer = new esri.renderer.SimpleRenderer(roadLineSymbol);
            roadCenterLinesLayer = new FeatureLayer(dojo.configData.RoadCenterLayerSettings.LayerUrl, {
                mode: FeatureLayer.MODE_SELECTION,
                outFields: ["*"]
            });

            roadCenterLinesLayer.id = this.roadCenterLinesLayerID;
            roadCenterLinesLayer.setRenderer(roadLineRenderer);
            this.map.addLayer(roadCenterLinesLayer);

            this.own(on(roadCenterLinesLayer, "click", lang.hitch(this, function (evt) {
                var roadLayerSettings = dojo.configData.RoadCenterLayerSettings;
                evt.cancelBubble = true;
                if (evt.stopPropagation) {
                    evt.stopPropagation();
                }
                if (evt.ctrlKey) {
                    if (dijit.byId('toolTipDialogues')) {
                        dojo.publish("hideRoad", evt);
                    }
                }
                topic.publish("createInfoWindowContent", evt.graphic, evt.mapPoint, roadLayerSettings);
                evt.cancelBubble = true;
                if (evt.stopPropagation) {
                    evt.stopPropagation();
                }
            })));

            this.own(on(glayer, "click", function (evt) {
                dojo.graphicLayerClicked = true;
                dojo.findTasksGraphicClicked = false;
            }));

            /**
            * load esri 'Home Button' widget
            */
            home = this._addHomeButton(this.map);

            /* *
            * set position of home button widget after map is successfully loaded
            * @param {array} dojo.configData.OperationalLayers List of operational Layers specified in configuration file
            */
            this.map.on("load", lang.hitch(this, function () {
                var _self = this, polyLine, taxParcelQueryUrl = dojo.configData.ParcelLayerSettings.LayerUrl, extent,
                    mapDefaultExtent, query, parcelGroup, p, qTask, numSegments, j, overLayQueryUrl;

                extent = this._getQueryString('extent');
                if (extent === "") {
                    mapDefaultExtent = new GeometryExtent({ "xmin": parseFloat(extentPoints[0]), "ymin": parseFloat(extentPoints[1]), "xmax": parseFloat(extentPoints[2]), "ymax": parseFloat(extentPoints[3]), "spatialReference": { "wkid": this.map.spatialReference.wkid} });
                    this.map.setExtent(mapDefaultExtent);
                } else {
                    mapDefaultExtent = extent.split(',');
                    mapDefaultExtent = new GeometryExtent({ "xmin": parseFloat(mapDefaultExtent[0]), "ymin": parseFloat(mapDefaultExtent[1]), "xmax": parseFloat(mapDefaultExtent[2]), "ymax": parseFloat(mapDefaultExtent[3]), "spatialReference": { "wkid": this.map.spatialReference.wkid} });
                    this.map.setExtent(mapDefaultExtent);
                }
                domConstruct.place(home.domNode, dojoQuery(".esriSimpleSliderIncrementButton")[0], "after");
                home.extent = mapDefaultExtent;
                home.startup();
                if (dojo.configData.BaseMapLayers.length > 1) {
                    this._addbasMapObjectGallery();
                }

                /**
                * to share parcel layer's graphic and infopopup
                */
                if (window.location.toString().split("$parcelID=").length > 1) {
                    topic.publish("getValuesToBuffer", true);
                    if (window.location.toString().split("$displayInfo=").length > 1) {
                        dojo.parcelArray = window.location.toString().split("$parcelID=")[1].split("$displayInfo=")[0].split(",");
                    } else {
                        dojo.parcelArray = window.location.toString().split("$parcelID=")[1].split(",");
                    }

                    query = new esri.tasks.Query();
                    parcelGroup = "";
                    for (p = 0; p < dojo.parcelArray.length; p++) {
                        if (p === (dojo.parcelArray.length - 1)) {
                            parcelGroup += "'" + dojo.parcelArray[p] + "'";
                        } else {
                            parcelGroup += "'" + dojo.parcelArray[p] + "',";
                        }
                    }
                    query.where = dojo.configData.AveryLabelSettings[0].ParcelInformation.ParcelIdentification + " in (" + parcelGroup + ")";
                    query.returnGeometry = true;
                    query.outFields = ["*"];
                    qTask = new QueryTask(taxParcelQueryUrl);
                    qTask.execute(query, function (featureset) {
                        topic.publish("addShareParcelsToMap", featureset, 0);
                    });

                    /**
                    * to share RoadLine layer graphics and infopoup
                    */
                } else if (window.location.toString().split("$roadID=").length > 1) {
                    topic.publish("getValuesToBuffer", false);
                    if (window.location.toString().split("$displayInfo=").length > 1) {
                        dojo.roadArray = window.location.toString().split("$roadID=")[1].split("$displayInfo=")[0].split(",");
                    } else {
                        dojo.roadArray = window.location.toString().split("$roadID=")[1].split(",");
                    }

                    query = new esri.tasks.Query();
                    query.returnGeometry = true;
                    query.objectIds = [dojo.roadArray.join(",")];
                    _self.map.getLayer("roadCenterLinesLayerID").selectFeatures(query, esri.layers.FeatureLayer.SELECTION_ADD, function (featureSet) {
                        polyLine = new esri.geometry.Polyline(_self.map.spatialReference);
                        numSegments = _self.map.getLayer("roadCenterLinesLayerID").graphics.length;
                        if (0 < numSegments) {
                            for (j = 0; j < numSegments; j++) {
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

                    /**
                    * to share overlay layer's graphic and infopoup
                    */
                } else if (window.location.toString().split("$overlayID=").length > 1) {
                    overLayQueryUrl = dojo.configData.OverlayLayerSettings[window.location.toString().split("$shareOverLayId=")[1].split("$displayInfo=")[0].split(",")].LayerUrl;
                    topic.publish("getoverlayValuesToBuffer", true);
                    if (window.location.toString().split("$displayInfo=").length > 1) {
                        dojo.overLayArray = window.location.toString().split("$overlayID=")[1].split("$displayInfo=")[0].split("$shareOverLayId")[0].split(",");
                    } else {
                        if ((window.location.toString().split("$overlayID=")[1].split("$Where=")[0].split(",").length) === 1) {
                            dojo.overLayArray = window.location.toString().split("$overlayID=")[1].split("$Where=")[0].split(","); //if only graphics objectid
                        } else {
                            dojo.overLayArray = window.location.toString().split("$overlayID=")[1].split(",");
                        }
                    }
                    query = new esri.tasks.Query();
                    parcelGroup = dojo.overLayArray.join(",");
                    if (window.location.toString().split("$dist=").length > 1) {
                        parcelGroup = parcelGroup.split("$Where=")[0];
                    }
                    dojo.whereclause = window.location.toString().split("$Where=")[1].split("$shareOverLayId")[0];
                    query.where = dojo.whereclause + " = (" + parcelGroup + ")";
                    query.returnGeometry = true;
                    query.outFields = ["*"];
                    qTask = new QueryTask(overLayQueryUrl);
                    qTask.execute(query, function (featureset) {
                        topic.publish("addShareOverLayToMap", featureset, 0, featureset.geometryType);
                    });
                } else {
                    topic.publish("hideProgressIndicator");
                }
            }));

            this.map.on("extent-change", lang.hitch(this, function () {
                topic.publish("setMapTipPosition", dojo.selectedMapPoint, this.map);
            }));
        },

        /* *
        * Get query string value of the provided key, if not found the function returns empty string
        * @return {string} return extent value
        */
        _getQueryString: function (key) {
            var extentValue = "", regex, qs;
            regex = new RegExp("[\\?&]" + key + "=([^&#]*)");
            qs = regex.exec(window.location.href);
            if (qs && qs.length > 0) {
                extentValue = qs[1];
            }
            return extentValue;
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
        * @return {object} return a basemap object
        * @memberOf widgets/mapSettings/mapSettings
        */
        _addbasMapObjectGallery: function () {
            var basMapObject = new BaseMapGallery({
                map: this.map
            }, domConstruct.create("div", {}, null));
            return basMapObject;
        },

        /**
        * Display the parcels on map
        * @param {object} Home button widget
        * @memberOf widgets/mapSettings/mapSettings
        */
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
                    topic.publish("clearAll");
                    dojo.interactiveParcel = false;
                    dojo.parcelArray = [];
                    this._queryForParcel(evt);
                    if (this.map.getLayer("roadCenterLinesLayerID")) {
                        this.map.getLayer("roadCenterLinesLayerID").clear();
                    }
                }
                if (dojo.interactiveParcel) {
                    topic.publish("clearAll", evt);
                    if (evt.ctrlKey) {
                        if (dojo.polygon) {
                            topic.publish("hideMapTip");
                            if (dojo.mouseMoveHandle) {
                                dojo.mouseMoveHandle.remove();
                            }
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
            } else {
                this._showFeatureDetails(evt.graphic, evt);
                dojo.graphicLayerClicked = false;
            }

            if (evt.ctrlKey) {
                if (!dojo.polygon) {
                    dojo.selectedPoint = null;
                    dojo.displayInfo = null;
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

        /**
        * Query for parcel when clicked on map
        * @param {object} map onclick event
        * @memberOf widgets/locator/locator
        */
        _queryForParcel: function (evt) {
            var _this = this, taxParcelQueryUrl, qTask, mapPointForQuery, query;
            taxParcelQueryUrl = dojo.configData.ParcelLayerSettings.LayerUrl;
            qTask = new QueryTask(taxParcelQueryUrl);
            mapPointForQuery = new Geometry.Point(evt.mapPoint.x, evt.mapPoint.y, this.map.spatialReference);
            query = new Query();
            query.returnGeometry = true;
            query.outFields = dojo.configData.QueryOutFields.split(",");
            query.geometry = mapPointForQuery;
            qTask.execute(query, function (fset) {
                if (fset.features.length) {
                    _this._showFeatureSet(fset, evt);
                } else {
                    topic.publish("hideProgressIndicator");
                }
            }, function (err) {
                alert(sharedNls.errorMessages.unableToPerform);
                topic.publish("hideProgressIndicator");
            });
        },

        /**
        * Locate adjacent road
        * @param {object} map onclick event
        * @memberOf widgets/locator/locator
        */
        queryForAdjacentRoad: function (evt) {
            var _self = this, roadCenterLinesLayerURL, j, geometryService, params, query, polyLine, queryTask;

            roadCenterLinesLayerURL = dojo.configData.RoadCenterLayerSettings.LayerUrl;
            geometryService = new GeometryService(dojo.configData.GeometryService);
            params = new esri.tasks.BufferParameters();
            params.geodesic = true;
            params.geometries = [evt.mapPoint];
            params.distances = [50];
            params.unit = GeometryService.UNIT_FOOT;
            params.outSpatialReference = this.map.spatialReference;
            geometryService.buffer(params, function (geometries) {
                query = new Query();
                query.geometry = geometries[0];
                query.where = "1=1";
                query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_INTERSECTS;
                query.returnGeometry = true;

                queryTask = new QueryTask(roadCenterLinesLayerURL);
                queryTask.execute(query, function (featureset) {
                    if (featureset.features.length > 0) {
                        query = new Query();
                        query.where = dojo.configData.RoadCenterLayerSettings.SearchDisplayFields + "= '" + featureset.features[0].attributes[dojo.configData.RoadCenterLayerSettings.SearchDisplayFields] + "'";
                        _self.map.getLayer("roadCenterLinesLayerID").selectFeatures(query, esri.layers.FeatureLayer.SELECTION_ADD, function (featureSet) {
                            polyLine = new esri.geometry.Polyline(_self.map.spatialReference);
                            for (j = 0; j < _self.map.getLayer("roadCenterLinesLayerID").graphics.length; j++) {
                                _self.map.getLayer("roadCenterLinesLayerID").graphics[j].show();
                                polyLine.addPath(_self.map.getLayer("roadCenterLinesLayerID").graphics[j].geometry.paths[0]);
                                dojo.roadArray.push(_self.map.getLayer("roadCenterLinesLayerID").graphics[j].attributes[_self.map.getLayer("roadCenterLinesLayerID").objectIdField]);
                            }
                            _self.map.setExtent(polyLine.getExtent().expand(1.5));
                        });
                        topic.publish("hideProgressIndicator");
                    } else {
                        topic.publish("hideProgressIndicator");
                        alert(sharedNls.errorMessages.noRoad);
                    }
                });
            }, function (error) {
                topic.publish("hideProgressIndicator");
                alert(error.message);
            });
        },


        /**
        * Function if their are multiple features in featureSet
        * @param {object} fset set of multiple features
        * @param {object} map onclick event
        * @memberOf widgets/locator/locator
        */
        _showFeatureSet: function (fset, evt) {
            topic.publish("clearAll", evt);
            var rendererColor = dojo.configData.OverlayLayerSettings[0].OverlayHighlightColor, centerPoint = evt.mapPoint,
                featureSet, features, contentDiv, feature, layer, fillColor, lineColor, symbol;

            if (fset.features.length > 1) {
                featureSet = fset;
                this.overlapCount = 0;
                contentDiv = this._createContent(featureSet.features);
                this._showOverlappingParcels(featureSet.features, contentDiv, evt, featureSet.features[0].attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.ParcelIdentification]);
                features = featureSet.features;
                topic.publish("drawPolygon", features, false);
                this.map.setExtent(this._centerMapPoint(evt.mapPoint, fset.features[0].geometry.getExtent().expand(9)));
            } else {
                feature = fset.features[0];
                layer = this.map.getLayer("esriGraphicsLayerMapSettings");
                lineColor = new Color();
                lineColor.setColor(rendererColor);
                fillColor = new Color();
                fillColor.setColor(rendererColor);
                fillColor.a = 0.25;
                symbol = new Symbol.SimpleFillSymbol(Symbol.SimpleFillSymbol.STYLE_SOLID, new Symbol.SimpleLineSymbol(Symbol.SimpleLineSymbol.STYLE_SOLID, lineColor, 3), fillColor);
                feature.setSymbol(symbol);
                dojo.parcelArray.push(feature.attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.ParcelIdentification]); //showfeatureset
                dojo.displayInfo = feature.attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.ParcelIdentification] + "$infoParcel";
                this._showUniqueParcel(feature, evt, centerPoint);
                topic.publish("hideProgressIndicator");
                this.map.setExtent(this._centerMapPoint(evt.mapPoint, fset.features[0].geometry.getExtent().expand(9)));
                layer.add(feature);
                dojo.polygon = true;
            }
        },

        /**
        * Triggered when highlighted features are clicked
        * @param {object} fature for the selected unique parcel
        * @param {object} mapPoint if mappoint is available
        * @param {object} else if centerPoint is available
        * @memberOf widgets/locator/locator
        */
        _showUniqueParcel: function (feature, mapPoint, centerPoint) {
            var parcelLayerSettings = dojo.configData.ParcelLayerSettings, evtMapPoint;
            if (mapPoint.ctrlKey) {
                if (dijit.byId('toolTipDialogues')) {
                    dojo.selectedMapPoint = null;
                    dojo.displayInfo = null;
                    this.map.infoWindow.hide();
                    if (!this.map.getLayer("roadCenterLinesLayerID").graphics.length) {
                        this.map.getLayer("esriGraphicsLayerMapSettings").remove(feature);
                    }
                }

                if (!this.map.getLayer("esriGraphicsLayerMapSettings").graphics.length) {
                    dojo.isSpanClicked = false;
                    topic.publish("hideMapTip");
                    dojo.mouseMoveHandle.remove();
                    topic.publish("clearAll");
                    dojo.interactiveParcel = false;
                }
            } else {
                if (centerPoint) {
                    topic.publish("createInfoWindowContent", feature, centerPoint, parcelLayerSettings);
                } else {
                    if (mapPoint.mapPoint) {
                        evtMapPoint = mapPoint.mapPoint;
                        topic.publish("createInfoWindowContent", feature, evtMapPoint, parcelLayerSettings);
                    } else {
                        evtMapPoint = mapPoint;
                        topic.publish("createInfoWindowContent", feature, evtMapPoint, parcelLayerSettings);
                    }
                }
            }
        },


        /**
        * Create popup content for overlapping parcel
        * @param {object} featureList is set of overlapping features present in the selected area
        * @memberOf widgets/locator/locator
        */
        _createContent: function (featureList) {
            var _this = this, adjacentLabel, customButtondiv, btnInnerDiv, btnTbody, divDisplayRow,
                divDisplayColumn1, divInfoImg, divDisplayColumn2, divSpan, i;

            domConstruct.empty(dojoQuery(".scrollbar_footer")[0]);
            domConstruct.empty(dojoQuery(".esriCTAdjacentParcel")[0]);
            adjacentLabel = dojoQuery(".esriCTAdjacentParcel")[0];
            if (dojoQuery(".divDataDisplay")[0]) {
                domConstruct.empty(dojoQuery(".divDataDisplay")[0]);
            }
            this.overlapCount = 0;
            this.detailsTab = domConstruct.create("div", { "class": "esriCTFullHeightWidth" }, null);
            this.buttonDetails = domConstruct.create("div", {}, this.detailsTab);
            this.scrollbar_container = domConstruct.create("div", { "class": "scrollbar_container" }, this.detailsTab);
            this.divParcelList = domConstruct.create("div", { "class": "esriCTscrollbar_content", "display": "block" }, this.scrollbar_container);
            this.divParcelList.setAttribute("id", "divParcelList");
            this.divDescription = domConstruct.create("div", { "class": "esriCTscrollbar_content", "display": "none" }, this.scrollbar_container);
            this.divDescription.setAttribute("id", "divDescription");
            this.btnDiv = dojoQuery(".scrollbar_footer")[0];
            domStyle.set(this.btnDiv, "display", "none");
            this.own(on(this.btnDiv, "click", lang.hitch(this, function () {
                this._showParcel();
            })));
            customButtondiv = domConstruct.create("div", { "class": "customButton", "cursor": "pointer" }, this.btnDiv);
            btnInnerDiv = domConstruct.create("div", { "class": "customButtonInner", "cursor": "pointer" }, customButtondiv);
            btnTbody = domConstruct.create("div", {}, btnInnerDiv);
            domConstruct.create("div", { "class": "backBtn", "innerHTML": dojo.configData.BackBtn }, btnTbody);

            this.divDisplayTable = domConstruct.create("div", { "class": "tblTransparent" }, this.divParcelList);
            for (i = 0; i < featureList.length; i++) {
                this.overlapCount++;
                _this._createFeatureContent(featureList[i], i);
            }
            divDisplayRow = domConstruct.create("div", {}, adjacentLabel);
            divDisplayColumn1 = domConstruct.create("div", {}, divDisplayRow);
            divInfoImg = domConstruct.create("img", { "id": "imgCreateAdjacentParcels", "class": "imgCreateAdjacentParcels" }, divDisplayColumn1);
            this.own(on(divInfoImg, "click", lang.hitch(this, function () {
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
            })));
            divInfoImg.src = dojoConfig.baseURL + "/js/library/themes/images/add.png";

            divDisplayColumn2 = domConstruct.create("div", { "class": "divDisplaySpan" }, divDisplayRow);
            divSpan = domConstruct.create("span", { "id": "spanCreateAdjacentParcels", "class": "esriCTCreateDivSpan", "display": "block", "innerHTML": dojo.configData.AdjacentParcels }, divDisplayColumn2);
            this.own(on(divSpan, "click", lang.hitch(this, function () {
                dojo.polygon = true;
                dojo.interactiveParcel = true;
                dojo.selectedMapPoint = null;
                dojo.displayInfo = null;
                this.map.infoWindow.hide();
                if (dojo.isSpanClicked === true) {
                    return;
                }
                dojo.mouseMoveHandle = this.map.on("mouse-move", lang.hitch(function (evt) {
                    topic.publish("showMapTipForParcels", evt);
                }));
                dojo.isSpanClicked = true;
            })));
            return this.detailsTab;
        },

        _createFeatureContent: function (featureList, i) {
            var _this = this, divDisplayRow, divDisplayColumn, divParcelId, attributes;

            attributes = featureList.attributes;
            divDisplayRow = domConstruct.create("div", { "class": "esriCTtrBufferRow" }, this.divDisplayTable);
            divDisplayColumn = domConstruct.create("div", { "class": "tdParcel" }, divDisplayRow);
            divParcelId = domConstruct.create("div", { "id": i, "innerHTML": attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.ParcelIdentification], "textDecoration": "underline" }, divDisplayColumn);
            domConstruct.create("div", { "class": "tdSiteAddress", "innerHTML": attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.SiteAddress] }, divDisplayRow);
            this.own(on(divParcelId, "click", function () {
                _this._showParcelDetail(featureList.attributes);
            }));

        },

        /**
        * Create content for overlapping parcels
        * @param {object} featureList is set of overlapping features present in the selected area
        * @memberOf widgets/locator/locator
        */
        _createContentForGraphics: function (featureList) {
            var adjacentLabel, customButtondiv, btnInnerDiv, btnTbody, divDisplayTable, parcelID, divDisplayRow,
                divDisplayColumn1, divInfoImg, divDisplayColumn2, divSpan;

            domConstruct.empty(dojoQuery(".scrollbar_footer")[0]);
            domConstruct.empty(dojoQuery(".esriCTAdjacentParcel")[0]);
            adjacentLabel = dojoQuery(".esriCTAdjacentParcel")[0];
            if (dojoQuery(".divDataDisplay")[0]) {
                domConstruct.empty(dojoQuery(".divDataDisplay")[0]);
            }
            this.overlapCount = 0;
            this.detailsTab = domConstruct.create("div", { "class": "esriCTFullHeightWidth" }, null);
            this.buttonDetails = domConstruct.create("div", {}, this.detailsTab);
            this.scrollbar_container = domConstruct.create("div", { "class": "scrollbar_container" }, this.detailsTab);
            this.divParcelList = domConstruct.create("div", { "class": "esriCTscrollbar_content", "display": "block" }, this.scrollbar_container);
            this.divParcelList.setAttribute("id", "divParcelList");
            this.divDescription = domConstruct.create("div", { "class": "esriCTscrollbar_content", "display": "none" }, this.scrollbar_container);
            this.divDescription.setAttribute("id", "divDescription");
            this.btnDiv = dojoQuery(".scrollbar_footer")[0];
            domStyle.set(this.btnDiv, "display", "none");
            this.own(on(this.btnDiv, "click", lang.hitch(this, function () {
                this._showParcel();
            })));
            customButtondiv = domConstruct.create("div", { "class": "customButton", "cursor": "pointer" }, this.btnDiv);
            btnInnerDiv = domConstruct.create("div", { "class": "customButtonInner", "cursor": "pointer" }, customButtondiv);
            btnTbody = domConstruct.create("div", {}, btnInnerDiv);
            domConstruct.create("div", { "class": "backBtn", "innerHTML": dojo.configData.BackBtn }, btnTbody);
            divDisplayTable = domConstruct.create("div", { "class": "tblTransparent" }, this.divParcelList);
            for (parcelID in featureList.attributes) {
                if (featureList.attributes.hasOwnProperty(parcelID)) {
                    this.overlapCount++;
                    this._CreateContentParcel(featureList, parcelID, divDisplayTable);
                }
            }
            divDisplayRow = domConstruct.create("div", {}, adjacentLabel);
            divDisplayColumn1 = domConstruct.create("div", {}, divDisplayRow);
            divInfoImg = domConstruct.create("img", { "id": "imgCreateAdjacentParcels", "class": "imgCreateAdjacentParcels" }, divDisplayColumn1);
            this.own(on(divInfoImg, "click", lang.hitch(this, function () {
                dojo.polygon = true;
                dojo.interactiveParcel = true;
                dojo.selectedMapPoint = null;
                dojo.displayInfo = null;
                if (dojo.isSpanClicked === true) {
                    return;
                }
            })));
            divInfoImg.src = dojoConfig.baseURL + "/js/library/themes/images/add.png";

            divDisplayColumn2 = domConstruct.create("div", { "class": "divDisplaySpan" }, divDisplayRow);
            divSpan = domConstruct.create("span", { "id": "spanCreateAdjacentParcels", "class": "esriCTCreateDivSpan", "display": "block", "innerHTML": dojo.configData.AdjacentParcels }, divDisplayColumn2);
            this.own(on(divSpan, "click", lang.hitch(this, function () {
                dojo.polygon = true;
                dojo.interactiveParcel = true;
                dojo.selectedMapPoint = null;
                dojo.displayInfo = null;
                this.map.infoWindow.hide();
                if (dojo.isSpanClicked === true) {
                    return;
                }
                dojo.mouseMoveHandle = this.map.on("mouse-move", lang.hitch(function (evt) {
                    topic.publish("showMapTipForParcels", evt);
                }));
                dojo.isSpanClicked = true;
            })));
            return this.detailsTab;
        },

        _CreateContentParcel: function (featureList, parcelID, divDisplayTable) {
            var divDisplayRow, divDisplayColumn, divParcelId, _this = this, attributes;


            attributes = featureList.attributes[parcelID];
            divDisplayRow = domConstruct.create("div", { "class": "esriCTtrBufferRow" }, divDisplayTable);
            divDisplayColumn = domConstruct.create("div", { "class": "tdParcel" }, divDisplayRow);
            divParcelId = domConstruct.create("div", { "innerHTML": attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.ParcelIdentification], "textDecoration": "underline" }, divDisplayColumn);
            this.own(on(divParcelId, "click", function () {
                _this._showParcelDetail(featureList.attributes[this.innerHTML]);
            }));
            domConstruct.create("div", { "class": "tdSiteAddress", "innerHTML": attributes[dojo.configData.AveryLabelSettings[0].ParcelInformation.SiteAddress] }, divDisplayRow);
        },

        /**
        * Show details of selected parcel.
        * @param {object} attr is set of attributes of selected parcel
        * @memberOf widgets/locator/locator
        */
        _showParcelDetail: function (attr) {
            var adjacentParcel, imgAdjacentParcels, infoPopupFieldsCollection, parcelInformation, divParcelRow, divParcelInformation,
                divInfoPopupDisplayText, divInfoPopupField, fieldName, fieldNames, notApplicableCounter, key, i, title;

            dojo.infoContainerScrollbar.removeScrollBar();
            if (dojoQuery(".esriCTCreateDivSpan")[0]) {
                adjacentParcel = dojoQuery(".esriCTCreateDivSpan")[0];
                domStyle.set(adjacentParcel, "display", "none");
                imgAdjacentParcels = dojoQuery(".imgCreateAdjacentParcels")[0];
                domStyle.set(imgAdjacentParcels, "display", "none");
            }
            if (dojoQuery(".esrictDivSpan")[0]) {
                adjacentParcel = dojoQuery(".esrictDivSpan")[0];
                domStyle.set(adjacentParcel, "display", "none");
                imgAdjacentParcels = dojoQuery(".imgAdjacentParcels")[0];
                domStyle.set(imgAdjacentParcels, "display", "none");
            }
            infoPopupFieldsCollection = dojo.configData.ParcelLayerSettings.InfoWindowSettings[0].InfoWindowData;
            parcelInformation = dojo.configData.AveryLabelSettings[0].ParcelInformation;
            domStyle.set(this.divParcelList, "display", "none");
            domStyle.set(this.divDescription, "display", "block");
            domStyle.set(this.btnDiv, "display", "block");
            topic.publish("removeChildren", this.divDescription);
            divParcelRow = domConstruct.create("div", { "class": "esriCTDivTransparent" }, null);
            domConstruct.create("div", { "class": "esriCTDisplayRow" }, null);
            for (key = 0; key < infoPopupFieldsCollection.length; key++) {
                divParcelInformation = domConstruct.create("div", { "class": "esriCTDisplayRow" }, divParcelRow);
                divInfoPopupDisplayText = domConstruct.create("div", { "innerHTML": infoPopupFieldsCollection[key].DisplayText, "class": "esriCTDisplayField" }, null);
                divInfoPopupField = domConstruct.create("div", { "class": "esriCTValueField" }, null);
                fieldName = infoPopupFieldsCollection[key].FieldName;
                fieldNames = fieldName.split(',');
                if (fieldNames.length > 1) {
                    notApplicableCounter = 0;
                    for (i = 0; i < fieldNames.length; i++) {
                        if (!attr[fieldNames[i]]) {
                            notApplicableCounter++;
                        }
                    }
                    if (notApplicableCounter === fieldNames.length) {
                        divInfoPopupField.innerHTML += dojo.configData.ShowNullValueAs;
                    } else {
                        for (i = 0; i < fieldNames.length; i++) {
                            if (attr[fieldNames[i]]) {
                                divInfoPopupField.innerHTML += attr[fieldNames[i]] + " ";
                            }
                        }
                        divInfoPopupField.innerHTML = divInfoPopupField.innerHTML.slice(0, -1);
                    }
                } else {
                    if (attr[fieldName] === null) {
                        divInfoPopupField.innerHTML = dojo.configData.ShowNullValueAs;
                    } else {
                        divInfoPopupField.innerHTML = attr[fieldName];
                    }
                }
                divParcelInformation.appendChild(divInfoPopupDisplayText);
                divParcelInformation.appendChild(divInfoPopupField);
            }
            this.divDescription.appendChild(divParcelRow);
            this.content = this.divDescription;
            if (attr[parcelInformation.SiteAddress]) {
                if (attr[parcelInformation.SiteAddress].length > 35) {
                    title = attr[parcelInformation.SiteAddress];
                    this.map.infoWindow.setTitle(title);
                } else {
                    title = attr[parcelInformation.SiteAddress];
                    this.map.infoWindow.setTitle(title);
                }
            } else {
                this.map.infoWindow.setTitle(dojo.configData.ShowNullValueAs);
            }
        },

        /**
        * Display back to parcel list
        * @memberOf widgets/locator/locator
        */
        _showParcel: function () {
            var infoTitle = this.overlapCount + " " + dojo.configData.ParcelsCount, adjacentParcel, imgAdjacentParcels;
            this.map.infoWindow.setTitle(infoTitle);
            if (dojo.infoContainerScrollbar) {
                domClass.add(dojo.infoContainerScrollbar._scrollBarContent, "esriCTZeroHeight");
                dojo.infoContainerScrollbar.removeScrollBar();
            }
            dojo.infoContainerScrollbar = new ScrollBar({
                domNode: this.map.infoWindow.divInfoScrollContent
            });
            domClass.add(this.map.infoWindow.divInfoScrollContent, "esrCTInfoContainerScrollbar");
            dojo.infoContainerScrollbar.setContent(this.map.infoWindow.divInfoDetailsScroll);
            dojo.infoContainerScrollbar.createScrollBar();
            if (dojoQuery(".esriCTCreateDivSpan")[0]) {
                adjacentParcel = dojoQuery(".esriCTCreateDivSpan")[0];
                domStyle.set(adjacentParcel, "display", "block");
                imgAdjacentParcels = dojoQuery(".imgCreateAdjacentParcels")[0];
                domStyle.set(imgAdjacentParcels, "display", "block");
            }
            domStyle.set(this.divParcelList, "display", "block");
            domStyle.set(this.divDescription, "display", "none");
            domStyle.set(this.btnDiv, "display", "none");
            this.content = this.divParcelList;
        },

        /**
        * Triggered when layer with multiple parcels is clicked
        * @param {object} feature is the set of features of selected location
        * @param {object} contentdiv will be the container for appending the infopopup structure
        * @param {object} evt is the seleced graphic event
        * @param {object} parcelFeature
        * @memberOf widgets/locator/locator
        */
        _showOverlappingParcels: function (feature, contentDiv, evt, parcelFeature) {
            var extentChanged, screenPoint, infoTitle;
            if (evt.mapPoint) {
                dojo.selectedMapPoint = evt.mapPoint;
            } else {
                dojo.selectedMapPoint = evt;
            }
            extentChanged = this.map.setExtent(this._getBrowserMapExtent(dojo.selectedMapPoint));
            extentChanged.then(lang.hitch(this, function () {
                screenPoint = this.map.toScreen(dojo.selectedMapPoint);
                screenPoint.y = this.map.height - screenPoint.y;
                this.map.infoWindow.show(contentDiv, screenPoint);
            }));
            infoTitle = this.overlapCount + " " + dojo.configData.ParcelsCount;
            this.map.infoWindow.setTitle(infoTitle);
            topic.publish("hideProgressIndicator");
        },

        /**
        * Get the extent of point
        * @return {object} extent of the point
        * @memberOf widgets/mapSettings/mapSettings
        */
        _centerMapPoint: function (mapPoint, extent) {
            var width, height, xmin, ymin, xmax, ymax;
            width = extent.getWidth();
            height = extent.getHeight();
            xmin = mapPoint.x - (width / 2);
            ymin = mapPoint.y - (height / 4);
            xmax = xmin + width;
            ymax = ymin + height;
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


        /**
        * Get the extent based on the map point for browser
        * @param {object} map point to calculate extent
        * @return {object} Current map instance
        * @memberOf widgets/mapSettings/mapSettings
        */
        _getBrowserMapExtent: function (mapPoint) {
            var width, height, xmin, ymin, xmax, ymax;
            width = this.map.extent.getWidth();
            height = this.map.extent.getHeight();
            xmin = mapPoint.x - (width / 2);
            ymin = mapPoint.y - (height / 2.7);
            xmax = xmin + width;
            ymax = ymin + height;
            return new Geometry.Extent(xmin, ymin, xmax, ymax, this.map.spatialReference);
        },

        /**
        * function called to show details of feature while clicked on graphic layer
        * @param {object} feature we get on click of graphics
        * @param {object} map point for that selected graphics
        * @memberOf widgets/mapSettings/mapSettings
        */
        _showFeatureDetails: function (feature, mapPoint) {
            var parcelLayerSettings, parcelInformation, count, k;

            parcelLayerSettings = dojo.configData.ParcelLayerSettings;
            parcelInformation = dojo.configData.AveryLabelSettings[0].ParcelInformation;
            count = 0;
            for (k in feature.attributes) {
                if (feature.attributes.hasOwnProperty(k)) {
                    ++count;
                }
            }
            if (feature.attributes && count > 0) {
                if (feature.attributes[parcelInformation.ParcelIdentification] ||
                        feature.attributes[parcelLayerSettings.SearchDisplayFields.split(",")[0]]) {
                    this._showUniqueParcel(feature, mapPoint);
                    topic.publish("hideProgressIndicator");
                } else {
                    topic.publish("createDataForOverlappedParcels", feature, mapPoint);
                }

                if (feature.attributes[parcelInformation.AliasParcelField]) {
                    dojo.displayInfo = feature.attributes[parcelInformation.AliasParcelField] + "$infoParcel";
                } else if (feature.attributes[parcelInformation.ParcelIdentification]) {
                    dojo.displayInfo = feature.attributes[parcelInformation.ParcelIdentification] + "$infoParcel";
                }
            }
        },

        /**
        * Create data template for overlapped parcels
        * @param {object} feature we get on click of graphics
        * @param {object} map point for that selected graphics
        * @memberOf widgets/mapSettings/mapSettings
        */
        createDataForOverlappedParcels: function (feature, mapPoint) {
            var parcelInformation, contentDiv, parcel, attr;

            parcelInformation = dojo.configData.AveryLabelSettings[0].ParcelInformation;
            contentDiv = this._createContentForGraphics(feature);
            for (parcel in feature.attributes) {
                if (feature.attributes.hasOwnProperty(parcel)) {
                    attr = feature.attributes[parcel];
                    break;
                }
            }
            dojo.displayInfo = attr[parcelInformation.ParcelIdentification] + "$infoParcel";
            this._showOverlappingParcels(feature, contentDiv, mapPoint, attr[parcelInformation.ParcelIdentification]);
        },

        /**
        * Clear All Graphics
        * @param {object} event we get when click on graphics
        * @memberOf widgets/mapSettings/mapSettings
        */
        clearAll: function (evt) {
            var i;
            dojo.selectedMapPoint = null;
            dojo.displayInfo = null;
            this.map.infoWindow.hide();
            this.map.graphics.clear();
            for (i = 0; i < this.map.graphicsLayerIds.length; i++) {
                if (!((evt && evt.ctrlKey && this.map.graphicsLayerIds[i] === "esriGraphicsLayerMapSettings") || (evt && evt.ctrlKey && this.map.graphicsLayerIds[i] === "roadCenterLinesLayerID"))) {
                    if (!evt) {
                        if (this.map.getLayer("roadCenterLinesLayerID")) {
                            this.map.getLayer("roadCenterLinesLayerID").clearSelection();
                        }
                    }
                    if (this.map.graphicsLayerIds[i] !== "roadCenterLinesLayerID") {
                        this.map.getLayer(this.map.graphicsLayerIds[i]).clear();
                    }
                }
            }
        },

        /**
        * Add overlay layers features  to map when app is shared
        * @param {object} fset contains featureset of the feaures to be shared
        * @param {object} q is the index of the features in the feaureset
        * @param {object} geometry type of the feature
        * @memberOf widgets/mapSettings/mapSettings
        */
        addShareOverLayToMap: function (fset, q, geometryType) {
            var _self = this, rendererColor, layer, lineColor, fillColor, symbol, feature, locatorMarkupSymbol, graphic, polylineSymbol, polyLine;
            rendererColor = dojo.configData.OverlayLayerSettings[0].OverlayHighlightColor;
            feature = fset.features[q];
            if (fset.features[q]) {
                if (fset.features.length > 1) {
                    topic.publish("drawPolygon", fset.features, true);
                    q++;
                    topic.publish("addShareOverLayToMap", fset, q);

                } else {

                    if (geometryType === "esriGeometryPoint") {
                        locatorMarkupSymbol = new SimpleMarkerSymbol(
                            SimpleMarkerSymbol.STYLE_CIRCLE,
                            12,
                            new SimpleLineSymbol(
                                SimpleLineSymbol.STYLE_SOLID,
                                new Color(dojo.configData.PointSymbology.PointSymbolBorder),
                                dojo.configData.PointSymbology.PointSymbolBorderWidth
                            ),
                            new Color(dojo.configData.PointSymbology.PointFillSymbolColor)
                        );
                        _self.mapPoint = new esri.geometry.Point(feature.geometry.x, feature.geometry.y, new SpatialReference(
                            { wkid: _self.map.spatialReference.wkid }
                        ));

                        graphic = new Graphic(_self.mapPoint, locatorMarkupSymbol, {}, null);
                        _self.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);

                    } else if (geometryType === "esriGeometryPolyline") {
                        layer = this.map.getLayer("esriGraphicsLayerMapSettings");
                        polylineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                            new Color(dojo.configData.PointSymbology.LineSymbolColor), 3);
                        polyLine = new Geometry.Polyline(this.map.spatialReference.wkid);
                        polyLine.addPath(feature.geometry.paths[0]);
                        this.map.setExtent(polyLine.getExtent().expand(2));
                        graphic = new Graphic(polyLine, polylineSymbol);
                        _self.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);

                    } else {
                        layer = _self.map.getLayer("esriGraphicsLayerMapSettings");
                        lineColor = new dojo.Color();
                        lineColor.setColor(rendererColor);
                        fillColor = new dojo.Color();
                        fillColor.setColor(rendererColor);
                        fillColor.a = 0.25;
                        symbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
                            new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, lineColor, 3), fillColor);
                        feature.setSymbol(symbol);
                        layer.add(feature);
                    }
                    q++;
                    topic.publish("addShareOverLayToMap", fset, q);
                }
            } else {
                if (window.location.toString().split("$dist=").length > 1) {
                    dojo.overLayerID = true;
                    topic.publish("createRoadBuffer");
                } else {
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

        /**
        * Add parcels to map when app is shared
        * @param {object} fset contains parcel feaure to be shared
        * @param {object} q is the index of the features in the feaureset
        * @memberOf widgets/mapSettings/mapSettings
        */
        addShareParcelsToMap: function (fset, q) {
            var _self = this, parcelInformation, rendererColor, taxParcelQueryUrl,
                qTask, feature, query, layer, lineColor, fillColor, symbol;

            parcelInformation = dojo.configData.AveryLabelSettings[0].ParcelInformation;
            rendererColor = dojo.configData.ParcelLayerSettings.ParcelHighlightColor;
            taxParcelQueryUrl = dojo.configData.ParcelLayerSettings.LayerUrl;
            qTask = new QueryTask(taxParcelQueryUrl);
            if (fset.features[q]) {
                feature = fset.features[q];
                query = new esri.tasks.Query();
                query.where = parcelInformation.LowParcelIdentification + " = '" + feature.attributes[parcelInformation.LowParcelIdentification] + "'";
                query.returnGeometry = true;
                query.outFields = ["*"];
                qTask.execute(query, function (featureset) {
                    if (featureset.features.length > 1) {
                        topic.publish("drawPolygon", featureset.features, true);
                        q++;
                        topic.publish("addShareParcelsToMap", fset, q);

                    } else {
                        layer = _self.map.getLayer("esriGraphicsLayerMapSettings");
                        lineColor = new dojo.Color();
                        lineColor.setColor(rendererColor);
                        fillColor = new dojo.Color();
                        fillColor.setColor(rendererColor);
                        fillColor.a = 0.25;
                        symbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
                            new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, lineColor, 3), fillColor);
                        feature.setSymbol(symbol);
                        layer.add(feature);
                        q++;
                        topic.publish("addShareParcelsToMap", fset, q);
                    }
                });
            } else {
                if (window.location.toString().split("$dist=").length > 1) {
                    dojo.overLayerID = false;
                    topic.publish("createRoadBuffer");
                } else {
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

        /**
        * Share overlay layers info-window with details
        * @memberOf widgets/mapSettings/mapSettings
        */
        shareOverInfoWindow: function () {
            var roadCenterLinesLayerURL, point, whereclause, overLayQueryUrl, qTask, roadTask, query, parcelGroup;
            roadCenterLinesLayerURL = dojo.configData.RoadCenterLayerSettings.LayerUrl;
            parcelGroup = dojo.overLayArray.join(",");
            point = new esri.geometry.Point(Number(window.location.toString().split("$point=")[1].split(",")[0]), Number(window.location.toString().split("$point=")[1].split("$Where=")[0].split(",")[1]), this.map.spatialReference);
            overLayQueryUrl = dojo.configData.OverlayLayerSettings[window.location.toString().split("$shareOverLayId=")[1].split("$displayInfo=")[0].split(",")].LayerUrl;
            whereclause = window.location.toString().split("$Where=")[1].split("$shareOverLayId")[0];
            query = new esri.tasks.Query();
            query.where = whereclause + " = (" + parcelGroup + ")";
            query.returnGeometry = true;
            query.outFields = ["*"];
            qTask = new QueryTask(overLayQueryUrl);
            if (window.location.toString().split("$displayInfo=")[1].split("$infoParcel").length > 1) {
                qTask.execute(query, function (featureset) {
                    topic.publish("createInfoWindowContent", featureset.features[0], point, dojo.configData.OverlayLayerSettings[window.location.toString().split("$shareOverLayId=")[1].split("$displayInfo=")[0].split(",")]);
                });
            } else {
                query = new esri.tasks.Query();
                query.returnGeometry = true;
                query.outFields = ["*"];
                query.objectIds = [window.location.toString().split("$displayInfo=")[1].split("$infoRoad")[0]];
                roadTask = new esri.tasks.QueryTask(roadCenterLinesLayerURL);
                roadTask.execute(query, function (featureset) {
                    topic.publish("showRoadDetails", featureset.features[0].attributes, point);
                });
            }
        },


        /**
        * Share info-window with details
        * @memberOf widgets/mapSettings/mapSettings
        */
        shareInfoWindow: function () {
            var roadCenterLinesLayerURL, _self = this, overlapQuery, parcelInformation, point, query,
                taxParcelQueryUrl, qTask, contentDiv, roadTask;

            point = new esri.geometry.Point(Number(window.location.toString().split("$point=")[1].split(",")[0]), Number(window.location.toString().split("$point=")[1].split(",")[1]), this.map.spatialReference);
            taxParcelQueryUrl = dojo.configData.ParcelLayerSettings.LayerUrl;
            roadCenterLinesLayerURL = dojo.configData.RoadCenterLayerSettings.LayerUrl;
            parcelInformation = dojo.configData.AveryLabelSettings[0].ParcelInformation;
            qTask = new esri.tasks.QueryTask(taxParcelQueryUrl);

            if (window.location.toString().split("$displayInfo=")[1].split("$infoParcel").length > 1) {
                query = new esri.tasks.Query();
                query.where = parcelInformation.ParcelIdentification + " = '" + window.location.toString().split("$displayInfo=")[1].split("$infoParcel")[0] + "'";
                query.returnGeometry = true;
                query.outFields = ["*"];
                qTask.execute(query, function (featureset) {
                    overlapQuery = new esri.tasks.Query();
                    overlapQuery.where = parcelInformation.LowParcelIdentification + " = '" + featureset.features[0].attributes[parcelInformation.LowParcelIdentification] + "'";
                    overlapQuery.returnGeometry = true;
                    overlapQuery.outFields = ["*"];
                    qTask.execute(overlapQuery, function (featureSet) {
                        if (featureSet.features.length > 1) {
                            contentDiv = _self._createContent(featureSet.features);
                            _self._showOverlappingParcels(featureSet.features, contentDiv, point, featureSet.features[0].attributes[parcelInformation.ParcelIdentification]);
                        } else {
                            _self._showFeatureDetails(featureset.features[0], point);
                        }
                    });
                });
            } else {
                query = new esri.tasks.Query();
                query.returnGeometry = true;
                query.outFields = ["*"];
                query.objectIds = [window.location.toString().split("$displayInfo=")[1].split("$infoRoad")[0]];
                roadTask = new esri.tasks.QueryTask(roadCenterLinesLayerURL);
                roadTask.execute(query, function (featureset) {
                    topic.publish("showRoadDetails", featureset.features[0].attributes, point);
                });
            }
        },

        /**
        * Display the particular road details in infowindow
        * @param {object} attributes are the details to be shown in the infowindow
        * @param {object} mapPoint is the location where infowindow gets open
        * @memberOf widgets/mapSettings/mapSettings
        */
        showRoadDetails: function (attributes, mapPoint) {
            var attr, roadLayerSettings;
            dojo.selectedMapPoint = mapPoint;
            attr = attributes.attributes;
            roadLayerSettings = dojo.configData.RoadCenterLayerSettings;
            dojo.displayInfo = attr[this.map.getLayer("roadCenterLinesLayerID").objectIdField] + "$infoRoad";
            topic.publish("createInfoWindowContent", attributes, mapPoint, roadLayerSettings);
        },

        /**
        * Trim the selected string
        * @param {string} string to be trimmed
        * @param {integer} length upto which string should be trimmed
        * @return {string} trimmed string
        * @memberOf widgets/mapSettings/mapSettings
        */
        _trimString: function (str, len) {
            return (str.length > len) ? str.substring(0, len) + "..." : str;
        },

        /**
        * add graphics on the map
        * @param {string} layer url on which we need to add the graphics
        * @param {object} symbol contains details of the symbol to be added
        * @param {object} point where we add symbol
        * @param {object} feature to which we add the graphic symbol
        * @memberOf widgets/mapSettings/mapSettings
        */
        addGraphic: function (layer, symbol, point, attr) {
            var graphic, features = [], featureSet;

            graphic = new Graphic(point, symbol, attr, null);
            features.push(graphic);
            featureSet = new esri.tasks.FeatureSet();
            featureSet.features = features;
            layer.add(featureSet.features[0]);
        }
    });
});
