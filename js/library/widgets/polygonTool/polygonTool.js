/*global define,dojo,dojoConfig,Modernizr,alert */
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
    "dojo/_base/lang",
    "dojo/dom-construct",
    "dojo/on",
    "dojo/dom-class",
    "dojo/topic",
    "dijit/_WidgetBase",
    "esri/tasks/GeometryService",
    "esri/geometry/Point",
    "esri/symbols/PictureMarkerSymbol",
    "esri/SpatialReference",
    "esri/toolbars/draw",
    "esri/symbols/SimpleFillSymbol",
    "esri/graphic",
    "dojo/i18n!application/js/library/nls/localizedStrings"
], function (declare, lang, domConstruct, on, domClass, topic, _WidgetBase, GeometryService, Point, PictureMarkerSymbol, SpatialReference, Draw, SimpleFillSymbol, Graphic, sharedNls) {

  //========================================================================================================================//

  return declare([_WidgetBase], {
    sharedNls: sharedNls,
    _drawTool: null,
    /**
    * create polygonTool widget
    *
    * @class
    * @memberOf widgets/polygonTool/polygonTool
    */
    postCreate: function () {
        this.domNode = domConstruct.create("div", { "title": sharedNls.tooltips.polygon, "class": "esriCTTdHeaderPolygon" }, null);

      /**
      * deactivate polygon tool if any other widget is selected
      * @param {string} widget Key of the newly opened widget
      */
      topic.subscribe("toggleWidget", lang.hitch(this, function (widgetID) {
        if (widgetID !== "polygonTool") {
          if (domClass.contains(this.domNode, "esriCTTdHeaderPolygon-select")) {
            this._deActivateDrawTool();
          }
        }
      }));

      //event listener to activate draw tool
      topic.subscribe("activateDrawTool", lang.hitch(this, this._activateDrawTool));

      //event listener to deactivate draw tool
      topic.subscribe("deactivateDrawTool", lang.hitch(this, this._deActivateDrawTool));

      //activate/deactivate draw tool
      this.own(on(this.domNode, "click", lang.hitch(this, function () {
        topic.publish("toggleWidget", "polygonTool");
        if (domClass.contains(this.domNode, "esriCTTdHeaderPolygon-select")) {
          domClass.replace(this.domNode, "esriCTTdHeaderPolygon", "esriCTTdHeaderPolygon-select");
          this._deActivateDrawTool();
        } else {
          domClass.replace(this.domNode, "esriCTTdHeaderPolygon-select", "esriCTTdHeaderPolygon");
          this._activateDrawTool();
        }
      })));
      this._initDrawTool();
    },

    /**
    * initialize draw tool
    * @memberOf widgets/polygonTool/polygonTool
    */
    _initDrawTool: function () {
      this._drawTool = new Draw(this.map);
      this._drawTool.on("draw-end", lang.hitch(this, this._onDrawEnd));
    },

    /**
    * activate draw tool
    * @memberOf widgets/polygonTool/polygonTool
    */
    _activateDrawTool: function () {
      dojo.isDownloadReport = false;
      //clear graphics from map
      topic.publish("clearAll");
      this._drawTool.activate(Draw["POLYGON"]);
      topic.publish("drawToolActivated");
    },

    /**
    * deactivate draw tool
    * @memberOf widgets/polygonTool/polygonTool
    */
    _deActivateDrawTool: function () {
      this._drawTool.deactivate();
      domClass.replace(this.domNode, "esriCTTdHeaderPolygon", "esriCTTdHeaderPolygon-select");
      topic.publish("drawToolDeActivated");
    },

    /**
    * deactivate draw tool when polygon is created
    * @memberOf widgets/polygonTool/polygonTool
    */
    _onDrawEnd: function (evt) {
      this._deActivateDrawTool();
      dojo.polygonGeometry = evt.geometry;
      dojo.bufferGeometry = dojo.polygonGeometry;
      topic.publish("polygonCreated", evt.geometry);
    }
  });
});