/*global define,dojo,esri */
/*jslint sloppy:true,nomen:true,plusplus:true */
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
            var i, basemapContainer,
                baseMapURL = 0,
                baseMapURLCount = 0,
                baseMapLayers = dojo.configData.BaseMapLayers;

            for (i = 0; i < baseMapLayers.length; i++) {
                if (baseMapLayers[i].MapURL) {
                    if (baseMapURLCount === 0) {
                        baseMapURL = i;
                    }
                    baseMapURLCount++;
                }
            }

            basemapContainer = domConstruct.create("div", {}, dom.byId("esriCTParentDivContainer"));
            basemapContainer.appendChild(this.esriCTDivLayerContainer);
            this.layerList.appendChild(this._createBaseMapElement(baseMapURL, baseMapURLCount));
        },

        _createBaseMapLayer: function (layerURL, layerId) {
            var layer = new esri.layers.ArcGISTiledMapServiceLayer(layerURL, { id: layerId, visible: false });
            return layer;
        },

        _createBaseMapElement: function (baseMapURL, baseMapURLCount) {
            var presentThumbNail, divContainer, imgThumbnail, presentBaseMap;

            divContainer = domConstruct.create("div", { "class": "esriCTbaseMapContainerNode" });
            imgThumbnail = domConstruct.create("img", { "class": "esriCTBasemapThumbnail", "src": dojo.configData.BaseMapLayers[baseMapURL + 1].ThumbnailSource }, null);
            presentBaseMap = baseMapURL + 1;
            presentThumbNail = baseMapURL + 2;
            on(imgThumbnail, "click", lang.hitch(this, function () {
                imgThumbnail.src = dojo.configData.BaseMapLayers[presentThumbNail].ThumbnailSource;
                this._changeBaseMap(presentBaseMap);
                if (baseMapURLCount - 1 === presentThumbNail) {
                    presentThumbNail = baseMapURL;
                } else {
                    presentThumbNail++;
                }
                if (baseMapURLCount - 1 === presentBaseMap) {
                    presentBaseMap = baseMapURL;
                } else {
                    presentBaseMap++;
                }
            }));
            divContainer.appendChild(imgThumbnail);
            return divContainer;
        },

        _changeBaseMap: function (spanControl) {
            var layer, basemap;
            basemap = this.map.getLayer("esriCTbasemap");
            this.map.removeLayer(basemap);

            layer = new esri.layers.ArcGISTiledMapServiceLayer(dojo.configData.BaseMapLayers[spanControl].MapURL, { id: "esriCTbasemap", visible: true });
            this.map.addLayer(layer);


        },

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