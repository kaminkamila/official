const map = new maplibregl.Map({
  container: 'map', // container id
  style: {
    "version": 8,
    "sources": {},
    "layers": []
  },
  center: [37, 55], // starting position [lng, lat]
  zoom: 5, // starting zoom
})
map.on('style.load', () => {
  map.setProjection({
      type: 'globe',
  });
});

// Москва (конец Транссиба)
const origin = [37.6173, 55.7558];

// Владивосток (начало Транссиба)
const destination = [131.885577, 43.116342];
    // A simple line from origin to destination.
    const route = {
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'geometry': {
                    'type': 'LineString',
                    'coordinates': [origin, destination]
                }
            }
        ]
    };

    // A single point that animates along the route.
    // Coordinates are initially set to origin.
    const point = {
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'properties': {},
                'geometry': {
                    'type': 'Point',
                    'coordinates': origin
                }
            }
        ]
    };

    // Calculate the distance in kilometers between route start/end point.
    const lineDistance = turf.lineDistance(route.features[0], 'kilometers');

    const arc = [];

    // Number of steps to use in the arc and animation, more steps means
    // a smoother arc and animation, but too many steps will result in a
    // low frame rate
    const steps = 500;

    // Draw an arc between the `origin` & `destination` of the two points
    for (let i = 0; i < lineDistance; i += lineDistance / steps) {
        const segment = turf.along(route.features[0], i, 'kilometers');
        arc.push(segment.geometry.coordinates);
    }

    // Update the route with calculated arc coordinates
    route.features[0].geometry.coordinates = arc;

    // Used to increment the value of the point measurement against the route.
    let counter = 0;

// функция для присоединения гугл-таблички

function mergeData(regionsGeoJSON, csvData) {
  regionsGeoJSON.features.forEach(feature => {
    const id = String(feature.properties.region_cod);
    // console.log(`Обрабатываем GeoJSON feature с region_code: ${id}`); 

    let csvRecord = null;

    for (let i = 0; i < csvData.length; i++) {
      const csvRegionCode = csvData[i].region_cod;
      // console.log(`Сравниваем с CSV region_code: ${csvRegionCode}`); 
      if (csvRegionCode === id) {
        csvRecord = csvData[i];
        // console.log(`Найдено соответствие для region_code: ${id}`); 
        break; // после того, как нашли соответствие, выходим из цикла
      }
    }

    Object.assign(feature.properties, csvRecord);
  });
}

map.on('load', async () => {
  let sourceAdded = false; // Флаг для предотвращения повторного добавления источника

  if (!sourceAdded) {
      sourceAdded = true;
      image = await map.loadImage('./data/train.png');
      map.addImage('cat', image.data);

      map.addSource('route', {
          'type': 'geojson',
          'data': route
      });

      map.addSource('point', {
          'type': 'geojson',
          'data': point
      });

      map.addLayer({
          'id': 'route',
          'source': 'route',
          'type': 'line',
          'paint': {
              'line-width': 2,
              'line-color': '#007cbf'
          }
      });

      map.addLayer({
          'id': 'point',
          'source': 'point',
          'type': 'symbol',
          'layout': {
              'icon-image': 'cat', // Используем добавленное изображение
              'icon-size': 0.1, // Уменьшаем изображение вдвое
              'icon-rotate': 0, // Поворот на 90 градусов по часовой стрелке
              'icon-rotation-alignment': 'map', // Выравнивание поворота относительно карты
              'icon-rotation-alignment': 'map',
              'icon-overlap': 'always',
              'icon-ignore-placement': true
          }
      });
  }

  function animate() {
      // Update point geometry to a new position based on counter denoting
      // the index to access the arc.
      point.features[0].geometry.coordinates =
          route.features[0].geometry.coordinates[counter];

      // Calculate the bearing to ensure the icon is rotated to match the route arc
      // The bearing is calculate between the current point and the next point, except
      // at the end of the arc use the previous point and the current point
      point.features[0].properties.bearing = turf.bearing(
          turf.point(
              route.features[0].geometry.coordinates[
                  counter >= steps ? counter - 1 : counter
              ]
          ),
          turf.point(
              route.features[0].geometry.coordinates[
                  counter >= steps ? counter : counter + 1
              ]
          )
      );

      // Update the source with this new data.
      map.getSource('point').setData(point);

      // Request the next frame of animation so long the end has not been reached.
      if (counter < steps) {
          requestAnimationFrame(animate);
      }

      counter = counter + 1;
  }

  document
      .getElementById('replay')
      .addEventListener('click', () => {
          // Set the coordinates of the original point back to origin
          point.features[0].geometry.coordinates = origin;

          // Update the source layer
          map.getSource('point').setData(point);

          // Reset the counter
          counter = 0;

          // Restart the animation.
          animate(counter);
      });

  // Start the animation.
  animate(counter);
});

