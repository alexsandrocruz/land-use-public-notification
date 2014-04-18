/*global define, document, Modernizr,dojoConfig,dijit,dojo,alert,esri ,event*/
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
        "dojo/_base/lang",
        "dojo/on",
        "dojo/dom",
        "dojo/dom-class",
        "dojo/topic",
        "esri/domUtils",
        "esri/urlUtils",
        "../scrollBar/scrollBar",
        "dojo/text!./templates/infoWindow.html",
        "./infoWindowView"
],
function (declare, domConstruct, domStyle, lang, on, dom, domClass, topic, domUtils, urlUtils, ScrollBar, template, infoWindowView) {
    return declare([infoWindowView], {

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
            this.btnSubmitImage.src = dojoConfig.baseURL + "/js/library/themes/images/download.png";
            this.infoWindowContainer = domConstruct.create("div", {}, dom.byId("esriCTParentDivContainer"));
            this.infoWindowContainer.appendChild(this.domNode);
            this._anchor = domConstruct.create("div", { "class": "esriCTdivTriangle" }, this.domNode);
            domUtils.hide(this.domNode);
            this.txtBuffer.value = dojo.configData.DefaultBufferDistance;
            this.textoccupant.value = dojo.configData.AveryLabelSettings[0].OccupantLabel;

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

            this.own(on(this.btnSubmit, "click", lang.hitch(this, function () {
                this.createBuffer();
            })));

            this.txtBuffer.onkeypress = lang.hitch(this, function (evt) {
                return this.onlyNumbers(evt);
            });
            this.btnSubmitImage.src = dojoConfig.baseURL + "/js/library/themes/images/download.png";
            this.esriCTShowDetailsView.src = dojoConfig.baseURL + "/js/library/themes/images/navigation.png";
            this.attachInfoWindowEvents();
            this._getAveryTemplates();
        },

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

        resize: function (width, height) {
            this.infoWindowWidth = width;
            this.infoWindowHeight = height;
            domStyle.set(this.domNode, {
                width: width + "px",
                height: height + "px"
            });
        },

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

        hide: function () {
            domUtils.hide(this.domNode);
            this.isShowing = false;
            this.onHide();
        },

        _hideInfoContainer: function () {
            this.own(on(this.esriCTclosediv, "click", lang.hitch(this, function () {
                domUtils.hide(this.domNode);
            })));
        },

        createRoadBuffer: function () {
            this.createBuffer();
        }
    });
});
