const map = new maplibregl.Map({
  container: "map", // container id
  style: {
    version: 8,
    sources: {},
    layers: [],
  },
  center: [37, 55], // starting position [lng, lat]
  zoom: 5, // starting zoom
  minZoom: 2, // Минимальный уровень зума
  maxZoom: 18, // Максимальный уровень зума
});
map.on("style.load", () => {
  map.setProjection({
    type: "globe",
  });
});

// функция для присоединения гугл-таблички

function mergeData(regionsGeoJSON, csvData) {
  regionsGeoJSON.features.forEach((feature) => {
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

map.on("load", () => {
  map.addLayer({
    id: "background",
    type: "background",
    paint: {
      "background-color": "lightblue",
    },
  });

  map.addSource("countries", {
    type: "geojson",
    data: "./data/countries.geojson",
    attribution: "Natural Earth",
  });

  map.addLayer({
    id: "countries-layer",
    type: "fill",
    source: "countries",
    paint: {
      "fill-color": "#f2e6d9",
    },
  });
  map.addLayer({
    id: "countries-layer2",
    type: "line",
    source: "countries",
    paint: {
      "line-color": "#d0d0d0", // Цвет границ
      "line-width": 1, // Толщина границ
      "line-opacity": 0.7, // Прозрачность границ
    },
  });

  map.addSource("rivers", {
    type: "geojson",
    data: "./data/rivers.geojson",
  });

  map.addLayer({
    id: "rivers-layer",
    type: "line",
    source: "rivers",
    paint: {
      "line-color": "#00BFFF",
    },
  });

  map.addSource("lakes", {
    type: "geojson",
    data: "./data/lakes.geojson",
  });

  map.addLayer({
    id: "lakes-layer",
    type: "fill",
    source: "lakes",
    paint: {
      "fill-color": "lightblue",
      "fill-outline-color": "#00BFFF",
    },
  });


  let regionsGeoJSON;

  fetch("./data/regions_ispr2.geojson")
    .then((response) => response.json())
    .then((data) => {
      regionsGeoJSON = data;
      // console.log(regionsGeoJSON)

      fetch(
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8FECP08E20R4RnOs3vbaHl3XqN3mvVyv7GjXGXDqUMcKu4eZqAtvczQqZUgXkJP4D62--Fmv26Yc2/pub?output=csv"
      )
        .then((response) => response.text())
        .then((csv) => {
          const rows = Papa.parse(csv, { header: true });
          csvData = rows.data;
          // console.log(csvData)
          mergeData(regionsGeoJSON, csvData);
          console.log(regionsGeoJSON);
          map.addSource("regions", {
            type: "geojson",
            data: regionsGeoJSON,
            promoteId: "region_cod",
          });

          map.addLayer({
            id: "regionslayer",
            type: "fill",
            source: "regions",
            paint: {
              "fill-color": "#8aa4eb",
              "fill-opacity": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                1,
                0.5,
              ],
            },
          });

          map.addLayer({
            id: "regions-outline-1",
            type: "line",
            source: "regions",
            paint: {
              "line-color": [
                "case",
                ["boolean", ["feature-state", "mew"], false],
                "#FFF0F5",
                "#cab6f3",
              ],
              "line-width": [
                "case",
                ["boolean", ["feature-state", "mew"], false],
                1,
                0.5,
              ],
              "line-offset": [
                "case",
                ["boolean", ["feature-state", "mew"], false],
                1, // Сдвиг в одну сторону
                0,
              ],
              "line-blur": [
                // Добавляем небольшое размытие
                "case",
                ["boolean", ["feature-state", "mew"], false],
                0.5, //  небольшое размытие чтобы скрыть стыки
                0,
              ],
            },
          });

          map.addLayer({
            id: "regions-outline-2",
            type: "line",
            source: "regions",
            paint: {
              "line-color": [
                "case",
                ["boolean", ["feature-state", "mew"], false],
                "#9370DB",
                "#8872b3",
              ],
              "line-width": [
                "case",
                ["boolean", ["feature-state", "mew"], false],
                2, // Меньше толщина для второго слоя
                1,
              ],
              "line-offset": [
                "case",
                ["boolean", ["feature-state", "mew"], false],
                -1, // Сдвиг в другую сторону
                0,
              ],
              "line-blur": [
                // Добавляем небольшое размытие
                "case",
                ["boolean", ["feature-state", "mew"], false],
                0.5, //  небольшое размытие чтобы скрыть стыки
                0,
              ],
            },
          });

          fetch("./data/railway3.geojson")
          .then((response) => response.json()) // Преобразование результата в объект
          .then((route) => {
            // Получили маршрут
        
            // Затем загрузим изображение
            fetch("./data/train.png")
              .then((response) => response.blob()) // Получение blob-данных картинки
              .then((blob) => createImageBitmap(blob))
              .then((image) => {
                // Добавляем картинку в качестве изображения в стиле карты
                map.addImage("train_icon", image);
        
                // Теперь продолжим дальше работать с маршрутом
                processRouteAndAnimate(map, route);
              });
          });

          let hoveredRegionsId = null;

          // изменение прозрачности (hover effect)

          map.on("mousemove", "regionslayer", (e) => {
            if (e.features.length > 0) {
              if (hoveredRegionsId) {
                map.setFeatureState(
                  { source: "regions", id: hoveredRegionsId },
                  { hover: false }
                );
              }
              hoveredRegionsId = e.features[0].id; // присвоение нового идентификатора
              map.setFeatureState(
                { source: "regions", id: hoveredRegionsId },
                { hover: true }
              );
            }
          });

          map.on("mouseleave", "regionslayer", (e) => {
            if (hoveredRegionsId) {
              map.setFeatureState(
                { source: "regions", id: hoveredRegionsId },
                { hover: false }
              );
            }
            hoveredRegionsId = null;
          });

          let mewedRegionsId = null;

          map.on("click", ["regionslayer"], (e) => {
            if (e.features.length > 0) {
              if (mewedRegionsId) {
                map.setFeatureState(
                  { source: "regions", id: mewedRegionsId },
                  { mew: false }
                );
              }
              mewedRegionsId = e.features[0].id;
              map.setFeatureState(
                { source: "regions", id: mewedRegionsId },
                { mew: true }
              );
              button.style.display = "block";
            }
          });

          const button = document.getElementById("button");

          button.addEventListener("click", () => {
            if (mewedRegionsId) {
              console.log(mewedRegionsId);

              map.setFeatureState(
                { source: "regions", id: mewedRegionsId },
                { mew: false }
              );

              button.style.display = "none";
            }
            mewedRegionsId = null;
          });

          map.on("mousemove", ["regionslayer"], (i) => {
            console.log(i.features);
            document.getElementById("region_name").innerHTML =
              i.features[0].properties.NL_NAME_1;
          });

          map.on("mousemove", (event) => {
            const lngLat = event.lngLat;
            // console.log(lngLat.lng)
            const lng = event.lngLat.lng;
            document.getElementById("lng").innerHTML = `Долгота: ${lng}`;
            // console.log(lngLat.lat)
            const lat = event.lngLat.lat;
            document.getElementById("lat").innerHTML = `Широта: ${lat}`;
          });

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
            "Донецкая Народная Республика":
              "./Audio/Донецкая Народная Республика.mp3",
            "Еврейская автономная область":
              "./Audio/Еврейская автономная область.mp3",
            "Забайкальский край": "./Audio/Забайкальский край.mp3",
            "Запорожская область": "./Audio/Запорожская область.mp3",
            "Ивановская область": "./Audio/Ивановская область.mp3",
            "Иркутская область": "./Audio/Иркутская область.mp3",
            "Кабардино-Балкарская Республика":
              "./Audio/Кабардино-Балкарская Республика.mp3",
            "Калининградская область": "./Audio/Калининградская область.mp3",
            "Калужская область": "./Audio/Калужская область.mp3",
            "Камчатский край": "./Audio/Камчатский край.mp3",
            "Карачаево-Черкесская Республика":
              "./Audio/Карачаево-Черкесская Республика.mp3",
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
            "Луганская Народная Республика":
              "./Audio/Луганская Народная Республика.mp3",
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
            "Республика Северная Осетия — Алания":
              "./Audio/Республика Северная Осетия — Алания.mp3",
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
            "Севастополь: ": "./Audio/Севастополь.mp3",
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
            "Ярославская область": "./Audio/Ярославская область.mp3",
          };
          // Функция для создания HTML элемента для региона (list-item)
          function createRegionListItem(
            regionName,
            audioSrc,
            regionSostav,
            regionMusic
          ) {
            return `<div class="list-item">
            <h4>${regionName}</h4>
            <pre>${regionSostav}</pre> 
            <audio controls src="${audioSrc}"></audio>
            <p>${regionMusic}</p> 
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
          button.addEventListener("click", () => {
            stopCurrentAudio(); // Останавливаем текущее аудио
          });

          map.on("click", ["regionslayer"], (e) => {
            const clickedRegionName =
              e.features[0].properties[
                "Наименование субъекта Российской Федерации"
              ];
            const clickedRegionSostav =
              e.features[0].properties["Национальный состав"];
            const clickedMusic = e.features[0].properties["Музыка"];
            const audioSrc = regionAudioMap[clickedRegionName];

            if (audioSrc) {
              // Останавливаем предыдущее аудио
              stopCurrentAudio();

              // Создаем и начинаем воспроизведение нового аудио
              currentAudio = new Audio(audioSrc);
              currentAudio.play();

              // Обновляем содержимое list-all
              const listItemHtml = createRegionListItem(
                clickedRegionName,
                audioSrc,
                clickedRegionSostav,
                clickedMusic
              );
              document.getElementById("list-all").innerHTML = listItemHtml; // Перезаписываем содержимое
            } else {
              console.warn(
                `Аудио для региона "${clickedRegionName}" не найдено.`
              );
              document.getElementById("list-all").innerHTML =
                "Аудио для данного региона не найдено.";
              stopCurrentAudio();
            }
          });

          regionsGeoJSON.features.forEach((f) => {
            const regionName =
              f.properties["Наименование субъекта Российской Федерации"];
            const listItemHtml = `<li>${regionName}</li>`;
            document.getElementById("list-all").innerHTML += listItemHtml;
          });

        
        });
      
      // Функция обработки маршрута и настройки анимации
      function processRouteAndAnimate(map, route) {
        // Инициализация необходимых переменных
        const coordinates = route.features[0].geometry.coordinates;
        const origin = coordinates[0];
        const destination = coordinates[coordinates.length - 1];
      
        // Создаем источник и добавляем его на карту
        map.addSource("route", {
          type: "geojson",
          data: route,
        });
      
        // Добавляем слой линии маршрута
        map.addLayer({
          id: "route",
          source: "route",
          type: "line",
          paint: {
            "line-width": 3,
            "line-dasharray": [2, 4],
            "line-color": "#777777",
          },
        });
      
        // Готовим точку для показа положения поезда
        const point = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: origin,
              },
            },
          ],
        };
      
        // Добавляем точку на карту
        map.addSource("point", {
          type: "geojson",
          data: point,
        });
      
        // Отображаем сам поезд на карте
        map.addLayer({
          id: "point",
          source: "point",
          type: "symbol",
          layout: {
            "icon-image": "train_icon",
            "icon-size": 0.1,
            "icon-rotation-alignment": "map",
            "icon-overlap": "always",
            "icon-ignore-placement": true,
          },
        });
      
        // Расчет расстояния между началом и концом маршрута
        const lineDistance = turf.lineDistance(route.features[0], "kilometers");
        console.log("Расстояние маршрута:", lineDistance);
      
        // Генерация набора промежуточных координат
        const steps = 2000;
        const arc = [];
        for (let i = 0; i < lineDistance; i += lineDistance / steps) {
          const segment = turf.along(route.features[0], i, "kilometers");
          arc.push(segment.geometry.coordinates);
        }
      
        // Сохраняем новый путь
        route.features[0].geometry.coordinates = arc;
      
        // Стартуем анимацию
        let counter = 0;
        function animate() {
          if (counter < arc.length) {
            point.features[0].geometry.coordinates = arc[counter];
            map.getSource("point").setData(point);
            requestAnimationFrame(animate);
            counter++;
          } else {
            console.log("Анимация завершена!");
          }
        }
      
        // Запускаем анимацию сразу же
        animate();
      
        // Реализуем возможность перезапуска анимации
        document.getElementById("replay").addEventListener("click", () => {
          point.features[0].geometry.coordinates = origin;
          map.getSource("point").setData(point);
          counter = 0;
          animate(); // Перезапускаем анимацию
        });
      
    };
  })

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  let audioBuffer;
  let sourceNode;
  let gainNode;
  let isPlaying = false;
  const MAX_ZOOM = 18; // Максимальный зум, используемый в map.setMaxZoom()
  const MIN_ZOOM = 0; // Минимальный зум

  function loadAudio(url) {
    fetch(url)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
      .then((buffer) => {
        audioBuffer = buffer;
        console.log("Аудио загружено и декодировано.");
      })
      .catch((error) => console.error("Ошибка при загрузке аудио:", error));
  }

  loadAudio("./Audio/Гимн России.mp3");

  function playAudio() {
    if (!audioBuffer) {
      console.warn("Аудио еще не загружено.");
      return;
    }

    if (isPlaying) {
      console.log("Аудио уже играет, не запускаем заново.");
      return;
    }

    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    gainNode = audioContext.createGain();
    gainNode.gain.value = 0.5;
    sourceNode.connect(gainNode).connect(audioContext.destination);

    sourceNode.onended = () => {
      isPlaying = false;
      console.log("Аудио закончило воспроизведение.");
    };

    sourceNode.start(0);
    sourceNode.loop = true;
    isPlaying = true;
    console.log("Аудио запущено.");
  }

  function stopAudio() {
    if (sourceNode) {
      sourceNode.stop();
      sourceNode.disconnect();
      sourceNode = null;
    }
    isPlaying = false;
    console.log("Аудио остановлено.");
  }

  document.getElementById("toggle").addEventListener("click", function () {
    // Пытаемся возобновить AudioContext при каждом клике, если он приостановлен
    if (audioContext.state !== "running") {
      audioContext
        .resume()
        .then(() => {
          console.log("AudioContext возобновлен.");
        })
        .catch((error) => {
          console.error("Ошибка при возобновлении AudioContext:", error);
        });
    }

    if (audioContext.state === "running") {
      if (isPlaying) {
        stopAudio();
      } else if (audioBuffer) {
        playAudio();
      }
    } else {
      console.log("AudioContext is suspended, cannot play.");
    }
  });

  function updateVolumeBasedOnZoom() {
    const zoomLevel = map.getZoom();

    // Нормализуем уровень зума в диапазон [0, 1]
    let normalizedZoom = (zoomLevel - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM);

    // Ограничиваем значение в диапазоне [0, 1] (на всякий случай)
    normalizedZoom = Math.max(0, Math.min(1, normalizedZoom));

    // Инвертируем, чтобы громкость уменьшалась при отдалении
    let volume = 1 - normalizedZoom;

    // Применим нелинейное масштабирование для большего контраста
    volume = Math.pow(volume, 2);

    if (gainNode) {
      gainNode.gain.value = volume;
    }
  }

  map.on("zoom", function () {
    updateVolumeBasedOnZoom();
  });

  updateVolumeBasedOnZoom();

  map.on("click", "regionslayer", function (e) {
    stopAudio();
    console.log("regionslayer clicked. Audio stopped.");
  });
});

// map.on("load", async () => {
//   let route; // Объявляем route здесь, чтобы он был доступен во всей функции
//   let origin;   // Объявляем origin
//   let destination; // Объявляем destination

//   // Функция для загрузки geojson данных
//   async function loadGeoJSON(url) {
//     try {
//       const response = await fetch(url);
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
//       const data = await response.json();
//       return data;
//     } catch (error) {
//       console.error("Ошибка загрузки GeoJSON:", error);
//       return null; // Возвращаем null в случае ошибки
//     }
//   }

// // Загружаем данные маршрута
// route = await loadGeoJSON("./data/railway3.geojson"); // Загружаем и присваиваем

// // Получаем первую и последнюю координаты из route
// const coordinates = route.features[0].geometry.coordinates;
// origin = coordinates[0];                     // Первая координата
// destination = coordinates[coordinates.length - 1]; // Последняя координата

// image = await map.loadImage("./data/train.png");
// map.addImage("cat", image.data);

// map.addSource("route", {
//   type: "geojson",
//   data: route,
// });

// // Обновляем координаты точки, чтобы начать с начала маршрута
// const point = {
//   type: "FeatureCollection",
//   features: [
//     {
//       type: "Feature",
//       properties: {},
//       geometry: {
//         type: "Point",
//         coordinates: origin, // Start at origin (из GeoJSON)
//       },
//     },
//   ],
// };

// map.addSource("point", {
//   type: "geojson",
//   data: point,
// });

// map.addLayer({
//   id: "route",
//   source: "route",
//   type: "line",
//   paint: {
//     "line-width": 2,
//     "line-color": "#007cbf",
//     "line-color": "#777777",
//   "line-width": 3,
//   "line-dasharray": [2, 4],
//   },
// });

// map.addLayer({
//   id: "point",
//   source: "point",
//   type: "symbol",
//   layout: {
//     "icon-image": "cat", // Используем добавленное изображение
//     "icon-size": 0.1,
//     // "icon-rotate": ["get", "bearing"], // Поворот в зависимости от bearing
//     "icon-rotation-alignment": "map",
//     "icon-overlap": "always",
//     "icon-ignore-placement": true,
//   },
// });

// console.log("Route.features [0] :", route.features[0]);

// // Calculate the distance in kilometers between route start/end point.
// const lineDistance = turf.lineDistance(route.features[0], "kilometers");
// console.log("Line distance:", lineDistance);

// const arc = [];

// // Number of steps to use in the arc and animation
// const steps = 2000;

// // Draw an arc between the `origin` & `destination` of the two points

// for (let i = 0; i < lineDistance; i += lineDistance / steps) {
//   const segment = turf.along(route.features[0], i, "kilometers");
//   arc.push(segment.geometry.coordinates);
// }

// // Update the route with calculated arc coordinates
// route.features[0].geometry.coordinates = arc;

// // Used to increment the value of the point measurement against the route.
// let counter = 0;

// function animate() {
//   // Получаем длину массива координат
//   const coordinatesLength = route.features[0].geometry.coordinates.length;

//   // Проверяем, что counter находится в пределах массива
//   if (counter < coordinatesLength) {
//     // Update point geometry to a new position based on counter denoting
//     // the index to access the arc.
//     point.features[0].geometry.coordinates =
//       route.features[0].geometry.coordinates[counter];

//     // Calculate the bearing to ensure the icon is rotated to match the route arc
//     let nextCounter = counter + 1;
//     if (nextCounter >= coordinatesLength) {
//         nextCounter = counter; // Если достигли конца, остаемся на последней точке
//     }
//     point.features[0].properties.bearing = turf.bearing(
//       turf.point(route.features[0].geometry.coordinates[counter]),
//       turf.point(route.features[0].geometry.coordinates[nextCounter])
//     );

//     // Update the source with this new data.
//     map.getSource("point").setData(point);

//     // Request the next frame of animation so long the end has not been reached.
//     requestAnimationFrame(animate);

//     counter = counter + 1; // Инкремент counter только если внутри массива
//   } else {
//     console.log("Animation complete!");
//   }
// }

// document.getElementById("replay").addEventListener("click", () => {
//    // **Проверка, что origin является массивом перед использованием**
//   if (!Array.isArray(origin)) {
//       console.error("Origin не является массивом координат при воспроизведении!");
//       return; //Прекращаем выполнение, чтобы избежать дальнейших ошибок
//   }
//   // Set the coordinates of the original point back to origin
//   point.features[0].geometry.coordinates = origin;

//   // Update the source layer
//   map.getSource("point").setData(point);

//   // Reset the counter
//   counter = 0;

//   // Restart the animation
//   animate();
// });

// Запускаем анимацию после загрузки всего
//   animate();

// });
// let imageSource; // Глобальная переменная для источника данных изображения
// let currentRegionId;  // Глобальная переменная для хранения id текущего региона

// map.on("load", async () => {
//   // 1. Загрузите изображение
//   const image = await map.loadImage("./Image/Русские.jpg"); // Замените на путь к вашему изображению
//   map.addImage("my-image", image.data);

//   // 2. Создайте источник для изображения (изначально пустой)
//   imageSource = {
//     type: "geojson",
//     data: {
//       type: "FeatureCollection",
//       features: [], // Изначально нет фич
//     },
//   };

//   map.addSource("image-point", imageSource);

//   // 3. Создайте слой для отображения изображения
//   map.addLayer({
//     id: "image-layer",
//     type: "symbol",
//     source: "image-point",
//     layout: {
//       "icon-image": "my-image", // Используем загруженное изображение
//       "icon-size": 0.1,        // Размер иконки (настройте по вкусу)
//       "icon-allow-overlap": true, // Разрешить перекрытие других элементов
//     },
//   });

//   // 4. Обработчик клика на регион
//   map.on("click", "regionslayer", (e) => {
//     const clickedFeature = e.features[0];
//     const regionId = clickedFeature.id; // Предполагаем, что у вас есть свойство 'id' у регионов

//     // Предотвращаем повторное появление картинки на одном и том же регионе
//     if (regionId === currentRegionId) {
//         return; // Ничего не делаем, если кликнули на тот же регион
//     }

//     currentRegionId = regionId;  // Обновляем id текущего региона

//     // Получаем координаты центра региона (centroid)
//     const centroid = turf.centroid(clickedFeature); // Требуется библиотека Turf.js
//     const coordinates = centroid.geometry.coordinates;

//     // Обновляем источник данных с точкой
//     imageSource.data = {
//       type: "FeatureCollection",
//       features: [
//         {
//           type: "Feature",
//           geometry: {
//             type: "Point",
//             coordinates: coordinates,
//           },
//           properties: {},
//         },
//       ],
//     };

//     // Обновляем источник данных, чтобы изменения отобразились
//     map.getSource("image-point").setData(imageSource.data);
//   });
// });
