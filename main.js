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

    let csvRecord = null;

    for (let i = 0; i < csvData.length; i++) {
      const csvRegionCode = csvData[i].region_cod;
      if (csvRegionCode === id) {
        csvRecord = csvData[i];
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
      "line-color": "#d0d0d0",
      "line-width": 1,
      "line-opacity": 0.7,
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
                "case",
                ["boolean", ["feature-state", "mew"], false],
                0.5,
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

          const regionImageMap = {
            "Алтайский край": "./Image/Алтайский край.jpg",
            "Амурская область": "./Image/Амурская область.jpg",
            "Архангельская область": "./Image/Архангельская область.jpg",
            "Астраханская область": "./Image/Астраханская область.jpg",
            "Белгородская область": "./Image/Белгородская область.jpg",
            "Брянская область": "./Image/Брянская область.png",
            "Владимирская область": "./Image/Владимирская область.jpg",
            "Волгоградская область": "./Image/Волгоградская область.jpg",
            "Вологодская область": "./Image/Вологодская область.jpg",
            "Воронежская область": "./Image/Воронежская область.jpg",
            "Еврейская автономная область": "./Image/ЕАО.jpg",
            "Забайкальский край": "./Image/Забайкальский край.jpg",
            "Ивановская область": "./Image/Ивановская область.jpg",
            "Иркутская область": "./Image/Иркутская область.jpg",
            "Кабардино-Балкарская Республика":
              "./Image/Кабардино-Балкарская Республика.jpg",
            "Калининградская область": "./Image/Калининградская область.jpg",
            "Калужская область": "./Image/Калужская область.jpg",
            "Камчатский край": "./Image/Камчатский край.jpg",
            "Карачаево-Черкесская Республика":
              "./Image/Карачаево-Черкесская Республика.jpg",
            "Кемеровская область": "./Image/Кемеровская область.jpg",
            "Кировская область": "./Image/Кировская область.jpg",
            "Костромская область": "./Image/Костромская область.jpg",
            "Краснодарский край": "./Image/Краснодарский край.jpg",
            "Красноярский край": "./Image/Красноярский край.jpg",
            "Курганская область": "./Image/Курганская область.jpg",
            "Курская область": "./Image/Курская область.jpg",
            "Ленинградская область": "./Image/Ленинградская область.jpg",
            "Липецкая область": "./Image/Липецкая область.jpg",
            "Магаданская область": "./Image/Магаданская область.jpg",
            "Москва": "./Image/Москва.jpg",
            "Московская область": "./Image/Московская область.jpg",
            "Мурманская область": "./Image/Мурманская область.jpg",
            "Ненецкий автономный округ": "./Image/НАО.jpg",
            "Нижегородская область": "./Image/Нижегородская область.jpg",
            "Новгородская область": "./Image/Новгородская область.jpg",
            "Новосибирская область": "./Image/Новосибирская область.jpg",
            "Омская область": "./Image/Омская область.jpg",
            "Оренбургская область": "./Image/Оренбургская область.jpg",
            "Орловская область": "./Image/Орловская область.jpg",
            "Пензенская область": "./Image/Пензенская область.jpg",
            "Пермский край": "./Image/Пермский край.jpg",
            "Приморский край": "./Image/Приморский край.jpg",
            "Псковская область": "./Image/Псковская область.jpg",
            "Республика Адыгея": "./Image/Республика Адыгея.jpg",
            "Республика Алтай": "./Image/Республика Алтай.jpg",
            "Республика Башкортостан": "./Image/Республика Башкортостан.jpg",
            "Республика Бурятия": "./Image/Республика Бурятия.jpg",
            "Республика Дагестан": "./Image/Республика Дагестан.jpg",
            "Республика Ингушетия": "./Image/Республика Ингушетия.jpg",
            "Республика Калмыкия": "./Image/Республика Калмыкия.jpg",
            "Республика Карелия": "./Image/Республика Карелия.jpg",
            "Республика Коми": "./Image/Республика Коми.jpg",
            "Республика Крым": "./Image/Республика Крым.jpg",
            "Республика Марий Эл": "./Image/Республика Марий Эл.jpg",
            "Республика Мордовия": "./Image/Республика Мордовия.jpg",
            "Республика Саха (Якутия)": "./Image/Республика Саха (Якутия).jpg",
            "Республика Северная Осетия - Алания":
              "./Image/Республика Северная Осетия - Алания.jpg",
            "Республика Татарстан": "./Image/Республика Татарстан.jpg",
            "Республика Тыва": "./Image/Республика Тыва.jpg",
            "Удмуртская Республика": "./Image/Республика Удмуртия.jpg",
            "Республика Хакасия": "./Image/Республика Хакасия.jpg",
            "Республика Чувашия": "./Image/Республика Чувашия.jpg",
            "Ростовская область": "./Image/Ростовская область.jpg",
            "Рязанская область": "./Image/Рязанская область.jpg",
            "Самарская область": "./Image/Самарская область.jpg",
            "Санкт-Петербург": "./Image/Санкт-Петербург.jpg",
            "Саратовская область": "./Image/Саратовская область.jpg",
            "Сахалинская область": "./Image/Сахалинская область.jpg",
            "Свердловская область": "./Image/Свердловская область.jpg",
            "Севастополь: ": "./Image/Севастополь.jpg",
            "Смоленская область": "./Image/Смоленская область.jpg",
            "Ставропольский край": "./Image/Ставропольский край.jpg",
            "Тамбовская область": "./Image/Тамбовская область.jpg",
            "Тверская область": "./Image/Тверская область.jpg",
            "Томская область": "./Image/Томская область.jpg",
            "Тульская область": "./Image/Тульская область.jpg",
            "Тюменская область": "./Image/Тюменская область.jpg",
            "Ульяновская область": "./Image/Ульяновская область.jpg",
            "Хабаровский край": "./Image/Хабаровский край.jpg",
            "Ханты-Мансийский автономный округ": "./Image/ХМАО.jpg",
            "Челябинская область": "./Image/Челябинская область.jpg",
            "Чеченская Республика": "./Image/Чеченская Республика.jpg",
            "Чукотский автономный округ": "./Image/ЧАО.jpg",
            "Ямало-Ненецкий автономный округ": "./Image/ЯНАО.jpg",
            "Ярославская область": "./Image/Ярославская область.jpg",
            "Запорожская область": "./Image/Запорожская область.jpg",
            "Донецкая Народная Республика": "./Image/ДНР.jpg",
            "Луганская Народная Республика": "./Image/ЛНР.jpg",
            "Херсонская область": "./Image/Херсонская область.jpg",
          };

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
            "Удмуртская Республика": "./Audio/Республика Удмуртия.mp3",
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
            regionMusic,
            imageSrc
          ) {
            return `<div class="list-item">
            <h4>${regionName}</h4>
            <img src="${imageSrc}" alt="${regionName}">
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
            const imageSrc = regionImageMap[clickedRegionName];

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
                clickedMusic,
                imageSrc
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
        // Функция для вычисления простого центроида полигона
        function getPolygonCentroid(polygon) {
          let sumX = 0;
          let sumY = 0;
          const coordinates = polygon.coordinates[0];

          for (let i = 0; i < coordinates.length; i++) {
            sumX += coordinates[i][0]; // долгота
            sumY += coordinates[i][1]; // широта
          }

          const numVertices = coordinates.length;
          return {
            longitude: sumX / numVertices,
            latitude: sumY / numVertices,
          };
        }

        // Обработка MultiPolygon
        function getMultiPolygonCentroid(multiPolygon) {
          let totalSumX = 0;
          let totalSumY = 0;
          let totalVerticesCount = 0;

          multiPolygon.coordinates.forEach((polygonsGroup) => {
            polygonsGroup.forEach((coordinates) => {
              let sumX = 0;
              let sumY = 0;

              for (let i = 0; i < coordinates.length; i++) {
                sumX += coordinates[i][0]; // долгота
                sumY += coordinates[i][1]; // широта
              }

              const verticesCount = coordinates.length;
              totalSumX += sumX;
              totalSumY += sumY;
              totalVerticesCount += verticesCount;
            });
          });

          return {
            longitude: totalSumX / totalVerticesCount,
            latitude: totalSumY / totalVerticesCount,
          };
        }

        const regionNames = [];

        regionsGeoJSON.features.forEach((f) => {
          const regionName = f.properties["NL_NAME_1"];
          regionNames.push(regionName);
        });

        regionNames.sort((a, b) =>
          a.localeCompare(b, "ru", { sensitivity: "base" })
        );

        document.getElementById("list-all").innerHTML = "";

        regionNames.forEach((regionName) => {
          const feature = regionsGeoJSON.features.find(
            (f) => f.properties["NL_NAME_1"] === regionName
          );

        let centroid;
        switch (feature.geometry.type) {
          case "Polygon":
            centroid = getPolygonCentroid(feature.geometry);
            break;
          case "MultiPolygon":
            centroid = getMultiPolygonCentroid(feature.geometry);
            break;
        }

            const listItemHtml = `
            <li data-region-name="${regionName}"
            data-latitude="${centroid.latitude}"
            data-longitude="${centroid.longitude}">
            ${regionName}
            </li>
            `;
            document.getElementById("list-all").innerHTML += listItemHtml;
          }
        );

        // Обработчик кликов остается прежним
        document.getElementById("list-all").addEventListener("click", function (event) {
          if (event.target && event.target.nodeName === "LI") {
            const regionName = event.target.dataset.regionName;
            const latitude = event.target.dataset.latitude;
            const longitude = event.target.dataset.longitude;
            
            map.flyTo({
              center: [longitude, latitude],
              zoom: 6,
              essential: true,
            });
          }
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

