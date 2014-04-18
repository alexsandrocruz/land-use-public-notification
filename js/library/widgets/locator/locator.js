/*global define,dojo,dojoConfig,alert,esri,dijit */
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
    "esri/tasks/locator",
    "dojo/text!./templates/locatorTemplate.html",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/TooltipDialog",
    "dojo/i18n!application/js/library/nls/localizedStrings",
    "dojo/topic",
    "esri/tasks/query",
    "esri/tasks/QueryTask",
    "esri/graphic",
    "../scrollBar/scrollBar",
    "esri/urlUtils",
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
], function (declare, domConstruct, domStyle, domAttr, lang, on, domGeom, dom, domClass, string, Locator, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, TooltipDialog, sharedNls, topic, Query, QueryTask, Graphic, ScrollBar, urlUtils, dojoQuery, InfoWindow, array, Deferred, DeferredList, all, Color, Symbol, Geometry, Place, FeatureLayer, SpatialReference) {

    //========================================================================================================================//
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        sharedNls: sharedNls,
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
        displayField: [],
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
            urlUtils.addProxyRule({
                urlPrefix: dojo.configData.GeometryService,
                proxyUrl: dojoConfig.baseURL + dojo.configData.ProxyUrl
            });

            topic.subscribe("toggleWidget", lang.hitch(this, function (widget) {
                if (widget !== "locator") {
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
            topic.subscribe("showMapTipForRoad", lang.hitch(this, this.showMapTipForRoad));
            topic.subscribe("hideRoad", lang.hitch(this, this.hideRoad));
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
                this._submitAddress(evt, false);
            })));
            this.own(on(this.txtAddress, "dblclick", lang.hitch(this, function (evt) {
                this._clearDefaultText(evt);
            })));
            this.own(on(this.txtAddress, "blur", lang.hitch(this, function (evt) {
                this._replaceDefaultText(evt);
            })));
            this.own(on(this.txtAddress, "focus", lang.hitch(this, function () {
                if (domStyle.get(this.imgSearchLoader, "display") === "none") {
                    domStyle.set(this.close, "display", "block");
                }
                domClass.add(this.txtAddress, "esriCTColorChange");
            })));
            this.own(on(this.close, "click", lang.hitch(this, function () {
                this._hideText();
                domConstruct.empty(this.divAddressResults);
            })));
            this.own(on(this.txtAddress, "paste", lang.hitch(this, function (evt) {
                domStyle.set(this.close, "display", "block");
                this._submitAddress(evt, true);
            })));
            this.own(on(this.txtAddress, "cut", lang.hitch(this, function (evt) {
                domStyle.set(this.close, "display", "block");
                this._submitAddress(evt, true);
            })));

        },

        _hideText: function () {
            this.txtAddress.value = "";
            domConstruct.empty(this.divAddressResults, this.divAddressScrollContent);
            domAttr.set(this.txtAddress, "defaultAddress", this.txtAddress.value);
            domClass.remove(this.divAddressContent, "esriCTAddressContainerHeight");
            domClass.remove(this.divAddressContent, "esriCTAddressResultHeight");
            if (this.locatorScrollbar) {
                domClass.add(this.locatorScrollbar._scrollBarContent, "esriCTZeroHeight");
                this.locatorScrollbar.removeScrollBar();
            }
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
        },

        /**
        * search address on every key press
        * @param {object} evt Keyup event
        * @memberOf widgets/locator/locator
        */
        _submitAddress: function (evt, locatorText) {
            var _this = this;
            if (locatorText) {
                setTimeout(lang.hitch(this, function () {
                    this._locate(evt);
                }), 100);
                return;
            }
            if (evt) {
                if (evt.keyCode === dojo.keys.ENTER) {
                    if (this.txtAddress.value !== '') {
                        domStyle.set(_this.imgSearchLoader, "display", "block");
                        domStyle.set(_this.close, "display", "none");
                        this._locate(evt);
                        return;
                    }
                }
                /**
                * do not perform auto complete search if alphabets,
                * numbers,numpad keys,comma,ctl+v,ctrl +x,delete or
                * backspace is pressed
                */
                if ((!((evt.keyCode >= 46 && evt.keyCode < 58) || (evt.keyCode > 64 && evt.keyCode < 91) || (evt.keyCode > 95 && evt.keyCode < 106) || evt.keyCode === 8 || evt.keyCode === 110 || evt.keyCode === 188)) || (evt.keyCode === 86 && evt.ctrlKey) || (evt.keyCode === 88 && evt.ctrlKey)) {
                    evt.cancelBubble = true;
                    if (evt.stopPropagation) {
                        evt.stopPropagation();
                    }
                    domStyle.set(this.imgSearchLoader, "display", "none");
                    domStyle.set(this.close, "display", "block");
                    return;
                }

                domStyle.set(this.imgSearchLoader, "display", "block");
                domStyle.set(this.close, "display", "none");
                /**
                * call locator service if search text is not empty
                */
                if (domGeom.getMarginBox(this.divAddressContent).h > 0) {
                    if (lang.trim(this.txtAddress.value) !== '') {
                        if (this.lastSearchString !== lang.trim(this.txtAddress.value)) {
                            this.lastSearchString = lang.trim(this.txtAddress.value);
                            domConstruct.empty(this.divAddressResults);
                            /**
                            * clear any staged search
                            */
                            clearTimeout(this.stagedSearch);
                            if (lang.trim(this.txtAddress.value).length > 0) {

                                /**
                                * stage a new search, which will launch if no new searches show up
                                * before the timeout
                                */
                                this.stagedSearch = setTimeout(lang.hitch(this, function () {
                                    this.stagedSearch = _this._locate();
                                }), 500);
                            }
                        } else {
                            domStyle.set(this.imgSearchLoader, "display", "none");
                            domStyle.set(this.close, "display", "block");
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
            topic.publish("hideMapTip");
            if (dojo.mouseMoveHandle) {
                dojo.mouseMoveHandle.remove();
            }
            dojo.parcelArray.length = 0;
            dojo.roadArray.length = 0;
            dojo.overLayArray.length = 0;
            domConstruct.empty(this.divAddressResults);
            if (lang.trim(this.txtAddress.value) === '') {
                domStyle.set(this.imgSearchLoader, "display", "none");
                domStyle.set(this.close, "display", "block");
                domConstruct.empty(this.divAddressResults);
                this._locatorErrBack();
            } else {
                this._searchLocation();
            }
        },


        _searchLocation: function () {
            var deferredListResult;
            this.deferredListarr.length = 0;
            domStyle.set(this.imgSearchLoader, "display", "block");
            domStyle.set(this.close, "display", "none");
            domAttr.set(this.txtAddress, "defaultAddress", this.txtAddress.value);
            this._queryRoadLineLayer();
            this._queryParcelLayer();
            this._queryOverlayLayer();
            deferredListResult = new DeferredList(this.deferredListarr);
            deferredListResult.then(lang.hitch(this, function (result) {
                this._getUnifiedResult(result);
            }));
        },

        _queryParcelLayer: function () {
            var deferred = new Deferred(), parcelLayerSettings, taxParcelQueryUrl, query, qTask, queryTaxParcel;

            parcelLayerSettings = dojo.configData.ParcelLayerSettings;
            taxParcelQueryUrl = dojo.configData.ParcelLayerSettings.LayerUrl;
            query = new Query();
            query.returnGeometry = false;
            query.outFields = ["*"];
            query.where = string.substitute(parcelLayerSettings.SearchExpression, [lang.trim(this.txtAddress.value).toUpperCase()]);
            qTask = new QueryTask(taxParcelQueryUrl);
            queryTaxParcel = qTask.execute(query, lang.hitch(this, function (featureSet) {
                setTimeout(function () {
                    deferred.resolve(featureSet);
                }, 1000);
                return deferred.promise;
            }, function () {
                domStyle.set(this.imgSearchLoader, "display", "none");
                domStyle.set(this.close, "display", "block");
                this._locatorErrBack();
            }));
            this.deferredListarr.push(queryTaxParcel);
        },

        _queryRoadLineLayer: function () {
            var deferred = new Deferred(), roadLineLayerSettings, queryRoadLayer, queryRoadLyr;
            dojo.interactiveParcel = false;
            roadLineLayerSettings = dojo.configData.RoadCenterLayerSettings;
            queryRoadLayer = new Query();
            queryRoadLayer.where = string.substitute(roadLineLayerSettings.SearchExpression, [lang.trim(this.txtAddress.value).toUpperCase()]);
            domStyle.set(this.imgSearchLoader, "display", "block");
            domStyle.set(this.close, "display", "none");
            queryRoadLyr = this.map.getLayer("roadCenterLinesLayerID").queryFeatures(queryRoadLayer, lang.hitch(this, function (features) {
                setTimeout(function () {
                    deferred.resolve(features);
                }, 700);
                return deferred.promise;
            }));
            this.deferredListarr.push(queryRoadLyr);
        },

        _queryOverlayLayer: function () {
            var overlayLayerSettings = dojo.configData.OverlayLayerSettings, index;
            this.overLayerArray.length = 0;
            for (index = 0; index < overlayLayerSettings.length; index++) {
                this._pushOverlayTask(overlayLayerSettings[index]);
            }
        },

        _pushOverlayTask: function (overlayLayerSettings) {
            var deferred, qtask, query, queryOverlayTask;
            deferred = new Deferred();
            qtask = new QueryTask(overlayLayerSettings.LayerUrl);
            query = new Query();
            query.returnGeometry = true;
            query.where = string.substitute(overlayLayerSettings.SearchExpression, [lang.trim(this.txtAddress.value).toUpperCase()]);
            query.outSpatialReference = this.map.spatialReference;
            query.outFields = ["*"];
            queryOverlayTask = qtask.execute(query, function (featureSet) {
                setTimeout(function () {
                    deferred.resolve(featureSet);
                }, 500);
                return deferred.promise;
            }, function () {
                this._locatorErrBack();
            });
            this.deferredListarr.push(queryOverlayTask);
        },

        //Populate data for parcel layer
        _populateSearchItem: function (featureSet) {
            var searchFields, searchText, features, parcelLayerSettings, i, addressParcelFields;

            searchFields = dojo.configData.SearchSettings.MultipleResults.split(",");
            domStyle.set(this.imgSearchLoader, "display", "block");
            domStyle.set(this.close, "display", "none");
            searchText = lang.trim(this.txtAddress.value).toLowerCase();
            features = featureSet.features;
            parcelLayerSettings = dojo.configData.ParcelLayerSettings;
            if (features.length > 0) {
                searchText.toUpperCase();
                for (i = 0; i < features.length; i++) {
                    this.feature = features[i];
                    array.some(searchFields, lang.hitch(this, this._filterParcelData));
                }
                addressParcelFields = parcelLayerSettings.SearchDisplayFields.split(",");
                for (i = 0; i < features.length; i++) {
                    if (features[i].foundFieldName === addressParcelFields[0]) {
                        this.displayField[i] = addressParcelFields[0];
                    } else if (features[i].foundFieldName === addressParcelFields[1]) {
                        this.displayField[i] = addressParcelFields[1];
                    }
                }
                this.divDispalyResultContainer = domConstruct.create("div", { "class": "esriCTSerachAddressRow" }, this.divAddressResults);
                domConstruct.create("div", { "class": "esriCTBottomBorder esriCTCursorPointer esriAddressCounty", "innerHTML": dojo.configData.ParcelDisplayText }, this.divDispalyResultContainer);
                for (i = 0; i < features.length; i++) {
                    domStyle.set(this.imgSearchLoader, "display", "block");
                    domStyle.set(this.close, "display", "none");
                    this._displayParcelContainer(features[i], i);
                }
            }
        },

        _displayParcelContainer: function (features, i) {
            var divDisplayRow, divDisplayColumn, target, addressParcelFields = dojo.configData.ParcelLayerSettings.SearchDisplayFields.split(",");
            divDisplayRow = domConstruct.create("div", { "class": "esriCTSerachAddressRow" }, this.divDispalyResultContainer);
            divDisplayColumn = domConstruct.create("div", { "class": "esriCTContentBottomBorder esriCTCursorPointer esriCTResultBottomBorder", "id": i, "title": sharedNls.clickToLocate, "innerHTML": features.attributes[this.displayField[i]] }, divDisplayRow);
            domAttr.set(divDisplayColumn, "parcelId", features.attributes[addressParcelFields[0]]);

            this.own(on(divDisplayColumn, "click", lang.hitch(this, function (evt) {
                if (this.map.getLayer("tempBufferLayer")) {
                    this.map.getLayer("tempBufferLayer").clear();
                }
                target = evt.currentTarget || evt.srcElement;
                this.txtAddress.value = target.innerHTML;
                domAttr.set(this.txtAddress, "defaultAddress", this.txtAddress.value);
                domClass.add(this.txtAddress, "txtColor");
                this._findTaskResult(features);
                this._hideAddressContainer();
                domStyle.set(this.imgSearchLoader, "display", "none");
            })));
        },

        _filterParcelData: function (field) {
            var whereSearchText, value;

            whereSearchText = lang.trim(this.txtAddress.value).toUpperCase();
            value = this.feature.attributes[field];
            if (value && value.toUpperCase().indexOf(whereSearchText) >= 0) {
                this.feature.foundFieldName = field;
                this.feature.value = value;
                return true;
            }
            return false;
        },

        //Populate data for roadline layer
        _findDisplayRoad: function (featureSets) {
            var nameArray = [], roadLineLayerSettings, order, nameA, nameB, i;

            roadLineLayerSettings = dojo.configData.RoadCenterLayerSettings;
            this.txtAddress.value = lang.trim(this.txtAddress.value);
            if (featureSets.features.length > 0) {
                domStyle.set(this.imgSearchLoader, "display", "block");
                domStyle.set(this.close, "display", "none");
                this.divDispalyResultContainer = domConstruct.create("div", {}, this.divAddressResults);
                domConstruct.create("div", {
                    "class": "esriCTBottomBorder esriCTCursorPointer esriAddressCounty",
                    "innerHTML": dojo.configData.RoadDisplayText
                }, this.divDispalyResultContainer);
                for (order = 0; order < featureSets.features.length; order++) {
                    nameArray.push({
                        name: featureSets.features[order].attributes[roadLineLayerSettings.SearchDisplayFields],
                        attributes: featureSets.features[order].attributes,
                        geometry: featureSets.features[order].geometry
                    });
                }
                nameArray.sort(function (a, b) {
                    nameA = a.name.toLowerCase();
                    nameB = b.name.toLowerCase();
                    if (nameA < nameB) { //sort string ascending
                        return -1;
                    }
                    if (nameA >= nameB) {
                        return 1;
                    }
                });
                for (i = 0; i < nameArray.length; i++) {
                    this._displayRoadLineContent(nameArray, i);
                }
            }
        },

        _displayRoadLineContent: function (nameArray, i) {
            var previousFoundName, searchString, divDisplayRow, divDisplayColumn, _this = this, roadLineLayerSettings;

            searchString = lang.trim(this.txtAddress.value).toLowerCase();
            roadLineLayerSettings = dojo.configData.RoadCenterLayerSettings;
            if (0 === i || searchString !== nameArray[i].attributes[roadLineLayerSettings.SearchDisplayFields].toLowerCase()) {
                if (i > 0) {
                    previousFoundName = nameArray[i - 1].attributes[roadLineLayerSettings.SearchDisplayFields];
                } else {
                    previousFoundName = "";
                }
                if (nameArray[i].attributes[roadLineLayerSettings.SearchDisplayFields] !== previousFoundName) {
                    divDisplayRow = domConstruct.create("div", {}, this.divDispalyResultContainer);
                    divDisplayColumn = domConstruct.create("div", { "class": "esriCTContentBottomBorder esriCTCursorPointer esriCTResultBottomBorder", "id": "i", "title": sharedNls.clickToLocate, "innerHTML": nameArray[i].attributes[roadLineLayerSettings.SearchDisplayFields] }, divDisplayRow);
                    this.own(on(divDisplayColumn, "click", function () {
                        if (_this.map.getLayer("tempBufferLayer")) {
                            _this.map.getLayer("tempBufferLayer").clear();
                        }
                        domStyle.set(_this.imgSearchLoader, "display", "none");
                        _this.txtAddress.value = this.innerHTML;
                        domAttr.set(_this.txtAddress, "defaultAddress", _this.txtAddress.value);
                        domClass.add(_this.txtAddress, "txtColor");
                        dojo.polygon = false;
                        _this._findAndShowRoads();
                        _this._hideAddressContainer();
                    }));
                }
            }

        },
        //Result for Parcel Layer , RoadLine Layer and overlay Layer
        _getUnifiedResult: function (result) {
            var temp, i, overlayLayerSettings;
            if (result[0][1].features.length === 0 && result[1][1].features.length === 0 && result[2][1].features.length === 0) {
                this._locatorErrBack();
            } else {
                temp = 0;
                domConstruct.empty(this.divAddressResults);
                if (result[1][0]) {
                    this._populateSearchItem(result[1][1]);
                }
                if (result[0][0]) {
                    this._findDisplayRoad(result[0][1]);
                }
                for (i = 2; i < this.deferredListarr.length; i++) {
                    if (result[i][0]) {
                        overlayLayerSettings = dojo.configData.OverlayLayerSettings;
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
                this.addressContainerScrollbar = new ScrollBar({
                    domNode: this.divAddressScrollContent
                });
                this.addressContainerScrollbar.setContent(this.divAddressResults);
                this.addressContainerScrollbar.createScrollBar();
            }
        },

        //Populate data for overlay layer
        _populateData: function (featureSet, layerInfo) {
            var displayField = [], searchText, i, j, features, arrOverLay = [], searchSchoolFields, addressSchoolFields, divDispalyResultContainer;

            this.overLayerArray.length = 0;
            features = featureSet.features;
            searchText = lang.trim(this.txtAddress.value);
            if (featureSet) {
                if (featureSet.features.length > 0) {
                    searchText.toUpperCase();
                    for (i = 0; i < features.length; i++) {
                        this.feature = features[i];
                        searchSchoolFields = layerInfo.SearchDisplayFields.split(",");
                        array.some(searchSchoolFields, lang.hitch(this, this._filterOverLayData));
                    }
                }
                addressSchoolFields = layerInfo.SearchDisplayFields.split(",");
                for (i = 0; i < features.length; i++) {
                    for (j = 0; j < addressSchoolFields.length; j++) {
                        if (features[i].foundFieldName === addressSchoolFields[j]) {
                            displayField[i] = addressSchoolFields[j];
                        }
                    }
                    this.overLayerArray.push({
                        attr: featureSet.features[i],
                        fields: featureSet.fields,
                        layerID: layerInfo,
                        displayField: displayField[i],
                        index: layerInfo.index
                    });
                }
                if (this.overLayerArray.length > 0) {
                    domStyle.set(this.imgSearchLoader, "display", "block");
                    domStyle.set(this.close, "display", "none");
                    divDispalyResultContainer = domConstruct.create("div", {}, this.divAddressResults);
                    domConstruct.create("div", {
                        "class": "esriCTBottomBorder esriCTCursorPointer esriAddressCounty",
                        "innerHTML": dojo.configData.OverLayDisplayText
                    }, divDispalyResultContainer);
                    try {
                        for (i = 0; i < this.overLayerArray.length; i++) {
                            arrOverLay.push({
                                attributes: this.overLayerArray[i],
                                searchDisplayField: this.overLayerArray[i].layerID.SearchDisplayFields,
                                name: this.overLayerArray[i].attr.attributes[this.overLayerArray[i].displayField],
                                index: layerInfo.index
                            });
                        }
                    } catch (e) {
                        alert(sharedNls.errorMessages.falseConfigParams);
                    }
                    for (i = 0; i < this.overLayerArray.length; i++) {
                        this._displayResultContainer(arrOverLay, i, divDispalyResultContainer, layerInfo);
                    }
                }
            }
        },

        _filterOverLayData: function (field) {
            var whereSearchText, value;

            whereSearchText = lang.trim(this.txtAddress.value).toUpperCase();
            value = this.feature.attributes[field];
            if (value && value.toUpperCase().indexOf(whereSearchText) >= 0) {
                this.feature.foundFieldName = field;
                this.feature.value = value;
                return true;
            }
            return false;
        },

        _displayResultContainer: function (arrOverLay, i, divDispalyResultContainer, layerInfo) {
            var _this = this, divDisplayRow, divDisplayColumn, attr, index;
            divDisplayRow = domConstruct.create("div", {}, divDispalyResultContainer);
            divDisplayColumn = domConstruct.create("div", { "class": "esriCTContentBottomBorder esriCTCursorPointer esriCTResultBottomBorder", "id": i, "title": sharedNls.clickToLocate, "innerHTML": arrOverLay[i].name }, divDisplayRow);
            domAttr.set(divDisplayColumn, "index", i);
            this.own(on(divDisplayColumn, "click", function () {
                if (_this.map.getLayer("tempBufferLayer")) {
                    _this.map.getLayer("tempBufferLayer").clear();
                }
                attr = arrOverLay[this.id];
                domAttr.set(_this.txtAddress, "defaultAddress", _this.txtAddress.value);
                _this.txtAddress.style.color = "#6e6e6e";
                _this._hideAddressContainer();
                domStyle.set(_this.imgSearchLoader, "display", "none");
                index = layerInfo.index;
                _this._findTaskOverlayResults(attr, index);
            }));

        },

        _findTaskOverlayResults: function (selectedFeature, index) {
            dojo.overLayArray.length = 0;
            var btnHide, rendererColor, layLayerSettings, overlayQueryUrl, i, query, qTask, selectedSet, layer, lineColor, symbol, centerPoint, fillColor, ringsmultiPoint;

            btnHide = dojoQuery(".scrollbar_footer")[0];
            domStyle.set(btnHide, "display", "none");
            dojo.overLayerID = true;
            dojo.objID = null;
            if (!index) {
                index = 0;
            }
            for (i = 0; i < selectedFeature.attributes.fields.length; i++) {
                if (selectedFeature.attributes.fields[i].type === "esriFieldTypeOID") {
                    dojo.objID = selectedFeature.attributes.fields[i].name;
                    break;
                }
            }
            rendererColor = dojo.configData.OverlayLayerSettings[0].OverlayHighlightColor;
            layLayerSettings = dojo.configData.OverlayLayerSettings[0];
            overlayQueryUrl = dojo.configData.OverlayLayerSettings[0].LayerUrl;
            this.map.getLayer("esriGraphicsLayerMapSettings").clear();
            this.txtAddress.value = (selectedFeature.name);
            if (this.map.getLayer("roadCenterLinesLayerID")) {
                this.map.getLayer("roadCenterLinesLayerID").clear();
            }
            query = new Query();
            query.returnGeometry = true;
            query.outFields = ["*"];
            query.where = dojo.objID + "= " + selectedFeature.attributes.attr.attributes[dojo.objID];
            qTask = new QueryTask(overlayQueryUrl);
            qTask.execute(query, lang.hitch(this, function (featureSet) {
                selectedSet = featureSet.features[0];
                layer = this.map.getLayer("esriGraphicsLayerMapSettings");
                lineColor = new Color();
                lineColor.setColor(rendererColor);
                fillColor = new Color();
                fillColor.setColor(rendererColor);
                fillColor.a = 0.25;
                symbol = new Symbol.SimpleFillSymbol(Symbol.SimpleFillSymbol.STYLE_SOLID, new Symbol.SimpleLineSymbol(Symbol.SimpleLineSymbol.STYLE_SOLID, lineColor, 3), fillColor);
                selectedSet.setSymbol(symbol);
                ringsmultiPoint = new Geometry.Multipoint(new SpatialReference({ wkid: 3857 }));
                for (i = 0; i < selectedSet.geometry.rings[0].length; i++) {
                    ringsmultiPoint.addPoint(selectedSet.geometry.rings[0][i]);
                }
                centerPoint = ringsmultiPoint.getExtent().getCenter();
                dojo.overLayArray.push(selectedFeature.attributes.attr.attributes[dojo.objID]);
                dojo.overlay = dojo.objID;
                dojo.displayInfo = selectedFeature.attributes.attr.attributes[dojo.objID] + "$infoParcel";
                this.map.setExtent(this._getExtentFromPolygon(selectedSet.geometry.getExtent().expand(4)));
                dojo.selectedMapPoint = centerPoint;
                this.map.infoWindow.hide();
                setTimeout(function () {
                    topic.publish("createInfoWindowContent", selectedFeature.attributes.attr, centerPoint, layLayerSettings);
                }, 700);
                layer.add(selectedSet);

            }));
        },

        _findTaskResult: function (selectedFeature) {
            var btnHide, parcelLayerSettings, rendererColor, taxParcelQueryUrl, parcelInformation, queryOutFields,
                query, qTask, selectedSet, layer, lineColor, symbol, centerPoint, ringsmultiPoint, i;

            btnHide = dojoQuery(".scrollbar_footer")[0];
            domStyle.set(btnHide, "display", "none");
            dojo.interactiveParcel = false;
            parcelLayerSettings = dojo.configData.ParcelLayerSettings;
            rendererColor = dojo.configData.ParcelLayerSettings.ParcelHighlightColor;
            taxParcelQueryUrl = dojo.configData.ParcelLayerSettings.LayerUrl;
            parcelInformation = dojo.configData.AveryLabelSettings[0].ParcelInformation;
            queryOutFields = dojo.configData.QueryOutFields.split(",");
            this.map.getLayer("esriGraphicsLayerMapSettings").clear();
            this.txtAddress.value = (selectedFeature.value);
            if (this.map.getLayer("roadCenterLinesLayerID")) {
                this.map.getLayer("roadCenterLinesLayerID").clear();
            }
            query = new Query();
            query.returnGeometry = true;
            query.outFields = queryOutFields;
            query.where = parcelInformation.ParcelIdentification + "= '" + selectedFeature.attributes[parcelInformation.ParcelIdentification] + "'";
            qTask = new QueryTask(taxParcelQueryUrl);
            qTask.execute(query, lang.hitch(this, function (featureSet) {
                selectedSet = featureSet.features[0];
                layer = this.map.getLayer("esriGraphicsLayerMapSettings");
                lineColor = new Color();
                lineColor.setColor(rendererColor);

                var fillColor = new Color();
                fillColor.setColor(rendererColor);
                fillColor.a = 0.25;
                symbol = new Symbol.SimpleFillSymbol(Symbol.SimpleFillSymbol.STYLE_SOLID, new Symbol.SimpleLineSymbol(Symbol.SimpleLineSymbol.STYLE_SOLID, lineColor, 3), fillColor);

                selectedSet.setSymbol(symbol);
                dojo.parcelArray.push(selectedFeature.attributes[parcelInformation.ParcelIdentification]);
                ringsmultiPoint = new Geometry.Multipoint(new SpatialReference({ wkid: 3857 }));
                for (i = 0; i < selectedSet.geometry.rings[0].length; i++) {
                    ringsmultiPoint.addPoint(selectedSet.geometry.rings[0][i]);
                }
                centerPoint = ringsmultiPoint.getExtent().getCenter();
                this.map.setExtent(this._getExtentFromPolygon(selectedSet.geometry.getExtent().expand(4)));
                this.map.infoWindow.hide();
                this.showFindTaskData(selectedSet, centerPoint, parcelLayerSettings);
                dojo.polygon = true;
                dojo.graphicLayerClicked = false;
                dojo.findTasksGraphicClicked = true;
                layer.add(selectedSet);

            }));
        },

        showFindTaskData: function (selectedSet, centerPoint, parcelLayerSettings) {
            dojo.selectedMapPoint = centerPoint;
            var parcelInformation = dojo.configData.AveryLabelSettings[0].ParcelInformation;
            dojo.displayInfo = selectedSet.attributes[parcelInformation.ParcelIdentification] + "$infoParcel";
            setTimeout(function () {
                topic.publish("createInfoWindowContent", selectedSet, centerPoint, parcelLayerSettings);
            }, 700);
        },

        //Get the extent of polygon
        _getExtentFromPolygon: function (extent) {
            var width, height, xmin, ymin, xmax, ymax;
            width = extent.getWidth();
            height = extent.getHeight();
            xmin = extent.xmin;
            ymin = extent.ymin - (height / 6);
            xmax = xmin + width;
            ymax = ymin + height;
            return new Geometry.Extent(xmin, ymin, xmax, ymax, this.map.spatialReference);
        },

        // Dynamically create contents for infowindow and append the structure in main window
        onCreateInfoWindowContent: function (feature, mapPoint, layerSettings) {
            var adjacentParcel, imgAdjacentParcels, infoPopupFieldsCollection, infoWindowTitle, infoPopupHeight, infoPopupWidth, divDataDetails, divDetailsTab,
                key, divInfoRow, aliases, fieldNames, divDisplayRow, divDisplayColumn1, divInfoImg, divDisplayColumn2, divSpan, screenPoint, extentChanged,
                possibleTitleFields, infoTitle, selectedMapPoint, adjacentRoad, imgAdjacentRoad;

            if (dojoQuery(".esriCTCreateDivSpan")[0]) {
                adjacentParcel = dojoQuery(".esriCTCreateDivSpan")[0];
                domStyle.set(adjacentParcel, "display", "none");
                imgAdjacentParcels = dojoQuery(".imgCreateAdjacentParcels")[0];
                domStyle.set(imgAdjacentParcels, "display", "none");
            }

            infoPopupFieldsCollection = layerSettings.InfoWindowSettings[0].InfoWindowData;
            infoWindowTitle = layerSettings.InfoWindowSettings[0].InfoWindowTitleFields;
            infoPopupHeight = dojo.configData.InfoPopupHeight;
            infoPopupWidth = dojo.configData.InfoPopupWidth;
            divDataDetails = dojoQuery(".divDataDisplay")[0];
            domConstruct.empty(dojoQuery(".divDataDisplay")[0]);
            this.selectedPoint = mapPoint;
            dojo.selectedMapPoint = mapPoint;
            divDetailsTab = domConstruct.create("div", { "class": "divDetailsTab" }, null);
            this.divInfoPopup = domConstruct.create("div", { "class": "esriCTDivTransparent" }, divDetailsTab);
            for (key = 0; key < infoPopupFieldsCollection.length; key++) {
                divInfoRow = domConstruct.create("div", { "class": "esriCTDisplayRow" }, this.divInfoPopup);
                this.divDispalyField = domConstruct.create("div", { "class": "esriCTDisplayField", "id": "divDispalyField", "innerHTML": infoPopupFieldsCollection[key].DisplayText }, divInfoRow);
                this.divValueField = domConstruct.create("div", { "class": "esriCTValueField", "id": "divValueField" }, divInfoRow);
                aliases = infoPopupFieldsCollection[key].AliasField.split(',');
                fieldNames = infoPopupFieldsCollection[key].FieldName.split(',');
                this._infowindowValueString(aliases, fieldNames, feature);

            }
            if (layerSettings === dojo.configData.ParcelLayerSettings) {
                divDisplayRow = domConstruct.create("div", {}, divDataDetails);
                divDisplayColumn1 = domConstruct.create("div", {}, divDisplayRow);
                divInfoImg = domConstruct.create("img", { "id": "imgAdjacentParcels", "class": "imgAdjacentParcels" }, divDisplayColumn1);
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
                divSpan = domConstruct.create("span", { "id": "spanAdjacentParcels", "class": "esrictDivSpan", "innerHTML": dojo.configData.AdjacentParcels }, divDisplayColumn2);
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
                if (dojoQuery(".esrictDivSpan")[0]) {
                    adjacentParcel = dojoQuery(".esrictDivSpan")[0];
                    domStyle.set(adjacentParcel, "display", "block");
                    imgAdjacentParcels = dojoQuery(".imgAdjacentParcels")[0];
                    domStyle.set(imgAdjacentParcels, "display", "block");
                }
            } else if (layerSettings === dojo.configData.RoadCenterLayerSettings) {
                divDisplayRow = domConstruct.create("div", {}, divDataDetails);
                divDisplayColumn1 = domConstruct.create("div", {}, divDisplayRow);
                divInfoImg = domConstruct.create("img", { "class": "imgAdjacentRoad" }, divDisplayColumn1);
                this.own(on(divInfoImg, "click", lang.hitch(this, function () {
                    dojo.polygon = false;
                    dojo.interactiveParcel = true;
                    dojo.selectedMapPoint = null;
                    dojo.displayInfo = null;
                    if (dojo.isSpanClicked === true) {
                        return;
                    }
                })));
                divInfoImg.src = dojoConfig.baseURL + "/js/library/themes/images/add.png";

                divDisplayColumn2 = domConstruct.create("div", { "class": "divDisplaySpan" }, divDisplayRow);
                divSpan = domConstruct.create("span", { "class": "esrictDivRoadSpan", "innerHTML": dojo.configData.AdjacentRoad }, divDisplayColumn2);
                this.own(on(divSpan, "click", lang.hitch(this, function () {
                    dojo.polygon = false;
                    dojo.interactiveParcel = true;
                    dojo.selectedMapPoint = null;
                    dojo.displayInfo = null;
                    this.map.infoWindow.hide();
                    if (dojo.isSpanClicked === true) {
                        return;
                    }
                    dojo.mouseMoveHandle = this.map.on("mouse-move", lang.hitch(function (evt) {
                        topic.publish("showMapTipForRoad", evt);
                    }));
                    dojo.isSpanClicked = true;

                })));

                if (dojoQuery(".esrictDivRoadSpan")[0]) {
                    adjacentRoad = dojoQuery(".esrictDivRoadSpan")[0];
                    domStyle.set(adjacentRoad, "display", "block");
                    imgAdjacentRoad = dojoQuery(".imgAdjacentRoad")[0];
                    domStyle.set(imgAdjacentRoad, "display", "block");
                }
            }
            this.map.infoWindow.resize(infoPopupWidth, infoPopupHeight);
            possibleTitleFields = infoWindowTitle.split(",");
            infoTitle = "";
            array.some(possibleTitleFields, function (field) {
                if (feature.attributes[field] && feature.attributes[field] !== "null") {
                    infoTitle = feature.attributes[field];
                    return true;
                }
                return false;
            });
            this.map.infoWindow.hide(dojo.selectedMapPoint);
            selectedMapPoint = mapPoint;
            dojo.selectedMapPoint = selectedMapPoint;
            extentChanged = this.map.setExtent(this._getBrowserMapExtent(selectedMapPoint));
            extentChanged.then(lang.hitch(this, function () {
                screenPoint = this.map.toScreen(selectedMapPoint);
                screenPoint.y = this.map.height - screenPoint.y;
                this.map.infoWindow.setTitle(infoTitle);
                this.map.infoWindow.show(divDetailsTab, screenPoint);
            }));
        },

        _infowindowValueString: function (aliases, fieldNames, feature) {
            var valueString = "", value;
            array.forEach(aliases, function (term) {
                value = feature.attributes[term];
                if (value && value !== "Null") {
                    valueString += value + " ";
                }
            });
            if (valueString.length === 0) {
                array.forEach(fieldNames, function (term) {
                    value = feature.attributes[term];
                    if (value && value !== "null") {
                        valueString += value + " ";
                    }
                });
            }
            if (valueString.length === 0) {
                valueString = dojo.configData.ShowNullValueAs;
            }
            this.divValueField.innerHTML = valueString;
        },

        showMapTipForParcels: function (evt) {
            var dialog;
            dojo.displayInfo = null;
            if (this.map.getLayer("esriGraphicsLayerMapSettings").graphics.length) {
                if (dojo.isSpanClicked) {
                    topic.publish("hideMapTip");
                    dialog = new TooltipDialog({
                        id: "toolTipDialogues",
                        content: dojo.configData.ToolTipContents.Parcel,
                        style: "position: absolute; z-index:1000;"
                    });
                    dialog.startup();
                    domStyle.set(dialog.domNode, "opacity", 0.80);
                    Place.at(dialog.domNode, { x: evt.pageX, y: evt.pageY }, ["TL", "TR"], { x: 5, y: 5 });
                }
            }
        },

        //Display tooltip for road
        showMapTipForRoad: function (evt) {
            var dialog;
            if (this.map.getLayer("roadCenterLinesLayerID").graphics.length) {
                if (dojo.isSpanClicked) {
                    topic.publish("hideMapTip");
                    dialog = new TooltipDialog({
                        id: "toolTipDialogues",
                        content: dojo.configData.ToolTipContents.Road,
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
            var width, height, xmin, ymin, xmax, ymax;
            width = this.map.extent.getWidth();
            height = this.map.extent.getHeight();
            xmin = mapPoint.x - (width / 2);
            ymin = mapPoint.y - (height / 2.7);
            xmax = xmin + width;
            ymax = ymin + height;
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
            var roadLayerSettings = dojo.configData.RoadCenterLayerSettings, query;
            query = new Query();
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
            var _this = this, point, j, polyLine, numSegments;

            polyLine = new Geometry.Polyline(this.map.spatialReference);
            numSegments = this.map.getLayer("roadCenterLinesLayerID").graphics.length;
            dojo.roadArray = [];
            if (0 < numSegments) {
                for (j = 0; j < numSegments; j++) {
                    if (this.map.getLayer("roadCenterLinesLayerID").graphics[j]) {
                        polyLine.addPath(this.map.getLayer("roadCenterLinesLayerID").graphics[j].geometry.paths[0]);
                    }
                    dojo.roadArray.push(this.map.getLayer("roadCenterLinesLayerID").graphics[j].attributes[this.map.getLayer("roadCenterLinesLayerID").objectIdField]);
                }
                this.map.setExtent(polyLine.getExtent().expand(2));
                setTimeout(function () {
                    point = polyLine.getPoint(0, 0);
                    topic.publish("showRoadDetails", _this.map.getLayer("roadCenterLinesLayerID").graphics[0], point, polyLine);
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
        * display search by address tab
        * @memberOf widgets/locator/locator
        */
        _showAddressSearchView: function () {
            if (this.imgSearchLoader.style.display === "block") {
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
            var errorAddressCounty;
            domConstruct.empty(this.divAddressResults);
            domStyle.set(this.imgSearchLoader, "display", "none");
            domStyle.set(this.close, "display", "block");
            domClass.remove(this.divAddressContent, "esriCTAddressContainerHeight");
            domClass.add(this.divAddressContent, "esriCTAddressResultHeight");
            errorAddressCounty = domConstruct.create("div", {
                "class": "esriCTCursorPointer esriAddressCounty esriCTContentBottomBorder"
            }, this.divAddressResults);
            errorAddressCounty.innerHTML = sharedNls.errorMessages.invalidSearch;
        },

        onSetMapTipPosition: function (selectedPoint, map) {
            var screenPoint;
            if (selectedPoint) {
                screenPoint = map.toScreen(selectedPoint);
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
            var target;
            this.txtAddress.value = '';
            target = window.event ? window.event.srcElement : evt ? evt.target : null;
            if (!target) {
                return;
            }
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
            if (!target) {
                return;
            }
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
            if (target.value === '' && domAttr.get(target, title)) {
                target.value = target.title;
                if (target.title === "") {
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
            var parcelInformation, fillColor, symbol, graphicCollection, attributeCollection, i,
                lowerParcelId, featureData, parcelAttributeData, graphic, rendererColor = dojo.configData.ParcelLayerSettings.ParcelHighlightColor, lineColor;

            parcelInformation = dojo.configData.AveryLabelSettings[0].ParcelInformation;
            lineColor = new Color();
            lineColor.setColor(rendererColor);
            fillColor = new Color();
            fillColor.setColor(rendererColor);
            fillColor.a = 0.25;
            symbol = new Symbol.SimpleFillSymbol(Symbol.SimpleFillSymbol.STYLE_SOLID, new Symbol.SimpleLineSymbol(Symbol.SimpleLineSymbol.STYLE_SOLID, lineColor, 3), fillColor);

            this.map.graphics.clear();
            graphicCollection = [];
            attributeCollection = [];
            for (i = 0; i < features.length; i++) {
                if (attributeCollection[features[i].attributes[parcelInformation.LowParcelIdentification]]) {
                    attributeCollection[features[i].attributes[parcelInformation.LowParcelIdentification]].push({ id: features[i].attributes[parcelInformation.ParcelIdentification], name: features[i].attributes });
                    if (!share) {
                        if (i === 1) {
                            dojo.parcelArray.push(features[0].attributes[parcelInformation.ParcelIdentification]);
                        }
                    }
                } else {
                    attributeCollection[features[i].attributes[parcelInformation.LowParcelIdentification]] = [];
                    graphicCollection[features[i].attributes[parcelInformation.LowParcelIdentification]] = features[i].geometry;
                    attributeCollection[features[i].attributes[parcelInformation.LowParcelIdentification]].push({ id: features[i].attributes[parcelInformation.ParcelIdentification], name: features[i].attributes });
                }
            }
            for (lowerParcelId in attributeCollection) {
                if (attributeCollection.hasOwnProperty(lowerParcelId)) {
                    featureData = attributeCollection[lowerParcelId];
                    parcelAttributeData = [];
                    if (featureData.length > 1) {
                        for (i = 0; i < featureData.length; i++) {
                            parcelAttributeData[featureData[i].id] = featureData[i].name;
                            if (i === 0) {
                                this.bufferArray.push(featureData[0].name[parcelInformation.ParcelIdentification]);
                            }
                        }
                    } else {
                        parcelAttributeData = featureData[0].name;
                        this.bufferArray.push(featureData[0].name[parcelInformation.ParcelIdentification]);
                    }
                    graphic = new Graphic(graphicCollection[lowerParcelId], symbol, parcelAttributeData);
                    this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
                }
            }
        },

        _trimString: function (str, len) {
            return (str.length > len) ? str.substring(0, len) + "..." : str;
        },

        hideRoad: function (evt) {
            var roadLayerSettings = dojo.configData.RoadCenterLayerSettings, p, q, t, count, query;
            topic.publish("hideMapTip");
            query = new Query();
            query.maxAllowableOffset = dojo.configData.MaxAllowableOffset;
            query.where = "UPPER(" + roadLayerSettings.SearchDisplayFields + ") LIKE '" + evt.graphic.attributes[dojo.configData.RoadCenterLayerSettings.SearchDisplayFields].toUpperCase() + "%'";
            query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_INTERSECTS;
            query.returnGeometry = true;
            this.map.getLayer("roadCenterLinesLayerID").selectFeatures(query, esri.layers.FeatureLayer.SELECTION_SUBTRACT, lang.hitch(this, function (featureset) {
                for (p = 0; p < featureset.length; p++) {
                    for (q = 0; q < dojo.roadArray.length; q++) {
                        if (dojo.roadArray[q] === featureset[p].attributes[this.map.getLayer("roadCenterLinesLayerID").objectIdField]) {
                            dojo.roadArray.splice(q, 1);
                            break;
                        }
                    }
                }

                dojo.selectedMapPoint = null;
                dojo.displayInfo = null;
                this.map.infoWindow.hide();
                count = 0;
                for (t = 0; t < this.map.getLayer("roadCenterLinesLayerID").graphics.length; t++) {
                    if (this.map.getLayer("roadCenterLinesLayerID").graphics[t].visible) {
                        count++;
                    }
                }
                if (!count) {
                    dojo.isSpanClicked = false;
                    topic.publish("hideMapTip");
                    if (dojo.mouseMoveHandle) {
                        dojo.mouseMoveHandle.remove();
                    }
                    topic.publish("clearAll", evt);
                    dojo.polygon = true;
                    dojo.interactiveParcel = false;
                }
                dojo.mouseMoveHandle = this.map.on("mouse-move", lang.hitch(function (evt) {
                    topic.publish("showMapTipForRoad", evt);
                }));
            }));
        }
    });
});
