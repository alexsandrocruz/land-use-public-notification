/*global define,dojo,window,alert,esri,parent:true,dijit,location */
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
    "dojo/_base/array",
    "dojo/on",
    "dojo/dom",
    "dojo/dom-attr",
    "dojo/dom-class",
    "dojo/dom-geometry",
    "dojo/string",
    "dojo/_base/html",
    "dojo/text!./templates/shareTemplate.html",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/i18n!nls/localizedStrings",
    "dojo/topic",
    "esri/request"
  ],
function (declare, domConstruct, domStyle, lang, array, on, dom, domAttr, domClass, domGeom, string, html, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, sharedNls, topic, esriRequest) {

    //========================================================================================================================//

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        sharedNls: sharedNls,

        /**
        * create share widget
        *
        * @class
        * @name widgets/share/share
        */
        postCreate: function () {

            /**
            * close share panel if any other widget is opened
            * @param {string} widget Key of the newly opened widget
            */
            topic.subscribe("toggleWidget", lang.hitch(this, function (widgetID) {
                if (widgetID !== "share") {
                    /**
                    * divAppContainer Sharing Options Container
                    * @member {div} divAppContainer
                    * @private
                    * @memberOf widgets/share/share
                    */
                    if (html.coords(this.divAppContainer).h > 0) {
                        domClass.replace(this.domNode, "esriCTImgSocialMedia", "esriCTImgSocialMedia-select");
                        domClass.replace(this.divAppContainer, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
                        domClass.replace(this.divAppContainer, "esriCTZeroHeight", "esriCTFullHeight");
                    }
                }
            }));

            topic.subscribe("getoverlayValuesToBuffer", lang.hitch(this, this.getoverlayValuesToBuffer));
            topic.subscribe("getValuesToBuffer", lang.hitch(this, this.getValuesToBuffer));

            this.domNode = domConstruct.create("div", { "title": sharedNls.tooltips.share, "class": "esriCTImgSocialMedia" }, null);

            this.own(on(this.domNode, "click", lang.hitch(this, function () {

                /**
                * minimize other open header panel widgets and show share panel
                */
                topic.publish("toggleWidget", "share");
                this._sharelink();
            })));
            on(this.embedding, "click", lang.hitch(this, function () {
                this._showembeddingContainer();
            }));
        },

        _showembeddingContainer: function () {
            if (domStyle.get(this.esriCTDivshareContainer, "display") === "none") {
                domStyle.set(this.esriCTDivshareContainer, "display", "block");
            }
            else {
                domStyle.set(this.esriCTDivshareContainer, "display", "none");
            }
        },

        /**
        * display sharing panel
        * @param {array} dojo.configData.MapSharingOptions Sharing option settings specified in configuration file
        * @memberOf widgets/share/share
        */
        _sharelink: function () {
            var mapExtent, url, urlStr, encodedUri, tinyResponse;
            domAttr.set(this.esriCTDivshareCodeContainer, "innerHTML", sharedNls.webpageDispalyText);
            this.esriCTDivshareCodeContent.value = "<iframe width='100%' height='100%' src='" + location.href + "'></iframe> ";
            /**
            * get current map extent to be shared
            */

            mapExtent = this._getMapExtent();
            url = esri.urlToObject(window.location.toString());

            if ((dojo.parcelArray.length > 0) && (dojo.roadArray.length <= 0) && (dojo.overLayArray.length <= 0)) {
                if (this.map.getLayer("tempBufferLayer").graphics.length > 0) {
                    urlStr = encodeURI(url.path) + "?extent=" + mapExtent + "$dist=" + this.map.infoWindow.txtBuffer.value + "$ocupntTxt=" + this.map.infoWindow.textoccupant.value + "$PDF=" + ((dijit.byId('chkPdf').checked) ? "checked" : false)
            + "$CSV=" + ((dijit.byId('chkCsv').checked) ? "checked" : false) + "$occupant=" + ((dijit.byId('chkOccupants').checked) ? "checked" : false)
             + "$owner=" + ((dijit.byId('chkOwners').checked) ? "checked" : false)
            + "$averyFormat=" + dijit.byId('selectAvery').item.id[0] + "$parcelID=" + dojo.parcelArray.join(",");
                } else {
                    urlStr = encodeURI(url.path) + "?extent=" + mapExtent + "$parcelID=" + dojo.parcelArray.join(",");
                }
            } else if (dojo.roadArray.length > 0) {
                if (!(this.map.infoWindow.txtBuffer.value)) {
                    this.map.infoWindow.txtBuffer.value = dojo.configData.DefaultBufferDistance;
                }
                if (!(dijit.byId('selectAvery').item)) {
                    dijit.byId('selectAvery').store.fetch({ query: { name: "5160" }, onComplete: function (items) {
                        dijit.byId('selectAvery').setDisplayedValue(items[0].name[0]);
                        dijit.byId('selectAvery').item = items[0];
                    }
                    });
                    dijit.byId('chkOwners').checked = true;
                    dijit.byId('chkPdf').checked = true;
                }

                urlStr = encodeURI(url.path) + "?extent=" + mapExtent + "$dist=" + this.map.infoWindow.txtBuffer.value + "$ocupntTxt=" + this.map.infoWindow.textoccupant.value + "$PDF=" + ((dijit.byId('chkPdf').checked) ? "checked" : false)
            + "$CSV=" + ((dijit.byId('chkCsv').checked) ? "checked" : false) + "$occupant=" + ((dijit.byId('chkOccupants').checked) ? "checked" : false)
             + "$owner=" + ((dijit.byId('chkOwners').checked) ? "checked" : false)
            + "$averyFormat=" + dijit.byId('selectAvery').item.id[0] + "$roadID=" + dojo.roadArray.join(",");
            } else if (dojo.overLayArray.length > 0) {

                if (this.map.getLayer("tempBufferLayer").graphics.length > 0) {
                    urlStr = encodeURI(url.path) + "?extent=" + mapExtent + "$dist=" + this.map.infoWindow.txtBuffer.value + "$ocupntTxt=" + this.map.infoWindow.textoccupant.value + "$PDF=" + ((dijit.byId('chkPdf').checked) ? "checked" : false)
            + "$CSV=" + ((dijit.byId('chkCsv').checked) ? "checked" : false) + "$occupant=" + ((dijit.byId('chkOccupants').checked) ? "checked" : false)
             + "$owner=" + ((dijit.byId('chkOwners').checked) ? "checked" : false)
            + "$averyFormat=" + dijit.byId('selectAvery').item.id[0] + "$overlayID=" + dojo.overLayArray.join(",") + "$Where=" + dojo.overlay;
                }
                else if ((dojo.overLayGraphicShare) && (this.map.getLayer("tempBufferLayer").graphics.length === 0)) {
                    urlStr = encodeURI(url.path) + "?extent=" + mapExtent + "$overlayID=" + dojo.overLayArray.join(",") + "$Where=" + dojo.overlay;
                } else {
                    urlStr = encodeURI(url.path) + "?extent=" + mapExtent + "$overlayID=" + dojo.overLayArray.join(",");
                }
            } else {
                urlStr = encodeURI(url.path) + "?extent=" + mapExtent;
            }

            if ((dojo.overLayArray.length > 0) && dojo.displayInfo) {
                urlStr = urlStr + "$displayInfo=" + dojo.displayInfo + "$point=" + dojo.selectedMapPoint.x + "," + dojo.selectedMapPoint.y + "$Where=" + dojo.overlay;
            } else if (dojo.displayInfo) {
                urlStr = urlStr + "$displayInfo=" + dojo.displayInfo + "$point=" + dojo.selectedMapPoint.x + "," + dojo.selectedMapPoint.y;
            }

            try {
                /**
                * call tinyurl service to generate share URL
                */
                encodedUri = encodeURIComponent(urlStr);
                url = string.substitute(dojo.configData.MapSharingOptions.TinyURLServiceURL, [encodedUri]);
                esriRequest({
                    url: url
                }, {
                    useProxy: true
                }).then(lang.hitch(this, function (response) {
                    var tinyUrl, applicationHeaderDiv;

                    tinyResponse = response.data;
                    if (tinyResponse) {
                        tinyUrl = tinyResponse.url;
                    }
                    applicationHeaderDiv = domConstruct.create("div", { "class": "esriCTApplicationShareicon" }, dom.byId("esriCTParentDivContainer"));
                    applicationHeaderDiv.appendChild(this.divAppContainer);
                    if (html.coords(this.divAppContainer).h > 0) {

                        /**
                        * when user clicks on share icon in header panel, close the sharing panel if it is open
                        */
                        domClass.replace(this.domNode, "esriCTImgSocialMedia", "esriCTImgSocialMedia-select");
                        domClass.replace(this.divAppContainer, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
                        domClass.replace(this.divAppContainer, "esriCTZeroHeight", "esriCTFullHeight");
                    } else {

                        /**
                        * when user clicks on share icon in header panel, open the sharing panel if it is closed
                        */
                        domClass.replace(this.domNode, "esriCTImgSocialMedia-select", "esriCTImgSocialMedia");
                        domClass.replace(this.divAppContainer, "esriCTShowContainerHeight", "esriCTHideContainerHeight");
                        domClass.replace(this.divAppContainer, "esriCTFullHeight", "esriCTZeroHeight");
                    }

                        /**
                        * remove event handlers from sharing options
                        */
                        if (this.facebookHandle) {
                            this.facebookHandle.remove();
                            this.twitterHandle.remove();
                            this.emailHandle.remove();
                        }
                        /**
                        * add event handlers to sharing options
                        */
                        this.facebookHandle = on(this.tdFacebook, "click", lang.hitch(this, function () { this._share("facebook", tinyUrl, urlStr); }));
                        this.twitterHandle = on(this.tdTwitter, "click", lang.hitch(this, function () { this._share("twitter", tinyUrl, urlStr); }));
                        this.emailHandle = on(this.tdMail, "click", lang.hitch(this, function () { this._share("email", tinyUrl, urlStr); }));

                }), lang.hitch(this, function (error) {
                    domClass.replace(this.domNode, "esriCTImgSocialMedia-select", "esriCTImgSocialMedia");
                    alert(sharedNls.errorMessages.shareLoadingFailed);

                }));
            }
            catch (err) {
                alert(sharedNls.errorMessages.shareLoadingFailed);
            }
        },

        /**
        * return current map extent
        * @return {string} Current map extent
        * @memberOf widgets/share/share
        */
        _getMapExtent: function () {
            var extents = Math.round(this.map.extent.xmin).toString() + "," + Math.round(this.map.extent.ymin).toString() + "," + Math.round(this.map.extent.xmax).toString() + "," + Math.round(this.map.extent.ymax).toString();
            return extents;
        },

        /**
        * share application detail with selected share option
        * @param {string} site Selected share option
        * @param {string} tinyUrl Tiny URL for sharing
        * @param {string} urlStr Long URL for sharing
        * @memberOf widgets/share/share
        */
        _share: function (site, tinyUrl, urlStr) {
            /*
            * hide share panel once any of the sharing options is selected
            */
            if (html.coords(this.divAppContainer).h > 0) {
                domClass.replace(this.divAppContainer, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
                domClass.add(this.divAppContainer, "esriCTZeroHeight");
            }
            try {
                if (tinyUrl) {
                    this._shareOptions(site, tinyUrl);
                } else {
                    this._shareOptions(site, urlStr);
                }
            } catch (err) {
                alert(sharedNls.errorMessages.shareFailed);
            }
        },

        /**
        * generate sharing URL and share with selected share option
        * @param {string} site Selected share option
        * @param {string} url URL for sharing
        * @memberOf widgets/share/share
        */
        _shareOptions: function (site, url) {
            domClass.replace(this.domNode, "esriCTImgSocialMedia", "esriCTImgSocialMedia-select");
            switch (site) {
                case "facebook":
                    window.open(string.substitute(dojo.configData.MapSharingOptions.FacebookShareURL, [url]));
                    break;
                case "twitter":
                    window.open(string.substitute(dojo.configData.MapSharingOptions.TwitterShareURL, [url]));
                    break;
                case "email":
                    parent.location = string.substitute(dojo.configData.MapSharingOptions.ShareByMailLink, [url]);
                    break;
            }
        },

        getValuesToBuffer: function (parcel) {
            var annotation, str;
            if (window.location.toString().split("$dist=").length > 1) {
                this.map.infoWindow.txtBuffer.value = Number(window.location.toString().split("$dist=")[1].split("$ocupntTxt=")[0]);
                str = window.location.toString().split("$PDF=")[1].split("$CSV=")[0];
                dijit.byId('chkPdf').checked = (str === "false") ? "" : str;
                str = window.location.toString().split("$CSV=")[1].split("$occupant=")[0];
                dijit.byId('chkCsv').checked = (str === "false") ? "" : str;
                str = window.location.toString().split("$occupant=")[1].split("$owner=")[0];
                dijit.byId('chkOccupants').checked = (str === "false") ? "" : str;
                str = window.location.toString().split("$owner=")[1].split("$averyFormat=")[0];
                dijit.byId('chkOwners').checked = (str === "false") ? "" : str;
                this.map.infoWindow.textoccupant.value = (window.location.toString().split("$ocupntTxt=")[1].split("$PDF")[0]);
                if (parcel) {
                    annotation = "$parcelID=";
                }
                else {
                    annotation = "$roadID=";
                }
                dijit.byId('selectAvery').store.fetch({
                    query: { name: window.location.toString().split("$averyFormat=")[1].split(annotation)[0].split("avery")[1] },
                    onComplete: function (items) {
                        dijit.byId('selectAvery').setDisplayedValue(items[0].name[0]);
                        dijit.byId('selectAvery').item = items[0];
                    }
                });
            }
        },

        getoverlayValuesToBuffer: function (overlay) {
            var annotation, str;
            if (window.location.toString().split("$dist=").length > 1) {
                this.map.infoWindow.txtBuffer.value = Number(window.location.toString().split("$dist=")[1].split("$ocupntTxt=")[0]);
                str = window.location.toString().split("$PDF=")[1].split("$CSV=")[0];
                dijit.byId('chkPdf').checked = (str === "false") ? "" : str;
                str = window.location.toString().split("$CSV=")[1].split("$occupant=")[0];
                dijit.byId('chkCsv').checked = (str === "false") ? "" : str;
                str = window.location.toString().split("$occupant=")[1].split("$owner=")[0];
                dijit.byId('chkOccupants').checked = (str === "false") ? "" : str;
                str = window.location.toString().split("$owner=")[1].split("$averyFormat=")[0];
                dijit.byId('chkOwners').checked = (str === "false") ? "" : str;
                this.map.infoWindow.textoccupant.value = (window.location.toString().split("$ocupntTxt=")[1].split("$PDF")[0]);
                if (overlay) {
                    annotation = "$overlayID=";
                }

                dijit.byId('selectAvery').store.fetch({
                    query: { name: window.location.toString().split("$averyFormat=")[1].split(annotation)[0].split("avery")[1] },
                    onComplete: function (items) {
                        dijit.byId('selectAvery').setDisplayedValue(items[0].name[0]);
                        dijit.byId('selectAvery').item = items[0];
                    }
                });
            }

        }

    });
});
