import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// Sample global cities with AQI data (Natural Environmental Markers)
export const SAMPLE_CITIES = [
  { name: 'Coimbatore', lat: 11.0168, lon: 76.9558, aqi: 42, status: 'Good', color: '#79A878', pollutant: 'PM2.5' },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707, aqi: 48, status: 'Good', color: '#79A878', pollutant: 'PM2.5' },
  { name: 'Delhi', lat: 28.6139, lon: 77.2090, aqi: 185, status: 'Unhealthy', color: '#C96B4F', pollutant: 'PM2.5' },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777, aqi: 110, status: 'Unhealthy for Sensitive', color: '#C96B4F', pollutant: 'PM10' },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503, aqi: 35, status: 'Good', color: '#79A878', pollutant: 'NO2' },
  { name: 'New York', lat: 40.7128, lon: -74.0060, aqi: 55, status: 'Moderate', color: '#D2B06A', pollutant: 'O3' },
  { name: 'London', lat: 51.5074, lon: -0.1278, aqi: 42, status: 'Good', color: '#79A878', pollutant: 'NO2' },
  { name: 'Paris', lat: 48.8566, lon: 2.3522, aqi: 62, status: 'Moderate', color: '#D2B06A', pollutant: 'NO2' },
  { name: 'Dubai', lat: 25.2048, lon: 55.2708, aqi: 125, status: 'Unhealthy for Sensitive', color: '#C96B4F', pollutant: 'PM10' },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093, aqi: 28, status: 'Good', color: '#79A878', pollutant: 'O3' },
  { name: 'Singapore', lat: 1.3521, lon: 103.8198, aqi: 50, status: 'Good', color: '#79A878', pollutant: 'PM2.5' },
  { name: 'Beijing', lat: 39.9042, lon: 116.4074, aqi: 160, status: 'Unhealthy', color: '#C96B4F', pollutant: 'PM2.5' },
  { name: 'Cairo', lat: 30.0444, lon: 31.2357, aqi: 140, status: 'Unhealthy for Sensitive', color: '#C96B4F', pollutant: 'PM10' },
  { name: 'São Paulo', lat: -23.5505, lon: -46.6333, aqi: 75, status: 'Moderate', color: '#D2B06A', pollutant: 'NO2' },
  { name: 'Los Angeles', lat: 34.0522, lon: -118.2437, aqi: 95, status: 'Moderate', color: '#D2B06A', pollutant: 'O3' },
];

