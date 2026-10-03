(function () {
  'use strict';
  var OWNER = 'ouedkarim-crypto';
  var API = 'https://api.github.com/repos/' + OWNER + '/WEBMAP_LOUMBILA/contents/updates/couches.json';
  var bridge = window.webmapBridge;
  if (!bridge) return;
  var layers = bridge.layers;
  var format = new ol.format.GeoJSON();
  var projection = { dataProjection: 'EPSG:4326', featureProjection: map.getView().getProjection() };
  var token = '', remoteSha = '', ready = false, saving = false, dirty = false;
  var history = [], selected = null, activeInteraction = null, snap = null, selectionClick = null;
  var selectedCollection = new ol.Collection();
  var selectionLayer = new ol.layer.Vector({ source: new ol.source.Vector({ features: selectedCollection }), style: new ol.style.Style({
    stroke: new ol.style.Stroke({color:'#e69900',width:4}), fill: new ol.style.Fill({color:'rgba(242,201,76,.2)'}),
    image: new ol.style.Circle({radius:9,fill:new ol.style.Fill({color:'#e69900'}),stroke:new ol.style.Stroke({color:'#fff',width:2})})
  }) });
  selectionLayer.setZIndex(2000); map.addLayer(selectionLayer);
  function el(id) { return document.getElementById(id); }
  function source(layer) { var s = layer.getSource(); return s instanceof ol.source.Cluster ? s.getSource() : s; }
  function currentLayer() { return layers[Number(el('editor-layer').value) || 0]; }
  function message(text, error) { el('editor-message').textContent = text; el('editor-message').classList.toggle('error', !!error); }
  function name(layer) { return layer.get('popuplayertitle'); }
  function fields(layer) { return Object.keys(layer.get('fieldAliases') || {}).filter(function(k){return k !== 'geometry';}); }
  function schema(layer) {
    var explicit = layer.get('editorTypes') || {};
    var result = {};
    fields(layer).forEach(function(field) {
      var value = source(layer).getFeatures().map(function(f){return f.get(field);}).find(function(v){return v != null;});
      result[field] = explicit[field] || (typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'text');
    });
    return result;
  }
  function capture() {
    var result = {version:1,layers:{}};
    layers.forEach(function(layer) {
      result.layers[name(layer)] = {aliases:layer.get('fieldAliases') || {},types:schema(layer),
        geojson:format.writeFeaturesObject(source(layer).getFeatures(),projection)};
    });
    return result;
  }
  function validate(data) {
    if (!data || data.version !== 1 || !data.layers || typeof data.layers !== 'object') throw new Error('Format de sauvegarde incompatible.');
    var allowed = layers.map(name);
    Object.keys(data.layers).forEach(function(key) {
      if (allowed.indexOf(key) === -1) throw new Error('Couche inconnue : ' + key);
      var item = data.layers[key];
      if (!item.aliases || !item.geojson || item.geojson.type !== 'FeatureCollection' || !Array.isArray(item.geojson.features)) throw new Error('Couche invalide : ' + key);
      Object.keys(item.aliases).forEach(function(field) {
        if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(field) || ['geometry','__proto__','constructor','prototype'].indexOf(field) !== -1) throw new Error('Nom de champ invalide : ' + field);
      });
      format.readFeatures(item.geojson,projection).forEach(function(feature) {
        if (!feature.getGeometry()) throw new Error('Géométrie manquante : ' + key);
      });
    });
  }
  function apply(data) {
    validate(data);
    stopSpatial(); selected = null; selectedCollection.clear();
    layers.forEach(function(layer) {
      var item = data.layers[name(layer)]; if (!item) return;
      var features = format.readFeatures(item.geojson,projection);
      var s = source(layer); s.clear(); s.addFeatures(features);
      layer.set('fieldAliases',item.aliases); layer.set('editorTypes',item.types || {});
      var images = {}, labels = {}; Object.keys(item.aliases).forEach(function(field){images[field]='TextEdit';labels[field]='no label';});
      layer.set('fieldImages',images); layer.set('fieldLabels',labels);
    });
    bridge.refresh();
  }
  function checkpoint() { history.push(capture()); if(history.length>20)history.shift(); }
  function changed(text) { dirty = true; bridge.refresh(); render(); message(text + ' Enregistrez en ligne pour partager.'); }
  function utf8Decode(base64) { return new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\s/g,'')),function(c){return c.charCodeAt(0);})); }
  function utf8Encode(text) { var bytes = new TextEncoder().encode(text), chunks=[]; for(var i=0;i<bytes.length;i+=8192)chunks.push(String.fromCharCode.apply(null,bytes.subarray(i,i+8192))); return btoa(chunks.join('')); }
  async function github(url, options) {
    var headers = {Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
    if(token) headers.Authorization='Bearer '+token;
    var response = await fetch(url,Object.assign({cache:'no-store'},options || {},{headers:Object.assign(headers,options && options.headers)}));
    if(!response.ok) {
      if(response.status===401)throw new Error('Jeton invalide ou expiré.');
      if(response.status===403)throw new Error('Accès refusé : vérifiez les droits du jeton et du dépôt.');
      if(response.status===409 || response.status===422)throw new Error('La version en ligne a changé. Rechargez avant de réessayer.');
      throw new Error('GitHub : erreur '+response.status+'.');
    }
    return response.json();
  }
  async function loadShared() {
    try {
      var file = await github(API+'?ref=main');
      var data = JSON.parse(utf8Decode(file.content));
      apply(data); remoteSha=file.sha; ready=true;
      message('Données partagées chargées.');
    } catch(error) {
      ready=false; message('Impossible de charger les données partagées. '+error.message, true);
    }
  }
  function background(inert) { document.querySelectorAll('.app-header,.workspace,.app-footer').forEach(function(node){node.inert=inert;}); }
  function showEditor() { el('editor').hidden=false; background(true); document.body.classList.add('editor-open'); render(); el('editor-close').focus(); }
  function hideEditor() { el('editor').hidden=true; background(false); document.body.classList.remove('editor-open'); map.updateSize(); }
  function logout() {
    stopSpatial(); hideEditor(); token=''; el('editor-token').value=''; el('editor-login').hidden=true;
    if(dirty) { history=[]; dirty=false; loadShared(); }
    el('editor-open').focus();
  }
  function render() {
    var layer=currentLayer(), fs=fields(layer), features=source(layer).getFeatures();
    el('editor-summary').textContent=name(layer)+' · '+features.length+' entités · '+fs.length+' champs';
    el('editor-dirty').textContent=dirty?'Modifications non enregistrées':'Version partagée';
    el('editor-save').disabled=!dirty || !ready || saving;
    el('editor-undo').disabled=!history.length;
    var body=el('editor-table-body'), head=el('editor-table-head'); body.replaceChildren();head.replaceChildren();
    var th=document.createElement('th');th.textContent='Sélection';head.appendChild(th);
    fs.forEach(function(field){var cell=document.createElement('th');cell.textContent=(layer.get('fieldAliases')[field]||field)+' · '+field;head.appendChild(cell);});
    features.forEach(function(feature,index){
      var row=document.createElement('tr'); row.classList.toggle('selected',feature===selected);
      var cell=document.createElement('td'), button=document.createElement('button');button.type='button';button.textContent='Entité '+(index+1);
      button.onclick=function(){selected=feature;selectedCollection.clear();selectedCollection.push(feature);render();};cell.appendChild(button);row.appendChild(cell);
      fs.forEach(function(field){var td=document.createElement('td');var value=feature.get(field);td.textContent=value==null?'—':String(value);row.appendChild(td);});body.appendChild(row);
    });
    el('editor-fields').replaceChildren();
    fs.forEach(function(field){var option=document.createElement('option');option.value=field;option.textContent=field;el('editor-fields').appendChild(option);});
    el('editor-attributes').replaceChildren();
    var geometryType = name(layer)==='LOCALITE' ? 'Point' : name(layer)==='COURS_EAU' ? 'LineString' : 'Polygon';
    el('editor-geometry-type').replaceChildren();
    var geometryOption=document.createElement('option');geometryOption.value=geometryType;
    geometryOption.textContent={Point:'Point',LineString:'Ligne',Polygon:'Polygone'}[geometryType];
    el('editor-geometry-type').appendChild(geometryOption);
    el('editor-geometry-type').value=geometryType;
    el('editor-delete-entity').disabled=!selected;el('editor-edit-geometry').disabled=!selected;el('editor-attribute-save').disabled=!selected;
    if(!selected){el('editor-attributes').textContent='Sélectionnez une entité dans la table pour modifier ses attributs.';return;}
    var types=schema(layer);
    fs.forEach(function(field){
      var label=document.createElement('label');label.textContent=layer.get('fieldAliases')[field]||field;
      var input=document.createElement('input');input.dataset.field=field;input.dataset.type=types[field];
      input.type=types[field]==='number'?'number':'text';if(input.type==='number')input.step='any';
      var value=selected.get(field);input.value=value==null?'':String(value);if(types[field]==='boolean')input.placeholder='true ou false';
      label.appendChild(input);el('editor-attributes').appendChild(label);
    });
  }
  function stopSpatial() {
    if(activeInteraction)map.removeInteraction(activeInteraction);if(snap)map.removeInteraction(snap);if(selectionClick)map.un('singleclick',selectionClick);
    activeInteraction=null;snap=null;selectionClick=null;window.webmapEditorEditing=false;el('editor-map-tools').hidden=true;
  }
  function spatial(mode) {
    if(!token)return;var layer=currentLayer(); stopSpatial();hideEditor();window.webmapEditorEditing=true;
    layer.setVisible(true);el('editor-map-tools').hidden=false;
    el('editor-map-instruction').textContent=mode==='draw'?'Dessinez une nouvelle entité. Double-cliquez pour terminer une ligne ou un polygone. Échap annule le dessin.':'Déplacez les sommets de l’entité sélectionnée. Alt + clic supprime un sommet.';
    if(mode==='draw') {
      var before=capture();activeInteraction=new ol.interaction.Draw({source:source(layer),type:el('editor-geometry-type').value});
      activeInteraction.on('drawend',function(event){
        var types=schema(layer);fields(layer).forEach(function(field){event.feature.set(field,types[field]==='number'?0:null);});
        selected=event.feature;
        window.setTimeout(function(){history.push(before);stopSpatial();selectedCollection.clear();selectedCollection.push(selected);dirty=true;bridge.refresh();showEditor();message('Entité créée. Renseignez ses attributs puis enregistrez en ligne.');},0);
      });
    } else {
      if(!selected){stopSpatial();showEditor();return;}
      selectedCollection.clear();selectedCollection.push(selected);
      map.getView().fit(selected.getGeometry().getExtent(),{padding:[100,70,70,70],maxZoom:17});
      activeInteraction=new ol.interaction.Modify({features:selectedCollection});
      activeInteraction.on('modifystart',checkpoint);
      activeInteraction.on('modifyend',function(){dirty=true;bridge.refresh();});
    }
    map.addInteraction(activeInteraction);snap=new ol.interaction.Snap({source:source(layer)});map.addInteraction(snap);
  }
  layers.forEach(function(layer,index){var option=document.createElement('option');option.value=index;option.textContent=name(layer);el('editor-layer').appendChild(option);});
  el('editor-open').onclick=function(){
    if(token){showEditor();return;}
    el('editor-login').hidden=false;el('editor-login-message').textContent='';el('editor-token').focus();
  };
  el('editor-login-cancel').onclick=function(){el('editor-login').hidden=true;el('editor-token').value='';};
  el('editor-login-form').onsubmit=async function(event){
    event.preventDefault();var button=el('editor-login-submit');button.disabled=true;
    try {
      token=el('editor-token').value.trim();if(!token)throw new Error('Saisissez votre jeton GitHub.');
      var user=await github('https://api.github.com/user');
      if(user.login!==OWNER)throw new Error('Édition réservée au compte '+OWNER+'.');
      var repo=await github('https://api.github.com/repos/'+OWNER+'/WEBMAP_LOUMBILA');
      if(!repo.permissions || !repo.permissions.push)throw new Error('Ce jeton ne permet pas d’écrire dans le dépôt.');
      await loadShared();if(!ready)throw new Error('Chargement des données partagées impossible.');
      el('editor-token').value='';el('editor-login').hidden=true;showEditor();
    } catch(error){token='';el('editor-login-message').textContent=error.message;} finally{button.disabled=false;}
  };
  el('editor-close').onclick=function(){hideEditor();el('editor-open').focus();};
  el('editor-logout').onclick=function(){if(dirty && !confirm('Quitter et abandonner les modifications non enregistrées ?'))return;logout();};
  el('editor-layer').onchange=function(){selected=null;selectedCollection.clear();render();};
  el('editor-add-field').onclick=function(){
    var field=el('editor-field-name').value.trim(),layer=currentLayer();
    if(!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(field) || ['geometry','__proto__','constructor','prototype'].indexOf(field)!==-1){message('Nom : lettre initiale, puis lettres, chiffres ou underscores (64 caractères maximum).',true);return;}
    if(fields(layer).indexOf(field)!==-1){message('Ce champ existe déjà.',true);return;}
    checkpoint();var type=el('editor-field-type').value;
    var aliases=Object.assign({},layer.get('fieldAliases'));aliases[field]=el('editor-field-label').value.trim()||field;layer.set('fieldAliases',aliases);
    var types=Object.assign({},schema(layer));types[field]=type;layer.set('editorTypes',types);
    source(layer).getFeatures().forEach(function(feature){feature.set(field,null);});
    el('editor-field-name').value='';el('editor-field-label').value='';changed('Champ ajouté.');
  };
  el('editor-delete-field').onclick=function(){
    var field=el('editor-fields').value,layer=currentLayer();if(!field)return;
    if(!confirm('Supprimer le champ '+field+' et ses valeurs dans toute la couche ? Vous pourrez annuler avant l’enregistrement.'))return;
    checkpoint();var aliases=Object.assign({},layer.get('fieldAliases'));delete aliases[field];layer.set('fieldAliases',aliases);
    var types=Object.assign({},layer.get('editorTypes'));delete types[field];layer.set('editorTypes',types);
    source(layer).getFeatures().forEach(function(feature){feature.unset(field);});changed('Champ supprimé.');
  };
  el('editor-attribute-save').onclick=function(){
    if(!selected)return;var values=[];
    try{el('editor-attributes').querySelectorAll('input').forEach(function(input){
      var value=input.value.trim();
      if(value==='')value=null;
      else if(input.dataset.type==='number'){if(!Number.isFinite(Number(value)))throw new Error('Nombre invalide : '+input.dataset.field);value=Number(value);}
      else if(input.dataset.type==='boolean'){if(value!=='true' && value!=='false')throw new Error('Utilisez true ou false : '+input.dataset.field);value=value==='true';}
      values.push([input.dataset.field,value]);
    });checkpoint();values.forEach(function(pair){selected.set(pair[0],pair[1]);});changed('Attributs modifiés.');}catch(error){message(error.message,true);}
  };
  el('editor-delete-entity').onclick=function(){if(!selected || !confirm('Supprimer cette entité et sa géométrie ?'))return;checkpoint();source(currentLayer()).removeFeature(selected);selected=null;selectedCollection.clear();changed('Entité supprimée.');};
  el('editor-undo').onclick=function(){if(!history.length)return;apply(history.pop());dirty=true;render();message('Dernière modification annulée.');};
  el('editor-draw').onclick=function(){spatial('draw');};el('editor-edit-geometry').onclick=function(){spatial('modify');};
  el('editor-spatial-done').onclick=function(){if(activeInteraction instanceof ol.interaction.Draw)activeInteraction.abortDrawing();stopSpatial();showEditor();};
  document.addEventListener('keydown',function(event){if(event.key==='Escape' && window.webmapEditorEditing){if(activeInteraction instanceof ol.interaction.Draw)activeInteraction.abortDrawing();stopSpatial();showEditor();}});
  el('editor-save').onclick=async function(){
    if(!token || !dirty || !ready || saving)return;saving=true;render();
    try {
      var user=await github('https://api.github.com/user');if(user.login!==OWNER)throw new Error('Compte non autorisé.');
      var latest=await github(API+'?ref=main');
      if(latest.sha!==remoteSha)throw new Error('Une autre session a modifié les données. Exportez votre travail puis rechargez la page pour éviter d’écraser ces changements.');
      var data=capture();validate(data);var submitted=JSON.stringify(data);
      var result=await github(API,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Mise à jour des couches depuis la webmap',branch:'main',sha:remoteSha,content:utf8Encode(submitted)})});
      remoteSha=result.content.sha;dirty=JSON.stringify(capture())!==submitted;if(!dirty)history=[];
      message(dirty?'Version envoyée enregistrée. Des changements plus récents restent à enregistrer.':'Enregistré dans GitHub. Les données sont partagées et le site sera redéployé automatiquement.');
    }catch(error){message(error.message,true);}finally{saving=false;render();}
  };
  el('editor-export').onclick=function(){
    var layer=currentLayer(),blob=new Blob([JSON.stringify(format.writeFeaturesObject(source(layer).getFeatures(),projection),null,2)],{type:'application/geo+json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name(layer)+'.geojson';a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);
  };
  window.addEventListener('beforeunload',function(event){if(dirty){event.preventDefault();event.returnValue='';}});
  // Only the owner can authenticate; public visitors only load the published datasets.
  loadShared();
}());
