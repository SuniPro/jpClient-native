import { WebView } from 'react-native-webview';

const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
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
      }
    </style>
  </head>
  <body>
    <div id="app"></div>

    <script src="https://unpkg.com/three@0.124.0/build/three.min.js"></script>
    <script src="https://unpkg.com/three@0.124.0/examples/js/controls/OrbitControls.js"></script>

    <script>
      (function () {
        const container = document.getElementById('app');

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#05070b');

        const camera = new THREE.PerspectiveCamera(
          45,
          window.innerWidth / window.innerHeight,
          0.1,
          1000
        );
        camera.position.set(0, 0, 4.5);

        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.minDistance = 2.2;
        controls.maxDistance = 8;
        controls.rotateSpeed = 0.8;
        controls.zoomSpeed = 0.9;

        const globeGroup = new THREE.Group();
        scene.add(globeGroup);

        const globeGeometry = new THREE.SphereGeometry(1, 64, 64);
        const globeMaterial = new THREE.MeshStandardMaterial({
          color: '#e9d6be',
          roughness: 1,
          metalness: 0,
        });
        const globe = new THREE.Mesh(globeGeometry, globeMaterial);
        globeGroup.add(globe);

        const meridianPoints = [];
        for (let i = 0; i <= 128; i++) {
          const v = (i / 128) * Math.PI;
          const x = 0;
          const y = Math.cos(v) * 1.002;
          const z = Math.sin(v) * 1.002;
          meridianPoints.push(new THREE.Vector3(x, y, z));
        }

        const meridianGeometry = new THREE.BufferGeometry().setFromPoints(meridianPoints);
        const meridianMaterial = new THREE.LineBasicMaterial({
          color: '#cdbca7',
          transparent: true,
          opacity: 0.9,
        });
        const meridian = new THREE.Line(meridianGeometry, meridianMaterial);
        globeGroup.add(meridian);

        const starsGeometry = new THREE.BufferGeometry();
        const starCount = 1200;
        const positions = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
          const radius = 30 + Math.random() * 40;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);

          const x = radius * Math.sin(phi) * Math.cos(theta);
          const y = radius * Math.cos(phi);
          const z = radius * Math.sin(phi) * Math.sin(theta);

          positions[i * 3] = x;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = z;
        }

        starsGeometry.setAttribute(
          'position',
          new THREE.BufferAttribute(positions, 3)
        );

        const starsMaterial = new THREE.PointsMaterial({
          color: '#ffffff',
          size: 0.08,
          sizeAttenuation: true,
        });

        const stars = new THREE.Points(starsGeometry, starsMaterial);
        scene.add(stars);

        const ambientLight = new THREE.AmbientLight('#ffffff', 1.1);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight('#fff7ef', 1.2);
        directionalLight.position.set(4, 2, 3);
        scene.add(directionalLight);

        const rimLight = new THREE.DirectionalLight('#9aa7c2', 0.35);
        rimLight.position.set(-4, -1, -3);
        scene.add(rimLight);

        function onResize() {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        }

        window.addEventListener('resize', onResize);

        function animate() {
          requestAnimationFrame(animate);

          globeGroup.rotation.y += 0.0018;
          controls.update();
          renderer.render(scene, camera);
        }

        animate();
      })();
    </script>
  </body>
</html>
`;

export default function GlobeWebView() {
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      javaScriptEnabled
      domStorageEnabled
      style={{ flex: 1 }}
    />
  );
}
