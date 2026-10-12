
"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = /* glsl */ `
  uniform float uTime;

  varying vec2 vUv;
  varying float vFoam;

  void main() {
    vUv = uv;

    vec3 p = position;

    float swell =
      sin(p.x * 0.62 - uTime * 0.85) * 1.05 +
      sin(p.x * 1.12 - uTime * 1.15) * 0.30;

    p.y += swell * smoothstep(0.0, 0.8, uv.y);

    p.z +=
      sin(p.x * 0.85 + uTime * 0.75 + p.y * 0.35) * 0.85 +
      sin(p.x * 1.65 - uTime * 1.20 + p.y * 0.55) * 0.22;

    vFoam = smoothstep(
      0.025,
      0.10,
      sin(p.x * 1.25 - uTime * 1.1 + p.y * 0.25)
    );

    gl_Position =
      projectionMatrix *
      modelViewMatrix *
      vec4(p, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;

  varying vec2 vUv;
  varying float vFoam;

  void main() {
    float crest =
      0.67 +
      sin(vUv.x * 7.2 - uTime * 0.65) * 0.13 +
      sin(vUv.x * 12.0 - uTime * 0.95) * 0.035;

    if (vUv.y > crest) {
      discard;
    }

    vec3 deepBlue = vec3(0.008, 0.075, 0.16);
    vec3 oceanBlue = vec3(0.015, 0.30, 0.43);
    vec3 marisCyan = vec3(0.12, 0.82, 0.88);
    vec3 foamWhite = vec3(0.82, 0.98, 1.0);

    float depth = smoothstep(0.0, 0.85, vUv.y);

    vec3 color = mix(deepBlue, oceanBlue, depth);
    color = mix(color, marisCyan, smoothstep(0.35, 0.95, vUv.y) * 0.65);

    float crestLine = 1.0 - smoothstep(
      0.0,
      0.035,
      abs(vUv.y - crest)
    );

    float foam = max(crestLine, vFoam * crestLine);

    color = mix(color, foamWhite, foam * 0.95);

    float shimmer =
      sin(vUv.x * 75.0 + uTime * 2.0) *
      sin(vUv.y * 38.0 - uTime) * 0.025;

    color += shimmer;

    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function OceanWave() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += Math.min(delta, 0.04);
    }
  });

  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[17, 9, 240, 160]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{ uTime: { value: 0 } }}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function OceanFloor() {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (!materialRef.current) return;

    materialRef.current.emissiveIntensity =
      0.12 + Math.sin(state.clock.elapsedTime * 0.8) * 0.035;
  });

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -3.2, -1.5]}
    >
      <planeGeometry args={[200, 200, 100, 100]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#06334a"
        emissive="#087e9b"
        emissiveIntensity={0.12}
        roughness={0.24}
        metalness={0.35}
      />
    </mesh>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#020817"]} />
      <fog attach="fog" args={["#031b30", 12, 35]} />

      <ambientLight intensity={1.5} />
      <directionalLight
        position={[-4, 6, 7]}
        intensity={2.5}
        color="#a5f3fc"
      />
      <pointLight
        position={[4, 1, 4]}
        intensity={30}
        color="#06b6d4"
        distance={20}
      />

      <OceanFloor />
      <OceanWave />
    </>
  );
}

export default function MarisOcean3D() {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <Canvas
        camera={{
          position: [0, 0.3, 12],
          fov: 45,
          near: 0.1,
          far: 100,
        }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        fallback={
          <div className="absolute inset-0 bg-[#031b30]" />
        }
      >
        <Scene />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#020817]/20 via-transparent to-[#020817]/75" />
    </div>
  );
}
