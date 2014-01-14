/*global define, document, Modernizr */
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
        "dojo/dom-attr",
        "dojo/_base/lang",
        "dojo/on",
        "dojo/dom-geometry",
        "dojo/dom",
        "dojo/dom-class",
        "dojo/string",
        "esri/tasks/locator",
        "dojo/window",
        "dojo/text!./templates/locatorTemplate.html",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        "dijit/_WidgetsInTemplateMixin",
        "dojo/i18n!nls/localizedStrings",
        "dojo/topic",
        "esri/tasks/query",
        "esri/tasks/QueryTask",
        "../scrollBar/scrollBar",
        "dojo/query",
        "widgets/infoWindow/infoWindow",
        "dojo/_base/array",
        "dojo/Deferred",
        "dojo/DeferredList",
        "dojo/promise/all",
        "dojo/_base/Color",
        "esri/symbol",
        "esri/geometry",
        "esri/SpatialReference"
    ],
    function (declare, domConstruct, domStyle, domAttr, lang, on, domGeom, dom, domClass, string, Locator, window, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, nls, topic, Query, QueryTask, scrollBar, query, InfoWindow, array, Deferred, DeferredList, all, Color, Symbol, Geometry, SpatialReference) {

        //========================================================================================================================//
        return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            nls: nls,
            lastSearchString: null,
            stagedSearch: null,
            mapPoint: null,
            nameArray: [],
            overLayerArray: [],
            splashScreenScrollbar: null,
            polygon: null,               //flag for handling to draw route and polygon
            interactiveParcel: null,
            selectedPoint: null,
            isSpanClicked: false,
            /**
            * display locator widget
            *
            * @class
            * @name widgets/locator/locator
            */
            postCreate: function () {
                deferredListarr = [];
                /**
                * close locator widget if any other widget is opened
                * @param {string} widget Key of the newly opened widget
                */
                topic.subscribe("toggleWidget", lang.hitch(this, function (widget) {
                    if (widget != "locator") {
                        if (domGeom.getMarginBox(this.divAddressHolder).h > 0) {
                            domClass.replace(this.domNode, "esriCTTdHeaderSearch", "esriCTTdHeaderSearch-select");
                            domClass.replace(this.divAddressHolder, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
                            domClass.replace(this.divAddressHolder, "esriCTZeroHeight", "esriCTAddressContentHeight");
                            this.txtAddress.blur();
                        }
                    }
                }));
                topic.subscribe("showProgressIndicator", lang.hitch(this, this.showProgressIndicator));
                topic.subscribe("setMapTipPosition", this.onSetMapTipPosition);
                this.domNode = domConstruct.create("div", {
                    "title": this.title,
                    "class": "esriCTTdHeaderSearch"
                }, null);
                domConstruct.place(this.divAddressContainer, dom.byId("esriCTParentDivContainer"));
                this.own(on(this.domNode, "click", lang.hitch(this, function () {
                    domStyle.set(this.imgSearchLoader, "display", "none");
                    domStyle.set(this.close, "display", "block");
                    /**
                    * minimize other open header panel widgets and show locator widget
                    */
                    topic.publish("toggleWidget", "locator");
                    this._showLocateContainer();
                })));

                domStyle.set(this.divAddressContainer, "display", "block");
                this.divAddressContent.title = "";
                this.close.src = dojoConfig.baseURL + "/themes/images/searchClose.png";
                this.imgSearchLoader.src = dojoConfig.baseURL + "/themes/images/blue-loader.gif";

                this._setDefaultTextboxValue();
                this._attachLocatorEvents();
            },

            /**
            * set default value of locator textbox as specified in configuration file
            * @param {array} dojo.configData.LocatorSettings.Locators Locator settings specified in configuration file
            * @memberOf widgets/locator/locator
            */
            _setDefaultTextboxValue: function () {
                var locatorSettings = dojo.configData.SearchSettings;
                /**
                * txtAddress Textbox for search text
                * @member {textbox} txtAddress
                * @private
                * @memberOf widgets/locator/locator
                */
                domAttr.set(this.txtAddress, "placeholder", dojo.configData.SearchSettings.HintText);
            },

            /**
            * attach locator events
            * @memberOf widgets/locator/locator
            */
            _attachLocatorEvents: function () {
                this.own(on(this.esriCTSearch, "click", lang.hitch(this, function (evt) {
                    domStyle.set(this.imgSearchLoader, "display", "block");
                    domStyle.set(this.close, "display", "none");
                    this._locate(evt);
                })));
                this.own(on(this.txtAddress, "keyup", lang.hitch(this, function (evt) {
                    domStyle.set(this.close, "display", "block");
                    this._submitAddress(evt);
                })));
                this.own(on(this.txtAddress, "dblclick", lang.hitch(this, function (evt) {
                    this._clearDefaultText(evt);
                })));
                this.own(on(this.txtAddress, "blur", lang.hitch(this, function (evt) {
                    this._replaceDefaultText(evt);
                })));
                this.own(on(this.txtAddress, "focus", lang.hitch(this, function () {
                    domStyle.set(this.close, "display", "block");
                    domClass.add(this.txtAddress, "esriCTColorChange");
                })));
                this.own(on(this.close, "click", lang.hitch(this, function () {
                    this._hideText();
                })));
            },
            _hideText: function () {
                this.txtAddress.value = "";
                domStyle.set(this.close, "display", "none");
            },


            /**
            * show/hide locator widget and set default search text in address, feature and activity tabs
            * @memberOf widgets/locator/locator
            */
            _showLocateContainer: function () {
                this.txtAddress.blur();

                if (domGeom.getMarginBox(this.divAddressHolder).h > 0) {
                    /**
                    * when user clicks on locator icon in header panel, close the search panel if it is open
                    */
                    domClass.replace(this.domNode, "esriCTTdHeaderSearch", "esriCTTdHeaderSearch-select");
                    domClass.replace(this.divAddressHolder, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
                    domClass.replace(this.divAddressHolder, "esriCTZeroHeight", "esriCTAddressContentHeight");
                    this.txtAddress.blur();
                } else {
                    /**
                    * when user clicks on locator icon in header panel, open the search panel if it is closed
                    */
                    domClass.replace(this.domNode, "esriCTTdHeaderSearch-select", "esriCTTdHeaderSearch");
                    domClass.replace(this.txtAddress, "esriCTBlurColorChange", "esriCTColorChange");
                    domClass.replace(this.divAddressHolder, "esriCTShowContainerHeight", "esriCTHideContainerHeight");
                    domClass.add(this.divAddressHolder, "esriCTAddressContentHeight");

                    domStyle.set(this.txtAddress, "verticalAlign", "middle");
                    this.lastSearchString = lang.trim(this.txtAddress.value)
                }
                this._setHeightAddressResults();
            },

            /**
            * search address on every key press
            * @param {object} evt Keyup event
            * @memberOf widgets/locator/locator
            */
            _submitAddress: function (evt) {
                var _this = this;
                if (evt) {
                    if (evt.keyCode == dojo.keys.ENTER) {
                        if (this.txtAddress.value != '') {
                            domStyle.set(_this.imgSearchLoader, "display", "block");
                            domStyle.set(_this.close, "display", "none");
                            this._locate(evt);
                            return;
                        }
                    }
                    domStyle.set(_this.imgSearchLoader, "display", "block");
                    domStyle.set(_this.close, "display", "none");
                    /**
                    * do not perform auto complete search if alphabets,
                    * numbers,numpad keys,comma,ctl+v,ctrl +x,delete or
                    * backspace is pressed
                    */
                    if ((!((evt.keyCode >= 46 && evt.keyCode < 58) || (evt.keyCode > 64 && evt.keyCode < 91) || (evt.keyCode > 95 && evt.keyCode < 106) || evt.keyCode == 8 || evt.keyCode == 110 || evt.keyCode == 188)) || (evt.keyCode == 86 && evt.ctrlKey) || (evt.keyCode == 88 && evt.ctrlKey)) {
                        evt.cancelBubble = true;
                        evt.stopPropagation && evt.stopPropagation();
                        return;
                    }

                    /**
                    * call locator service if search text is not empty
                    */
                    if (domGeom.getMarginBox(this.divAddressContent).h > 0) {
                        if (lang.trim(this.txtAddress.value) != '') {
                            if (this.lastSearchString != lang.trim(this.txtAddress.value)) {
                                this.lastSearchString = lang.trim(this.txtAddress.value);
                                // domConstruct.empty(this.divAddressResults);
                                var _this = this;

                                /**
                                * clear any staged search
                                */
                                clearTimeout(this.stagedSearch);
                                if (lang.trim(this.txtAddress.value).length > 0) {

                                    /**
                                    * stage a new search, which will launch if no new searches show up
                                    * before the timeout
                                    */
                                    this.stagedSearch = setTimeout(function () {
                                        _this._locate();
                                    }, 500);
                                }
                            }
                        } else {
                            this.lastSearchString = lang.trim(this.txtAddress.value);
                            domStyle.set(_this.imgSearchLoader, "display", "none");
                            domStyle.set(_this.close, "display", "block");
                        }
                    }
                }
            },

            /**
            * perform search by addess if search type is address search
            * @memberOf widgets/locator/locator
            */
            _locate: function () {
                domConstruct.empty(this.divAddressResults);
                if (lang.trim(this.txtAddress.value) == '') {
                    domStyle.set(this.imgSearchLoader, "display", "none");
                    domStyle.set(this.close, "display", "block");
                    domConstruct.empty(this.divAddressResults);
                    return;
                } else {
                    this._searchLocation();
                }
            },

            /**
            * call locator service and get search results
            * @memberOf widgets/locator/locator
            */
            _searchLocation: function () {
                deferredListarr.length = 0;
                domStyle.set(this.imgSearchLoader, "display", "block");
                domStyle.set(this.close, "display", "none");
                domAttr.set(this.txtAddress, "defaultAddress", this.txtAddress.value);
                this._setHeightAddressResults();
                qTask = new QueryTask(taxParcelQueryURL);
                var RoadLineLayerSettings = dojo.configData.RoadCenterLayerSettings;
                var queryOutFields = dojo.configData.QueryOutFields.split(",");
                var searchText = lang.trim(this.txtAddress.value);
                isSpanClicked = false;
                if (searchText) {
                    searchText = lang.trim(searchText);
                }

                flagForAddress = true;
                if (!searchText || searchText === "") {
                    domStyle.set(this.imgSearchLoader, "display", "block");
                    domStyle.set(this.close, "display", "none");
                    domConstruct.empty(this.divAddressResults);
                    alert(nls.errorMessages.addressToLocate);
                    return;
                }
                this._queryParcelLayer();
                this._queryRoadLineLayer();
                this._queryOverlayLayer();
            },

            _queryParcelLayer: function () {
                var parcelLayerSettings = dojo.configData.ParcelLayerSettings;
                taxParcelQueryURL = dojo.configData.ParcelLayerSettings.LayerUrl;
                var queryOutFields = dojo.configData.QueryOutFields.split(",");
                var query = new Query();
                query.returnGeometry = false;
                query.outFields = queryOutFields;
                searchFields = dojo.configData.SearchSettings.MultipleResults.split(",");
                query.where = string.substitute(parcelLayerSettings.SearchExpression, [lang.trim(this.txtAddress.value).toUpperCase()]);
                var qTask = new QueryTask(taxParcelQueryURL);
                var QueryTaxParcel = qTask.execute(query, lang.hitch(this, function (featureSet) {
                    var deferred = new dojo.Deferred();
                    deferred.resolve(featureSet);
                    return deferred.promise;
                },
                    function (err) {
                        domStyle.set(this.imgSearchLoader, "display", "none");
                        domStyle.set(this.close, "display", "block");
                        this._locatorErrBack();
                    }));
                deferredListarr.push(QueryTaxParcel);
            },

            _queryRoadLineLayer: function () {
                var RoadLineLayerSettings = dojo.configData.RoadCenterLayerSettings;
                var queryRoadLayer = new Query();
                queryRoadLayer.where = string.substitute(RoadLineLayerSettings.SearchExpression, [lang.trim(this.txtAddress.value).toUpperCase()]); ;
                domStyle.set(this.imgSearchLoader, "display", "block");
                domStyle.set(this.close, "display", "none");

                var QueryRoadLayer = this.map.getLayer("roadCenterLinesLayerID").queryFeatures(queryRoadLayer, lang.hitch(this, function (features) {
                    var deferred = new dojo.Deferred();
                    deferred.resolve(features);
                    return deferred.promise;
                }));
                deferredListarr.push(QueryRoadLayer);
            },

            //Get Overlaylayer
            _queryOverlayLayer: function () {
                var overlayLayerSettings = dojo.configData.OverlayLayerSettings;
                for (var index = 0; index < overlayLayerSettings.length; index++) {
                    this._getOverLayResult(overlayLayerSettings[index], index);

                }
            },

            //Populate data for parcel layer
            _populateSearchItem: function (featureSet, searchFields) {
                domStyle.set(this.imgSearchLoader, "display", "block");
                domStyle.set(this.close, "display", "none");
                var searchText = lang.trim(this.txtAddress.value);
                var DisplayField = [];
                _this = this;
                var features = featureSet.features;
                var parcelLayerSettings = dojo.configData.ParcelLayerSettings;
                if (features.length > 0) {
                    var whereSearchText = searchText.toUpperCase();
                    for (var i = 0; i < features.length; i++) {
                        var feature = features[i];
                        array.some(searchFields, function (field) {
                            var value = feature.attributes[field];
                            if (value && value.toUpperCase().indexOf(whereSearchText) >= 0) {
                                feature.foundFieldName = field;
                                feature.value = value;
                                return true;
                            }
                            return false;
                        });
                    }
                    var addressParcelFields = parcelLayerSettings.SearchDisplayFields.split(",");
                    for (var i = 0; i < features.length; i++) {
                        if (features[i].foundFieldName === addressParcelFields[0])
                            DisplayField[i] = addressParcelFields[0];
                        else if (features[i].foundFieldName === addressParcelFields[1])
                            DisplayField[i] = addressParcelFields[1];
                    }
                    var divDispalyResultContainer = domConstruct.create("div", {}, this.divAddressResults);
                    var divHeadding = domConstruct.create("div", { "class": "esriCTBottomBorder esriCTCursorPointer esriAddressCounty", "innerHTML": "ParcelID/Address" }, divDispalyResultContainer);
                    for (var i = 0; i < features.length; i++) {
                        domStyle.set(this.imgSearchLoader, "display", "block");
                        domStyle.set(this.close, "display", "none");
                        var divDisplayRow = domConstruct.create("div", {}, divDispalyResultContainer);
                        var divDisplayColumn = domConstruct.create("div", { "class": "esriCTContentBottomBorder esriCTCursorPointer esriCTResultBottomBorder", "id": i, "title": "Click to Locate", "innerHTML": features[i].attributes[DisplayField[i]] }, divDisplayRow);
                        domAttr.set(divDisplayColumn, "parcelId", features[i].attributes[addressParcelFields[0]]);
                        this.own(on(divDisplayColumn, "click", function () {
                            domAttr.set(_this.txtAddress, "defaultAddress", _this.txtAddress.value);
                            _this._FindTaskResult(features[this.id]);
                            _this._hideAddressContainer();
                            domStyle.set(_this.imgSearchLoader, "display", "none");
                        }));
                    }
                }
            },

            //Populate data for roadline layer
            _findDisplayRoad: function (featureSets) {
                var nameArray = [];
                var numUnique = 0
                var _this = this;
                this.txtAddress.value = lang.trim(this.txtAddress.value);
                var roadLineLayerSettings = dojo.configData.RoadCenterLayerSettings;
                if (featureSets.features.length > 0) {
                    domStyle.set(this.imgSearchLoader, "display", "block");
                    domStyle.set(this.close, "display", "none");
                    var searchString = lang.trim(this.txtAddress.value).toLowerCase();
                    var divDispalyResultContainer = domConstruct.create("div", {}, this.divAddressResults);
                    var divHeadding = domConstruct.create("div", {
                        "class": "esriCTBottomBorder esriCTCursorPointer esriAddressCounty",
                        "innerHTML": "Road Centerline"
                    }, divDispalyResultContainer);
                    for (var order = 0; order < featureSets.features.length; order++) {
                        nameArray.push({
                            name: featureSets.features[order].attributes[roadLineLayerSettings.SearchDisplayFields],
                            attributes: featureSets.features[order].attributes,
                            geometry: featureSets.features[order].geometry
                        });
                    }
                    nameArray.sort(function (a, b) {
                        var nameA = a.name.toLowerCase();
                        var nameB = b.name.toLowerCase();
                        if (nameA < nameB) //sort string ascending
                            return -1
                        if (nameA >= nameB)
                            return 1
                    });

                    //  _this._displayRoadResult(nameArray, divDispalyResultContainer);
                    for (var i = 0; i < nameArray.length; i++) {
                        if (0 == i || searchString != nameArray[i].attributes[roadLineLayerSettings.SearchDisplayFields].toLowerCase()) {
                            if (i > 0) {
                                var previousFoundName = nameArray[i - 1].attributes[roadLineLayerSettings.SearchDisplayFields]
                            } else {
                                var previousFoundName = "";
                            }
                            if (nameArray[i].attributes[roadLineLayerSettings.SearchDisplayFields] != previousFoundName) {
                                ++numUnique;
                                var divDisplayRow = domConstruct.create("div", {}, divDispalyResultContainer);
                                var divDisplayColumn = domConstruct.create("div", { "class": "esriCTContentBottomBorder esriCTCursorPointer esriCTResultBottomBorder", "id": "i", "title": "Click to locate", "innerHTML": nameArray[i].attributes[roadLineLayerSettings.SearchDisplayFields] }, divDisplayRow);
                                domAttr.set(divDisplayColumn, "OBJECTID", nameArray[0].attributes[this.map.getLayer("roadCenterLinesLayerID").objectIdField]);
                                this.own(on(divDisplayColumn, "click", function () {
                                    domStyle.set(_this.imgSearchLoader, "display", "none");
                                    _this.txtAddress.value = this.innerHTML;
                                    domAttr.set(_this.txtAddress, "defaultAddress", _this.txtAddress.value);
                                    polygon = false;
                                    _this._FindAndShowRoads();
                                    _this._hideAddressContainer();
                                }));
                            }
                        }
                    }
                }
            },

            //Query Overlay Layer
            _getOverLayResult: function (layerInfo, index) {
                var _this = this;
                this.overLayerArray.length = 0;
                isSpanClicked = false;
                var qtask = new QueryTask(layerInfo.LayerUrl);
                var query = new Query();
                query.returnGeometry = true;
                var whereClause = "";
                query.where = string.substitute(layerInfo.SearchExpression, [lang.trim(this.txtAddress.value).toUpperCase()]);
                query.outSpatialReference = this.map.spatialReference;
                query.outFields = ["*"];
                var QueryOverlayTask = qtask.execute(query, function (featureSet) {
                    var deferred = new dojo.Deferred();
                    deferred.resolve(featureSet);
                    return deferred.promise;

                },
                    function (err) {
                        this._locatorErrBack();
                    });
                deferredListarr.push(QueryOverlayTask);
                this._getUnifiedResult(deferredListarr, layerInfo, index);
            },

            //Result for Parcel Layer , RoadLine Layer and overlay Layer
            _getUnifiedResult: function (deferredListarr, layerInfo, index) {
                var deferredListResult = new dojo.DeferredList(deferredListarr);
                deferredListResult.then(lang.hitch(this, function (result) {
                    domConstruct.empty(this.divAddressResults);
                    if (result[0][0]) {
                        this._populateSearchItem(result[0][1], searchFields);
                    }
                    if (result[1][0]) {
                        this._findDisplayRoad(result[1][1]);
                    }
                    for (i = 2; i < deferredListarr.length; i++) {
                        if (result[i][0]) {
                            this._populateData(result[i][1], layerInfo, index);
                        }
                    }
                    domClass.add(this.divAddressContent, "esriCTAddressContainerHeight");
                    domStyle.set(this.imgSearchLoader, "display", "none");
                    domStyle.set(this.close, "display", "block");
                }));

            },

            //Populate data for overlay layer
            _populateData: function (featureSet, layerInfo, index) {
                var _this = this;
                this.overLayerArray.length = 0;
                overlayLayerSettings = dojo.configData.OverlayLayerSettings;
                var DisplayField = [];
                var features = featureSet.features;
                var searchText = lang.trim(this.txtAddress.value);
                if (featureSet) {
                    if (featureSet.features.length > 0) {
                        var whereSearchText = searchText.toUpperCase();
                        for (var i = 0; i < features.length; i++) {
                            var feature = features[i];
                            var searchSchoolFields = layerInfo.SearchDisplayFields.split(",");
                            array.some(searchSchoolFields, function (field) {
                                var value = feature.attributes[field];

                                if (value && value.toUpperCase().indexOf(whereSearchText) >= 0) {
                                    feature.foundFieldName = field;
                                    feature.value = value;
                                    return true;
                                }
                                return false;
                            });
                        }
                    }
                    var addressSchoolFields = overlayLayerSettings[index].SearchDisplayFields.split(",");
                    for (var i = 0; i < features.length; i++) {
                        for (var j = 0; j < addressSchoolFields.length; j++) {
                            if (features[i].foundFieldName === addressSchoolFields[j]) {
                                DisplayField[i] = addressSchoolFields[j];
                            }
                        }
                        this.overLayerArray.push({
                            attr: featureSet.features[i],
                            fields: featureSet.fields,
                            index: index,
                            layerID: layerInfo,
                            displayField: DisplayField[i]
                        });
                    }
                    if (this.overLayerArray.length > 0) {
                        domStyle.set(this.imgSearchLoader, "display", "block");
                        domStyle.set(this.close, "display", "none");
                        var searchString = lang.trim(this.txtAddress.value).toLowerCase();
                        var divDispalyResultContainer = domConstruct.create("div", {}, this.divAddressResults);
                        var divHeadding = domConstruct.create("div", {
                            "class": "esriCTBottomBorder esriCTCursorPointer esriAddressCounty",
                            "innerHTML": "School District"
                        }, divDispalyResultContainer);
                        var arrPermits = [];
                        try {
                            for (var i = 0; i < this.overLayerArray.length; i++) {
                                arrPermits.push({
                                    attributes: this.overLayerArray[i],
                                    searchDisplayField: this.overLayerArray[i].layerID.SearchDisplayFields,
                                    name: this.overLayerArray[i].attr.attributes[this.overLayerArray[i].displayField]
                                });
                            }
                        } catch (e) {
                            alert(messages.getElementsByTagName("falseConfigParams")[0].childNodes[0].nodeValue);
                        }
                        var searchString = lang.trim(this.txtAddress.value).toLowerCase();
                        for (var i = 0; i < this.overLayerArray.length; i++) {
                            var divDisplayRow = domConstruct.create("div", {}, divDispalyResultContainer);
                            var divDisplayColumn = domConstruct.create("div", { "class": "esriCTContentBottomBorder esriCTCursorPointer esriCTResultBottomBorder", "id": i, "title": "Click to locate", "innerHTML": arrPermits[i].name }, divDisplayRow);
                            domAttr.set(divDisplayColumn, "index", i);

                            this.own(on(divDisplayColumn, "click", function () {
                                var attr = arrPermits[this.id];
                                domAttr.set(_this.txtAddress, "defaultAddress", _this.txtAddress.value);
                                _this._hideAddressContainer();
                                domStyle.set(_this.imgSearchLoader, "display", "none");
                                _this._findTaskOverlayResults(attr, index);
                            }));
                        }
                    }
                }
                if (this.splashScreenScrollbar) {
                    domClass.add(this.splashScreenScrollbar._scrollBarContent, "esriCTZeroHeight");
                    this.splashScreenScrollbar.removeScrollBar();
                }
                this.splashScreenScrollbar = new scrollBar({
                    domNode: this.divAddressScrollContent
                });
                this.splashScreenScrollbar.setContent(this.divAddressResults);
                this.splashScreenScrollbar.createScrollBar();


            },
            _findTaskOverlayResults: function (selectedFeature, index) {
                rendererColor = dojo.configData.OverlayLayerSettings[0].OverlayHighlightColor
                var overlayLayerSettings = dojo.configData.OverlayLayerSettings;
                var queryOutFields = dojo.configData.QueryOutFields.split(",");
                overlayQueryUrl = dojo.configData.OverlayLayerSettings[0].LayerUrl;
                this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                var _this = this;
                this.txtAddress.value = (selectedFeature.name);
                if (this.map.getLayer("roadCenterLinesLayerID")) {
                    this.map.getLayer("roadCenterLinesLayerID").clear();
                }
                var query = new Query();
                query.returnGeometry = true;
                query.outFields = queryOutFields;
                query.where = string.substitute(overlayLayerSettings[0].SearchExpression, [lang.trim(this.txtAddress.value).toUpperCase()]);
                var qTask = new QueryTask(overlayQueryUrl);
                var QuerOverlay = qTask.execute(query, lang.hitch(this, function (featureSet) {
                    var selectedSet = featureSet.features[0];
                    var layer = this.map.getLayer("esriGraphicsLayerMapSettings");
                    var lineColor = new Color();
                    lineColor.setColor(rendererColor);
                    var fillColor = new Color();
                    fillColor.setColor(rendererColor);
                    fillColor.a = 0.25;
                    var symbol = new Symbol.SimpleFillSymbol(Symbol.SimpleFillSymbol.STYLE_SOLID, new Symbol.SimpleLineSymbol(Symbol.SimpleLineSymbol.STYLE_SOLID, lineColor, 3), fillColor);
                    selectedSet.setSymbol(symbol);
                    ringsmultiPoint = new Geometry.Multipoint(new SpatialReference({ wkid: 3857 }));
                    for (var i = 0; i < selectedSet.geometry.rings[0].length; i++)
                        ringsmultiPoint.addPoint(selectedSet.geometry.rings[0][i]);
                    var centerPoint = ringsmultiPoint.getExtent().getCenter();

                    this.map.setExtent(this._getExtentFromPolygon(selectedSet.geometry.getExtent().expand(4)));
                    layer.add(selectedSet);
                }));
            },


            _FindTaskResult: function (selectedFeature) {
                var parcelLayerSettings = dojo.configData.ParcelLayerSettings;
                rendererColor = dojo.configData.ParcelLayerSettings.ParcelHighlightColor
                taxParcelQueryURL = dojo.configData.ParcelLayerSettings.LayerUrl;
                parcelInformation = dojo.configData.AveryLabelSettings[0].ParcelInformation;
                var queryOutFields = dojo.configData.QueryOutFields.split(",");
                this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                var _this = this;
                this.txtAddress.value = (selectedFeature.value);
                if (this.map.getLayer("roadCenterLinesLayerID")) {
                    this.map.getLayer("roadCenterLinesLayerID").clear();
                }
                var query = new Query();

                query.returnGeometry = true;
                query.outFields = queryOutFields;
                query.where = string.substitute(parcelLayerSettings.SearchExpression, [lang.trim(this.txtAddress.value).toUpperCase()]);
                var qTask = new QueryTask(taxParcelQueryURL);
                var QueryTaxParcel = qTask.execute(query, lang.hitch(this, function (featureSet) {
                    var selectedSet = featureSet.features[0];
                    var layer = this.map.getLayer("esriGraphicsLayerMapSettings");
                    var lineColor = new Color();
                    lineColor.setColor(rendererColor);

                    var fillColor = new Color();
                    fillColor.setColor(rendererColor);
                    fillColor.a = 0.25;
                    var symbol = new Symbol.SimpleFillSymbol(Symbol.SimpleFillSymbol.STYLE_SOLID, new Symbol.SimpleLineSymbol(Symbol.SimpleLineSymbol.STYLE_SOLID, lineColor, 3), fillColor);

                    selectedSet.setSymbol(symbol);
                    ringsmultiPoint = new Geometry.Multipoint(new SpatialReference({ wkid: 3857 }));
                    for (var i = 0; i < selectedSet.geometry.rings[0].length; i++)
                        ringsmultiPoint.addPoint(selectedSet.geometry.rings[0][i]);
                    var centerPoint = ringsmultiPoint.getExtent().getCenter();

                    this.map.setExtent(this._getExtentFromPolygon(selectedSet.geometry.getExtent().expand(4)));
                    layer.add(selectedSet);

                }));
            },

            //Get the extent of polygon
            _getExtentFromPolygon: function (extent) {
                var width = extent.getWidth();
                var height = extent.getHeight();
                var xmin = extent.xmin;
                var ymin = extent.ymin - (height / 6);
                var xmax = xmin + width;
                var ymax = ymin + height;
                return new Geometry.Extent(xmin, ymin, xmax, ymax, this.map.spatialReference);
            },

            // Dynamically create contents for infowindow and append the structure in main window
            _createInfoWindowContent: function (feature, mapPoint) {
                infoPopupFieldsCollection = dojo.configData.ParcelLayerSettings.InfoWindowSettings[0].InfoWindowData;
                infoWindowTitle = dojo.configData.ParcelLayerSettings.InfoWindowSettings[0].InfoWindowTitleFields;
                infoPopupHeight = dojo.configData.InfoPopupHeight;
                infoPopupWidth = dojo.configData.InfoPopupWidth;
                var showNullAs = dojo.configData.ShowNullValueAs;
                displayInfo = feature.attributes[parcelInformation.AliasParcelField] + "$infoParcel";
                selectedPoint = mapPoint;
                var divDetailsTab = domConstruct.create("div", { "width": "100%", "height": "100%" }, null);
                var scrollbar_container = domConstruct.create("div", { "id": "scrollbar_container1", "className": "scrollbar_container" }, divDetailsTab);
                scrollbar_container.style.height = (infoPopupHeight - 80) + "px";
                var scrollContent = domConstruct.create("div", { "id": "scrollList1", "className": "scrollbar_content", "display": "block" }, scrollbar_container);
                scrollContent.style.height = (infoPopupHeight - 80) + "px";
                var divInfoPopup = domConstruct.create("div", { "id": "tblParcels", "className": "esriCTdivTransparent" }, scrollContent);
                for (var key = 0; key < infoPopupFieldsCollection.length; key++) {
                    var divInfoRow = domConstruct.create("div", {}, divInfoPopup);
                    // Create the row's label
                    this.divInfoCol1 = domConstruct.create("div", { "className": "esriCTDisplayField", "id": "divInfoCol1", "height": "20", "innerHTML": infoPopupFieldsCollection[key].DisplayText }, divInfoRow);
                    this.divInfoCol2 = domConstruct.create("div", { "className": "esriCTValueField", "id": "divInfoCol2", "height": "20" }, divInfoRow);
                    var valueString = "";
                    var aliases = infoPopupFieldsCollection[key].AliasField.split(',');
                    array.forEach(aliases, function (term) {
                        var value = feature.attributes[term];
                        if (value && value !== "Null") {
                            valueString += value + " ";
                        }
                    });

                    if (valueString.length === 0) {
                        var fieldNames = infoPopupFieldsCollection[key].FieldName.split(',');
                        array.forEach(fieldNames, function (term) {
                            var value = feature.attributes[term];
                            if (value && value !== "Null") {
                                valueString += value + " ";
                            }
                        });

                    }
                    if (valueString.length === 0) {
                        valueString = showNullAs;
                    }


                    this.divInfoCol2.innerHTML = valueString;
                }
                var divDisplay = domConstruct.create("div", { "width": "100%", "marginTop": "10px", "align": "right" }, divDetailsTab);
                var divDisplayTable = domConstruct.create("div", {}, divDisplay);
                var divDisplayRow = domConstruct.create("div", {}, divDisplayTable);
                var divDisplayColumn1 = domConstruct.create("div", {}, divDisplayRow);
                var divInfoImg = domConstruct.create("img", { "id": "imgAdjacentParcels", "src": "/themes/images/add.png" }, divDisplayColumn1);
                this.own(on(divInfoImg, "click", lang.hitch(this, function () {
                    this.polygon = true;
                    this.interactiveParcel = true;
                    selectedPoint = null;
                    displayInfo = null;
                    if (this.isSpanClicked == true) {
                        return;
                    }
                })));
                var divDisplayColumn2 = domConstruct.create("div", {}, divDisplayRow);
                var divSpan = domConstruct.create("span", { "id": "spanAdjacentParcels", "class": "esrictDivSpan", "display": "block", "innerHTML": "Add adjacent parcel" }, divDisplayColumn2);
                this.own(on(divSpan, "click", lang.hitch(this, function () {
                    this.polygon = true;
                    this.interactiveParcel = true;
                    selectedPoint = null;
                    displayInfo = null;
                    if (this.isSpanClicked == true) {
                        return;
                    }

                })));
                //function to append dynamically created data in infowindow
                this._resetInfoWindowContent(divDetailsTab);
                this.map.infoWindow.resize(infoPopupWidth, infoPopupHeight);
                var possibleTitleFields = infoWindowTitle.split(",");
                var infoTitle = "";
                array.some(possibleTitleFields, function (field) {
                    if (feature.attributes[field] && feature.attributes[field] !== "Null") {
                        infoTitle = feature.attributes[field];
                        return true;
                    }
                    return false;
                });
                this.map.infoWindow.hide();
                selectedMapPoint = mapPoint;
                dojo.selectedMapPoint = selectedMapPoint;
                this.map.setExtent(this._getBrowserMapExtent(selectedMapPoint));
                var screenPoint = this.map.toScreen(selectedMapPoint);
                screenPoint.y = this.map.height - screenPoint.y;
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

            _resetInfoWindowContent: function (detailsTab) {
                var x = query(".infopanel")[0]
                this.RemoveChildren(dojo.byId("divInfoDetailsScroll"));
                dojo.byId("divInfoDetailsScroll").appendChild(detailsTab);
            },

            //Refresh address container div
            RemoveChildren: function (parentNode) {
                if (parentNode) {
                    while (parentNode.hasChildNodes()) {
                        parentNode.removeChild(parentNode.lastChild);
                    }
                }
            },



            _FindAndShowRoads: function () {
                var roadLayerSettings = dojo.configData.RoadCenterLayerSettings;
                var query = new Query();
                if (this.map.getLayer("roadCenterLinesLayerID")) {
                    this.map.getLayer("roadCenterLinesLayerID").clear();
                }
                query.where = "UPPER(" + roadLayerSettings.SearchDisplayFields + ") LIKE '" + lang.trim(this.txtAddress.value).toUpperCase() + "%'";
                this.map.getLayer("roadCenterLinesLayerID").selectFeatures(query, esri.layers.FeatureLayer.SELECTION_NEW, lang.hitch(this, function (features) {
                    this._ShowSelectedRoads()
                }));

            },
            _ShowSelectedRoads: function () {
                var polyLine = new esri.geometry.Polyline(this.map.spatialReference);
                var numSegments = this.map.getLayer("roadCenterLinesLayerID").graphics.length;
                var roadArray = [];
                if (0 < numSegments) {
                    for (var j = 0; j < numSegments; j++) {
                        if (this.map.getLayer("roadCenterLinesLayerID").graphics[j]) {
                            polyLine.addPath(this.map.getLayer("roadCenterLinesLayerID").graphics[j].geometry.paths[0]);
                        }
                        roadArray.push(this.map.getLayer("roadCenterLinesLayerID").graphics[j].attributes[this.map.getLayer("roadCenterLinesLayerID").objectIdField]);
                    }
                    this.map.setExtent(polyLine.getExtent().expand(1.5));
                }

            },

            /**
            * hide search panel
            * @memberOf widgets/locator/locator
            */
            _hideAddressContainer: function () {
                domClass.replace(this.domNode, "esriCTTdHeaderSearch", "esriCTTdHeaderSearch-select");
                this.txtAddress.blur();
                domClass.replace(this.divAddressHolder, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
                domClass.replace(this.divAddressHolder, "esriCTZeroHeight", "esriCTAddressContentHeight");
                //                 domStyle.set(this.divAddressScrollContent, "display", "none");
            },

            /**
            * set height of the search panel
            * @memberOf widgets/locator/locator
            */
            _setHeightAddressResults: function () {
                /**
                * divAddressContent Container for search results
                * @member {div} divAddressContent
                * @private
                * @memberOf widgets/locator/locator
                */
                var height = domGeom.getMarginBox(this.divAddressContent).h;
                if (height > 0) {
                    /**
                    * divAddressScrollContent Scrollbar container for search results
                    * @member {div} divAddressScrollContent
                    * @private
                    * @memberOf widgets/locator/locator
                    */
                    this.divAddressScrollContent.style.height = (height - 120) + "px";

                }
            },

            /**
            * display search by address tab
            * @memberOf widgets/locator/locator
            */
            _showAddressSearchView: function () {
                if (this.imgSearchLoader.style.display == "block") {
                    return;
                }
                this.txtAddress.value = domAttr.get(this.txtAddress, "defaultAddress");
                this.lastSearchString = lang.trim(this.txtAddress.value);
                //domConstruct.empty(this.divAddressResults);
            },

            /**
            * display error message if locator service fails or does not return any results
            * @memberOf widgets/locator/locator
            */
            _locatorErrBack: function () {
                domConstruct.empty(this.divAddressResults);
                domStyle.set(this.imgSearchLoader, "display", "none");
                domStyle.set(this.close, "display", "block");
                var errorAddressCounty = domConstruct.create("div", {
                    "class": "esriCTBottomBorder esriCTCursorPointer esriAddressCounty"
                }, this.divAddressResults);
                errorAddressCounty.innerHTML = nls.errorMessages.invalidSearch;
            },

            onSetMapTipPosition: function (selectedPoint, map) {
                if (selectedPoint) {
                    var screenPoint = map.toScreen(selectedPoint);
                    screenPoint.y = map.height - screenPoint.y;
                    map.infoWindow.setLocation(screenPoint);
                }
            },
            /**
            * clear default value from search textbox
            * @param {object} evt Dblclick event
            * @memberOf widgets/locator/locator
            */
            _clearDefaultText: function (evt) {
                this.txtAddress.value = '';
                var target = window.event ? window.event.srcElement : evt ? evt.target : null;
                if (!target) return;
                target.style.color = "#FFF";
                target.value = '';
            },

            /**
            * set default value to search textbox
            * @param {object} evt Blur event
            * @memberOf widgets/locator/locator
            */
            _replaceDefaultText: function (evt) {
                var target = window.event ? window.event.srcElement : evt ? evt.target : null;
                if (!target) return;
                this._resetTargetValue(target, "defaultAddress", "gray");

            },

            /**
            * set default value to search textbox
            * @param {object} target Textbox dom element
            * @param {string} title Default value
            * @param {string} color Background color of search textbox
            * @memberOf widgets/locator/locator
            */
            _resetTargetValue: function (target, title, color) {
                if (target.value == '' && domAttr.get(target, title)) {
                    target.value = target.title;
                    if (target.title == "") {
                        target.value = domAttr.get(target, title);
                    }
                }
                if (domClass.contains(target, "esriCTColorChange")) {
                    domClass.remove(target, "esriCTColorChange");
                }
                domClass.add(target, "esriCTBlurColorChange");
                this.lastSearchString = lang.trim(this.txtAddress.value);
            }

        });
    });