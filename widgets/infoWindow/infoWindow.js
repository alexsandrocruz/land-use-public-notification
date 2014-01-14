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
        "esri/InfoWindowBase",
        "dojo/text!./templates/infoWindow.html",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        "dijit/_WidgetsInTemplateMixin"
],
 function (declare, domConstruct, domStyle, domAttr, lang, on, domGeom, dom, domClass, string, InfoWindowBase, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin) {
     return declare([InfoWindowBase, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
         templateString: template,

         postCreate: function () {
             this.infoWindowWidth = dojo.configData.InfoPopupHeight;
             this.infoWindowHeight = dojo.configData.InfoPopupWidth;
             this.infoWindowContainer = domConstruct.create("div", {}, dom.byId("esriCTParentDivContainer"));
             this.infoWindowContainer.appendChild(this.esriCTinfoWindow);
             this._anchor = domConstruct.create("div", { "class": "esriCTdivTriangle" }, this.domNode);
             esri.hide(this.domNode);
             this._hideInfoContainer();
         },

         show: function (location) {
             this.setLocation(location);
         },
         resize: function (width, height) {
             this.infoWindowWidth = width;
             this.infoWindowHeight = height;
             dojo.style(this.domNode, {
                 width: width + "px",
                 height: height + "px"
             });
         },

         setLocation: function (location) {
             if (location.spatialReference) {
                 location = this.map.toScreen(location);
             }
             domStyle.set(this.domNode, {
                 left: (location.x - (this.infoWindowWidth / 2)) + "px",
                 bottom: (location.y + 28) + "px"
             });
             //this._title.style.display = 'none';
             esri.show(this.domNode);
             this.isShowing = true;
         },
         hide: function () {
             esri.hide(this.domNode);
             this.isShowing = false;
             this.onHide();
         },

         _hideInfoContainer: function (map) {
             this.own(on(this.esriCTclosediv, "click", lang.hitch(this, function (evt) {
                 esri.hide(this.domNode);
             })));
         }
     });


 });