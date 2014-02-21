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
        "dijit/TooltipDialog",
        "dojo/i18n!nls/localizedStrings",
        "dojo/topic",
        "esri/tasks/query",
        "esri/tasks/QueryTask",
        "esri/graphic",
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
        "dijit/place",
        "esri/layers/FeatureLayer",
        "esri/SpatialReference"
    ],
    function (declare, domConstruct, domStyle, domAttr, lang, on, domGeom, dom, domClass, string, Locator, window, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, TooltipDialog, nls, topic, Query, QueryTask, Graphic, scrollBar, dojoQuery, InfoWindow, array, Deferred, DeferredList, all, Color, Symbol, Geometry, Place, FeatureLayer, SpatialReference) {

        //========================================================================================================================//
        return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            nls: nls,
            lastSearchString: null,
            stagedSearch: null,
            mapPoint: null,
            nameArray: [],
            overLayerArray: [],
            addressContainerScrollbar: null,
            interactiveParcel: null,
            selectedPoint: null,
            isSpanClicked: false,
            deferredListarr: [],
            bufferArray: [],
            toolTipContents: null, //variable to store the content's for tooltip
            /**
            * display locator widget
            *
            * @class
            * @name widgets/locator/locator
            */

            postCreate: function () {

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
                topic.subscribe("setMapTipPosition", this.onSetMapTipPosition);
                topic.subscribe("createInfoWindowContent", lang.hitch(this, this.onCreateInfoWindowContent));
                topic.subscribe("removeChildren", lang.hitch(this, this.onRemoveChildren));
                topic.subscribe("showErrorMessage", lang.hitch(this, this.onShowErrorMessage));
                topic.subscribe("drawPolygon", lang.hitch(this, this.ondrawPolygon));
                topic.subscribe("hideMapTip", lang.hitch(this, this.hideMapTip));
                this.domNode = domConstruct.create("div", { "title": this.title, "class": "esriCTTdHeaderSearch" }, null);
                topic.subscribe("showMapTipForParcels", lang.hitch(this, this.showMapTipForParcels));

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
                this.close.src = dojoConfig.baseURL + "/js/library/themes/images/searchClose.png";
                this.imgSearchLoader.src = dojoConfig.baseURL + "/js/library/themes/images/blue-loader.gif";

                this._setDefaultTextboxValue();
                this._attachLocatorEvents();
            },

            /**
            * set default value of locator textbox as specified in configuration file
            * @param {array} dojo.configData.LocatorSettings.Locators Locator settings specified in configuration file
            * @memberOf widgets/locator/locator
            */
            _setDefaultTextboxValue: function () {
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
                this.own(on(this.txtAddress, "focus", lang.hitch(this, function () {
                    domStyle.set(this.close, "display", "block");
                    domClass.add(this.txtAddress, "esriCTColorChange");
                })));
                this.own(on(this.close, "click", lang.hitch(this, function () {
                    this._hideText();
                    domConstruct.empty(this.divAddressResults);
                })));
            },

            _hideText: function () {
                this.txtAddress.value = "";
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
                    this.lastSearchString = lang.trim(this.txtAddress.value);
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
                    this._locatorErrBack();
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
                this.deferredListarr.length = 0;
                var taxParcelQueryUrl = dojo.configData.ParcelLayerSettings.LayerUrl;
                domStyle.set(this.imgSearchLoader, "display", "block");
                domStyle.set(this.close, "display", "none");
                domAttr.set(this.txtAddress, "defaultAddress", this.txtAddress.value);
                this._setHeightAddressResults();
                this._queryRoadLineLayer();
                this._queryParcelLayer();
                this._queryOverlayLayer();
                var deferredListResult = new DeferredList(this.deferredListarr);
                deferredListResult.then(lang.hitch(this, function (result) {
                    this._getUnifiedResult(result);
                }));
            },

            _queryParcelLayer: function () {
                var deferred = new Deferred();
                var parcelLayerSettings = dojo.configData.ParcelLayerSettings;
                var taxParcelQueryUrl = dojo.configData.ParcelLayerSettings.LayerUrl;
                var queryOutFields = dojo.configData.QueryOutFields.split(",");
                var query = new Query();
                query.returnGeometry = false;
                query.outFields = queryOutFields;
                query.where = string.substitute(parcelLayerSettings.SearchExpression, [lang.trim(this.txtAddress.value).toUpperCase()]);
                var qTask = new QueryTask(taxParcelQueryUrl);
                var queryTaxParcel = qTask.execute(query, lang.hitch(this, function (featureSet) {
                    setTimeout(function () {
                        deferred.resolve(featureSet);
                    }, 1000);
                    return deferred.promise;
                }, function (err) {
                    domStyle.set(this.imgSearchLoader, "display", "none");
                    domStyle.set(this.close, "display", "block");
                    this._locatorErrBack();
                }));
                this.deferredListarr.push(queryTaxParcel);
            },

            _queryRoadLineLayer: function () {
                var deferred = new Deferred();
                var roadLineLayerSettings = dojo.configData.RoadCenterLayerSettings;
                var queryRoadLayer = new Query();
                queryRoadLayer.where = string.substitute(roadLineLayerSettings.SearchExpression, [lang.trim(this.txtAddress.value).toUpperCase()]); ;
                domStyle.set(this.imgSearchLoader, "display", "block");
                domStyle.set(this.close, "display", "none");

                var queryRoadLayer1 = this.map.getLayer("roadCenterLinesLayerID").queryFeatures(queryRoadLayer, lang.hitch(this, function (features) {
                    setTimeout(function () {
                        deferred.resolve(features);
                    }, 700);
                    return deferred.promise;
                }));
                this.deferredListarr.push(queryRoadLayer1);
            },

            //Get Overlaylayer
            _queryOverlayLayer: function () {
                var overlayLayerSettings = dojo.configData.OverlayLayerSettings;
                var deferred = new Deferred();
                this.overLayerArray.length = 0;
                for (var index = 0; index < overlayLayerSettings.length; index++) {
                    var qtask = new QueryTask(overlayLayerSettings[index].LayerUrl);
                    var query = new Query();
                    query.returnGeometry = true;
                    query.where = string.substitute(overlayLayerSettings[index].SearchExpression, [lang.trim(this.txtAddress.value).toUpperCase()]);
                    query.outSpatialReference = this.map.spatialReference;
                    query.outFields = ["*"];
                    var queryOverlayTask = qtask.execute(query, function (featureSet) {
                        setTimeout(function () {
                            deferred.resolve(featureSet);
                        }, 500);
                        return deferred.promise;
                    }, function (err) {
                        this._locatorErrBack();
                    });
                    this.deferredListarr.push(queryOverlayTask);
                }
            },

            //Populate data for parcel layer
            _populateSearchItem: function (featureSet) {
                var searchFields = dojo.configData.SearchSettings.MultipleResults.split(",");
                domStyle.set(this.imgSearchLoader, "display", "block");
                domStyle.set(this.close, "display", "none");
                var searchText = lang.trim(this.txtAddress.value).toLowerCase();
                var displayField = [];
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
                    for (i = 0; i < features.length; i++) {
                        if (features[i].foundFieldName === addressParcelFields[0])
                            displayField[i] = addressParcelFields[0];
                        else if (features[i].foundFieldName === addressParcelFields[1])
                            displayField[i] = addressParcelFields[1];
                    }
                    var divDispalyResultContainer = domConstruct.create("div", { "class": "esriCTSerachAddressRow" }, this.divAddressResults);
                    var divHeading = domConstruct.create("div", { "class": "esriCTBottomBorder esriCTCursorPointer esriAddressCounty", "innerHTML": nls.parcelDisplayText }, divDispalyResultContainer);
                    for (i = 0; i < features.length; i++) {
                        domStyle.set(this.imgSearchLoader, "display", "block");
                        domStyle.set(this.close, "display", "none");
                        var divDisplayRow = domConstruct.create("div", { "class": "esriCTSerachAddressRow" }, divDispalyResultContainer);
                        var divDisplayColumn = domConstruct.create("div", { "class": "esriCTContentBottomBorder esriCTCursorPointer esriCTResultBottomBorder", "id": i, "title": nls.ClickToLocate, "innerHTML": features[i].attributes[displayField[i]] }, divDisplayRow);
                        domAttr.set(divDisplayColumn, "parcelId", features[i].attributes[addressParcelFields[0]]);

                        this.own(on(divDisplayColumn, "click", lang.hitch(this, function (evt) {
                            if (this.map.getLayer("tempBufferLayer")) {
                                this.map.getLayer("tempBufferLayer").clear();
                            }
                            var target = (evt.currentTarget) ? evt.currentTarget : evt.srcElement;
                            this.txtAddress.value = target.innerHTML;
                            domAttr.set(this.txtAddress, "defaultAddress", this.txtAddress.value);
                            this.txtAddress.style.color = "#6e6e6e";
                            this._findTaskResult(features[target.id]);
                            this._hideAddressContainer();
                            domStyle.set(this.imgSearchLoader, "display", "none");
                        })));
                    }
                }
            },

            //Populate data for roadline layer
            _findDisplayRoad: function (featureSets) {
                var nameArray = [];
                var numUnique = 0;
                var _this = this;
                this.txtAddress.value = lang.trim(this.txtAddress.value);
                var roadLineLayerSettings = dojo.configData.RoadCenterLayerSettings;
                if (featureSets.features.length > 0) {
                    domStyle.set(this.imgSearchLoader, "display", "block");
                    domStyle.set(this.close, "display", "none");
                    var searchString = lang.trim(this.txtAddress.value).toLowerCase();
                    var divDispalyResultContainer = domConstruct.create("div", {}, this.divAddressResults);
                    var divHeading = domConstruct.create("div", {
                        "class": "esriCTBottomBorder esriCTCursorPointer esriAddressCounty",
                        "innerHTML": nls.roadDisplayText
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
                            return -1;
                        if (nameA >= nameB)
                            return 1;
                    });
                    for (var i = 0; i < nameArray.length; i++) {
                        if (0 == i || searchString != nameArray[i].attributes[roadLineLayerSettings.SearchDisplayFields].toLowerCase()) {
                            if (i > 0) {
                                var previousFoundName = nameArray[i - 1].attributes[roadLineLayerSettings.SearchDisplayFields]
                            } else {
                                previousFoundName = "";
                            }
                            if (nameArray[i].attributes[roadLineLayerSettings.SearchDisplayFields] != previousFoundName) {
                                ++numUnique;
                                var divDisplayRow = domConstruct.create("div", {}, divDispalyResultContainer);
                                var divDisplayColumn = domConstruct.create("div", { "class": "esriCTContentBottomBorder esriCTCursorPointer esriCTResultBottomBorder", "id": "i", "title": nls.ClickToLocate, "innerHTML": nameArray[i].attributes[roadLineLayerSettings.SearchDisplayFields] }, divDisplayRow);
                                domAttr.set(divDisplayColumn, "OBJECTID", nameArray[0].attributes[this.map.getLayer("roadCenterLinesLayerID").objectIdField]);
                                this.own(on(divDisplayColumn, "click", function () {
                                    if (_this.map.getLayer("tempBufferLayer")) {
                                        _this.map.getLayer("tempBufferLayer").clear();
                                    }
                                    domStyle.set(_this.imgSearchLoader, "display", "none");
                                    _this.txtAddress.value = this.innerHTML;
                                    domAttr.set(_this.txtAddress, "defaultAddress", _this.txtAddress.value);
                                    _this.txtAddress.style.color = "#6e6e6e";
                                    _this._findAndShowRoads();
                                    _this._hideAddressContainer();
                                }));
                            }
                        }
                    }
                }
            },

            //Result for Parcel Layer , RoadLine Layer and overlay Layer
            _getUnifiedResult: function (result) {
                if (result[0][1].features.length == 0 && result[1][1].features.length == 0 && result[2][1].features.length == 0) {
                    this._locatorErrBack();
                } else {
                    var temp = 0;
                    domConstruct.empty(this.divAddressResults);
                    if (result[1][0]) {
                        this._populateSearchItem(result[1][1]);
                    }
                    if (result[0][0]) {
                        this._findDisplayRoad(result[0][1]);
                    }
                    for (var i = 2; i < this.deferredListarr.length; i++) {
                        if (result[i][0]) {
                            var overlayLayerSettings = dojo.configData.OverlayLayerSettings;
                            this._populateData(result[i][1], overlayLayerSettings[temp]);
                            temp++;
                        }
                    }
                    domClass.add(this.divAddressContent, "esriCTAddressContainerHeight");
                    domStyle.set(this.imgSearchLoader, "display", "none");
                    domStyle.set(this.close, "display", "block");
                    if (this.addressContainerScrollbar) {
                        domClass.add(this.addressContainerScrollbar._scrollBarContent, "esriCTZeroHeight");
                        this.addressContainerScrollbar.removeScrollBar();
                    }
                    this.addressContainerScrollbar = new scrollBar({
                        domNode: this.divAddressScrollContent
                    });
                    this.addressContainerScrollbar.setContent(this.divAddressResults);
                    this.addressContainerScrollbar.createScrollBar();
                }
            },

            //Populate data for overlay layer
            _populateData: function (featureSet, layerInfo) {
                var _this = this;
                this.overLayerArray.length = 0;
                var displayField = [];
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
                    var addressSchoolFields = layerInfo.SearchDisplayFields.split(",");
                    for (i = 0; i < features.length; i++) {
                        for (var j = 0; j < addressSchoolFields.length; j++) {
                            if (features[i].foundFieldName === addressSchoolFields[j]) {
                                displayField[i] = addressSchoolFields[j];
                            }
                        }
                        this.overLayerArray.push({
                            attr: featureSet.features[i],
                            fields: featureSet.fields,
                            layerID: layerInfo,
                            displayField: displayField[i]
                        });
                    }
                    if (this.overLayerArray.length > 0) {
                        domStyle.set(this.imgSearchLoader, "display", "block");
                        domStyle.set(this.close, "display", "none");
                        var divDispalyResultContainer = domConstruct.create("div", {}, this.divAddressResults);
                        var divHeading = domConstruct.create("div", {
                            "class": "esriCTBottomBorder esriCTCursorPointer esriAddressCounty",
                            "innerHTML": nls.overLayDisplayText
                        }, divDispalyResultContainer);
                        var arrOverLay = [];
                        try {
                            for (var i = 0; i < this.overLayerArray.length; i++) {
                                arrOverLay.push({
                                    attributes: this.overLayerArray[i],
                                    searchDisplayField: this.overLayerArray[i].layerID.SearchDisplayFields,
                                    name: this.overLayerArray[i].attr.attributes[this.overLayerArray[i].displayField]
                                });
                            }
                        } catch (e) {
                            alert(nls.errorMessages.falseConfigParams);
                        }
                        for (var i = 0; i < this.overLayerArray.length; i++) {
                            var divDisplayRow = domConstruct.create("div", {}, divDispalyResultContainer);
                            var divDisplayColumn = domConstruct.create("div", { "class": "esriCTContentBottomBorder esriCTCursorPointer esriCTResultBottomBorder", "id": i, "title": nls.ClickToLocate, "innerHTML": arrOverLay[i].name }, divDisplayRow);
                            domAttr.set(divDisplayColumn, "index", i);
                            this.own(on(divDisplayColumn, "click", function () {
                                if (_this.map.getLayer("tempBufferLayer")) {
                                    _this.map.getLayer("tempBufferLayer").clear();
                                }
                                var attr = arrOverLay[this.id];
                                domAttr.set(_this.txtAddress, "defaultAddress", _this.txtAddress.value);
                                _this.txtAddress.style.color = "#6e6e6e";
                                _this._hideAddressContainer();
                                domStyle.set(_this.imgSearchLoader, "display", "none");
                                index = layerInfo.index;
                                _this._findTaskOverlayResults(attr, index);
                            }));
                        }
                    }
                }
            },

            _findTaskOverlayResults: function (selectedFeature, index) {
                var rendererColor = dojo.configData.OverlayLayerSettings[0].OverlayHighlightColor;
                var overlayLayerSettings = dojo.configData.OverlayLayerSettings;
                var layLayerSettings = dojo.configData.OverlayLayerSettings[0];
                var queryOutFields = dojo.configData.QueryOutFields.split(",");
                var overlayQueryUrl = dojo.configData.OverlayLayerSettings[0].LayerUrl;
                this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                this.txtAddress.value = (selectedFeature.name);
                if (this.map.getLayer("roadCenterLinesLayerID")) {
                    this.map.getLayer("roadCenterLinesLayerID").clear();
                }
                var query = new Query();
                query.returnGeometry = true;
                query.outFields = dojo.configData.SearchDisplayFields;
                query.where = string.substitute(overlayLayerSettings[0].SearchExpression, [lang.trim(this.txtAddress.value).toUpperCase()]);
                var qTask = new QueryTask(overlayQueryUrl);
                var querOverlay = qTask.execute(query, lang.hitch(this, function (featureSet) {
                    var selectedSet = featureSet.features[0];
                    var layer = this.map.getLayer("esriGraphicsLayerMapSettings");
                    var lineColor = new Color();
                    lineColor.setColor(rendererColor);
                    var fillColor = new Color();
                    fillColor.setColor(rendererColor);
                    fillColor.a = 0.25;
                    var symbol = new Symbol.SimpleFillSymbol(Symbol.SimpleFillSymbol.STYLE_SOLID, new Symbol.SimpleLineSymbol(Symbol.SimpleLineSymbol.STYLE_SOLID, lineColor, 3), fillColor);
                    selectedSet.setSymbol(symbol);
                    var ringsmultiPoint = new Geometry.Multipoint(new SpatialReference({ wkid: 3857 }));
                    for (var i = 0; i < selectedSet.geometry.rings[0].length; i++)
                        ringsmultiPoint.addPoint(selectedSet.geometry.rings[0][i]);
                    var centerPoint = ringsmultiPoint.getExtent().getCenter();

                    this.map.setExtent(this._getExtentFromPolygon(selectedSet.geometry.getExtent().expand(4)));
                    setTimeout(function () {
                        topic.publish("createInfoWindowContent", selectedFeature.attributes.attr, centerPoint, layLayerSettings);
                    }, 700);
                    layer.add(selectedSet);
                }));
            },

            _findTaskResult: function (selectedFeature) {
                var parcelLayerSettings = dojo.configData.ParcelLayerSettings;
                var rendererColor = dojo.configData.ParcelLayerSettings.ParcelHighlightColor;
                var taxParcelQueryUrl = dojo.configData.ParcelLayerSettings.LayerUrl;
                var parcelInformation = dojo.configData.AveryLabelSettings[0].ParcelInformation;
                var queryOutFields = dojo.configData.QueryOutFields.split(",");
                this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                this.txtAddress.value = (selectedFeature.value);
                if (this.map.getLayer("roadCenterLinesLayerID")) {
                    this.map.getLayer("roadCenterLinesLayerID").clear();
                }
                var query = new Query();
                query.returnGeometry = true;
                query.outFields = queryOutFields;
                query.where = string.substitute(parcelLayerSettings.SearchExpression, [lang.trim(this.txtAddress.value).toUpperCase()]);
                var qTask = new QueryTask(taxParcelQueryUrl);
                var queryTaxParcel = qTask.execute(query, lang.hitch(this, function (featureSet) {
                    var selectedSet = featureSet.features[0];
                    var layer = this.map.getLayer("esriGraphicsLayerMapSettings");
                    var lineColor = new Color();
                    lineColor.setColor(rendererColor);

                    var fillColor = new Color();
                    fillColor.setColor(rendererColor);
                    fillColor.a = 0.25;
                    var symbol = new Symbol.SimpleFillSymbol(Symbol.SimpleFillSymbol.STYLE_SOLID, new Symbol.SimpleLineSymbol(Symbol.SimpleLineSymbol.STYLE_SOLID, lineColor, 3), fillColor);

                    selectedSet.setSymbol(symbol);
                    var ringsmultiPoint = new Geometry.Multipoint(new SpatialReference({ wkid: 3857 }));
                    for (var i = 0; i < selectedSet.geometry.rings[0].length; i++)
                        ringsmultiPoint.addPoint(selectedSet.geometry.rings[0][i]);
                    var centerPoint = ringsmultiPoint.getExtent().getCenter();
                    this.map.setExtent(this._getExtentFromPolygon(selectedSet.geometry.getExtent().expand(4)));
                    this.map.infoWindow.hide();
                    setTimeout(function () {
                        topic.publish("createInfoWindowContent", selectedSet, centerPoint, parcelLayerSettings);
                    }, 700);
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
            onCreateInfoWindowContent: function (feature, mapPoint, layerSettings) {
                if (dojoQuery(".esrictDivSpan1")[0]) {
                    var adjacentParcel = dojoQuery(".esrictDivSpan1")[0];
                    domStyle.set(adjacentParcel, "display", "none");
                    var imgAdjacentParcels = dojoQuery(".imgAdjacentParcels1")[0];
                    domStyle.set(imgAdjacentParcels, "display", "none");
                }

                var infoPopupFieldsCollection = layerSettings.InfoWindowSettings[0].InfoWindowData;
                var infoWindowTitle = layerSettings.InfoWindowSettings[0].InfoWindowTitleFields;
                var infoPopupHeight = dojo.configData.InfoPopupHeight;
                var infoPopupWidth = dojo.configData.InfoPopupWidth;
                var showNullAs = dojo.configData.ShowNullValueAs;
                this.divDataDetails = dojoQuery(".divDataDisplay")[0];
                domConstruct.empty(dojoQuery(".divDataDisplay")[0]);
                this.selectedPoint = mapPoint;
                var divDetailsTab = domConstruct.create("div", { "class": "divDetailsTab" }, null);
                this.divInfoPopup = domConstruct.create("div", { "id": "tblParcels", "class": "esriCTDivTransparent" }, divDetailsTab);
                for (var key = 0; key < infoPopupFieldsCollection.length; key++) {
                    var divInfoRow = domConstruct.create("div", { "class": "esriCTDisplayRow" }, this.divInfoPopup);
                    this.divDispalyField = domConstruct.create("div", { "class": "esriCTDisplayField", "id": "divDispalyField", "innerHTML": infoPopupFieldsCollection[key].DisplayText }, divInfoRow);
                    this.divValueField = domConstruct.create("div", { "class": "esriCTValueField", "id": "divValueField" }, divInfoRow);
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
                            if (value && value !== "null") {
                                valueString += value + " ";
                            }
                        });
                    }
                    if (valueString.length === 0) {
                        valueString = showNullAs;
                    }
                    this.divValueField.innerHTML = valueString;
                }
                if (layerSettings == dojo.configData.ParcelLayerSettings) {
                    var divDisplayRow = domConstruct.create("div", {}, this.divDataDetails);
                    var divDisplayColumn1 = domConstruct.create("div", {}, divDisplayRow);
                    var divInfoImg = domConstruct.create("img", { "id": "imgAdjacentParcels", "class": "imgAdjacentParcels" }, divDisplayColumn1);
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
                    var divSpan = domConstruct.create("span", { "id": "spanAdjacentParcels", "class": "esrictDivSpan", "innerHTML": nls.spanAdjacentParcels }, divDisplayColumn2);
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

                    if (dojoQuery(".esrictDivSpan")[0]) {
                        var adjacentParcel = dojoQuery(".esrictDivSpan")[0];
                        domStyle.set(adjacentParcel, "display", "block");
                        var imgAdjacentParcels = dojoQuery(".imgAdjacentParcels")[0];
                        domStyle.set(imgAdjacentParcels, "display", "block");
                    }
                }
                this.map.infoWindow.resize(infoPopupWidth, infoPopupHeight);
                var possibleTitleFields = infoWindowTitle.split(",");
                var infoTitle = "";
                array.some(possibleTitleFields, function (field) {
                    if (feature.attributes[field] && feature.attributes[field] !== "null") {
                        infoTitle = feature.attributes[field];
                        return true;
                    }
                    return false;
                });
                this.map.infoWindow.hide(dojo.selectedMapPoint);
                var selectedMapPoint = mapPoint;
                dojo.selectedMapPoint = selectedMapPoint;
                var extentChanged = this.map.setExtent(this._getBrowserMapExtent(selectedMapPoint));
                extentChanged.then(lang.hitch(this, function () {
                    var screenPoint = this.map.toScreen(selectedMapPoint);
                    screenPoint.y = this.map.height - screenPoint.y;
                    this.map.infoWindow.setTitle(infoTitle);
                    this.map.infoWindow.show(divDetailsTab, screenPoint);
                }));

            },

            showMapTipForParcels: function (evt) {
                if (this.map.getLayer("esriGraphicsLayerMapSettings").graphics.length) {
                    if (dojo.isSpanClicked) {
                        topic.publish("hideMapTip");
                        var dialog = new TooltipDialog({
                            id: "toolTipDialogues",
                            content: nls.ToolTipContents.Parcel,
                            style: "position: absolute; z-index:1000;"
                        });
                        dialog.startup();
                        domStyle.set(dialog.domNode, "opacity", 0.80);
                        Place.at(dialog.domNode, { x: evt.pageX, y: evt.pageY }, ["TL", "TR"], { x: 5, y: 5 });
                    }
                }

            },

            hideMapTip: function () {
                if (dijit.byId('toolTipDialogues')) {
                    dijit.byId('toolTipDialogues').destroy();
                }
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

            //Refresh address container div
            onRemoveChildren: function (parentNode) {
                if (parentNode) {
                    while (parentNode.hasChildNodes()) {
                        parentNode.removeChild(parentNode.lastChild);
                    }
                }
            },

            _findAndShowRoads: function () {
                var roadLayerSettings = dojo.configData.RoadCenterLayerSettings;
                var query = new Query();
                this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                if (this.map.getLayer("roadCenterLinesLayerID")) {
                    this.map.getLayer("roadCenterLinesLayerID").clear();
                }
                query.where = "UPPER(" + roadLayerSettings.SearchDisplayFields + ") LIKE '" + lang.trim(this.txtAddress.value).toUpperCase() + "%'";
                this.map.getLayer("roadCenterLinesLayerID").selectFeatures(query, FeatureLayer.SELECTION_NEW, lang.hitch(this, function (features) {
                    this._showSelectedRoads(features);
                }));

            },

            _showSelectedRoads: function (features) {
                var _this = this;
                var roadLayerSettings = dojo.configData.RoadCenterLayerSettings;
                var polyLine = new Geometry.Polyline(this.map.spatialReference);
                var numSegments = this.map.getLayer("roadCenterLinesLayerID").graphics.length;
                var roadArray = [];
                if (0 < numSegments) {
                    for (var j = 0; j < numSegments; j++) {
                        if (this.map.getLayer("roadCenterLinesLayerID").graphics[j]) {
                            polyLine.addPath(this.map.getLayer("roadCenterLinesLayerID").graphics[j].geometry.paths[0]);
                        }
                        roadArray.push(this.map.getLayer("roadCenterLinesLayerID").graphics[j].attributes[this.map.getLayer("roadCenterLinesLayerID").objectIdField]);
                    }
                    this.map.setExtent(polyLine.getExtent().expand(2));
                    setTimeout(function () {
                        var point = polyLine.getPoint(0, 0);
                        topic.publish("createInfoWindowContent", _this.map.getLayer("roadCenterLinesLayerID").graphics[0], point, roadLayerSettings);
                    }, 1000);
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

            onShowErrorMessage: function (control, message, color) {
                var ctl = dojoQuery(".spanFileUploadMessage")[0];
                ctl.style.display = 'block';
                ctl.innerHTML = message;
                ctl.style.color = color;
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
                this._resetTargetValue(target, "defaultAddress");

            },

            /**
            * set default value to search textbox
            * @param {object} target Textbox dom element
            * @param {string} title Default value
            * @param {string} color Background color of search textbox
            * @memberOf widgets/locator/locator
            */
            _resetTargetValue: function (target, title) {
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
            },

            ondrawPolygon: function (features, share) {
                var parcelArray = [];
                var rendererColor = dojo.configData.ParcelLayerSettings.ParcelHighlightColor;
                var parcelInformation = dojo.configData.AveryLabelSettings[0].ParcelInformation;
                var lineColor = new Color();
                lineColor.setColor(rendererColor);
                var fillColor = new Color();
                fillColor.setColor(rendererColor);
                fillColor.a = 0.25;
                var symbol = new Symbol.SimpleFillSymbol(Symbol.SimpleFillSymbol.STYLE_SOLID, new Symbol.SimpleLineSymbol(Symbol.SimpleLineSymbol.STYLE_SOLID, lineColor, 3), fillColor);
                var qglayer = this.map.getLayer("esriGraphicsLayerMapSettings");
                this.map.graphics.clear();
                var graphicCollection = [];
                var attributeCollection = [];
                for (var i = 0; i < features.length; i++) {
                    if (attributeCollection[features[i].attributes[parcelInformation.LowParcelIdentification]]) {
                        attributeCollection[features[i].attributes[parcelInformation.LowParcelIdentification]].push({ id: features[i].attributes[parcelInformation.ParcelIdentification], name: features[i].attributes });
                        if (!share) {
                            if (i == 1) {
                                parcelArray.push(features[0].attributes[parcelInformation.ParcelIdentification]);
                            }
                        }
                    } else {
                        attributeCollection[features[i].attributes[parcelInformation.LowParcelIdentification]] = [];
                        graphicCollection[features[i].attributes[parcelInformation.LowParcelIdentification]] = features[i].geometry;
                        attributeCollection[features[i].attributes[parcelInformation.LowParcelIdentification]].push({ id: features[i].attributes[parcelInformation.ParcelIdentification], name: features[i].attributes });
                    }
                }
                for (var lowerParcelId in attributeCollection) {
                    var featureData = attributeCollection[lowerParcelId];
                    var parcelAttributeData = [];
                    if (featureData.length > 1) {
                        for (var i = 0; i < featureData.length; i++) {
                            parcelAttributeData[featureData[i].id] = featureData[i].name;
                            if (i == 0) {
                                this.bufferArray.push(featureData[0].name[parcelInformation.ParcelIdentification]);
                            }
                        }
                    } else {
                        parcelAttributeData = featureData[0].name;
                        this.bufferArray.push(featureData[0].name[parcelInformation.ParcelIdentification]);
                    }
                    var graphic = new Graphic(graphicCollection[lowerParcelId], symbol, parcelAttributeData);
                    qglayer.add(graphic);
                }
            }
        });
    });
