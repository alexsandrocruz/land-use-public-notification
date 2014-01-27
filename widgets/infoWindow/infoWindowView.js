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
        "dojo/window",
        "dojo/topic",
        "esri/tasks/query",
        "esri/tasks/QueryTask",
        "../scrollBar/scrollBar",
        "dojo/query",
        "dojo/_base/array",
        "dojo/Deferred",
        "dojo/DeferredList",
        "dojo/promise/all",
        "dojo/_base/Color",
        "esri/symbol",
        "esri/geometry",
        "esri/SpatialReference",
        "dijit/form/Button",
        "dijit/form/ComboBox",
        "dijit/form/CheckBox",
        "dojo/store/Memory",
        "esri/InfoWindowBase",
        "dojo/text!./templates/infoWindow.html",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        "dijit/_WidgetsInTemplateMixin"

    ],
     function (declare, domConstruct, domStyle, domAttr, lang, on, domGeom, dom, domClass, string, window, topic, Query, QueryTask, scrollBar, query, array, Deferred, DeferredList, all, Color, Symbol, Geometry, SpatialReference, Button, ComboBox, CheckBox, ItemFileReadStore, InfoWindowBase, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin) {

         //========================================================================================================================//
         return declare([InfoWindowBase, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {

             attachInfoWindowEvents: function () {
                 this.own(on(this.esriCTShowDetailsView, "click", lang.hitch(this, function (evt) {
                     var defaultBufferDistance = dojo.configData;
                     if (this.esriCTShowDetailsView.getAttribute("checked") == "info") {
                         this.esriCTShowDetailsView.setAttribute("checked", "notify");
                         domStyle.set(this.divInfoDetails, "display", "none");
                         domStyle.set(this.divInfoNotify, "display", "block");
                         this.esriCTShowDetailsView.src = dojoConfig.baseURL + "/themes/images/details.png";
                         this.esriCTShowDetailsView.title = "Details";
                         dijit.byId('selectAvery').store.fetch({ query: { name: "5160" }, onComplete: function (items) {
                             dijit.byId('selectAvery').displayedValue(items[0].name[0]);
                             dijit.byId('selectAvery').item = items[0];
                         }
                         });
                     } else {
                         this.esriCTShowDetailsView.setAttribute("checked", "info");
                         this.esriCTShowDetailsView.src = dojoConfig.baseURL + "/themes/images/navigation.png";
                         this.esriCTShowDetailsView.title = "Notify";
                         domStyle.set(this.divInfoDetails, "display", "block");
                         domStyle.set(this.divInfoNotify, "display", "none");
                     }
                 })));
             },
             _getAveryTemplates: function () {
                 var averyTemplates = dojo.configData.AveryLabelSettings[0].AveryLabelTemplates;
                 var averyTypes = { identifier: 'id', items: [] };
                 for (var i = 0; i < averyTemplates.length; i++) {
                     averyTypes.items[i] = { id: averyTemplates[i].value, name: averyTemplates[i].name };
                 }
                 var itemstore = new ItemFileReadStore({ data: averyTypes });
                 var filteringSelect = new ComboBox({
                     autocomplete: false,
                     hasdownarrow: true,
                     id: 'selectAvery',
                     store: itemstore,
                     searchAttr: "name",
                     style: "width: 130px;color: #FFF !important",
                     onChange: function () {
                         this._validateAveryFormat();
                     }
                 }, this.cmbAveryLabels);
                 dijit.byId("selectAvery").textbox.readOnly = true;
             },

             //Validate avery format
             _validateAveryFormat: function (value) {
                 if (!dijit.byId('selectAvery').item) {
                     dijit.byId('selectAvery').setValue('');
                 }
             }
         });
     });