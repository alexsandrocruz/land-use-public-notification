/*global dojo,define,dojoConfig */
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
    "dojo/on",
    "dojo/topic",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "esri/map",
    "dojo/text!./templates/print.html"
], function (declare, domConstruct, on, topic, lang, _WidgetBase, esriMap, printMap) {

    //========================================================================================================================//

    return declare([_WidgetBase], {

        tempPushPinLayer: "tempPushPinLayer",
        tempPolygonLayer: "tempPolygonLayer",
        tempBuffer: "tempBuffer",
        parcelLayer: null,
        bufferLayer: null,
        initialExtent: null,
        /**
        * create printMap widget
        *
        * @class
        * @name widgets/printMap/printMap
        */
        postCreate: function () {
            this.domNode = domConstruct.create("div", { "title": this.title, "class": "esriCTImgPrint" }, null);

            this.own(on(this.domNode, "click", lang.hitch(this, function () {

                /**
                * minimize other open header panel widgets and show help
                */
                topic.publish("toggleWidget", "print");
                this._showModal();
            })));
        },

        /**
        * Display print window
        * @memberOf widgets/printMap/printMap
        */
        _showModal: function () {
            var dataObject = {
                "ParcelLayer": this.map.getLayer("esriGraphicsLayerMapSettings"),
                "Bufferlayer": this.map.getLayer("tempBufferLayer"),
                "Extent": this.map.extent,
                "Window": window,
                "BaseMapLayer": this.map.getLayer("esriCTbasemap")
            };

            window.showModalDialog(dojoConfig.baseURL + "/js/library/widgets/print/templates/print.html", dataObject);
        },
        /**
        * Get current map extent
        * @memberOf widgets/printMap/printMap
        */
        getPrintExtent: function () {
            return this.map.extent;
        }


    });
});

