var wms_layers = [];

// Provider OSM alternatif : les tuiles sont chargées comme images (sans XHR),
// ce qui permet d'ouvrir le fichier index.html directement en file://.
var osmSource_LOUMBILA = new ol.source.XYZ({
    attributions: '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a> | Fond : <a href="https://www.openstreetmap.fr/fonds-de-carte/">OpenStreetMap France</a>',
    url: 'https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    crossOrigin: null
});

        var lyr_OSMStandard_0 = new ol.layer.Tile({
            'title': 'OSM Standard',
            'opacity': 1.000000,
            
            
            source: osmSource_LOUMBILA
        });
var format_COMMUNE_DE_LOUMBILA_1 = new ol.format.GeoJSON();
var features_COMMUNE_DE_LOUMBILA_1 = format_COMMUNE_DE_LOUMBILA_1.readFeatures(json_COMMUNE_DE_LOUMBILA_1, 
            {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
var jsonSource_COMMUNE_DE_LOUMBILA_1 = new ol.source.Vector({
    attributions: ' ',
});
jsonSource_COMMUNE_DE_LOUMBILA_1.addFeatures(features_COMMUNE_DE_LOUMBILA_1);
var lyr_COMMUNE_DE_LOUMBILA_1 = new ol.layer.Vector({
                declutter: false,
                source:jsonSource_COMMUNE_DE_LOUMBILA_1, 
                style: style_COMMUNE_DE_LOUMBILA_1,
                popuplayertitle: 'COMMUNE_DE_LOUMBILA',
                interactive: true,
                title: '<img src="styles/legend/COMMUNE_DE_LOUMBILA_1.png" /> COMMUNE_DE_LOUMBILA'
            });
var format_PLANEAU_2 = new ol.format.GeoJSON();
var features_PLANEAU_2 = format_PLANEAU_2.readFeatures(json_PLANEAU_2, 
            {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
var jsonSource_PLANEAU_2 = new ol.source.Vector({
    attributions: ' ',
});
jsonSource_PLANEAU_2.addFeatures(features_PLANEAU_2);
var lyr_PLANEAU_2 = new ol.layer.Vector({
                declutter: false,
                source:jsonSource_PLANEAU_2, 
                style: style_PLANEAU_2,
                popuplayertitle: 'PLAN EAU',
                interactive: true,
                title: '<img src="styles/legend/PLANEAU_2.png" /> PLAN EAU'
            });
var format_COURS_EAU_3 = new ol.format.GeoJSON();
var features_COURS_EAU_3 = format_COURS_EAU_3.readFeatures(json_COURS_EAU_3, 
            {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
var jsonSource_COURS_EAU_3 = new ol.source.Vector({
    attributions: ' ',
});
jsonSource_COURS_EAU_3.addFeatures(features_COURS_EAU_3);
var lyr_COURS_EAU_3 = new ol.layer.Vector({
                declutter: false,
                source:jsonSource_COURS_EAU_3, 
                style: style_COURS_EAU_3,
                popuplayertitle: 'COURS_EAU',
                interactive: true,
                title: '<img src="styles/legend/COURS_EAU_3.png" /> COURS_EAU'
            });
var format_LOCALITE_4 = new ol.format.GeoJSON();
var features_LOCALITE_4 = format_LOCALITE_4.readFeatures(json_LOCALITE_4, 
            {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
var jsonSource_LOCALITE_4 = new ol.source.Vector({
    attributions: ' ',
});
jsonSource_LOCALITE_4.addFeatures(features_LOCALITE_4);
var lyr_LOCALITE_4 = new ol.layer.Vector({
                declutter: false,
                source:jsonSource_LOCALITE_4, 
                style: style_LOCALITE_4,
                popuplayertitle: 'LOCALITE',
                interactive: true,
                title: '<img src="styles/legend/LOCALITE_4.png" /> LOCALITE'
            });

lyr_OSMStandard_0.setVisible(true);lyr_COMMUNE_DE_LOUMBILA_1.setVisible(true);lyr_PLANEAU_2.setVisible(true);lyr_COURS_EAU_3.setVisible(true);lyr_LOCALITE_4.setVisible(true);
var layersList = [lyr_OSMStandard_0,lyr_COMMUNE_DE_LOUMBILA_1,lyr_PLANEAU_2,lyr_COURS_EAU_3,lyr_LOCALITE_4];
lyr_COMMUNE_DE_LOUMBILA_1.set('fieldAliases', {'OBJECTID': 'OBJECTID', 'Nom': 'Nom', 'SHAPE_Leng': 'SHAPE_Leng', 'SHAPE_Area': 'SHAPE_Area', });
lyr_PLANEAU_2.set('fieldAliases', {'Regime': 'Regime', 'Type': 'Type', 'Nom': 'Nom', 'SHAPE_Leng': 'SHAPE_Leng', 'SHAPE_Area': 'SHAPE_Area', });
lyr_COURS_EAU_3.set('fieldAliases', {'Regime': 'Regime', 'Type': 'Type', 'Nom': 'Nom', 'SHAPE_Leng': 'SHAPE_Leng', });
lyr_LOCALITE_4.set('fieldAliases', {'OBJECTID': 'OBJECTID', 'Nom': 'Nom', 'Statut': 'Statut', 'CLcommune': 'CLcommune', 'CLprovince': 'CLprovince', 'CLregion': 'CLregion', 'EQposte': 'EQposte', 'EQecole': 'EQecole', 'EQgendarme': 'EQgendarme', 'EQpolice': 'EQpolice', 'EQdouane': 'EQdouane', 'EQcontrole': 'EQcontrole', 'EQhopital': 'EQhopital', 'EQsanitair': 'EQsanitair', 'EQAnimiste': 'EQAnimiste', 'EQChretien': 'EQChretien', 'EQMusulman': 'EQMusulman', 'EQLCAn': 'EQLCAn', 'EQLCCh': 'EQLCCh', 'EQLCMu': 'EQLCMu', 'Marche': 'Marche', 'Code_ADM': 'Code_ADM', 'Code_GEO': 'Code_GEO', 'Nom_admin': 'Nom_admin', });
lyr_COMMUNE_DE_LOUMBILA_1.set('fieldImages', {'OBJECTID': 'Range', 'Nom': 'TextEdit', 'SHAPE_Leng': 'TextEdit', 'SHAPE_Area': 'TextEdit', });
lyr_PLANEAU_2.set('fieldImages', {'Regime': 'TextEdit', 'Type': 'TextEdit', 'Nom': 'TextEdit', 'SHAPE_Leng': 'TextEdit', 'SHAPE_Area': 'TextEdit', });
lyr_COURS_EAU_3.set('fieldImages', {'Regime': 'TextEdit', 'Type': 'TextEdit', 'Nom': 'TextEdit', 'SHAPE_Leng': 'TextEdit', });
lyr_LOCALITE_4.set('fieldImages', {'OBJECTID': 'Range', 'Nom': 'TextEdit', 'Statut': 'TextEdit', 'CLcommune': 'Range', 'CLprovince': 'Range', 'CLregion': 'Range', 'EQposte': 'Range', 'EQecole': 'Range', 'EQgendarme': 'Range', 'EQpolice': 'Range', 'EQdouane': 'Range', 'EQcontrole': 'Range', 'EQhopital': 'Range', 'EQsanitair': 'Range', 'EQAnimiste': 'Range', 'EQChretien': 'Range', 'EQMusulman': 'Range', 'EQLCAn': 'Range', 'EQLCCh': 'Range', 'EQLCMu': 'Range', 'Marche': 'Range', 'Code_ADM': 'TextEdit', 'Code_GEO': 'TextEdit', 'Nom_admin': 'TextEdit', });
lyr_COMMUNE_DE_LOUMBILA_1.set('fieldLabels', {'OBJECTID': 'no label', 'Nom': 'no label', 'SHAPE_Leng': 'no label', 'SHAPE_Area': 'no label', });
lyr_PLANEAU_2.set('fieldLabels', {'Regime': 'no label', 'Type': 'no label', 'Nom': 'no label', 'SHAPE_Leng': 'no label', 'SHAPE_Area': 'no label', });
lyr_COURS_EAU_3.set('fieldLabels', {'Regime': 'no label', 'Type': 'no label', 'Nom': 'no label', 'SHAPE_Leng': 'no label', });
lyr_LOCALITE_4.set('fieldLabels', {'OBJECTID': 'no label', 'Nom': 'no label', 'Statut': 'no label', 'CLcommune': 'no label', 'CLprovince': 'no label', 'CLregion': 'no label', 'EQposte': 'no label', 'EQecole': 'no label', 'EQgendarme': 'no label', 'EQpolice': 'no label', 'EQdouane': 'no label', 'EQcontrole': 'no label', 'EQhopital': 'no label', 'EQsanitair': 'no label', 'EQAnimiste': 'no label', 'EQChretien': 'no label', 'EQMusulman': 'no label', 'EQLCAn': 'no label', 'EQLCCh': 'no label', 'EQLCMu': 'no label', 'Marche': 'no label', 'Code_ADM': 'no label', 'Code_GEO': 'no label', 'Nom_admin': 'no label', });
lyr_LOCALITE_4.on('precompose', function(evt) {
    evt.context.globalCompositeOperation = 'normal';
});
