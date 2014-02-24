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
        "dojo/topic",
        "esri/domUtils",
        "esri/InfoWindowBase",
        "esri/tasks/BufferParameters",
        "../scrollBar/scrollBar",
        "dijit/form/Button",
        "dijit/form/ComboBox",
        "dijit/form/CheckBox",
        "dojo/store/Memory",
         "dojo/i18n!nls/localizedStrings",
        "dojo/text!./templates/infoWindow.html",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        "dijit/_WidgetsInTemplateMixin",
        "./infoWindowView"
],
function (declare, domConstruct, domStyle, domAttr, lang, on, domGeom, dom, domClass, string, topic, domUtils, InfoWindowBase, BufferParameters, scrollBar, Button, ComboBox, CheckBox, ItemFileReadStore, nls, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, infoWindowView) {
    return declare([infoWindowView], {
        templateString: template,

        postCreate: function () {
            if (!this.infoWindowWidth) {
                this.infoWindowWidth = "100px";
            }
            if (!this.infoWindowHeight) {
                this.infoWindowHeight = "100px";
            }
            this.infoWindowContainer = domConstruct.create("div", {}, dom.byId("esriCTParentDivContainer"));
            this.infoWindowContainer.appendChild(this.domNode);
            this._anchor = domConstruct.create("div", { "class": "esriCTdivTriangle" }, this.domNode);
            domUtils.hide(this.domNode);
            this.txtBuffer.value = dojo.configData.DefaultBufferDistance;
            this.textoccupant.value = dojo.configData.OccupantName;

            this.own(on(this.esriCTclosediv, "click", lang.hitch(this, function () {
                domUtils.hide(this.domNode);
                dojo.selectedMapPoint = null;
                if (dojo.mouseMoveHandle) {
                    dojo.mouseMoveHandle.remove();
                }

            })));

            this.own(on(this.btnSubmit, "click", lang.hitch(this, function () {
                this.CreateBuffer();
            })));

            this.txtBuffer.onkeypress = lang.hitch(this, function (evt) {
                return this.onlyNumbers(evt);
            });

            this.btnSubmitImage.src = dojoConfig.baseURL + "/js/library/themes/images/download.png"
            this.esriCTShowDetailsView.src = dojoConfig.baseURL + "/js/library/themes/images/navigation.png";
            this.esriCTShowDetailsView.title = nls.navigation;
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
            this.esriCTShowDetailsView.title = nls.notify;
            domStyle.set(this.divInfoDetails, "display", "block");
            domStyle.set(this.divInfoNotify, "display", "none");
            this.setLocation(screenPoint);
            if (this.infoContainerScrollbar) {
                domClass.add(this.infoContainerScrollbar._scrollBarContent, "esriCTZeroHeight");
                this.infoContainerScrollbar.removeScrollBar();
            }
            this.infoContainerScrollbar = new scrollBar({
                domNode: this.divInfoScrollContent
            });
            this.infoContainerScrollbar.setContent(this.divInfoDetailsScroll);
            this.infoContainerScrollbar.createScrollBar();
        },

        resize: function (width, height) {
            this.infoWindowWidth = width;
            this.infoWindowHeight = height;
            domStyle.set(this.domNode, {
                width: width + "px",
                height: height + "px"
            });
        },

        setTitle: function (infoTitle) {
            if (infoTitle.length > 0) {
                this.esriCTheadderPanel.innerHTML = "";
                this.esriCTheadderPanel.innerHTML = infoTitle;
                this.esriCTheadderPanel.title = infoTitle;
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
        }
    });
});