// Helper: Procedural Canvas Texture Generator for Realistic Earth Surface
function createEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // 1. Deep Blue Ocean Base Gradient (#173B4A to #1E5362)
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
  oceanGrad.addColorStop(0, '#173B4A');
  oceanGrad.addColorStop(0.5, '#1E5362');
  oceanGrad.addColorStop(1, '#173B4A');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, w, h);

  // Helper for latitude/longitude to canvas pixel coordinates
  const toXY = (lon, lat) => {
    const x = ((lon + 180) / 360) * w;
    const y = ((90 - lat) / 180) * h;
    return [x, y];
  };

  const drawShape = (coords, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    coords.forEach(([lon, lat], i) => {
      const [x, y] = toXY(lon, lat);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  };

  // 2. Realistic Landmasses & Continents
  // North America (Green & Forests)
  drawShape([[-165,72],[-140,70],[-125,60],[-105,50],[-85,45],[-75,55],[-60,45],[-75,30],[-80,25],[-90,15],[-105,20],[-115,30],[-125,48],[-140,58],[-165,65]], '#4F7048');
  // Deserts SW US & Mexico
  drawShape([[-115,35],[-100,32],[-105,22],[-115,28]], '#A8895A');
  // Mountains Rockies
  drawShape([[-120,55],[-110,45],[-105,38],[-112,40]], '#746B55');

  // South America (Amazon Forests & Andes)
  drawShape([[-80,10],[-60,10],[-35,-5],[-38,-20],[-55,-35],[-70,-50],[-75,-40],[-70,-20],[-80,0]], '#35583D');
  // Andes / Patagonian Deserts
  drawShape([[-75,-20],[-65,-30],[-70,-45],[-75,-40]], '#B89B69');

  // Eurasia (Europe + Asia Forests & Vegetation)
  drawShape([[-10,35],[0,50],[20,60],[40,68],[80,72],[120,70],[170,65],[180,60],[140,50],[120,35],[100,10],[80,8],[70,25],[60,40],[40,42],[25,35],[10,38]], '#4F7048');
  // Siberian Dense Taiga
  drawShape([[60,65],[100,68],[140,62],[130,52],[80,55]], '#35583D');
  // Gobi / Central Asian Deserts
  drawShape([[50,40],[85,45],[110,40],[95,32],[65,35]], '#A8895A');

  // India
  drawShape([[68,24],[78,32],[90,26],[88,20],[80,8],[73,15]], '#6F8B52');
  // Thar Desert
  drawShape([[70,28],[76,30],[74,24]], '#B89B69');

  // Africa (Savannahs & Jungles)
  drawShape([[-17,35],[10,37],[32,32],[42,12],[51,12],[40,-10],[35,-30],[20,-35],[12,-15],[0,5],[-15,12]], '#6F8B52');
  // Sahara & Arabian Deserts
  drawShape([[-15,33],[30,32],[50,30],[55,18],[35,15],[-12,18]], '#A8895A');

  // Australia
  drawShape([[113,-15],[135,-12],[153,-25],[150,-38],[138,-35],[115,-34]], '#B89B69');
  // Outback Desert Core
  drawShape([[120,-20],[140,-22],[135,-30],[122,-28]], '#A8895A');

  // Greenland Ice Cap
  drawShape([[-55,60],[-35,65],[-20,75],[-40,82],[-60,75]], '#E8E5D8');

  // 3. Polar Ice Caps (Snow/Ice: #E8E5D8)
  ctx.fillStyle = '#E8E5D8';
  // North Pole Ice Cap
  ctx.fillRect(0, 0, w, h * 0.07);
  // South Pole Ice Cap
  ctx.fillRect(0, h * 0.88, w, h * 0.12);

  // 4. Subtle Earth Surface Cloud Wisps
  ctx.fillStyle = 'rgba(232, 229, 216, 0.12)';
  for (let i = 0; i < 35; i++) {
    const cx = Math.random() * w;
    const cy = h * 0.18 + Math.random() * h * 0.64;
    const rx = 30 + Math.random() * 80;
    const ry = 6 + Math.random() * 18;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, Math.random() * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

// Helper: Procedural Cloud Layer Texture
function createCloudTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(245, 245, 245, 0.22)';
  
  for (let i = 0; i < 45; i++) {
    const cx = Math.random() * w;
    const cy = h * 0.15 + Math.random() * h * 0.7;
    const rx = 40 + Math.random() * 110;
    const ry = 8 + Math.random() * 24;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, (Math.random() - 0.5) * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

export default function Globe3D({ onSelectLocation, selectedLat, selectedLon }) {
  const mountRef = useRef(null);
  const [hoveredCity, setHoveredCity] = useState(null);
  const [timeMode, setTimeMode] = useState('now'); // 'past', 'now', 'forecast'

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 280;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Globe Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Realistic Earth Surface Material
    const globeRadius = 90;
    const earthTexture = createEarthTexture();
    const globeGeo = new THREE.SphereGeometry(globeRadius, 64, 64);
    const globeMat = new THREE.MeshPhongMaterial({
      map: earthTexture,
      specular: 0x1E5362,
      shininess: 12,
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    globeGroup.add(globeMesh);

    // Translucent Cloud Atmosphere Layer
    const cloudTexture = createCloudTexture();
    const cloudGeo = new THREE.SphereGeometry(globeRadius + 1.2, 64, 64);
    const cloudMat = new THREE.MeshPhongMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.3,
      blending: THREE.NormalBlending,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    globeGroup.add(cloudMesh);

    // Extremely Subtle Reference Grid Lines (rgba(210,176,106,0.10))
    const gridGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(globeRadius + 0.3, 24, 24));
    const gridMat = new THREE.LineBasicMaterial({ color: 0xD2B06A, transparent: true, opacity: 0.08 });
    const gridLine = new THREE.LineSegments(gridGeo, gridMat);
    globeGroup.add(gridLine);

    // Thin Outer Terracotta Atmosphere Glow Shell
    const atmoGeo = new THREE.SphereGeometry(globeRadius + 5, 64, 64);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0xA66A4C,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    globeGroup.add(atmoMesh);

    // Gentle Orbital Dust Particles
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = globeRadius + 10 + Math.random() * 20;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xD2B06A,
      size: 1.2,
      transparent: true,
      opacity: 0.3,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    globeGroup.add(particleSystem);

    // Helper: Convert Lat/Lon to 3D Cartesian coordinates
    const latLonToVector3 = (lat, lon, radius) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const x = -(radius * Math.sin(phi) * Math.cos(theta));
      const z = radius * Math.sin(phi) * Math.sin(theta);
      const y = radius * Math.cos(phi);
      return new THREE.Vector3(x, y, z);
    };

    // 3. City AQI Hotspot Pillars & Glow Pins
    const cityObjects = [];
    SAMPLE_CITIES.forEach((city) => {
      const pos = latLonToVector3(city.lat, city.lon, globeRadius);

      // Height scaled by AQI
      const pillarHeight = Math.max(8, (city.aqi / 200) * 30);
      const pillarGeo = new THREE.CylinderGeometry(1.2, 0.4, pillarHeight, 16);
      pillarGeo.translate(0, pillarHeight / 2, 0);

      const colorHex = parseInt(city.color.replace('#', '0x'));
      const pillarMat = new THREE.MeshPhongMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.85,
      });

      const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
      pillarMesh.position.copy(pos);
      pillarMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());

      // Pin top sphere
      const sphereGeo = new THREE.SphereGeometry(2.5, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
      sphereMesh.position.set(0, pillarHeight, 0);
      pillarMesh.add(sphereMesh);

      pillarMesh.userData = { city };
      globeGroup.add(pillarMesh);
      cityObjects.push(pillarMesh);
    });

    // 4. Realistic Planetary Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xF1EDE5, 1.4);
    dirLight1.position.set(200, 150, 200);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xA66A4C, 0.4);
    dirLight2.position.set(-200, -150, -200);
    scene.add(dirLight2);

    // 5. Mouse Drag & Raycasting Interaction
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const deltaMove = {
          x: e.clientX - previousMousePosition.x,
          y: e.clientY - previousMousePosition.y,
        };

        globeGroup.rotation.y += deltaMove.x * 0.005;
        globeGroup.rotation.x += deltaMove.y * 0.005;

        previousMousePosition = { x: e.clientX, y: e.clientY };
      } else {
        // Raycast hover check
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(cityObjects, true);
        if (intersects.length > 0) {
          let rootObj = intersects[0].object;
          while (rootObj.parent && !rootObj.userData?.city) {
            rootObj = rootObj.parent;
          }
          if (rootObj.userData?.city) {
            setHoveredCity(rootObj.userData.city);
            container.style.cursor = 'pointer';
          }
        } else {
          setHoveredCity(null);
          container.style.cursor = 'grab';
        }
      }
    };

    const onPointerUp = (e) => {
      isDragging = false;

      // Click detection
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(cityObjects, true);
      if (intersects.length > 0) {
        let rootObj = intersects[0].object;
        while (rootObj.parent && !rootObj.userData?.city) {
          rootObj = rootObj.parent;
        }
        if (rootObj.userData?.city && onSelectLocation) {
          const c = rootObj.userData.city;
          onSelectLocation(c.lat, c.lon, c.name, 'globe');
        }
      }
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // 6. Animation Loop
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isDragging) {
        globeGroup.rotation.y += 0.0012;
      }
      cloudMesh.rotation.y += 0.0016;
      particleSystem.rotation.y -= 0.0008;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [onSelectLocation]);

  return (
    <div className="glass-panel" style={{ position: 'relative', padding: '1.5rem', marginBottom: '2.5rem', overflow: 'hidden' }}>
      {/* Globe Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', zIndex: 10, position: 'relative' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              3D Orbital Atmosphere
            </span>
            <span className={timeMode === 'forecast' ? 'badge badge-ai' : 'badge badge-live'}>
              {timeMode === 'forecast' ? '⚡ AI Forecast +48h' : '● Live Earth Observations'}
            </span>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.25rem' }}>
            Interactive 3D Global AQI Sphere
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Drag to rotate 360°. Click any glowing city pillar to fly models and target forecasts to that location.
          </p>
        </div>

        {/* Time Slider Toggles */}
        <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-elevated)', padding: '0.35rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
          <button
            onClick={() => setTimeMode('past')}
            className="btn"
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.8rem',
              borderRadius: '6px',
              background: timeMode === 'past' ? 'rgba(210, 176, 106, 0.15)' : 'transparent',
              color: timeMode === 'past' ? 'var(--text-primary)' : 'var(--text-muted)'
            }}
          >
            Past 7 Days
          </button>
          <button
            onClick={() => setTimeMode('now')}
            className="btn"
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.8rem',
              borderRadius: '6px',
              background: timeMode === 'now' ? 'linear-gradient(135deg, #A66A4C 0%, #8C5438 100%)' : 'transparent',
              color: timeMode === 'now' ? '#F1EDE5' : 'var(--text-muted)',
              fontWeight: '700'
            }}
          >
            ● Now
          </button>
          <button
            onClick={() => setTimeMode('forecast')}
            className="btn"
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.8rem',
              borderRadius: '6px',
              background: timeMode === 'forecast' ? 'linear-gradient(135deg, #78866B 0%, #5F6C53 100%)' : 'transparent',
              color: timeMode === 'forecast' ? '#F1EDE5' : 'var(--text-muted)',
              fontWeight: '700'
            }}
          >
            ⚡ AI Forecast +48h
          </button>
        </div>
      </div>

      {/* 3D Canvas Mount Container */}
      <div style={{ position: 'relative', height: '420px', width: '100%', marginTop: '1rem', cursor: 'grab' }}>
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

        {/* Hover Tooltip Overlay */}
        {hoveredCity && (
          <div
            className="glass-panel font-mono"
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              padding: '0.75rem 1.25rem',
              borderRadius: '12px',
              pointerEvents: 'none',
              borderLeft: `4px solid ${hoveredCity.color}`,
              zIndex: 20
            }}
          >
            <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              📍 {hoveredCity.name}
            </div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.2rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span>AQI Index: <strong style={{ color: hoveredCity.color }}>{hoveredCity.aqi}</strong></span>
              <span className="badge" style={{ backgroundColor: `${hoveredCity.color}22`, color: hoveredCity.color, border: `1px solid ${hoveredCity.color}55` }}>
                {hoveredCity.status}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Primary Pollutant: <strong>{hoveredCity.pollutant}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Quick Select City Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
          Quick Jump:
        </span>
        {SAMPLE_CITIES.slice(0, 8).map((c, i) => (
          <button
            key={i}
            onClick={() => onSelectLocation(c.lat, c.lon, c.name, 'globe_chip')}
            className="btn btn-secondary"
            style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.color }} />
            <span>{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
