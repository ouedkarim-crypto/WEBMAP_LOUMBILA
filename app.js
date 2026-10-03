(function () {
  'use strict';

  var layerList = document.getElementById('layer-list');
  var layerFilter = document.getElementById('layer-filter');
  var queryForm = document.getElementById('query-form');
  var resultsBox = document.getElementById('query-results');
  var resultCount = document.getElementById('result-count');
  var resultsHeadRow = document.getElementById('results-head-row');
  var exportResultsButton = document.getElementById('export-results');
  var criteriaList = document.getElementById('criteria-list');
  var dashboard = document.getElementById('dashboard');
  var dashboardToggle = document.getElementById('dashboard-toggle');
  var dashboardClose = document.getElementById('dashboard-close');
  var criterionNumber = 0;
  var localityLabelThreshold = 75;
  var currentMatches = [];
  var currentResultColumns = [];

  function dataFeatures(layer) {
    if (!layer || !layer.getSource()) return [];
    var source = layer.getSource();
    // Read the original features: cluster features depend on the rendered map extent.
    if (source instanceof ol.source.Cluster) source = source.getSource();
    if (!source) return [];
    return source.getFeatures().reduce(function (all, feature) {
      var members = feature.get('features');
      return all.concat(Array.isArray(members) ? members : [feature]);
    }, []);
  }

  function localityName(feature) {
    return feature.get('Nom') || feature.get('Nom_admin') || '';
  }

  function setupLocalityClusters() {
    var baseSource = lyr_LOCALITE_4.getSource();
    lyr_LOCALITE_4.setSource(new ol.source.Cluster({
      distance: 34,
      minDistance: 14,
      source: baseSource
    }));

    var clusterStyles = Object.create(null);
    lyr_LOCALITE_4.setStyle(function (cluster, resolution) {
      var members = cluster.get('features') || [cluster];
      if (members.length > 1) {
        var count = members.length;
        if (!clusterStyles[count]) {
          var radius = count < 10 ? 15 : (count < 30 ? 18 : 22);
          clusterStyles[count] = new ol.style.Style({
            image: new ol.style.Circle({
              radius: radius,
              fill: new ol.style.Fill({ color: '#176b45' }),
              stroke: new ol.style.Stroke({ color: '#ffffff', width: 2.5 })
            }),
            text: new ol.style.Text({
              text: String(count),
              font: '700 12px Arial, sans-serif',
              fill: new ol.style.Fill({ color: '#ffffff' })
            })
          });
        }
        return clusterStyles[count];
      }

      var sourceFeature = members[0];
      var name = localityName(sourceFeature);
      var label = resolution <= localityLabelThreshold ? name : '';
      return new ol.style.Style({
        image: new ol.style.Circle({
          radius: 5,
          fill: new ol.style.Fill({ color: '#c8333c' }),
          stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 })
        }),
        text: label ? new ol.style.Text({
          text: label,
          font: '600 11px Arial, sans-serif',
          offsetX: 9,
          offsetY: -5,
          textAlign: 'left',
          fill: new ol.style.Fill({ color: '#18382a' }),
          stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 })
        }) : undefined
      });
    });

    // Clusters zoom to their extent; single locations keep the regular attribute popup.
    if (typeof onSingleClickFeatures === 'function') {
      map.un('singleclick', onSingleClickFeatures);
      map.on('singleclick', function (event) {
        var pickedCluster = null;
        map.forEachFeatureAtPixel(event.pixel, function (feature, layer) {
          if (layer === lyr_LOCALITE_4) {
            pickedCluster = feature;
            return true;
          }
          return false;
        });

        var members = pickedCluster && pickedCluster.get('features');
        if (members && members.length > 1) {
          var extent = ol.extent.createEmpty();
          members.forEach(function (feature) { ol.extent.extend(extent, feature.getGeometry().getExtent()); });
          if (ol.extent.getWidth(extent) < 1 && ol.extent.getHeight(extent) < 1) {
            map.getView().animate({ center: ol.extent.getCenter(extent), zoom: (map.getView().getZoom() || 1) + 2, duration: 450 });
          } else {
            map.getView().fit(extent, { size: map.getSize(), padding: [70, 60, 70, 60], maxZoom: 16, duration: 450 });
          }
          container.style.display = 'none';
          overlayPopup.setPosition(undefined);
          return;
        }
        onSingleClickFeatures(event);
      });
    }
  }

  function updateDashboard() {
    var localities = dataFeatures(lyr_LOCALITE_4);
    var waterbodies = dataFeatures(lyr_PLANEAU_2);
    var waterways = dataFeatures(lyr_COURS_EAU_3);
    var equipmentFields = ['EQposte', 'EQecole', 'EQgendarme', 'EQpolice', 'EQdouane', 'EQcontrole', 'EQhopital', 'EQsanitair', 'EQAnimiste', 'EQChretien', 'EQMusulman', 'EQLCAn', 'EQLCCh', 'EQLCMu', 'Marche'];
    var equippedLocalities = localities.filter(function (feature) {
      return equipmentFields.some(function (field) { return Number(feature.get(field)) > 0; });
    }).length;
    document.getElementById('metric-localities').textContent = localities.length.toLocaleString('fr-FR');
    document.getElementById('metric-water').textContent = waterbodies.length.toLocaleString('fr-FR');
    document.getElementById('metric-rivers').textContent = waterways.length.toLocaleString('fr-FR');
    document.getElementById('metric-equipped').textContent = equippedLocalities.toLocaleString('fr-FR');
    renderEquipmentChart(localities);
    renderStatusChart(localities);
  }

  function svgNode(name, attributes) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attributes || {}).forEach(function (key) { node.setAttribute(key, attributes[key]); });
    return node;
  }

  function renderEquipmentChart(localities) {
    var definitions = [
      ['EQecole', 'Écoles'], ['EQhopital', 'Hôpitaux'], ['EQsanitair', 'Équipements sanitaires'],
      ['EQposte', 'Postes'], ['EQgendarme', 'Gendarmerie'], ['EQpolice', 'Police'],
      ['EQdouane', 'Douane'], ['EQcontrole', 'Postes de contrôle'], ['Marche', 'Marchés'],
      ['EQAnimiste', 'Équipements animistes (EQAnimiste)'],
      ['EQChretien', 'Équipements chrétiens (EQChretien)'],
      ['EQMusulman', 'Équipements musulmans (EQMusulman)'],
      ['EQLCAn', 'Lieux de culte animistes (EQLCAn)'],
      ['EQLCCh', 'Lieux de culte chrétiens (EQLCCh)'],
      ['EQLCMu', 'Lieux de culte musulmans (EQLCMu)']
    ];
    var categories = definitions.map(function (item) {
      return { label: item[1], members: localities.filter(function (feature) {
        return Number(feature.get(item[0])) > 0;
      }) };
    }).sort(function (a, b) { return b.members.length - a.members.length; });
    var container = document.getElementById('equipment-chart');
    container.innerHTML = '';
    var note = document.createElement('p');
    note.className = 'chart-note';
    note.textContent = 'Nombre et proportion de localités disposant de chaque équipement. Cliquez sur un type pour voir les localités concernées. Une localité peut appartenir à plusieurs catégories. 0 signifie aucune présence recensée.';
    container.appendChild(note);
    var detail = document.createElement('section');
    detail.className = 'equipment-detail';
    detail.setAttribute('aria-live', 'polite');
    var rows = [];
    function selectCategory(category, button) {
      rows.forEach(function (row) { row.setAttribute('aria-pressed', String(row === button)); });
      detail.innerHTML = '';
      var heading = document.createElement('h4');
      heading.textContent = category.label + ' — ' + category.members.length + ' / ' + localities.length + ' localités';
      detail.appendChild(heading);
      var list = document.createElement('ul');
      category.members.slice().sort(function (a, b) {
        return localityName(a).localeCompare(localityName(b), 'fr');
      }).forEach(function (feature) {
        var item = document.createElement('li');
        item.textContent = localityName(feature) || 'Localité sans nom';
        list.appendChild(item);
      });
      if (category.members.length) detail.appendChild(list);
      else {
        var empty = document.createElement('p');
        empty.textContent = 'Aucune localité recensée pour ce type d’équipement.';
        detail.appendChild(empty);
      }
    }
    categories.forEach(function (category) {
      var percentage = localities.length ? 100 * category.members.length / localities.length : 0;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'equipment-bar';
      button.setAttribute('aria-pressed', 'false');
      var label = document.createElement('span');
      label.className = 'equipment-label';
      label.textContent = category.label;
      var track = document.createElement('span');
      track.className = 'equipment-track';
      track.setAttribute('aria-hidden', 'true');
      var fill = document.createElement('span');
      fill.style.width = percentage + '%';
      track.appendChild(fill);
      var value = document.createElement('strong');
      value.textContent = category.members.length + ' (' + Math.round(percentage) + ' %)';
      button.appendChild(label);
      button.appendChild(track);
      button.appendChild(value);
      button.addEventListener('click', function () { selectCategory(category, button); });
      rows.push(button);
      container.appendChild(button);
    });
    container.appendChild(detail);
    if (categories.length) selectCategory(categories[0], rows[0]);
  }

  function renderStatusChart(localities) {
    var counts = Object.create(null);
    localities.forEach(function (feature) {
      var status = feature.get('Statut') || 'Non renseigné';
      counts[status] = (counts[status] || 0) + 1;
    });
    var statuses = Object.keys(counts).map(function (name) { return { label: name.replace(/_/g, ' '), value: counts[name] }; })
      .sort(function (a, b) { return b.value - a.value; });
    var container = document.getElementById('status-chart');
    container.innerHTML = '';
    if (!statuses.length) {
      container.textContent = 'Aucune donnée de statut renseignée.';
      return;
    }
    var colors = ['#176b45', '#c8333c', '#e5b927', '#4c9cbb', '#8a70b6', '#e28545'];
    var total = statuses.reduce(function (sum, item) { return sum + item.value; }, 0);
    var radius = 57;
    var circumference = 2 * Math.PI * radius;
    var donut = svgNode('svg', { viewBox: '0 0 170 170', role: 'img', 'aria-label': 'Répartition des localités selon leur statut' });
    donut.appendChild(svgNode('circle', { cx: 85, cy: 85, r: radius, fill: 'none', stroke: '#edf1ee', 'stroke-width': 22 }));
    var offset = 0;
    statuses.forEach(function (item, index) {
      var segment = circumference * item.value / total;
      donut.appendChild(svgNode('circle', {
        cx: 85, cy: 85, r: radius, fill: 'none', stroke: colors[index % colors.length], 'stroke-width': 22,
        'stroke-dasharray': segment + ' ' + (circumference - segment), 'stroke-dashoffset': -offset,
        transform: 'rotate(-90 85 85)'
      }));
      offset += segment;
    });
    var totalText = svgNode('text', { x: 85, y: 82, class: 'donut-total' });
    totalText.textContent = String(total);
    donut.appendChild(totalText);
    var totalLabel = svgNode('text', { x: 85, y: 100, class: 'donut-label' });
    totalLabel.textContent = 'localités';
    donut.appendChild(totalLabel);
    container.appendChild(donut);

    var legend = document.createElement('div');
    legend.className = 'donut-legend';
    statuses.forEach(function (item, index) {
      var row = document.createElement('div');
      row.className = 'donut-legend-row';
      var swatch = document.createElement('span');
      swatch.className = 'donut-swatch';
      swatch.style.backgroundColor = colors[index % colors.length];
      var name = document.createElement('span');
      name.className = 'donut-status-name';
      name.textContent = item.label;
      var value = document.createElement('b');
      value.textContent = item.value.toLocaleString('fr-FR');
      row.appendChild(swatch);
      row.appendChild(name);
      row.appendChild(value);
      legend.appendChild(row);
    });
    container.appendChild(legend);
  }

  function setupGeolocation() {
    var button = document.getElementById('geolocate-button');
    var accuracyFeature = new ol.Feature();
    var positionFeature = new ol.Feature();
    var positionSource = new ol.source.Vector({ features: [accuracyFeature, positionFeature] });
    var positionLayer = new ol.layer.Vector({
      source: positionSource,
      style: function (feature) {
        if (feature === accuracyFeature) {
          return new ol.style.Style({
            fill: new ol.style.Fill({ color: 'rgba(23, 107, 69, 0.13)' }),
            stroke: new ol.style.Stroke({ color: '#176b45', width: 2, lineDash: [5, 5] })
          });
        }
        return new ol.style.Style({
          image: new ol.style.Circle({ radius: 8, fill: new ol.style.Fill({ color: '#c8333c' }), stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 }) })
        });
      }
    });
    positionLayer.setZIndex(1000);
    map.addLayer(positionLayer);

    var geolocation = new ol.Geolocation({
      projection: map.getView().getProjection(),
      trackingOptions: { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    });
    var tracking = false;
    var centerOnNextFix = false;

    function setButtonState(active, label) {
      button.classList.toggle('geo-active', active);
      button.innerHTML = '<i class="fas ' + (active ? 'fa-location-arrow' : 'fa-location-arrow') + '"></i><span>' + label + '</span>';
      button.setAttribute('aria-label', label);
      button.title = label;
    }

    geolocation.on('change:accuracyGeometry', function () {
      accuracyFeature.setGeometry(geolocation.getAccuracyGeometry() || null);
    });
    geolocation.on('change:position', function () {
      var coordinates = geolocation.getPosition();
      positionFeature.setGeometry(coordinates ? new ol.geom.Point(coordinates) : null);
      if (coordinates && centerOnNextFix) {
        centerOnNextFix = false;
        map.getView().animate({ center: coordinates, zoom: Math.max(map.getView().getZoom() || 1, 15), duration: 550 });
        setButtonState(true, 'Arrêter le suivi');
      }
    });
    geolocation.on('error', function () {
      tracking = false;
      centerOnNextFix = false;
      geolocation.setTracking(false);
      positionFeature.setGeometry(null);
      accuracyFeature.setGeometry(null);
      setButtonState(false, 'Localisation refusée ou indisponible');
      window.setTimeout(function () { setButtonState(false, 'Me localiser'); }, 4500);
    });

    button.addEventListener('click', function () {
      if (!navigator.geolocation) {
        setButtonState(false, 'Géolocalisation non prise en charge');
        return;
      }
      if (tracking) {
        tracking = false;
        centerOnNextFix = false;
        geolocation.setTracking(false);
        positionFeature.setGeometry(null);
        accuracyFeature.setGeometry(null);
        setButtonState(false, 'Me localiser');
        return;
      }
      tracking = true;
      centerOnNextFix = true;
      setButtonState(true, 'Localisation en cours…');
      geolocation.setTracking(true);
    });
  }

  var icons = {
    'COMMUNE_DE_LOUMBILA': 'fa-draw-polygon',
    'PLAN EAU': 'fa-water',
    'COURS_EAU': 'fa-water',
    'LOCALITE': 'fa-map-marker-alt',
    'OSM Standard': 'fa-map'
  };

  function layerName(layer) {
    return layer.get('popuplayertitle') || layer.get('title') || 'Couche';
  }

  function isVectorDataLayer(layer) {
    return layer instanceof ol.layer.Vector && layer.get('interactive');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function createLayerControls() {
    var dataLayers = layersList.filter(function (layer) {
      return layer instanceof ol.layer.Vector || layer instanceof ol.layer.Tile;
    });

    dataLayers.forEach(function (layer, index) {
      var name = layerName(layer);
      var vector = isVectorDataLayer(layer);
      var featureCount = vector ? dataFeatures(layer).length : null;
      var card = document.createElement('div');
      card.className = 'layer-card';
      var head = document.createElement('div');
      head.className = 'layer-card-head';

      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = layer.getVisible();
      checkbox.id = 'layer-toggle-' + index;
      checkbox.setAttribute('aria-label', 'Afficher ' + name);
      checkbox.addEventListener('change', function () { layer.setVisible(checkbox.checked); });

      var symbol = document.createElement('span');
      symbol.className = 'layer-symbol';
      symbol.innerHTML = '<i class="fas ' + (icons[name] || 'fa-layer-group') + '"></i>';

      var label = document.createElement('label');
      label.className = 'layer-name';
      label.htmlFor = checkbox.id;
      label.textContent = name;

      head.appendChild(checkbox);
      head.appendChild(symbol);
      head.appendChild(label);
      card.appendChild(head);

      var meta = document.createElement('div');
      meta.className = 'layer-meta';
      if (vector) {
        var count = document.createElement('span');
        count.textContent = featureCount + (featureCount > 1 ? ' entités' : ' entité');
        meta.appendChild(count);
      } else {
        var baseLabel = document.createElement('span');
        baseLabel.textContent = 'Fond de carte';
        meta.appendChild(baseLabel);
      }
      var state = document.createElement('span');
      state.className = 'visibility-label';
      state.textContent = layer.getVisible() ? 'Visible' : 'Masquée';
      meta.appendChild(state);
      checkbox.addEventListener('change', function () {
        state.textContent = checkbox.checked ? 'Visible' : 'Masquée';
      });
      card.appendChild(meta);
      if (name === 'LOCALITE') {
        var clusterNote = document.createElement('span');
        clusterNote.className = 'cluster-note';
        clusterNote.innerHTML = '<i class="fas fa-compress-arrows-alt"></i> Les groupes se séparent au zoom ; les noms apparaissent en détail.';
        card.appendChild(clusterNote);
      }
      layerList.appendChild(card);

      if (vector) {
        var option = document.createElement('option');
        option.value = String(index);
        option.textContent = name;
        layerFilter.appendChild(option);
      }
    });
  }

  function fieldChoices(layerIndex) {
    var layers = layersList.filter(function (layer, index) {
      return isVectorDataLayer(layer) && (layerIndex === 'all' || String(index) === layerIndex);
    });
    var choices = Object.create(null);
    layers.forEach(function (layer) {
      var aliases = layer.get('fieldAliases') || {};
      Object.keys(aliases).forEach(function (field) {
        if (field !== 'geometry') choices[field] = aliases[field] || field;
      });
    });
    return Object.keys(choices).map(function (field) { return { value: field, label: choices[field] }; });
  }

  function refreshCriterionFields() {
    var fields = fieldChoices(layerFilter.value);
    criteriaList.querySelectorAll('.criterion-field').forEach(function (select) {
      var previous = select.value;
      select.innerHTML = '';
      var all = document.createElement('option');
      all.value = '*';
      all.textContent = 'Tous les champs';
      select.appendChild(all);
      fields.forEach(function (field) {
        var option = document.createElement('option');
        option.value = field.value;
        option.textContent = field.label;
        select.appendChild(option);
      });
      select.value = fields.some(function (field) { return field.value === previous; }) ? previous : (fields.length ? fields[0].value : '*');
      populateCriterionValues(select.closest('.criterion-row'));
    });
  }

  function populateCriterionValues(row) {
    if (!row) return;
    var fieldSelect = row.querySelector('.criterion-field');
    var valueSelect = row.querySelector('.criterion-value');
    if (!fieldSelect || !valueSelect) return;
    var previous = valueSelect.value;
    var values = Object.create(null);
    layersList.forEach(function (layer, index) {
      if (!isVectorDataLayer(layer) || (layerFilter.value !== 'all' && String(index) !== layerFilter.value)) return;
      dataFeatures(layer).forEach(function (feature) {
        var keys = fieldSelect.value === '*' ? feature.getKeys().filter(function (key) { return key !== 'geometry'; }) : [fieldSelect.value];
        keys.forEach(function (key) {
          var raw = feature.get(key);
          if (raw === undefined || raw === null || String(raw).trim() === '') return;
          values[String(raw).trim()] = true;
        });
      });
    });
    var sortedValues = Object.keys(values).sort(function (a, b) {
      return a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' });
    });
    valueSelect.innerHTML = '';
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = sortedValues.length ? 'Choisir une valeur…' : 'Aucune valeur disponible';
    valueSelect.appendChild(placeholder);
    sortedValues.forEach(function (value) {
      var option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      valueSelect.appendChild(option);
    });
    if (sortedValues.indexOf(previous) !== -1) valueSelect.value = previous;
  }

  function addCriterion() {
    criterionNumber += 1;
    var row = document.createElement('div');
    row.className = 'criterion-row';
    row.setAttribute('data-criterion', String(criterionNumber));

    var top = document.createElement('div');
    top.className = 'criterion-top';
    var field = document.createElement('select');
    field.className = 'criterion-field';
    field.setAttribute('aria-label', 'Champ à interroger');
    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-criterion';
    remove.setAttribute('aria-label', 'Supprimer ce critère');
    remove.innerHTML = '<i class="fas fa-times"></i>';
    remove.addEventListener('click', function () {
      row.remove();
      if (!criteriaList.children.length) addCriterion();
      updateRemoveButtons();
    });
    top.appendChild(field);
    top.appendChild(remove);

    var controls = document.createElement('div');
    controls.className = 'criterion-controls';
    var operator = document.createElement('select');
    operator.className = 'criterion-operator';
    operator.setAttribute('aria-label', 'Opérateur de recherche');
    [
      ['contains', 'Contient'], ['equals', 'Égale à'], ['starts', 'Commence par'],
      ['greater', 'Supérieur à'], ['less', 'Inférieur à']
    ].forEach(function (pair) {
      var option = document.createElement('option');
      option.value = pair[0];
      option.textContent = pair[1];
      operator.appendChild(option);
    });
    var value = document.createElement('select');
    value.className = 'criterion-value';
    value.setAttribute('aria-label', 'Valeur du critère');
    controls.appendChild(operator);
    controls.appendChild(value);
    row.appendChild(top);
    row.appendChild(controls);
    criteriaList.appendChild(row);
    refreshCriterionFields();
    field.addEventListener('change', function () { populateCriterionValues(row); });
    updateRemoveButtons();
  }

  function updateRemoveButtons() {
    var buttons = criteriaList.querySelectorAll('.remove-criterion');
    buttons.forEach(function (button) { button.disabled = buttons.length <= 1; });
  }

  function criteriaMatch(feature, criterion) {
    var keys = criterion.field === '*' ? feature.getKeys().filter(function (key) { return key !== 'geometry'; }) : [criterion.field];
    return keys.some(function (key) {
      var raw = feature.get(key);
      if (raw === undefined || raw === null) return false;
      var actual = String(raw).trim();
      var expected = criterion.value;
      if (criterion.operator === 'equals') return actual.toLocaleLowerCase('fr') === expected.toLocaleLowerCase('fr');
      if (criterion.operator === 'starts') return actual.toLocaleLowerCase('fr').indexOf(expected.toLocaleLowerCase('fr')) === 0;
      if (criterion.operator === 'greater' || criterion.operator === 'less') {
        var actualNumber = Number(actual.replace(',', '.'));
        var expectedNumber = Number(expected.replace(',', '.'));
        if (!Number.isFinite(actualNumber) || !Number.isFinite(expectedNumber)) return false;
        return criterion.operator === 'greater' ? actualNumber > expectedNumber : actualNumber < expectedNumber;
      }
      return actual.toLocaleLowerCase('fr').indexOf(expected.toLocaleLowerCase('fr')) !== -1;
    });
  }

  function makeEmptyState(message) {
    currentResultColumns = [];
    resultsHeadRow.innerHTML = '';
    var heading = document.createElement('th');
    heading.scope = 'col';
    heading.textContent = 'Résultats';
    resultsHeadRow.appendChild(heading);
    resultsBox.innerHTML = '';
    var row = document.createElement('tr');
    row.className = 'results-empty';
    var cell = document.createElement('td');
    cell.colSpan = Math.max(1, resultsHeadRow.children.length);
    cell.textContent = message;
    row.appendChild(cell);
    resultsBox.appendChild(row);
    exportResultsButton.disabled = true;
  }

  function primaryValue(feature, layer) {
    var fields = ['Nom', 'Nom_admin', 'Type', 'OBJECTID'];
    for (var i = 0; i < fields.length; i += 1) {
      var value = feature.get(fields[i]);
      if (value !== undefined && value !== null && String(value).trim() !== '') return String(value);
    }
    return layerName(layer) + ' · entité';
  }

  function attributePairs(feature, layer) {
    var aliases = layer.get('fieldAliases') || {};
    return feature.getKeys().filter(function (key) {
      return key !== 'geometry' && feature.get(key) !== undefined && feature.get(key) !== null && String(feature.get(key)).trim() !== '';
    }).map(function (key) {
      return { label: aliases[key] || key, value: String(feature.get(key)) };
    });
  }

  function showFeature(feature, layer) {
    var geometry = feature.getGeometry();
    if (!geometry) return;
    var extent = geometry.getExtent();
    var view = map.getView();
    if (geometry.getType() === 'Point' || geometry.getType() === 'MultiPoint') {
      view.animate({ center: ol.extent.getCenter(extent), zoom: Math.max(view.getZoom() || 1, 15), duration: 450 });
    } else {
      view.fit(extent, { size: map.getSize(), padding: [90, 45, 70, 45], maxZoom: 15, duration: 450 });
    }

    if (typeof collection !== 'undefined' && typeof featureOverlay !== 'undefined') {
      collection.clear();
      collection.push(feature);
      featureOverlay.setStyle(new ol.style.Style({
        stroke: new ol.style.Stroke({ color: '#c8333c', width: 3 }),
        fill: new ol.style.Fill({ color: 'rgba(242, 201, 76, 0.42)' }),
        image: new ol.style.Circle({ radius: 9, fill: new ol.style.Fill({ color: '#c8333c' }), stroke: new ol.style.Stroke({ color: '#fff', width: 2 }) })
      }));
    }

    var popupRows = attributePairs(feature, layer).map(function (item) {
      return '<tr><th>' + escapeHtml(item.label) + '</th><td>' + escapeHtml(item.value) + '</td></tr>';
    }).join('');
    content.innerHTML = '<div class="popup-title">' + escapeHtml(layerName(layer)) + '</div><table>' + popupRows + '</table>';
    container.style.display = 'block';
    overlayPopup.setPosition(geometry.getClosestPoint(ol.extent.getCenter(extent)));
  }

  function resultColumns(matches) {
    var columns = [{ key: '__layer', label: 'Couche' }, { key: '__entity', label: 'Entité' }];
    var known = Object.create(null);
    matches.forEach(function (match) {
      var aliases = match.layer.get('fieldAliases') || {};
      match.feature.getKeys().forEach(function (key) {
        if (key === 'geometry' || Object.prototype.hasOwnProperty.call(known, key)) return;
        known[key] = true;
        columns.push({ key: key, label: aliases[key] || key });
      });
    });
    return columns;
  }

  function renderResultTable(matches) {
    currentResultColumns = resultColumns(matches);
    resultsHeadRow.innerHTML = '';
    currentResultColumns.forEach(function (column) {
      var th = document.createElement('th');
      th.scope = 'col';
      th.textContent = column.label;
      resultsHeadRow.appendChild(th);
    });
    resultsBox.innerHTML = '';
    matches.forEach(function (match) {
      var row = document.createElement('tr');
      currentResultColumns.forEach(function (column) {
        var cell = document.createElement('td');
        if (column.key === '__layer') {
          cell.textContent = layerName(match.layer);
        } else if (column.key === '__entity') {
          var button = document.createElement('button');
          button.type = 'button';
          button.className = 'table-feature-link';
          button.innerHTML = '<i class="fas fa-map-marker-alt" aria-hidden="true"></i> ';
          button.appendChild(document.createTextNode(primaryValue(match.feature, match.layer)));
          button.addEventListener('click', function () { showFeature(match.feature, match.layer); });
          cell.appendChild(button);
        } else {
          var value = match.feature.get(column.key);
          cell.textContent = value === undefined || value === null ? '' : String(value);
        }
        row.appendChild(cell);
      });
      resultsBox.appendChild(row);
    });
  }

  function exportResultsCsv() {
    if (!currentMatches.length) return;
    function csvCell(value) {
      return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
    }
    var rows = [currentResultColumns.map(function (column) { return csvCell(column.label); }).join(';')];
    currentMatches.forEach(function (match) {
      rows.push(currentResultColumns.map(function (column) {
        var value = column.key === '__layer' ? layerName(match.layer) :
          (column.key === '__entity' ? primaryValue(match.feature, match.layer) : match.feature.get(column.key));
        return csvCell(value);
      }).join(';'));
    });
    var blob = new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'resultats_requete_loumbila.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function searchFeatures(event) {
    if (event) event.preventDefault();
    var criteria = Array.from(criteriaList.querySelectorAll('.criterion-row')).map(function (row) {
      return {
        field: row.querySelector('.criterion-field').value,
        operator: row.querySelector('.criterion-operator').value,
        value: row.querySelector('.criterion-value').value.trim()
      };
    }).filter(function (criterion) { return criterion.value !== ''; });
    if (!criteria.length) {
      currentMatches = [];
      resultCount.textContent = '0';
      makeEmptyState('Renseignez au moins un critère pour lancer la requête.');
      return;
    }

    var selected = layerFilter.value;
    var matches = [];
    layersList.forEach(function (layer, layerIndex) {
      if (!isVectorDataLayer(layer) || (selected !== 'all' && selected !== String(layerIndex))) return;
      dataFeatures(layer).forEach(function (feature) {
        if (criteria.every(function (criterion) { return criteriaMatch(feature, criterion); })) {
          matches.push({ feature: feature, layer: layer });
        }
      });
    });

    currentMatches = matches;
    resultCount.textContent = matches.length + (matches.length === 1 ? ' résultat' : ' résultats');
    if (!matches.length) {
      makeEmptyState('Aucune entité ne correspond à tous les critères. Ajustez les valeurs et réessayez.');
      return;
    }
    renderResultTable(matches);
    exportResultsButton.disabled = false;
  }

  setupLocalityClusters();
  updateDashboard();
  createLayerControls();
  setupGeolocation();
  addCriterion();
  document.getElementById('add-criterion').addEventListener('click', addCriterion);
  layerFilter.addEventListener('change', refreshCriterionFields);
  exportResultsButton.addEventListener('click', exportResultsCsv);
  function toggleDashboard(open) {
    dashboard.hidden = !open;
    document.body.classList.toggle('dashboard-open', open);
    dashboardToggle.setAttribute('aria-expanded', String(open));
    document.querySelectorAll('.app-header, .workspace, .app-footer').forEach(function (element) {
      element.inert = open;
    });
    if (open) {
      updateDashboard();
      dashboard.scrollTop = 0;
      dashboardClose.focus();
    } else {
      map.updateSize();
      dashboardToggle.focus();
    }
  }
  dashboardToggle.addEventListener('click', function () { toggleDashboard(dashboard.hidden); });
  dashboardClose.addEventListener('click', function () { toggleDashboard(false); dashboardToggle.focus(); });
  dashboard.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { event.preventDefault(); toggleDashboard(false); }
    if (event.key === 'Tab') {
      var focusable = Array.from(dashboard.querySelectorAll('button, [href], select, input, [tabindex="0"]')).filter(function (element) { return !element.disabled; });
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  queryForm.addEventListener('submit', searchFeatures);
  window.addEventListener('resize', function () { map.updateSize(); });
  window.requestAnimationFrame(function () { map.updateSize(); });
}());
