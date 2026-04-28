import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { SelectedRegion } from './types';

import citySeedData from './cityData.json';
import worldSubsetGeo from './worldSubsetGeo.json';

const cityDataJson = JSON.stringify(citySeedData.cities);
const worldSubsetGeoJson = JSON.stringify(worldSubsetGeo);

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
  />
  <style>
    html, body, #app {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #05070b;
    }

    canvas {
      display: block;
      touch-action: none;
    }
    
      #label-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.city-label {
  position: absolute;
  transform: translate(-50%, -50%);
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(5, 7, 11, 0.72);
  color: #fff4ea;
  font-size: 11px;
  font-family: Arial, sans-serif;
  white-space: nowrap;
  line-height: 1;
  pointer-events: auto;
  cursor: pointer;
}
  </style>
</head>
<body>
  <div id="app"></div>
  <div id="label-layer"></div>

  <script src="https://unpkg.com/three@0.124.0/build/three.min.js"></script>
  <script src="https://unpkg.com/three@0.124.0/examples/js/controls/OrbitControls.js"></script>

  <script>
    (function () {
    const PALETTE = {
        ocean: '#47C8FF',
        countryFill: '#F8F9FA',
        outline: '#009DE0',
        selected: '#FDBA2E',
        cityBase: '#4BC8B6',
        cityBuilding: '#ffffff',
        guidePrimary: '#c58a64',
        guideSecondary: '#d6a98c',
    };

    const CITY_LEVEL_COLORS = {
        1: '#7DDCFF', // sky
        2: '#3A86FF', // blue
        3: '#9EF01A', // light green
        4: '#38B000', // green
        5: '#FF6FB5', // pink
        6: '#9D4EDD', // purple
        7: '#FF9F1C', // orange
        8: '#E5383B', // red
    };

    const CITY_BUILDING_COLORS = {
        house: '#FFD43B',
        tower: '#4D96FF',
        hotel: '#FF6B6B',
    };

    const CITY_LEVEL_PATTERNS = {
        1: [
            ['house'],
        ],
        2: [
            ['house', 'house'],
        ],
        3: [
            ['tower', 'house'],
            ['house', 'tower'],
        ],
        4: [
            ['house', 'house', 'tower', 'house', 'house'],
            ['tower', 'house', 'house', 'house'],
        ],
        5: [
            ['tower', 'tower'],
            ['tower', 'house', 'house', 'house'],
        ],
        6: [
            ['tower', 'tower', 'tower'],
            ['hotel', 'house', 'house', 'house', 'house'],
            ['hotel', 'hotel', 'tower', 'house'],
        ],
        7: [
            ['hotel', 'tower', 'tower', 'house', 'house'],
            ['hotel', 'hotel', 'tower', 'house', 'house'],
        ],
        8: [
            ['hotel', 'hotel', 'tower', 'tower', 'house', 'house'],
            ['hotel', 'hotel', 'hotel', 'tower', 'house'],
        ],
    };

    const cityData = ${cityDataJson};
    const worldSubsetGeoData = ${worldSubsetGeoJson};

    const container = document.getElementById('app');

    const labelLayer = document.getElementById('label-layer');
    const cityLabelElements = new Map();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#05070b');

    const camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 5.5);

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableRotate = true;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.minDistance = 1.6;
    controls.maxDistance = 10;
    controls.rotateSpeed = 0.8;
    controls.touches = {ONE: THREE.TOUCH.ROTATE};

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    let isAutoRotating = true;
    let focusTargetPosition = null;
    let focusLerp = 0.1;

    const globeGroup = new THREE.Group();
    const countryLayerGroup = new THREE.Group();
    const cityLayerGroup = new THREE.Group();

    globeGroup.add(countryLayerGroup);
    globeGroup.add(cityLayerGroup);
    scene.add(globeGroup);

    const oceanGeometry = new THREE.SphereGeometry(1, 64, 64);
    const oceanMaterial = new THREE.MeshBasicMaterial({
        color: PALETTE.ocean,
    });
    const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
    globeGroup.add(ocean);

    function latLngToVector3(lat, lng, radius) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);

        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const z = radius * Math.sin(phi) * Math.sin(theta);
        const y = radius * Math.cos(phi);

        return new THREE.Vector3(x, y, z);
    }

    function createLatitudeLine(lat, radius, segments, color, opacity) {
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const lng = -180 + (i / segments) * 360;
            points.push(latLngToVector3(lat, lng, radius));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity,
        });

        return new THREE.Line(geometry, material);
    }

    function createLongitudeLine(lng, radius, segments, color, opacity) {
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const lat = -90 + (i / segments) * 180;
            points.push(latLngToVector3(lat, lng, radius));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity,
        });

        return new THREE.Line(geometry, material);
    }

    const guideLineRadius = 1.002;
    const guideLineSegments = 180;

    globeGroup.add(
        createLongitudeLine(0, guideLineRadius, guideLineSegments, PALETTE.guidePrimary, 1)
    );
    globeGroup.add(
        createLongitudeLine(180, guideLineRadius, guideLineSegments, PALETTE.guideSecondary, 0.75)
    );
    globeGroup.add(
        createLatitudeLine(0, guideLineRadius, guideLineSegments, PALETTE.guidePrimary, 0.9)
    );

    function projectPointToSphere(point, radius) {
        return point.clone().normalize().multiplyScalar(radius);
    }

    function midpointOnSphere(a, b, radius) {
        return projectPointToSphere(
            new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5),
            radius
        );
    }

    function subdivideTriangleOnSphere(a, b, c, radius, depth, outPositions, outIndices) {
        if (depth <= 0) {
            const baseIndex = outPositions.length / 3;
            outPositions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
            outIndices.push(baseIndex, baseIndex + 1, baseIndex + 2);
            return;
        }

        const ab = midpointOnSphere(a, b, radius);
        const bc = midpointOnSphere(b, c, radius);
        const ca = midpointOnSphere(c, a, radius);

        subdivideTriangleOnSphere(a, ab, ca, radius, depth - 1, outPositions, outIndices);
        subdivideTriangleOnSphere(ab, b, bc, radius, depth - 1, outPositions, outIndices);
        subdivideTriangleOnSphere(ca, bc, c, radius, depth - 1, outPositions, outIndices);
        subdivideTriangleOnSphere(ab, bc, ca, radius, depth - 1, outPositions, outIndices);
    }

    function createLocalFrame(lat, lng) {
        const origin = latLngToVector3(lat, lng, 1).normalize();
        const worldUp = new THREE.Vector3(0, 1, 0);
        let east = new THREE.Vector3().crossVectors(worldUp, origin);

        if (east.lengthSq() < 1e-6) {
            east = new THREE.Vector3(1, 0, 0);
        } else {
            east.normalize();
        }

        const north = new THREE.Vector3().crossVectors(origin, east).normalize();
        return {origin, east, north};
    }

    function latLngToLocal2D(lat, lng, frame, radius) {
        const p = latLngToVector3(lat, lng, radius);
        return new THREE.Vector2(p.dot(frame.east), p.dot(frame.north));
    }

    function createCountryOutline(feature) {
        const group = new THREE.Group();

        feature.polygons.forEach((polygon) => {
            const points = polygon.map((point) =>
                latLngToVector3(point.lat, point.lng, 1.01)
            );

            if (points.length > 0) {
                points.push(points[0].clone());
            }

            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: PALETTE.outline,
                transparent: true,
                opacity: 1,
            });

            const line = new THREE.Line(geometry, material);
            line.userData = {
                countryId: feature.id,
                countryName: feature.name,
                defaultColor: new THREE.Color(PALETTE.outline),
                selectedColor: new THREE.Color(PALETTE.selected),
            };

            group.add(line);
        });

        return group;
    }

    function createCountryFill(feature) {
        const frame = createLocalFrame(feature.centerLat, feature.centerLng);
        const surfaceRadius = 1.01;
        const subdivisionDepth = 2;

        const group = new THREE.Group();

        feature.polygons.forEach((polygon) => {
            if (!polygon || polygon.length < 3) return;

            let polygonPoints = [...polygon];

            const contour2D = polygonPoints.map((point) =>
                latLngToLocal2D(point.lat, point.lng, frame, surfaceRadius)
            );

            if (THREE.ShapeUtils.isClockWise(contour2D)) {
                contour2D.reverse();
                polygonPoints.reverse();
            }

            const faces = THREE.ShapeUtils.triangulateShape(contour2D, []);
            const spherePoints = polygonPoints.map((point) =>
                latLngToVector3(point.lat, point.lng, surfaceRadius)
            );

            const positions = [];
            const indices = [];

            faces.forEach((face) => {
                subdivideTriangleOnSphere(
                    spherePoints[face[0]],
                    spherePoints[face[1]],
                    spherePoints[face[2]],
                    surfaceRadius,
                    subdivisionDepth,
                    positions,
                    indices
                );
            });

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute(
                'position',
                new THREE.Float32BufferAttribute(positions, 3)
            );
            geometry.setIndex(indices);

            const material = new THREE.MeshBasicMaterial({
                color: PALETTE.countryFill,
                transparent: true,
                opacity: 0.96,
                side: THREE.DoubleSide,
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData = {
                countryId: feature.id,
                countryName: feature.name,
                lat: feature.centerLat,
                lng: feature.centerLng,
                defaultColor: new THREE.Color(PALETTE.countryFill),
                selectedColor: new THREE.Color(PALETTE.selected),
            };

            group.add(mesh);
        });

        return group;
    }

    // City Label 함수
    function ensureCityLabel(city) {
        let el = cityLabelElements.get(city.id);

        if (!el) {
            el = document.createElement('div');
            el.className = 'city-label';
            el.textContent = city.name;
            el.style.display = 'none';

            el.addEventListener('click', function (event) {
                event.stopPropagation();
                selectCityById(city.id);
            });

            el.addEventListener('touchend', function (event) {
                event.preventDefault();
                event.stopPropagation();
                selectCityById(city.id);
            });

            labelLayer.appendChild(el);
            cityLabelElements.set(city.id, el);
        }

        return el;
    }

    function toScreenPosition(worldPosition, camera, renderer) {
        const projected = worldPosition.clone().project(camera);

        return {
            x: ((projected.x + 1) / 2) * renderer.domElement.clientWidth,
            y: ((-projected.y + 1) / 2) * renderer.domElement.clientHeight,
            z: projected.z,
        };
    }

    function updateCityLabels() {
        const distance = camera.position.length();

        // 빌딩은 항상 보이고, 라벨만 줌 기준으로 제어
        const showLabels = distance <= 4.2;
        const tightZoom = distance <= 3.2;

        cityData.forEach((city) => {
            const el = cityLabelElements.get(city.id);
            if (!el) return;

            const priority = city.labelPriority || 0;

            // 멀 때는 높은 우선순위만
            if (!showLabels) {
                el.style.display = 'none';
                return;
            }

            if (!tightZoom && priority < 8) {
                el.style.display = 'none';
                return;
            }

            const worldPos = latLngToVector3(city.lat, city.lng, 1.08);
            const worldPosRotated = worldPos.clone().applyQuaternion(globeGroup.quaternion);

            // 카메라 앞쪽인지 판정
            const camDir = camera.position.clone().normalize();
            const dot = worldPosRotated.clone().normalize().dot(camDir);

            // 뒤쪽 반구면 숨김
            if (dot < 0.15) {
                el.style.display = 'none';
                return;
            }

            const screen = toScreenPosition(worldPosRotated, camera, renderer);

            if (screen.z < -1 || screen.z > 1) {
                el.style.display = 'none';
                return;
            }

            el.style.display = 'block';
            el.style.left = screen.x + 'px';
            el.style.top = screen.y + 'px';
        });
    }

    function hashString(str) {
        let hash = 0;

        for (let i = 0; i < str.length; i++) {
            hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
        }

        return hash;
    }

    function pickPatternForCity(city) {
        const level = city.level || 1;
        const patterns = CITY_LEVEL_PATTERNS[level] || CITY_LEVEL_PATTERNS[1] || [['house']];
        const index = hashString(city.id || city.name || 'city') % patterns.length;

        return patterns[index];
    }

    function createHouseMesh(city, color) {
        const group = new THREE.Group();

        const bodyGeometry = new THREE.BoxGeometry(0.018, 0.012, 0.018);
        const roofGeometry = new THREE.ConeGeometry(0.015, 0.01, 4);

        const material = new THREE.MeshBasicMaterial({color});

        const body = new THREE.Mesh(bodyGeometry, material.clone());
        body.position.y = 0.006;

        const roof = new THREE.Mesh(roofGeometry, material.clone());
        roof.position.y = 0.017;
        roof.rotation.y = Math.PI * 0.25;

        body.userData = {
            cityId: city.id,
            cityName: city.name,
            country: city.country,
            cityLevel: city.level || 1,
            defaultColor: new THREE.Color(color),
            selectedColor: new THREE.Color(color),
        };

        roof.userData = {
            cityId: city.id,
            cityName: city.name,
            country: city.country,
            cityLevel: city.level || 1,
            defaultColor: new THREE.Color(color),
            selectedColor: new THREE.Color(PALETTE.selected),
        };

        group.add(body);
        group.add(roof);

        return group;
    }

    function createTowerMesh(city, color) {
        const group = new THREE.Group();

        const baseGeometry = new THREE.BoxGeometry(0.02, 0.012, 0.02);
        const midGeometry = new THREE.BoxGeometry(0.014, 0.024, 0.014);
        const topGeometry = new THREE.BoxGeometry(0.009, 0.016, 0.009);

        const material = new THREE.MeshBasicMaterial({color});

        const base = new THREE.Mesh(baseGeometry, material.clone());
        base.position.y = 0.006;

        const mid = new THREE.Mesh(midGeometry, material.clone());
        mid.position.y = 0.024;

        const top = new THREE.Mesh(topGeometry, material.clone());
        top.position.y = 0.044;

        [base, mid, top].forEach((mesh) => {
            mesh.userData = {
                cityId: city.id,
                cityName: city.name,
                country: city.country,
                cityLevel: city.level || 1,
                defaultColor: new THREE.Color(color),
                selectedColor: new THREE.Color(color),
            };
            group.add(mesh);
        });

        return group;
    }

    function createHotelMesh(city, color) {
        const group = new THREE.Group();

        const bodyGeometry = new THREE.BoxGeometry(0.024, 0.016, 0.024);
        const upperGeometry = new THREE.BoxGeometry(0.018, 0.014, 0.018);
        const crownGeometry = new THREE.BoxGeometry(0.012, 0.01, 0.012);

        const material = new THREE.MeshBasicMaterial({color});

        const body = new THREE.Mesh(bodyGeometry, material.clone());
        body.position.y = 0.008;

        const upper = new THREE.Mesh(upperGeometry, material.clone());
        upper.position.y = 0.023;

        const crown = new THREE.Mesh(crownGeometry, material.clone());
        crown.position.y = 0.035;

        [body, upper, crown].forEach((mesh) => {
            mesh.userData = {
                cityId: city.id,
                cityName: city.name,
                country: city.country,
                cityLevel: city.level || 1,
                defaultColor: new THREE.Color(color),
                selectedColor: new THREE.Color(color),
            };
            group.add(mesh);
        });

        return group;
    }

    function createBuildingToken(city, type) {
        const color = CITY_BUILDING_COLORS[type] || '#ffffff';

        if (type === 'hotel') {
            return createHotelMesh(city, color);
        }

        if (type === 'tower') {
            return createTowerMesh(city, color);
        }

        return createHouseMesh(city, color);
    }

    function createCityCluster(city) {
        const group = new THREE.Group();
        group.userData = {
            type: 'city',
            id: city.id,
            name: city.name,
            country: city.country,
            lat: city.lat,
            lng: city.lng,
            level: city.level || 1,
        };

        const basePosition = latLngToVector3(city.lat, city.lng, 1.02);
        group.position.copy(basePosition);

        const normal = basePosition.clone().normalize();
        group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

        const level = city.level || 1;
        const pattern = pickPatternForCity(city);
        const baseColor = CITY_LEVEL_COLORS[level] || CITY_LEVEL_COLORS[1] || '#7DDCFF';

        const typePriority = {
            hotel: 0,
            tower: 1,
            house: 2,
        };

        const sortedPattern = [...pattern].sort((a, b) => {
            return (typePriority[a] ?? 99) - (typePriority[b] ?? 99);
        });

        // 도시 바닥 반지름
        const baseRadius = Math.max(0.04, 0.026 + sortedPattern.length * 0.002);

        //건물들 사이의 간격
        const innerRadius = 0.012;
        
        // 건물 수가 많을 때 바깥쪽 링 반경
        const outerRadius = Math.min(0.07, baseRadius * 0.72);

        sortedPattern.forEach((type, index) => {
            const token = createBuildingToken(city, type);

            if (index === 0) {
                token.position.set(0, 0, 0);
                group.add(token);
                return;
            }

            const ringIndex = index - 1;
            const ringCount = sortedPattern.length - 1;
            const angle = (ringIndex / Math.max(ringCount, 1)) * Math.PI * 2;

            const radius = ringCount <= 4 ? innerRadius : outerRadius;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            token.position.set(x, 0, z);
            token.rotation.y = -angle;

            group.add(token);
        });

        const baseGeometry = new THREE.CylinderGeometry(baseRadius, baseRadius, 0.008, 28);
        const baseMaterial = new THREE.MeshBasicMaterial({
            color: baseColor,
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0;

        base.userData = {
            cityId: city.id,
            cityName: city.name,
            country: city.country,
            cityLevel: level,
            defaultColor: new THREE.Color(baseColor),
            selectedColor: new THREE.Color(PALETTE.selected),
            isCityBase: true,
        };

        group.add(base);

        return group;
    }

    function normalizeLng(lng) {
        if (lng === 180) return 180;
        let value = ((lng + 180) % 360 + 360) % 360 - 180;
        if (value === -180) value = 180;
        return value;
    }

    function unwrapRing(ring) {
        if (!ring || ring.length === 0) return [];

        const result = [];
        let previousLng = normalizeLng(ring[0][0]);
        result.push([previousLng, ring[0][1]]);

        for (let i = 1; i < ring.length; i++) {
            let lng = normalizeLng(ring[i][0]);
            const lat = ring[i][1];

            while (lng - previousLng > 180) lng -= 360;
            while (lng - previousLng < -180) lng += 360;

            result.push([lng, lat]);
            previousLng = lng;
        }

        return result;
    }

    function computeCenter(polygons) {
        let latSum = 0;
        let lngSum = 0;
        let count = 0;

        for (const polygon of polygons) {
            for (const point of polygon) {
                latSum += point.lat;
                lngSum += point.lng;
                count += 1;
            }
        }

        if (count === 0) {
            return {centerLat: 0, centerLng: 0};
        }

        return {
            centerLat: latSum / count,
            centerLng: lngSum / count,
        };
    }

    function convertFeatureToCountry(feature) {
        const geometry = feature && feature.geometry;
        const props = (feature && feature.properties) || {};

        if (!geometry || !geometry.type || !geometry.coordinates) {
            return null;
        }

        const polygons = [];

        if (geometry.type === 'Polygon') {
            const outerRing = geometry.coordinates[0] || [];
            const unwrapped = unwrapRing(outerRing);
            polygons.push(unwrapped.map(([lng, lat]) => ({lat, lng})));
        }

        if (geometry.type === 'MultiPolygon') {
            geometry.coordinates.forEach((polygonCoords) => {
                const outerRing = polygonCoords[0] || [];
                const unwrapped = unwrapRing(outerRing);
                polygons.push(unwrapped.map(([lng, lat]) => ({lat, lng})));
            });
        }

        const filteredPolygons = polygons.filter((polygon) => polygon.length >= 3);
        if (filteredPolygons.length === 0) {
            return null;
        }

        const center = computeCenter(filteredPolygons);

        return {
            id: props.iso_a2 || props.iso_a3 || props.adm0_a3 || props.name,
            name: props.name_en || props.name || props.admin || 'Unknown',
            centerLat: center.centerLat,
            centerLng: center.centerLng,
            polygons: filteredPolygons,
        };
    }

    function convertGeoJsonToCountryData(geojson) {
        if (!geojson || !Array.isArray(geojson.features)) {
            return [];
        }

        return geojson.features.map(convertFeatureToCountry).filter(Boolean);
    }

    const countryData = convertGeoJsonToCountryData(worldSubsetGeoData);

    const cityGroups = [];
    const clickableCountryMeshes = [];
    const clickableMeshes = [];
    let selectedCountryId = null;
    let selectedCityId = null;

    countryData.forEach((country) => {
        const fillGroup = createCountryFill(country);
        const outlineGroup = createCountryOutline(country);

        countryLayerGroup.add(fillGroup);
        countryLayerGroup.add(outlineGroup);

        fillGroup.children.forEach((child) => {
            if (child.isMesh && child.userData && child.userData.countryId) {
                clickableCountryMeshes.push(child);
            }
        });
    });

    cityData.forEach((city) => {
        ensureCityLabel(city);

        const cityGroup = createCityCluster(city);
        cityLayerGroup.add(cityGroup);
        cityGroups.push(cityGroup);

        cityGroup.traverse((node) => {
            if (node.isMesh && node.userData && node.userData.cityId) {
                clickableMeshes.push(node);
            }
        });
    });

    function selectCityById(cityId) {
        if (selectedCityId === cityId) {
            focusTargetPosition = null;
            setSelectedCity(null);
            isAutoRotating = true;
            return;
        }

        setSelectedCountry(null);
        setSelectedCity(cityId);
        sendCityToReactNative(cityId);
    }

    function setSelectedCountry(countryId) {
    selectedCountryId = countryId;

    countryLayerGroup.children.forEach((child) => {
        if (child.type !== 'Group') return;

        child.children.forEach((item) => {
            if (!item.userData || !item.userData.countryId) return;

            const isSelected = item.userData.countryId === countryId;
            item.material.color.copy(
                isSelected ? item.userData.selectedColor : item.userData.defaultColor
            );
        });
    });
}

    function setSelectedCity(cityId) {
        selectedCityId = cityId;

        cityGroups.forEach((group) => {
            group.traverse((node) => {
                if (!node.isMesh || !node.userData || !node.userData.cityId) return;

                const isSelected = node.userData.cityId === cityId;
                node.material.color.copy(
                    isSelected ? node.userData.selectedColor : node.userData.defaultColor
                );
            });
        });
    }

    function setAutoRotationEnabled(enabled) {
        isAutoRotating = enabled;
    }

    function resumeAutoRotation() {
        focusTargetPosition = null;
        setSelectedCountry(null);
        setSelectedCity(null);
        isAutoRotating = true;
    }

    function focusCameraOnLatLng(lat, lng, distanceOverride) {
        const currentDistance = camera.position.length();
        const nextDistance = distanceOverride || currentDistance;

        isAutoRotating = false;

        const dir = latLngToVector3(lat, lng, 1).normalize();
        const worldDir = dir.clone().applyQuaternion(globeGroup.quaternion).normalize();

        focusTargetPosition = worldDir.multiplyScalar(nextDistance);
    }

    function sendCountryToReactNative(countryId) {
        const country = countryData.find((item) => item.id === countryId);
        if (!country) return;

        focusCameraOnLatLng(country.centerLat, country.centerLng, 3.6);

        if (window.ReactNativeWebView?.postMessage) {
            window.ReactNativeWebView.postMessage(
                JSON.stringify({
                    type: 'countrySelected',
                    countryId: country.id,
                    countryName: country.name,
                    lat: country.centerLat,
                    lng: country.centerLng,
                })
            );
        }
    }

    function sendCityToReactNative(cityId) {
        const city = cityData.find((item) => item.id === cityId);
        if (!city) return;

        focusCameraOnLatLng(city.lat, city.lng, 2.4);

        if (window.ReactNativeWebView?.postMessage) {
            window.ReactNativeWebView.postMessage(
                JSON.stringify({
                    type: 'citySelected',
                    cityId: city.id,
                    cityName: city.name,
                    countryName: city.country,
                    lat: city.lat,
                    lng: city.lng,
                })
            );
        }
    }

    function setCameraDistance(nextDistance) {
        const clamped = Math.min(Math.max(nextDistance, controls.minDistance), controls.maxDistance);
        camera.position.setLength(clamped);
    }

    function getCountryIntersects(clientX, clientY) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        return raycaster.intersectObjects(clickableCountryMeshes, false);
    }

    function getCityIntersects(clientX, clientY) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        return raycaster.intersectObjects(clickableMeshes, false);
    }

    let pointerDown = null;
    let pinchState = null;
    let wasPinching = false;
    let gestureStartCameraDistance = null;

    function getPinchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function onPointerUp(event) {
        if (pinchState) return;

        const point = event.changedTouches ? event.changedTouches[0] : event;
        if (!pointerDown) return;

        const dx = point.clientX - pointerDown.x;
        const dy = point.clientY - pointerDown.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const elapsed = Date.now() - pointerDown.time;

        pointerDown = null;

        if (distance > 10 || elapsed > 500) return;

        const cityIntersects = getCityIntersects(point.clientX, point.clientY);

        if (cityIntersects.length > 0) {
            const cityId = cityIntersects[0].object.userData.cityId;
            selectCityById(cityId);
            return;
        }

        const countryIntersects = getCountryIntersects(point.clientX, point.clientY);

        if (countryIntersects.length > 0) {
            const countryId = countryIntersects[0].object.userData.countryId;

            if (selectedCountryId === countryId) {
                focusTargetPosition = null;
                setSelectedCountry(null);
                isAutoRotating = true;
                return;
            }

            setSelectedCity(null);
            setSelectedCountry(countryId);
            sendCountryToReactNative(countryId);
        }
    }

    renderer.domElement.addEventListener('mousedown', function (e) {
        pointerDown = {
            x: e.clientX,
            y: e.clientY,
            time: Date.now(),
        };
    });

    renderer.domElement.addEventListener('mouseup', onPointerUp);

renderer.domElement.addEventListener('mouseleave', function () {
    pointerDown = null;
});

    renderer.domElement.addEventListener(
        'touchstart',
        function (e) {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                pointerDown = {
                    x: touch.clientX,
                    y: touch.clientY,
                    time: Date.now(),
                };
            }

            if (e.touches.length === 2) {
                wasPinching = true;
                controls.enabled = false;
                pinchState = {
                    startDistance: getPinchDistance(e.touches),
                    startCameraDistance: camera.position.length(),
                };
            }
        },
        {passive: false}
    );

    renderer.domElement.addEventListener(
        'touchmove',
        function (e) {
            if (e.touches.length === 2 && pinchState) {
                const currentDistance = getPinchDistance(e.touches);
                const ratio = pinchState.startDistance / currentDistance;
                const nextDistance = pinchState.startCameraDistance * ratio;
                setCameraDistance(nextDistance);
            }
        },
        {passive: false}
    );

    renderer.domElement.addEventListener(
        'touchend',
        function (e) {
            if (e.touches.length < 2) {
                pinchState = null;
                gestureStartCameraDistance = null;
                controls.enabled = true;
                controls.update();

                setTimeout(() => {
                    wasPinching = false;
                }, 0);
            }

            if (!wasPinching && e.changedTouches && e.changedTouches.length === 1) {
                onPointerUp(e);
            }
        },
        {passive: false}
    );

    renderer.domElement.addEventListener(
        'gesturestart',
        function (e) {
            e.preventDefault();
            controls.enabled = false;
            wasPinching = true;
            gestureStartCameraDistance = camera.position.length();
        },
        {passive: false}
    );

    renderer.domElement.addEventListener(
        'gesturechange',
        function (e) {
            e.preventDefault();
            if (!gestureStartCameraDistance) return;
            const nextDistance = gestureStartCameraDistance / e.scale;
            setCameraDistance(nextDistance);
        },
        {passive: false}
    );

    renderer.domElement.addEventListener(
        'gestureend',
        function (e) {
            e.preventDefault();
            gestureStartCameraDistance = null;
            pinchState = null;
            controls.enabled = true;
            controls.update();

            setTimeout(() => {
                wasPinching = false;
            }, 0);
        },
        {passive: false}
    );

    renderer.domElement.addEventListener(
        'touchcancel',
        function () {
            pinchState = null;
            wasPinching = false;
            gestureStartCameraDistance = null;
            controls.enabled = true;
            controls.update();
            pointerDown = null;
        },
        {passive: false}
    );

    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    window.addEventListener('resize', onResize);

    function animate() {
        requestAnimationFrame(animate);

        if (isAutoRotating && !pointerDown && !pinchState && !focusTargetPosition) {
            globeGroup.rotation.y += 0.0018;
        }

        if (focusTargetPosition) {
            camera.position.lerp(focusTargetPosition, focusLerp);

            if (camera.position.distanceTo(focusTargetPosition) < 0.01) {
                camera.position.copy(focusTargetPosition);
                focusTargetPosition = null;
            }
        }

        if (!pinchState) {
            controls.update();
        }

        const distance = camera.position.length();
        // 거리에 따라 시티의 visible을 결정합니다.
        // const showCities = distance <= 3.4;

        countryLayerGroup.visible = true;
        // 항상 시티가 보이게 합니다.
        cityLayerGroup.visible = true;

        updateCityLabels();
        renderer.render(scene, camera);
    }

    window.__globeControls = {
        resumeAutoRotation: resumeAutoRotation,
    };

    animate();
})();
  </script>
</body>
</html>
`;

export default function GlobeWebView({
  onRegionMessage,
}: {
  onRegionMessage: (region: SelectedRegion) => void;
}) {
  const webViewRef = useRef<WebView>(null);

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        style={{ flex: 1 }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data?.type !== 'citySelected' && data?.type !== 'countrySelected') {
              return;
            }

            const region: SelectedRegion = data;
            onRegionMessage(region);
          } catch (error) {
            console.error('Failed to parse globe message', error);
          }
        }}
      />

      <Pressable
        onPress={() => {
          webViewRef.current?.injectJavaScript(`
            if (window.__globeControls && window.__globeControls.resumeAutoRotation) {
              window.__globeControls.resumeAutoRotation();
            }
            true;
          `);
        }}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(5, 7, 11, 0.72)',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 18 }}>↻</Text>
      </Pressable>
    </View>
  );
}
