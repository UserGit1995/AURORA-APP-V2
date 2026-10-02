import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RotateCw, ZoomIn, ZoomOut, RefreshCw, Camera, Eye, Star } from "lucide-react";

export interface Product3DConfig {
  category: "kraft_bags" | "pizza_boxes" | "pinsa_boxes" | "shoppers" | "napkins" | "cups";
  sizeKey: string;
  colorHex: string;
  materialFinish: "kraft_natural" | "white_cardboard" | "black_matt" | "airlaid_linen" | "glossy";
  logoUrl: string | null;
  logoScale: number; // 10 to 100
  logoX: number; // -50 to 50
  logoY: number; // -50 to 50
  logoRotation: number; // 0 to 360 deg
  customText?: string;
  textColorHex?: string;
}

interface Packaging3DViewerProps {
  config: Product3DConfig;
  className?: string;
  onTakeSnapshot?: (dataUrl: string) => void;
}

export function Packaging3DViewer({ config, className = "", onTakeSnapshot }: Packaging3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [isRendering, setIsRendering] = useState<boolean>(true);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth || 600;
    const height = containerRef.current.clientHeight || 450;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#141824"); // Aurora dark card background
    sceneRef.current = scene;

    // Subtle grid ground plane
    const gridHelper = new THREE.GridHelper(10, 20, 0x47bcee, 0x1e2638);
    gridHelper.position.y = -1.5;
    scene.add(gridHelper);

    // Shadow catcher plane
    const shadowPlaneGeo = new THREE.PlaneGeometry(12, 12);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.49;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 1.2, 3.8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight1.position.set(5, 8, 5);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xe0f2fe, 0.4);
    dirLight2.position.set(-5, 4, -5);
    scene.add(dirLight2);

    const fillLight = new THREE.DirectionalLight(0xfff7ed, 0.3);
    fillLight.position.set(0, -3, 4);
    scene.add(fillLight);

    // 4. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 5. Container group for product
    const meshGroup = new THREE.Group();
    scene.add(meshGroup);
    meshGroupRef.current = meshGroup;

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (meshGroupRef.current && autoRotate && !isDraggingRef.current) {
        meshGroupRef.current.rotation.y += 0.005;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const newW = containerRef.current.clientWidth;
      const newH = containerRef.current.clientHeight;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, []);

  // Update 3D Geometry and Materials when config changes
  useEffect(() => {
    if (!meshGroupRef.current) return;

    // Clear previous mesh
    while (meshGroupRef.current.children.length > 0) {
      const child = meshGroupRef.current.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
      meshGroupRef.current.remove(child);
    }

    setIsRendering(true);

    // Generate dynamic texture canvas for logo & text
    createDynamicTexture(config).then((texture) => {
      if (!meshGroupRef.current) return;

      buildProductGeometry(config, texture, meshGroupRef.current);
      setIsRendering(false);
    });
  }, [config]);

  // Handle Mouse / Touch Orbit Navigation
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !meshGroupRef.current) return;
    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    meshGroupRef.current.rotation.y += deltaX * 0.008;
    meshGroupRef.current.rotation.x += deltaY * 0.008;

    // Clamp vertical rotation
    meshGroupRef.current.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, meshGroupRef.current.rotation.x));

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Stessa identica logica di sopra, ma per il dito su schermo touch
  // (prima mancava del tutto: il mouse funzionava, il tocco no).
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || !meshGroupRef.current || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    const deltaX = touch.clientX - previousMousePositionRef.current.x;
    const deltaY = touch.clientY - previousMousePositionRef.current.y;

    meshGroupRef.current.rotation.y += deltaX * 0.008;
    meshGroupRef.current.rotation.x += deltaY * 0.008;

    meshGroupRef.current.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, meshGroupRef.current.rotation.x));

    previousMousePositionRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  const handleZoom = (delta: number) => {
    if (!cameraRef.current) return;
    cameraRef.current.position.z = Math.max(1.8, Math.min(7.0, cameraRef.current.position.z + delta));
  };

  const handleResetCamera = () => {
    if (!cameraRef.current || !meshGroupRef.current) return;
    cameraRef.current.position.set(0, 1.2, 3.8);
    cameraRef.current.lookAt(0, 0, 0);
    meshGroupRef.current.rotation.set(0, 0, 0);
  };

  const handleCaptureSnapshot = () => {
    if (!rendererRef.current) return;
    const dataUrl = rendererRef.current.domElement.toDataURL("image/png");
    if (onTakeSnapshot) {
      onTakeSnapshot(dataUrl);
    } else {
      const link = document.createElement("a");
      link.download = `aurora-packaging-3d-${config.category}-${config.sizeKey}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[450px] md:h-[520px] bg-[#081326] rounded-xl overflow-hidden border border-[#1c2433] shadow-md group select-none ${className}`}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
      />

      {/* Loading Overlay */}
      {isRendering && (
        <div className="absolute inset-0 bg-[#040813]/80 backdrop-blur-xs flex items-center justify-center gap-2 text-white text-sm font-medium">
          <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
          <span>Generazione Modello 3D...</span>
        </div>
      )}

      {/* Floating Controls Overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button
          type="button"
          onClick={() => handleZoom(-0.5)}
          className="p-2.5 bg-[#081326]/90 hover:bg-card text-white rounded-xl shadow-md border border-[#1c2433] transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Zoom Avanti"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleZoom(0.5)}
          className="p-2.5 bg-[#081326]/90 hover:bg-card text-white rounded-xl shadow-md border border-[#1c2433] transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Zoom Indietro"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleResetCamera}
          className="p-2.5 bg-[#081326]/90 hover:bg-card text-white rounded-xl shadow-md border border-[#1c2433] transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Ripristina Vista"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setAutoRotate((prev) => !prev)}
          className={`p-2.5 rounded-xl shadow-md border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
            autoRotate
              ? "bg-sky-600 text-white border-sky-500"
              : "bg-[#081326]/90 hover:bg-card text-white border-[#1c2433]"
          }`}
          title="Rotazione Automatica"
        >
          <RotateCw className={`w-4 h-4 ${autoRotate ? "animate-spin-slow" : ""}`} />
        </button>
      </div>

      {/* Bottom Bar Controls & Info */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto bg-[#081326]/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#1c2433] shadow-sm flex items-center gap-2 text-xs font-semibold text-white">
          <Star className="w-4 h-4 text-sky-400 animate-pulse" />
          <span>Anteprima 3D Reale Vetrina</span>
        </div>

        <button
          type="button"
          onClick={handleCaptureSnapshot}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-sky-600 text-white font-semibold text-xs rounded-xl shadow-md hover:bg-sky-700 transition-all active:scale-95 cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          <span>Scatta Foto HD 3D</span>
        </button>
      </div>

      {/* Rotation hint indicator */}
      <div className="absolute top-4 left-4 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-[#081326]/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-[#1c2433]">
          <Eye className="w-3.5 h-3.5" />
          <span>Trascina per ruotare in 3D</span>
        </div>
      </div>
    </div>
  );
}

// Helper: Generates a Canvas texture with color background, paper bump patterns, uploaded logo & custom text
async function createDynamicTexture(config: Product3DConfig): Promise<THREE.CanvasTexture> {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;

  // 1. Fill base background color
  ctx.fillStyle = config.colorHex || "#d1b38e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Add paper / kraft texture noise or finish effect
  if (config.materialFinish === "kraft_natural") {
    // Add fine paper grain fibers
    ctx.fillStyle = "rgba(0,0,0,0.03)";
    for (let i = 0; i < 4000; i++) {
      const rx = Math.random() * canvas.width;
      const ry = Math.random() * canvas.height;
      const rw = Math.random() * 3 + 1;
      ctx.fillRect(rx, ry, rw, 1);
    }
  } else if (config.materialFinish === "airlaid_linen") {
    // Linen waffle pattern
    ctx.strokeStyle = "rgba(0,0,0,0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }

  // 3. Draw Logo Image if provided
  if (config.logoUrl) {
    try {
      const img = await loadImage(config.logoUrl);
      ctx.save();

      // Transform center
      const centerX = canvas.width / 2 + (config.logoX / 50) * (canvas.width / 3);
      const centerY = canvas.height / 2 + (config.logoY / 50) * (canvas.height / 3);

      ctx.translate(centerX, centerY);
      ctx.rotate((config.logoRotation * Math.PI) / 180);

      const maxDim = (canvas.width * (config.logoScale / 100)) * 0.6;
      let drawW = maxDim;
      let drawH = maxDim;

      if (img.width && img.height) {
        if (img.width > img.height) {
          drawH = maxDim * (img.height / img.width);
        } else {
          drawW = maxDim * (img.width / img.height);
        }
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    } catch (err) {
      console.warn("Could not load logo onto 3D canvas texture", err);
    }
  }

  // 4. Draw Custom Text if present
  if (config.customText && config.customText.trim()) {
    ctx.save();
    const textY = canvas.height / 2 + (config.logoY / 50) * (canvas.height / 3) + 120;
    const textX = canvas.width / 2 + (config.logoX / 50) * (canvas.width / 3);

    ctx.font = "bold 42px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = config.textColorHex || "#1e293b";
    ctx.fillText(config.customText, textX, textY);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

// Builds procedural 3D packaging geometries with realistic details
function buildProductGeometry(
  config: Product3DConfig,
  texture: THREE.CanvasTexture,
  group: THREE.Group
) {
  const mainMat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: config.materialFinish === "glossy" ? 0.2 : 0.8,
    metalness: config.materialFinish === "glossy" ? 0.1 : 0.0,
    side: THREE.DoubleSide,
  });

  const insideMat = new THREE.MeshStandardMaterial({
    color: config.colorHex === "#ffffff" ? 0xf8fafc : 0xd1b38e,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });

  switch (config.category) {
    case "pizza_boxes":
    case "pinsa_boxes": {
      // Dimensions
      const isPinsa = config.category === "pinsa_boxes";
      const w = isPinsa ? 2.2 : 2.0;
      const h = 0.35;
      const d = isPinsa ? 1.3 : 2.0;

      // Outer box body
      const boxGeo = new THREE.BoxGeometry(w, h, d);

      // Create material array (0: right, 1: left, 2: top with logo, 3: bottom, 4: front, 5: back)
      const boxMats = [
        mainMat,
        mainMat,
        mainMat, // Top lid gets texture
        insideMat,
        mainMat,
        mainMat,
      ];

      const boxMesh = new THREE.Mesh(boxGeo, boxMats);
      boxMesh.castShadow = true;
      boxMesh.receiveShadow = true;
      group.add(boxMesh);

      // Lid flap detail on front
      const flapGeo = new THREE.BoxGeometry(w * 0.96, 0.12, 0.05);
      const flapMesh = new THREE.Mesh(flapGeo, mainMat);
      flapMesh.position.set(0, -h / 2 + 0.06, d / 2 + 0.025);
      group.add(flapMesh);
      break;
    }

    case "kraft_bags":
    case "shoppers": {
      // Paper Bag dimensions
      const isShopper = config.category === "shoppers";
      const bw = isShopper ? 1.8 : 1.6; // width
      const bh = isShopper ? 2.2 : 2.0; // height
      const bd = isShopper ? 0.9 : 0.8; // depth

      // Main bag box body (open top)
      const bagGeo = new THREE.BoxGeometry(bw, bh, bd);
      const bagMats = [mainMat, mainMat, insideMat, insideMat, mainMat, mainMat];
      const bagMesh = new THREE.Mesh(bagGeo, bagMats);
      bagMesh.position.y = bh / 2 - 1.0;
      bagMesh.castShadow = true;
      bagMesh.receiveShadow = true;
      group.add(bagMesh);

      // Add twisted paper handles on top
      const handleRadius = 0.22;
      const handleTube = 0.025;
      const handleGeo = new THREE.TorusGeometry(handleRadius, handleTube, 8, 24, Math.PI);
      const handleMat = new THREE.MeshStandardMaterial({
        color: config.colorHex === "#ffffff" ? 0xdddddd : 0x8c6b43,
        roughness: 0.9,
      });

      // Front handle
      const handle1 = new THREE.Mesh(handleGeo, handleMat);
      handle1.position.set(0, bh - 1.0, bd / 2 + 0.01);
      handle1.rotation.z = Math.PI;
      group.add(handle1);

      // Back handle
      const handle2 = new THREE.Mesh(handleGeo, handleMat);
      handle2.position.set(0, bh - 1.0, -bd / 2 - 0.01);
      handle2.rotation.z = Math.PI;
      group.add(handle2);

      // Fold indent crease on side
      const creaseGeo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        -bw / 2, 0, 0,
        -bw / 2, bh, 0
      ]);
      creaseGeo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
      break;
    }

    case "cups": {
      // Tapered Cylinder geometry for coffee cups
      const topR = 0.7;
      const botR = 0.48;
      const height = 1.6;
      const segments = 32;

      const cupGeo = new THREE.CylinderGeometry(topR, botR, height, segments, 1, true);
      const cupMesh = new THREE.Mesh(cupGeo, mainMat);
      cupMesh.position.y = height / 2 - 0.8;
      cupMesh.castShadow = true;
      cupMesh.receiveShadow = true;
      group.add(cupMesh);

      // Rolled Rim at top
      const rimGeo = new THREE.TorusGeometry(topR, 0.035, 12, 32);
      const rimMat = new THREE.MeshStandardMaterial({
        color: config.colorHex === "#ffffff" ? 0xffffff : 0xe5e7eb,
        roughness: 0.4,
      });
      const rimMesh = new THREE.Mesh(rimGeo, rimMat);
      rimMesh.rotation.x = Math.PI / 2;
      rimMesh.position.y = height - 0.8;
      group.add(rimMesh);

      // Bottom cap
      const botGeo = new THREE.CircleGeometry(botR, 32);
      const botMesh = new THREE.Mesh(botGeo, insideMat);
      botMesh.rotation.x = Math.PI / 2;
      botMesh.position.y = -0.8;
      group.add(botMesh);
      break;
    }

    case "napkins": {
      // Flat tablecloth or stacked napkins
      const nw = 2.2;
      const nh = 0.08;
      const nd = 1.6;

      const napkinGeo = new THREE.BoxGeometry(nw, nh, nd);
      const napkinMesh = new THREE.Mesh(napkinGeo, mainMat);
      napkinMesh.castShadow = true;
      napkinMesh.receiveShadow = true;
      group.add(napkinMesh);

      // Embossed edge frame
      const borderGeo = new THREE.BoxGeometry(nw * 0.94, nh + 0.01, nd * 0.92);
      const borderMat = new THREE.MeshStandardMaterial({
        color: config.colorHex,
        roughness: 0.95,
      });
      const borderMesh = new THREE.Mesh(borderGeo, borderMat);
      group.add(borderMesh);
      break;
    }

    default: {
      const defaultGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
      const defaultMesh = new THREE.Mesh(defaultGeo, mainMat);
      group.add(defaultMesh);
    }
  }
}