map.on('load', () => {
  map.addLayer({
    id: 'background',
    type: 'background',
    paint: {
      'background-color': 'lightblue'
    }
  })

  map.addSource('countries', {
    type: 'geojson',
    data: './data/countries.geojson',
    attribution: 'Natural Earth'
  })

  map.addLayer({
    id: 'countries-layer',
    type: 'fill',
    source: 'countries',
    paint: {
      'fill-color': 'lightgray'
    }
  })


  map.addSource('rivers', {
    type: 'geojson',
    data: './data/rivers.geojson'
  })

  map.addLayer({
    id: 'rivers-layer',
    type: 'line',
    source: 'rivers',
    paint: {
      'line-color': '#00BFFF'
    }
  })

  map.addSource('lakes', {
    type: 'geojson',
    data: './data/lakes.geojson'
  })

  map.addLayer({
    id: 'lakes-layer',
    type: 'fill',
    source: 'lakes',
    paint: {
      'fill-color': 'lightblue',
      'fill-outline-color': '#00BFFF'
    }
  })


  let regionsGeoJSON;

  fetch('./data/regions_ispr2.geojson')
    .then(response => response.json())
    .then(data => {
      regionsGeoJSON = data;
      // console.log(regionsGeoJSON)


      fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vS8FECP08E20R4RnOs3vbaHl3XqN3mvVyv7GjXGXDqUMcKu4eZqAtvczQqZUgXkJP4D62--Fmv26Yc2/pub?output=csv")
        .then((response) => response.text())
        .then((csv) => {
          const rows = Papa.parse(csv, { header: true });
          csvData = rows.data;
          // console.log(csvData)
          mergeData(regionsGeoJSON, csvData);
          console.log(regionsGeoJSON)
          map.addSource('regions', {
            type: 'geojson',
            data: regionsGeoJSON,
            promoteId: 'region_cod'
          });
          map.addLayer({
            id: 'regionslayer',
            type: 'fill',
            source: 'regions',
            paint: {
              'fill-color': '#627BC1',
              'fill-outline-color': [
                'case',
                ['boolean', ['feature-state', 'mew'], false],
                'purple',
                'white'
              ],
              'fill-opacity': [
                'case', //ключевое слово в выражении MapLibre GL, которое позволяет задать условные правила
                ['boolean', ['feature-state', 'hover'], false], //Эта часть проверяет, установлено ли свойство hover в true для текущего региона
                1,
                0.5
              ]
            }
          });

          let hoveredRegionsId = null;

          // изменение прозрачности (hover effect)

          map.on('mousemove', 'regionslayer', (e) => {
            if (e.features.length > 0) {
              if (hoveredRegionsId) {
                map.setFeatureState(
                  { source: 'regions', id: hoveredRegionsId },
                  { hover: false }
                );
              }
              hoveredRegionsId = e.features[0].id; // присвоение нового идентификатора
              map.setFeatureState(
                { source: 'regions', id: hoveredRegionsId },
                { hover: true }
              );
            }
          });

          map.on('mouseleave', 'regionslayer', (e) => {
            if (hoveredRegionsId) {
              map.setFeatureState(
                { source: 'regions', id: hoveredRegionsId },
                { hover: false }
              );
            }
            hoveredRegionsId = null;
          });

          let mewedRegionsId = null;

          map.on('click', ['regionslayer'], (e) => {
            if (e.features.length > 0) {
              if (mewedRegionsId) {
                map.setFeatureState(
                  { source: 'regions', id: mewedRegionsId },
                  { mew: false }
                );
              }
              mewedRegionsId = e.features[0].id;
              map.setFeatureState(
                { source: 'regions', id: mewedRegionsId },
                { mew: true }
              );
              button.style.display = 'block'
            }
          });

          const button = document.getElementById('button');

          button.addEventListener('click', () => {
            if (mewedRegionsId) {
              console.log(mewedRegionsId)

              map.setFeatureState(
                { source: 'regions', id: mewedRegionsId },
                { mew: false }
              );

              button.style.display = 'none'
            }
            mewedRegionsId = null
          });

          map.on('mousemove', ['regionslayer'], (i) => {
            console.log(i.features)
            document.getElementById('region_name').innerHTML = i.features[0].properties.NL_NAME_1
          })

          map.on('mousemove', (event) => {
            const lngLat = event.lngLat;
            // console.log(lngLat.lng)
            const lng = event.lngLat.lng
            document.getElementById('lng').innerHTML = `Долгота: ${lng}`
            // console.log(lngLat.lat)
            const lat = event.lngLat.lat
            document.getElementById('lat').innerHTML = `Широта: ${lat}`
          })
          
          const regionAudioMap = {
            "Алтайский край": "./Audio/Алтайский край.mp3",
            "Амурская область": "./Audio/Амурская область.mp3",
            "Архангельская область": "./Audio/Архангельская область.mp3",
            "Астраханская область": "./Audio/Астраханская область.mp3",
            "Белгородская область": "./Audio/Белгородская область.mp3",
            "Брянская область": "./Audio/Брянская область.mp3",
            "Владимирская область": "./Audio/Владимирская область.mp3",
            "Волгоградская область": "./Audio/Волгоградская область.mp3",
            "Вологодская область": "./Audio/Вологодская область.mp3",
            "Воронежская область": "./Audio/Воронежская область.mp3",
            "Донецкая Народная Республика": "./Audio/Донецкая Народная Республика.mp3",
            "Еврейская автономная область": "./Audio/Еврейская автономная область.mp3",
            "Забайкальский край": "./Audio/Забайкальский край.mp3",
            "Запорожская область": "./Audio/Запорожская область.mp3",
            "Ивановская область": "./Audio/Ивановская область.mp3",
            "Иркутская область": "./Audio/Иркутская область.mp3",
            "Кабардино-Балкарская Республика": "./Audio/Кабардино-Балкарская Республика.mp3",
            "Калининградская область": "./Audio/Калининградская область.mp3",
            "Калужская область": "./Audio/Калужская область.mp3",
            "Камчатский край": "./Audio/Камчатский край.mp3",
            "Карачаево-Черкесская Республика": "./Audio/Карачаево-Черкесская Республика.mp3",
            "Кемеровская область": "./Audio/Кемеровская область.mp3",
            "Кировская область": "./Audio/Кировская область.mp3",
            "Костромская область": "./Audio/Костромская область.mp3",
            "Республика Коми": "./Audio/Республика Коми.mp3",
            "Краснодарский край": "./Audio/Краснодарский край.mp3",
            "Красноярский край": "./Audio/Красноярский край.mp3",
            "Курганская область": "./Audio/Курганская область.mp3",
            "Курская область": "./Audio/Курская область.mp3",
            "Ленинградская область": "./Audio/Ленинградская область.mp3",
            "Липецкая область": "./Audio/Липецкая область.mp3",
            "Луганская Народная Республика": "./Audio/Луганская Народная Республика.mp3",
            "Магаданская область": "./Audio/Магаданская область.mp3",
            "Московская область": "./Audio/Московская область.mp3",
            "Мурманская область": "./Audio/Мурманская область.mp3",
            "Ненецкий автономный округ": "./Audio/НАО.mp3",
            "Нижегородская область": "./Audio/Нижегородская область.mp3",
            "Новгородская область": "./Audio/Новгородская область.mp3",
            "Новосибирская область": "./Audio/Новосибирская область.mp3",
            "Омская область": "./Audio/Омская область.mp3",
            "Оренбургская область": "./Audio/Оренбургская область.mp3",
            "Орловская область": "./Audio/Орловская область.mp3",
            "Пензенская область": "./Audio/Пензенская область.mp3",
            "Пермский край": "./Audio/Пермский край.mp3",
            "Приморский край": "./Audio/Приморский край.mp3",
            "Псковская область": "./Audio/Псковская область.mp3",
            "Республика Адыгея": "./Audio/Республика Адыгея.mp3",
            "Республика Алтай": "./Audio/Республика Алтай.mp3",
            "Республика Башкортостан": "./Audio/Республика Башкортостан.mp3",
            "Республика Бурятия": "./Audio/Республика Бурятия.mp3",
            "Республика Дагестан": "./Audio/Республика Дагестан.mp3",
            "Республика Ингушетия": "./Audio/Республика Ингушетия.mp3",
            "Республика Калмыкия": "./Audio/Республика Калмыкия.mp3",
            "Республика Карелия": "./Audio/Республика Карелия.mp3",
            "Республика Крым": "./Audio/Республика Крым.mp3",
            "Республика Марий Эл": "./Audio/Республика Марий Эл.mp3",
            "Республика Мордовия": "./Audio/Республика Мордовия.mp3",
            "Республика Саха (Якутия)": "./Audio/Республика Саха (Якутия).mp3",
            "Республика Северная Осетия — Алания": "./Audio/Республика Северная Осетия — Алания.mp3",
            "Республика Татарстан": "./Audio/Республика Татарстан.mp3",
            "Республика Тыва": "./Audio/Республика Тыва.mp3",
            "Республика Удмуртия": "./Audio/Республика Удмуртия.mp3",
            "Республика Хакасия": "./Audio/Республика Хакасия.mp3",
            "Республика Чувашия": "./Audio/Республика Чувашия.mp3",
            "Ростовская область": "./Audio/Ростовская область.mp3",
            "Рязанская область": "./Audio/Рязанская область.mp3",
            "Самарская область": "./Audio/Самарская область.mp3",
            "Санкт-Петербург": "./Audio/Санкт-Петербург.mp3",
            "Саратовская область": "./Audio/Саратовская область.mp3",
            "Сахалинская область": "./Audio/Сахалинская область.mp3",
            "Свердловская область": "./Audio/Свердловская область.mp3",
            "Севастополь": "./Audio/Севастополь.mp3",
            "Смоленская область": "./Audio/Смоленская область.mp3",
            "Ставропольский край": "./Audio/Ставропольский край.mp3",
            "Тамбовская область": "./Audio/Тамбовская область.mp3",
            "Тверская область": "./Audio/Тверская область.mp3",
            "Томская область": "./Audio/Томская область.mp3",
            "Тульская область": "./Audio/Тульская область.mp3",
            "Тюменская область": "./Audio/Тюменская область.mp3",
            "Ульяновская область": "./Audio/Ульяновская область.mp3",
            "Хабаровский край": "./Audio/Хабаровский край.mp3",
            "Херсонская область": "./Audio/Херсонская область.mp3",
            "Ханты-Мансийский автономный округ": "./Audio/ХМАО.mp3",
            "Челябинская область": "./Audio/Челябинская область.mp3",
            "Чеченская Республика": "./Audio/Чеченская Республика.mp3",
            "Чукотский автономный округ": "./Audio/ЧАО.mp3",
            "Ямало-Ненецкий автономный округ": "./Audio/ЯНАО.mp3",
            "Ярославская область": "./Audio/Ярославская область.mp3"
        };
          // Функция для создания HTML элемента для региона (list-item)
          function createRegionListItem(regionName, audioSrc) {
            return `<div class="list-item">
            <h4>${regionName}</h4>
            <audio controls src="${audioSrc}"></audio>
        </div><hr>`;
          }

          // Переменная для хранения текущего аудиоэлемента
          let currentAudio = null;

          // Функция для остановки текущего аудио
          function stopCurrentAudio() {
            if (currentAudio) {
              currentAudio.pause();
              currentAudio.currentTime = 0; // Сбросить в начало
            }
          }

          // Добавляем обработчик события click для кнопки
            button.addEventListener('click', () => {
              stopCurrentAudio(); // Останавливаем текущее аудио
            });


          map.on('click', ['regionslayer'], (e) => {
            const clickedRegionName = e.features[0].properties["Наименование субъекта Российской Федерации"];
            const audioSrc = regionAudioMap[clickedRegionName];

            if (audioSrc) {
              // Останавливаем предыдущее аудио
              stopCurrentAudio();

              // Создаем и начинаем воспроизведение нового аудио
              currentAudio = new Audio(audioSrc);
              currentAudio.play();

              // Обновляем содержимое list-all (только если нужно именно заменять)
              const listItemHtml = createRegionListItem(clickedRegionName, audioSrc);
              document.getElementById("list-all").innerHTML = listItemHtml; // Перезаписываем содержимое
              // Если нужно добавлять элементы, то используйте +=
              // document.getElementById("list-all").innerHTML += listItemHtml;
            } else {
              console.warn(`Аудио для региона "${clickedRegionName}" не найдено.`);
              document.getElementById("list-all").innerHTML = "Аудио для данного региона не найдено.";
              stopCurrentAudio();
            }
          });

          // (изначальное заполнение list-all)
          regionsGeoJSON.features.forEach((f) => {
            const regionName = f.properties["Наименование субъекта Российской Федерации"];
            const audioSrc = regionAudioMap[regionName];

            if (audioSrc) {
              const listItemHtml = createRegionListItem(regionName, audioSrc);
              document.getElementById("list-all").innerHTML += listItemHtml;
            }
          });
        });
    });
})








