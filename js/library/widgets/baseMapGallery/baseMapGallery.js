/*global define,dojo,esri */
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
    "dojo/_base/lang",
    "dojo/on",
    "dojo/dom",
    "dojo/text!./templates/baseMapGalleryTemplate.html",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin"

], function (declare, domConstruct, lang, on, dom, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin) {

    //========================================================================================================================//

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,

        /**
        * create baseMapGallery widget
        *
        * @class
        * @name widgets/baseMapGallery/baseMapGallery
        */
        postCreate: function () {
            var i, basemapContainer, layer,
                baseMapURL = 0,
                baseMapURLCount = 0,
                baseMapLayers = dojo.configData.BaseMapLayers;

            for (i = 0; i < baseMapLayers.length; i++) {
                if (baseMapLayers[i].MapURL) {
                    this.map.addLayer(this._createBaseMapLayer(baseMapLayers[i].MapURL, baseMapLayers[i].Key));
                    if (baseMapURLCount === 0) {
                        baseMapURL = i;
                    }
                    baseMapURLCount++;
                }
            }
            basemapContainer = domConstruct.create("div", {}, dom.byId("esriCTParentDivContainer"));
            basemapContainer.appendChild(this.esriCTDivLayerContainer);
            this.layerList.appendChild(this._createBaseMapElement(baseMapURL, baseMapURLCount));

            if (baseMapURLCount >= 1) {
                layer = this.map.getLayer(baseMapLayers[baseMapURL].Key);
                layer.show();
            }
        },

        /**
        * Create basemap layer on the map
        * @param {string} layer url for the basemap
        * @param {string} layer id for the basemap
        * @memberOf widgets/baseMapGallery/baseMapGallery
        */
        _createBaseMapLayer: function (layerURL, layerId) {
            var layer = new esri.layers.ArcGISTiledMapServiceLayer(layerURL, { id: layerId, visible: false });
            return layer;
        },

        /**
        * Create basemap images with respective titles
        * @param {string} layer url for the basemap
        * @param {integer} count of the basemaps configured in the config file
        * @return {object} divcontainer contains visible basemap image with respective title
        * @memberOf widgets/baseMapGallery/baseMapGallery
        */
        _createBaseMapElement: function (baseMapURL, baseMapURLCount) {
            var divContainer, imgThumbnail, i;

            divContainer = domConstruct.create("div", { "class": "esriCTbaseMapContainerNode" });
            imgThumbnail = domConstruct.create("img", { "class": "esriCTBasemapThumbnail", "src": dojo.configData.BaseMapLayers[baseMapURL + 1].ThumbnailSource }, null);
            imgThumbnail.setAttribute("index", 1);
            //Fix for creating basemap gallery as per configuration
            on(imgThumbnail, "click", lang.hitch(this, function () {
                for (i = 0; i < dojo.configData.BaseMapLayers.length; i++) {
                    if (parseInt(imgThumbnail.getAttribute("index"), 10) === i) {
                        this._changeBaseMap(dojo.configData.BaseMapLayers[i]);
                        if (i >= baseMapURLCount - 1) {
                            imgThumbnail.src = dojo.configData.BaseMapLayers[0].ThumbnailSource;
                            imgThumbnail.setAttribute("index", 0);
                        } else {
                            imgThumbnail.src = dojo.configData.BaseMapLayers[i + 1].ThumbnailSource;
                            imgThumbnail.setAttribute("index", i + 1);
                        }
                        break;
                    }
                }
            }));
            divContainer.appendChild(imgThumbnail);
            return divContainer;
        },

        /**
        * Toggle basemap layer
        * @param {object} contains current basemap object
        * @memberOf widgets/baseMapGallery/baseMapGallery
        */
        _changeBaseMap: function (basemap) {
            var baseMapLayer, allLayer = this.map.getLayersVisibleAtScale(), i;
            this._hideMapLayers();
            baseMapLayer = this.map.getLayer(basemap.Key);
            //Add boolean flag which will be used to identify the current basemap on map
            for (i = 0; i < allLayer.length; i++) {
                if (allLayer[i].url && baseMapLayer.url === allLayer[i].url) {
                    allLayer[i].isSelectedBaseMap = true;
                } else {
                    if (allLayer[i].hasOwnProperty("isSelectedBaseMap")) {
                        //If the basemap is not loaded, set flag to false
                        allLayer[i].isSelectedBaseMap = false;
                    }
                }
            }
            baseMapLayer.show();
        },

        /**
        * Hide layers
        * @memberOf widgets/baseMapGallery/baseMapGallery
        */
        _hideMapLayers: function () {
            var i, layer;

            for (i = 0; i < dojo.configData.BaseMapLayers.length; i++) {
                if (dojo.configData.BaseMapLayers[i].MapURL) {
                    layer = this.map.getLayer(dojo.configData.BaseMapLayers[i].Key);
                    if (layer) {
                        layer.hide();
                    }
                }
            }
        }

    });
});
