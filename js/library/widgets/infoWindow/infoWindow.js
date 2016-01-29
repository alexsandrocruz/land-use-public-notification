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
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/on",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/topic",
    "esri/tasks/query",
    "esri/tasks/QueryTask",
    "dojo/Deferred",
    "dojo/promise/all",
    "esri/domUtils",
    "esri/urlUtils",
    "../scrollBar/scrollBar",
    "dojo/text!./templates/infoWindow.html",
    "./infoWindowView",
    "dojo/i18n!application/js/library/nls/localizedStrings"
], function (declare, domConstruct, domStyle, lang, array, on, dom, domClass, topic, Query, QueryTask, Deferred, all, domUtils, urlUtils, ScrollBar, template, infoWindowView, sharedNls) {
    return declare([infoWindowView], {

        /**
       * create infowindow view  widget
       *
       * @class
       * @name widgets/infoWindow/infoWindow
       */

        templateString: template,
        postCreate: function () {

            urlUtils.addProxyRule({
                urlPrefix: dojo.configData.AveryLabelSettings[0].PDFServiceTask,
                proxyUrl: dojoConfig.baseURL + dojo.configData.ProxyUrl
            });

            urlUtils.addProxyRule({
                urlPrefix: dojo.configData.AveryLabelSettings[0].CSVServiceTask,
                proxyUrl: dojoConfig.baseURL + dojo.configData.ProxyUrl
            });

            urlUtils.addProxyRule({
                urlPrefix: dojo.configData.GeometryService,
                proxyUrl: dojoConfig.baseURL + dojo.configData.ProxyUrl
            });

            if (!this.infoWindowWidth) {
                this.infoWindowWidth = "100px";
            }
            if (!this.infoWindowHeight) {
                this.infoWindowHeight = "100px";
            }
            topic.subscribe("createRoadBuffer", lang.hitch(this, this.createRoadBuffer));
            topic.subscribe("generateBufferParmas", lang.hitch(this, this.generateBufferParameter));
            this.btnSubmitImage.src = dojoConfig.baseURL + "/js/library/themes/images/download.png";
            this.infoWindowContainer = domConstruct.create("div", {}, dom.byId("esriCTParentDivContainer"));
            this.infoWindowContainer.appendChild(this.domNode);
            this._anchor = domConstruct.create("div", { "class": "esriCTdivTriangle" }, this.domNode);
            domUtils.hide(this.domNode);
            this.txtBuffer.value = dojo.configData.DefaultBufferDistance;
            this.textoccupant.value = dojo.configData.AveryLabelSettings[0].OccupantLabel;
            this.selectParcelLabel.innerHTML = dojo.configData.AdjacentParcels;

             /**
             * click event of close button in the infowindow
             */
            this.own(on(this.esriCTclosediv, "click", lang.hitch(this, function () {
                domUtils.hide(this.domNode);
                dojo.selectedMapPoint = null;
                dojo.displayInfo = null;
                topic.publish("hideMapTip");
                if (dojo.mouseMoveHandle) {
                    dojo.mouseMoveHandle.remove();
                }
                dojo.polygon = true;
                dojo.interactiveParcel = false;
                dojo.isSpanClicked = false;
                dojo.displyOverlayInfo = true;
                if (dojo.overlay) {
                    dojo.overLayGraphicShare = true;
                }
            })));

             /**
             * click event triggers when we click download button in the infowindow
             */
            var featuresArray = [], featureObj = {}, filteredFeaturesArray = [], filteredFeaturesObjArray = [];
            this.own(on(this.btnSubmit, "click", lang.hitch(this, function () {
                if (!this._validateBufferParameters()) {
                    return;
                }
                topic.publish("showProgressIndicator");
                featuresArray = []; featureObj = {}; filteredFeaturesArray = []; filteredFeaturesObjArray = [];
                //If the buffer value is 0, query the features with LOWPARCELID and show them
                if (dojo.selectedFeatures.length > 0 && parseInt(this.txtBuffer.value, 10) === 0) {
                    //Loop all the selected feature and filter features based on LOWPARCELID
                    array.forEach(dojo.selectedFeatures, lang.hitch(this, function (currentFeature, index) {
                        //Check if array
                        if (filteredFeaturesArray.length >= 1 && filteredFeaturesArray.indexOf(currentFeature.attributes['LOWPARCELID']) === -1) {
                            filteredFeaturesArray.push(currentFeature.attributes['LOWPARCELID']);
                            filteredFeaturesObjArray.push(currentFeature);
                        } else {
                            if (index === 0) {
                                filteredFeaturesArray.push(currentFeature.attributes['LOWPARCELID']);
                                filteredFeaturesObjArray.push(currentFeature);
                            }
                        }
                    }));

                    //Fetch all the features based on LOWPARCELID
                    array.forEach(filteredFeaturesObjArray, lang.hitch(this, function (currentFeature) {
                        featuresArray.push(this._fetchPolygons(currentFeature));
                    }));


                    //After fetching all the features, create an array and send it to further processing
                    all(featuresArray).then(lang.hitch(this, function (featureSet) {
                        featureObj.features = [];
                        array.forEach(featureSet, function (currentFeature) {
                            if (currentFeature) {
                                if (currentFeature.length > 1) {
                                    array.forEach(currentFeature, lang.hitch(this, function (subFeatures) {
                                        featureObj.features.push(subFeatures);
                                    }));
                                } else {
                                    featureObj.features.push(currentFeature[0]);
                                }
                            }
                        });
                        this._checkInfowindowParams(featureObj);
                    }));
                } else {
                    dojo.isDownloadReport = true;
                    this.createBuffer();
                }
            })));

            this.txtBuffer.onkeypress = lang.hitch(this, function (evt) {
                return this.onlyNumbers(evt);
            });
            this.btnSubmitImage.src = dojoConfig.baseURL + "/js/library/themes/images/download.png";
            this.esriCTShowDetailsView.src = dojoConfig.baseURL + "/js/library/themes/images/navigation.png";
            this.attachInfoWindowEvents();
            this._getAveryTemplates();
            topic.subscribe("polygonCreated", lang.hitch(this, this.onPolygonCreated));
        },

        /**
        * validate buffer parameters
        * @memberOf widgets/infoWindow/infoWindow
        */
        _validateBufferParameters: function () {
            var isValidParams = false;
            this.pdfFormat = dijit.byId('chkPdf').checked;
            this.csvFormat = dijit.byId('chkCsv').checked;
            this.occupants = dijit.byId('chkOccupants').checked;
            this.owners = dijit.byId('chkOwners').checked;
            if ((this.owners === "checked" || this.owners) || (this.occupants === "checked" || this.occupants)) {
                if ((this.pdfFormat === "checked" || this.pdfFormat) || (this.csvFormat === "checked" || this.csvFormat)) {
                    isValidParams = true;
                } else {
                    topic.publish("showErrorMessage", 'spanFileUploadMessage', sharedNls.errorMessages.fileSelect, '#FF0000');
                    topic.publish("hideProgressIndicator");
                }
            } else {
                topic.publish("showErrorMessage", 'spanFileUploadMessage', sharedNls.errorMessages.selectProperty, '#FF0000');
                topic.publish("hideProgressIndicator");
            }
            return isValidParams;
        },

        /**
        * fetch features when buffer distance is set to zero
        * @param {object} feature
        * @memberOf widgets/infoWindow/infoWindow
        */
        _fetchPolygons: function (currentFeature) {
            var qTask, query, featureDef = new Deferred();
            qTask = new QueryTask(dojo.configData.ParcelLayerSettings.LayerUrl);
            query = new Query();
            query.outFields = ["*"];
            query.where = "LOWPARCELID = '" + currentFeature.attributes['LOWPARCELID'] + "'";
            query.returnGeometry = true;
            qTask.execute(query, lang.hitch(this, function (featureSet) {
                featureDef.resolve(featureSet.features);
            }), function (error) {
                featureDef.resolve();
            });
            return featureDef;
        },

        /**
        * display infowindow
        * @param {object} container of the infowindow
        * @param {object} location where infowindow gets open
        * @memberOf widgets/infoWindow/infoWindow
        */
        show: function (detailsTab, screenPoint) {
            if (this.divInfoDetailsScroll) {
                while (this.divInfoDetailsScroll.hasChildNodes()) {
                    this.divInfoDetailsScroll.removeChild(this.divInfoDetailsScroll.lastChild);
                }
            }
            this.divInfoDetailsScroll.appendChild(detailsTab);
            this.esriCTShowDetailsView.setAttribute("checked", "info");
            this.esriCTShowDetailsView.src = dojoConfig.baseURL + "/js/library/themes/images/navigation.png";
            domStyle.set(this.divInfoDetails, "display", "block");
            domStyle.set(this.divInfoNotify, "display", "none");
            this.setLocation(screenPoint);
            if (dojo.infoContainerScrollbar) {
                domClass.add(dojo.infoContainerScrollbar._scrollBarContent, "esriCTZeroHeight");
                dojo.infoContainerScrollbar.removeScrollBar();
            }
            dojo.infoContainerScrollbar = new ScrollBar({
                domNode: this.divInfoScrollContent
            });
            domClass.add(this.divInfoScrollContent, "esrCTInfoContainerScrollbar");
            dojo.infoContainerScrollbar.setContent(this.divInfoDetailsScroll);
            dojo.infoContainerScrollbar.createScrollBar();
        },

        /**
        * resize infowindow
        * @param {integer} contains width of the infowindow
        * @param {integer} contains height of the infowindow
        * @memberOf widgets/infoWindow/infoWindow
        */
        resize: function (width, height) {
            this.infoWindowWidth = width;
            this.infoWindowHeight = height;
            domStyle.set(this.domNode, {
                width: width + "px",
                height: height + "px"
            });
        },

        /**
        * set title at the headder of the infowindow
        * @param {string} contains string to be displayed at headder
        * @memberOf widgets/infoWindow/infoWindow
        */
        setTitle: function (str) {
            var infoTitle, len = 35;
            infoTitle = (str.length > len) ? str.substring(0, len) + "..." : str;
            if (infoTitle.length > 0) {
                this.esriCTheadderPanel.innerHTML = "";
                this.esriCTheadderPanel.innerHTML = infoTitle;
                this.esriCTheadderPanel.title = str;
            } else {
                this.esriCTheadderPanel.innerHTML = dojo.configData.ShowNullValueAs;
            }

        },

       /**
       * set position of the anchor attached to infowindow
       * @param {object} position of the anchor on map
       * @memberOf widgets/infoWindow/infoWindow
       */
        setLocation: function (location) {
            if (location.spatialReference) {
                location = this.map.toScreen(location);
            }
            domStyle.set(this.domNode, {
                left: (location.x - (this.infoWindowWidth / 2)) + "px",
                bottom: (location.y + 28) + "px"
            });
            domUtils.show(this.domNode);
            this.isShowing = true;
        },

       /**
       * clear the infowindow from the map
       * @memberOf widgets/infoWindow/infoWindow
       */
        hide: function () {
            domUtils.hide(this.domNode);
            this.isShowing = false;
            this.onHide();
        },


       /**
       * create buffer for road
       * @memberOf widgets/infoWindow/infoWindow
       */
        createRoadBuffer: function () {
            this.createBuffer();
        },

        /**
        * fires when polygon is created
        * @memberOf widgets/infoWindow/infoWindow
        */
        onPolygonCreated: function (polygonGeometry) {
            var overlayInfowindow;
            if (polygonGeometry) {
                if (this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0] && this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].attributes && this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].attributes.overLay) {
                    overlayInfowindow = true;
                }
                //show drawn polygon on map
                this._showBuffer([polygonGeometry], overlayInfowindow, true);
            }
        },

        /**
        * create all required buffer parameters
        * @memberOf widgets/infoWindow/infoWindow
        */
        generateBufferParameter: function (polygonGeometry) {
            this.generateBufferParmas(polygonGeometry);
        }
    });
});
