/*global dojo,define,require,esri */
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
require([
    "dojo/on",
    "dojo/_base/Color",
    "esri/map",
    "esri/layers/ArcGISTiledMapServiceLayer",
    "esri/layers/ImageServiceParameters",
    "esri/layers/ArcGISImageServiceLayer",
    "esri/layers/GraphicsLayer",
    "esri/graphic",
    "esri/geometry/Polygon",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "../../../../config.js",
    "dojo/domReady!"
], function (on, Color, Map, ArcGISTiledMapServiceLayer, ImageServiceParameters, ArcGISImageServiceLayer, GraphicsLayer, Graphic, Polygon, SimpleLineSymbol, SimpleFillSymbol, config) {
    /**
    * create print  widget
    *
    * @class
    * @name widgets/printMap/print
    */

    var top_opener = window.top.opener,
        tempPolygonLayer = 'tempPolygonLayer',
        tempBuffer = 'tempBuffer',
        params = dojo.byId("paramid"),
        color = "#1C86EE",
        printmap,
        parcelLayer,
        bufferLayer,
        initialExtent,
        baseMapLayer,
        imageServiceLayer;
    //fetch data from parent window
    parcelLayer = top_opener.dataObject.ParcelLayer;
    bufferLayer = top_opener.dataObject.Bufferlayer;
    baseMapLayer = top_opener.dataObject.BaseMapLayer;
    initialExtent = top_opener.dataObject.Extent;

    printmap = new Map("mapPrint", { extent: initialExtent, slider: false });

    baseMapLayer = new ArcGISTiledMapServiceLayer(baseMapLayer.url);
    printmap.addLayer(baseMapLayer);
    params = new ImageServiceParameters();
    params.format = "PNG24";
    imageServiceLayer = new ArcGISImageServiceLayer(baseMapLayer.url, { imageServiceParameters: params });
    printmap.addLayer(imageServiceLayer);
    document.title = config.ApplicationName;

    /**
    * function to add polygon and graphics in the print map window when it gets open
    * @memberOf widgets/printMap/print
    */
    on(printmap, "load", function () {
        var gLayer, i, j, buffersymbol, polygon, lineColor, fillColor, polysymbol, addWaitCount = 2;
        printmap.disablePan();
        printmap.disableDoubleClickZoom();

        printmap.disableKeyboardNavigation();
        printmap.disableScrollWheelZoom();

        // Catch additions of graphics layers
        on(printmap, "layer-add", function (addedLayer) {
            if (addedLayer.layer.id === tempBuffer || addedLayer.layer.id === tempPolygonLayer) {
                addWaitCount--;
                if (addWaitCount === 0) {
                    // After both layers have been added, perform the print
                    window.print();
                }
            }
        });

        // Add the generated buffers
        gLayer = new GraphicsLayer();
        gLayer.id = tempBuffer;
        for (i = 0; i < bufferLayer.geometries.length; i++) {
            buffersymbol = new SimpleFillSymbol(
                SimpleFillSymbol.STYLE_SOLID,
                new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_SOLID,
                    new Color([255, 0, 0, 0.65]),
                    2
                ),
                new Color([255, 0, 0, 0.35])
            );

            polygon = new Polygon(bufferLayer.geometries[i]);
            gLayer.add(new Graphic(polygon, buffersymbol));
        }
        printmap.addLayer(gLayer);

        // Add the selected parcels
        gLayer = new GraphicsLayer();
        gLayer.id = tempPolygonLayer;
        for (j = 0; j < parcelLayer.geometries.length; j++) {
            lineColor = new Color(color);

            fillColor = new Color(color);
            fillColor.a = 0.25;
            polygon = new Polygon(parcelLayer.geometries[j]);
            polysymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, lineColor, 3), fillColor);

            gLayer.add(new Graphic(polygon, polysymbol));
        }
        printmap.addLayer(gLayer);
    });
});
