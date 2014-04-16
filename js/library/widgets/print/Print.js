/*global dojo,define,require,esri */
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

require([
   "esri/map",
   "esri/layers/ImageServiceParameters",
   "esri/layers/ArcGISImageServiceLayer",
   "../../../config.js"
  ],
 function (esriMap, ImageServiceParameters, ArcGISImageServiceLayer, config) {
     var window_opener = window.dialogArguments,
     tempPolygonLayer = 'tempPolygonLayer',
     tempBuffer = 'tempBuffer',
     params = dojo.byId("paramid"),
     color = "#1C86EE",
     printmap,
     parcelLayer,
     bufferLayer,
     initialExtent, layerUrl, baseMapLayer, imageServiceLayer;
     parcelLayer = window_opener.ParcelLayer;
     bufferLayer = window_opener.Bufferlayer;
     baseMapLayer = window_opener.BaseMapLayer;
     initialExtent = window_opener.Extent;

     printmap = new esri.Map("mapPrint", { extent: initialExtent, slider: false });

     layerUrl = window_opener.BaseMapLayerURL;
     baseMapLayer = new esri.layers.ArcGISTiledMapServiceLayer(baseMapLayer.url);
     printmap.addLayer(baseMapLayer);

     params = new ImageServiceParameters();
     params.format = "PNG24";
     imageServiceLayer = new ArcGISImageServiceLayer(baseMapLayer.url, { imageServiceParameters: params });
     printmap.addLayer(imageServiceLayer);
     document.title = config.ApplicationName;
     dojo.connect(printmap, "onLoad", function () {
         var gLayer, i, buffersymbol, polygon, lineColor, fillColor, polysymbol;
         printmap.disablePan();
         printmap.disableDoubleClickZoom();

         printmap.disableKeyboardNavigation();
         printmap.disableScrollWheelZoom();

         gLayer = new esri.layers.GraphicsLayer();
         gLayer.id = tempBuffer;
         printmap.addLayer(gLayer);
         for (i = 0; i < bufferLayer.graphics.length; i++) {
             buffersymbol = new esri.symbol.SimpleFillSymbol(
                    esri.symbol.SimpleFillSymbol.STYLE_SOLID,
                    new esri.symbol.SimpleLineSymbol(
                    esri.symbol.SimpleLineSymbol.STYLE_SOLID,
                    new dojo.Color([255, 0, 0, 0.65]), 2
                    ),
                    new dojo.Color([255, 0, 0, 0.35]));

             polygon = new esri.geometry.Polygon(bufferLayer.graphics[i].geometry.toJson());
             gLayer.add(new esri.Graphic(polygon, buffersymbol));
         }

         gLayer = new esri.layers.GraphicsLayer();
         gLayer.id = tempPolygonLayer;
         printmap.addLayer(gLayer);
         for (i = 0; i < parcelLayer.graphics.length; i++) {
             lineColor = new dojo.Color();
             lineColor.setColor(color);

             fillColor = new dojo.Color();
             fillColor.setColor(color);
             fillColor.a = 0.25;
             polygon = new esri.geometry.Polygon(parcelLayer.graphics[i].geometry.toJson());
             polysymbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, lineColor, 3), fillColor);

             gLayer.add(new esri.Graphic(polygon, polysymbol));
         }
         window.print();
     });

 });


