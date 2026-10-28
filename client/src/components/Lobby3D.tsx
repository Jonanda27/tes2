import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Users,
  Play,
  Volume2,
  VolumeX,
  Music,
  User,
  Compass,
  ArrowRight,
  Maximize2,
  Minimize2,
  Flame,
  Award,
  Sparkles,
  ChevronRight,
  Tv
} from 'lucide-react';
import { soundEffects } from '../utils/soundEffects.js';
import { RoomInfo } from '../types.js';

export interface TableConfig {
  id: string;
  name: string;
  subtitle: string;
  category: 'CASUAL' | 'REGULER' | 'VIP' | 'ROYALE';
  tagColor: string;
  feltColor: number;
  feltHex: string;
  rimColor: number;
  position: [number, number, number];
  smallBlind: number;
  bigBlind: number;
  startingChips: number;
  minBuyinText: string;
  description: string;
}

export const CASINO_TABLES: TableConfig[] = [
  {
    id: 'meja-1',
    name: 'Meja Santai #1',
    subtitle: 'Casual Lounge',
    category: 'CASUAL',
    tagColor: '#10b981',
    feltColor: 0x0d5c38,
    feltHex: '#0d5c38',
    rimColor: 0x241208,
    position: [-7.5, 0, -4.5],
    smallBlind: 1000,
    bigBlind: 2000,
    startingChips: 100000,
    minBuyinText: 'Rp 100.000',
    description: 'Meja santai ramah pemula. Blind rendah, cocok untuk mengasah taktik dan bersantai bersama teman.'
  },
  {
    id: 'meja-2',
    name: 'Meja Reguler #2',
    subtitle: 'Intermediate Club',
    category: 'REGULER',
    tagColor: '#38bdf8',
    feltColor: 0x143c72,
    feltHex: '#143c72',
    rimColor: 0x1b1924,
    position: [7.5, 0, -4.5],
    smallBlind: 2500,
    bigBlind: 5000,
    startingChips: 250000,
    minBuyinText: 'Rp 250.000',
    description: 'Tingkat persaingan menengah dengan blind reguler. Atmosfer kompetitif khas klub poker malam.'
  },
  {
    id: 'meja-vip',
    name: 'Meja VIP High Roller',
    subtitle: 'Exclusive Velvet Room',
    category: 'VIP',
    tagColor: '#f43f5e',
    feltColor: 0x7c142c,
    feltHex: '#7c142c',
    rimColor: 0x3d0b14,
    position: [-7.5, 0, 5.5],
    smallBlind: 10000,
    bigBlind: 20000,
    startingChips: 1000000,
    minBuyinText: 'Rp 1.000.000',
    description: 'Ruang VIP mewah berlapis beludru merah ruby. Taruhan tinggi untuk pemain berpengalaman dan berani.'
  },
  {
    id: 'meja-turnamen',
    name: 'Meja Turnamen Royale',
    subtitle: 'Championship Onyx Suite',
    category: 'ROYALE',
    tagColor: '#f59e0b',
    feltColor: 0x1c1c24,
    feltHex: '#1c1c24',
    rimColor: 0x0f0f14,
    position: [7.5, 0, 5.5],
    smallBlind: 25000,
    bigBlind: 50000,
    startingChips: 2500000,
    minBuyinText: 'Rp 2.500.000',
    description: 'Meja emas hitam paling bergengsi. Pertarungan para juara dengan pot terbesar di seluruh lounge.'
  }
];

export const OUTFIT_COLORS = [
  { name: 'Midnight Onyx', hex: '#0f172a', colorVal: 0x0f172a, tag: 'Classic Tuxedo' },
  { name: 'Crimson Velvet', hex: '#881337', colorVal: 0x881337, tag: 'High Roller Red' },
  { name: 'Royal Sapphire', hex: '#1e3a8a', colorVal: 0x1e3a8a, tag: 'Casino Navy' },
  { name: 'Emerald Silk', hex: '#064e3b', colorVal: 0x064e3b, tag: 'Lucky Green' },
  { name: 'Ivory Gold', hex: '#f8fafc', colorVal: 0xf1f5f9, tag: 'VIP White' }
];

interface Lobby3DProps {
  socket?: any;
  playerName: string;
  onUpdatePlayerName: (name: string) => void;
  onSelectTable: (roomId: string) => void;
  isBgmPlaying: boolean;
  onToggleBgm: () => void;
  initialTableId?: string;
}

interface RemotePlayer {
  id: string;
  name: string;
  suitColorIdx: number;
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  nametagSprite: THREE.Sprite;
  walkCycle: number;
  targetPos: { x: number; z: number };
  targetRotY: number;
  isMoving: boolean;
}

export const Lobby3D: React.FC<Lobby3DProps> = ({
  socket,
  playerName,
  onUpdatePlayerName,
  onSelectTable,
  isBgmPlaying,
  onToggleBgm,
  initialTableId
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // UI state
  const [roomData, setRoomData] = useState<Record<string, RoomInfo>>({});
  const [nearbyTable, setNearbyTable] = useState<TableConfig | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableConfig | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);

  // Customization
  const [suitColorIdx, setSuitColorIdx] = useState(() => {
    const saved = localStorage.getItem('poker_avatar_outfit');
    return saved !== null ? parseInt(saved, 10) : 0;
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(playerName);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showRoomListModal, setShowRoomListModal] = useState(false);

  // References for Three.js state
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Character references
  const characterGroupRef = useRef<THREE.Group | null>(null);
  const bodyMeshRef = useRef<THREE.Mesh | null>(null);
  const leftArmRef = useRef<THREE.Group | null>(null);
  const rightArmRef = useRef<THREE.Group | null>(null);
  const leftLegRef = useRef<THREE.Group | null>(null);
  const rightLegRef = useRef<THREE.Group | null>(null);
  const nametagSpriteRef = useRef<THREE.Sprite | null>(null);
  const playerRingRef = useRef<THREE.Mesh | null>(null);

  // Multiplayer Lounge references & state
  const [onlineLobbyCount, setOnlineLobbyCount] = useState<number>(1);
  const [remotePlayersList, setRemotePlayersList] = useState<Array<{ id: string; name: string; suitColorIdx: number; position: [number, number, number] }>>([]);
  const [loungeToast, setLoungeToast] = useState<string | null>(null);
  const otherPlayersRef = useRef<Map<string, RemotePlayer>>(new Map());
  const pendingRemotePlayersRef = useRef<Map<string, { id: string; name: string; suitColorIdx: number; position: [number, number, number] }>>(new Map());
  const lastMoveEmitTimeRef = useRef<number>(0);
  const lastWasMovingRef = useRef<boolean>(false);

  const showLoungeToast = useCallback((msg: string) => {
    setLoungeToast(msg);
    setTimeout(() => {
      setLoungeToast(curr => (curr === msg ? null : curr));
    }, 3800);
  }, []);

  const handleTeleportToPlayer = useCallback((targetPlayer: { id: string; name: string; suitColorIdx: number; position: [number, number, number] }) => {
    const targetX = targetPlayer.position[0] + 1.2;
    const targetZ = targetPlayer.position[2] + 1.2;
    playerPosRef.current = { x: targetX, z: targetZ };
    if (characterGroupRef.current) {
      characterGroupRef.current.position.set(targetX, 0, targetZ);
    }
    const dx = targetPlayer.position[0] - targetX;
    const dz = targetPlayer.position[2] - targetZ;
    playerHeadingRef.current = Math.atan2(dx, dz);
    if (socket) {
      socket.emit('lobby:move', {
        position: [targetX, 0, targetZ],
        rotationY: playerHeadingRef.current,
        isMoving: false
      });
    }
    showLoungeToast(`Mendekati ${targetPlayer.name}! 🚀`);
  }, [socket, showLoungeToast]);

  // Click destination marker
  const clickMarkerRef = useRef<THREE.Mesh | null>(null);
  const destinationRef = useRef<{ x: number; z: number } | null>(null);

  // Movement physics state
  const playerPosRef = useRef<{ x: number; z: number }>({ x: 0, z: 1 });
  const playerHeadingRef = useRef<number>(0);
  const isWalkingRef = useRef<boolean>(false);
  const walkCycleRef = useRef<number>(0);
  const lastFootstepTimeRef = useRef<number>(0);
  const keysPressedRef = useRef<{ [code: string]: boolean }>({});

  // Table spot lights map for proximity highlight
  const tableSpotlightsRef = useRef<Map<string, THREE.SpotLight>>(new Map());
  const tableBillboardsRef = useRef<Map<string, THREE.Sprite>>(new Map());
  const nearbyTableRef = useRef<TableConfig | null>(null);
  const isTransitioningRef = useRef<boolean>(false);
  const handleEnterTableRef = useRef<(table: TableConfig) => void>(() => {});

  // Virtual Joystick touch state
  const joystickTouchRef = useRef<{ active: boolean; startX: number; startY: number; currX: number; currY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    currX: 0,
    currY: 0
  });

  // Fetch live table stats from server
  const fetchRoomStats = useCallback(async () => {
    try {
      const serverUrl = import.meta.env.VITE_SERVER_URL || '';
      const res = await fetch(`${serverUrl}/api/rooms`);
      if (res.ok) {
        const rooms: RoomInfo[] = await res.json();
        const map: Record<string, RoomInfo> = {};
        rooms.forEach(r => {
          map[r.roomId] = r;
        });
        setRoomData(map);
      }
    } catch {
      // server might still be booting or offline
    }
  }, []);

  useEffect(() => {
    fetchRoomStats();
    const interval = setInterval(fetchRoomStats, 3500);
    return () => clearInterval(interval);
  }, [fetchRoomStats]);

  // Update nametag sprite when player name changes
  const updateNametagCanvas = (name: string, isLocal: boolean = true) => {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 384, 128);

    // Pill background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = isLocal ? '#f59e0b' : '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(16, 24, 352, 80, 40);
    ctx.fill();
    ctx.stroke();

    // Badge
    ctx.fillStyle = isLocal ? '#f59e0b' : '#38bdf8';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(isLocal ? '👑 VIP' : '👤 TAMU', 36, 73);

    // Name text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Outfit", sans-serif';
    ctx.fillText(name.length > 13 ? name.substring(0, 12) + '…' : name, 140, 73);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  };

  // Helper to create character avatar (for local player and multiplayer friends)
  const createAvatar = useCallback((name: string, outfitIdx: number, isLocal: boolean) => {
    const charGroup = new THREE.Group();

    const shadowGeo = new THREE.CircleGeometry(0.65, 24);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 });
    const shadowBlob = new THREE.Mesh(shadowGeo, shadowMat);
    shadowBlob.rotation.x = -Math.PI / 2;
    shadowBlob.position.y = 0.02;
    charGroup.add(shadowBlob);

    const ringGeo = new THREE.RingGeometry(0.55, 0.68, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isLocal ? 0xf59e0b : 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    charGroup.add(ring);

    const suitColor = OUTFIT_COLORS[outfitIdx % OUTFIT_COLORS.length].colorVal;
    const bodyMat = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.55 });
    const bodyGeo = new THREE.BoxGeometry(0.65, 0.85, 0.42);
    const bMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bMesh.position.y = 1.35;
    bMesh.castShadow = true;
    charGroup.add(bMesh);

    const shirtMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.35, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    );
    shirtMesh.position.set(0, 0.25, 0.21);
    bMesh.add(shirtMesh);

    const tieMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.45, 0.06),
      new THREE.MeshStandardMaterial({ color: isLocal ? 0xd97706 : 0x0284c7, roughness: 0.3, metalness: 0.4 })
    );
    tieMesh.position.set(0, 0.1, 0.22);
    bMesh.add(tieMesh);

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf6c8a3, roughness: 0.7 });
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), skinMat);
    headMesh.position.set(0, 2.05, 0);
    headMesh.castShadow = true;
    charGroup.add(headMesh);

    const hairMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0x1f140e, roughness: 0.8 })
    );
    hairMesh.position.set(0, 2.12, 0);
    charGroup.add(hairMesh);

    const glassesMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.1, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.9 })
    );
    glassesMesh.position.set(0, 2.06, 0.24);
    charGroup.add(glassesMesh);

    const armGeo = new THREE.BoxGeometry(0.18, 0.7, 0.18);
    const handGeo = new THREE.SphereGeometry(0.1, 10, 10);

    const lArm = new THREE.Group();
    lArm.position.set(-0.44, 1.7, 0);
    const lArmMesh = new THREE.Mesh(armGeo, bodyMat);
    lArmMesh.position.y = -0.35;
    lArmMesh.castShadow = true;
    lArm.add(lArmMesh);
    const lHand = new THREE.Mesh(handGeo, skinMat);
    lHand.position.y = -0.72;
    lArm.add(lHand);
    charGroup.add(lArm);

    const rArm = new THREE.Group();
    rArm.position.set(0.44, 1.7, 0);
    const rArmMesh = new THREE.Mesh(armGeo, bodyMat);
    rArmMesh.position.y = -0.35;
    rArmMesh.castShadow = true;
    rArm.add(rArmMesh);
    const rHand = new THREE.Mesh(handGeo, skinMat);
    rHand.position.y = -0.72;
    rArm.add(rHand);
    charGroup.add(rArm);

    const legGeo = new THREE.BoxGeometry(0.22, 0.85, 0.22);
    const shoeGeo = new THREE.BoxGeometry(0.24, 0.16, 0.38);
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 0.2, metalness: 0.5 });

    const lLeg = new THREE.Group();
    lLeg.position.set(-0.18, 0.9, 0);
    const lLegMesh = new THREE.Mesh(legGeo, pantsMat);
    lLegMesh.position.y = -0.42;
    lLegMesh.castShadow = true;
    lLeg.add(lLegMesh);
    const lShoe = new THREE.Mesh(shoeGeo, shoeMat);
    lShoe.position.set(0, -0.86, 0.06);
    lShoe.castShadow = true;
    lLeg.add(lShoe);
    charGroup.add(lLeg);

    const rLeg = new THREE.Group();
    rLeg.position.set(0.18, 0.9, 0);
    const rLegMesh = new THREE.Mesh(legGeo, pantsMat);
    rLegMesh.position.y = -0.42;
    rLegMesh.castShadow = true;
    rLeg.add(rLegMesh);
    const rShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rShoe.position.set(0, -0.86, 0.06);
    rShoe.castShadow = true;
    rLeg.add(rShoe);
    charGroup.add(rLeg);

    const nametagTexture = updateNametagCanvas(name, isLocal);
    const nametagMat = new THREE.SpriteMaterial({ map: nametagTexture || undefined, transparent: true });
    const nametagSprite = new THREE.Sprite(nametagMat);
    nametagSprite.scale.set(2.4, 0.8, 1.0);
    nametagSprite.position.set(0, 2.7, 0);
    charGroup.add(nametagSprite);

    return {
      group: charGroup,
      ring,
      bodyMesh: bMesh,
      leftArm: lArm,
      rightArm: rArm,
      leftLeg: lLeg,
      rightLeg: rLeg,
      nametagSprite
    };
  }, []);

  const addOrUpdateRemotePlayer = useCallback((p: { id: string; name: string; suitColorIdx: number; position: [number, number, number]; rotationY?: number; isMoving?: boolean }) => {
    // Save to pending map
    pendingRemotePlayersRef.current.set(p.id, {
      id: p.id,
      name: p.name,
      suitColorIdx: p.suitColorIdx,
      position: p.position
    });

    // Update React state for UI
    setRemotePlayersList(Array.from(pendingRemotePlayersRef.current.values()));
    setOnlineLobbyCount(pendingRemotePlayersRef.current.size + 1);

    if (!sceneRef.current) return;

    let remote = otherPlayersRef.current.get(p.id);
    if (!remote) {
      const avatar = createAvatar(p.name, p.suitColorIdx, false);
      avatar.group.position.set(p.position[0], 0, p.position[2]);
      if (typeof p.rotationY === 'number') avatar.group.rotation.y = p.rotationY;
      sceneRef.current.add(avatar.group);

      remote = {
        id: p.id,
        name: p.name,
        suitColorIdx: p.suitColorIdx,
        group: avatar.group,
        bodyMesh: avatar.bodyMesh,
        leftArm: avatar.leftArm,
        rightArm: avatar.rightArm,
        leftLeg: avatar.leftLeg,
        rightLeg: avatar.rightLeg,
        nametagSprite: avatar.nametagSprite,
        walkCycle: 0,
        targetPos: { x: p.position[0], z: p.position[2] },
        targetRotY: p.rotationY || 0,
        isMoving: p.isMoving || false
      };
      otherPlayersRef.current.set(p.id, remote);
    } else {
      remote.targetPos = { x: p.position[0], z: p.position[2] };
      if (typeof p.rotationY === 'number') remote.targetRotY = p.rotationY;
      if (typeof p.isMoving === 'boolean') remote.isMoving = p.isMoving;
    }
  }, [createAvatar]);

  const removeRemotePlayer = useCallback((id: string, name?: string) => {
    pendingRemotePlayersRef.current.delete(id);
    setRemotePlayersList(Array.from(pendingRemotePlayersRef.current.values()));
    setOnlineLobbyCount(pendingRemotePlayersRef.current.size + 1);

    const remote = otherPlayersRef.current.get(id);
    if (remote && sceneRef.current) {
      sceneRef.current.remove(remote.group);
      otherPlayersRef.current.delete(id);
    }
    if (name) {
      showLoungeToast(`🚪 ${name} keluar dari Lounge`);
    }
  }, [showLoungeToast]);

  const updateRemotePlayerVisuals = useCallback((data: { id: string; suitColorIdx?: number; name?: string }) => {
    const remote = otherPlayersRef.current.get(data.id);
    if (remote) {
      if (typeof data.suitColorIdx === 'number') {
        remote.suitColorIdx = data.suitColorIdx;
        const col = OUTFIT_COLORS[data.suitColorIdx % OUTFIT_COLORS.length].colorVal;
        (remote.bodyMesh.material as THREE.MeshStandardMaterial).color.setHex(col);
        const leftArmMesh = remote.leftArm.children[0] as THREE.Mesh;
        if (leftArmMesh) (leftArmMesh.material as THREE.MeshStandardMaterial).color.setHex(col);
        const rightArmMesh = remote.rightArm.children[0] as THREE.Mesh;
        if (rightArmMesh) (rightArmMesh.material as THREE.MeshStandardMaterial).color.setHex(col);
      }
      if (data.name) {
        remote.name = data.name;
        const tex = updateNametagCanvas(data.name, false);
        if (tex) {
          remote.nametagSprite.material.map = tex;
          remote.nametagSprite.material.needsUpdate = true;
        }
      }
    }
  }, []);

  // Socket multiplayer presence listeners in 3D Lounge
  useEffect(() => {
    if (!socket) return;

    const onAllPlayers = (players: any[]) => {
      if (Array.isArray(players)) {
        players.forEach(p => {
          if (p && p.id !== socket.id) {
            addOrUpdateRemotePlayer(p);
          }
        });
      }
    };

    const onPlayerJoined = (player: any) => {
      if (player && player.id !== socket.id) {
        addOrUpdateRemotePlayer(player);
        soundEffects.playChatPop();
        showLoungeToast(`👋 ${player.name} baru saja masuk ke Casino Lounge!`);
      }
    };

    const onPlayerMoved = (data: { id: string; position: [number, number, number]; rotationY: number; isMoving: boolean }) => {
      const remote = otherPlayersRef.current.get(data.id);
      if (remote) {
        remote.targetPos = { x: data.position[0], z: data.position[2] };
        remote.targetRotY = data.rotationY;
        remote.isMoving = data.isMoving;
      }
    };

    const onPlayerUpdated = (data: { id: string; suitColorIdx?: number; name?: string }) => {
      updateRemotePlayerVisuals(data);
    };

    const onPlayerLeft = (data: { id: string; name?: string }) => {
      removeRemotePlayer(data.id, data.name);
    };

    socket.on('lobby:all-players', onAllPlayers);
    socket.on('lobby:player-joined', onPlayerJoined);
    socket.on('lobby:player-moved', onPlayerMoved);
    socket.on('lobby:player-updated', onPlayerUpdated);
    socket.on('lobby:player-left', onPlayerLeft);

    // Announce presence in 3D Casino Lounge
    socket.emit('lobby:join', {
      name: playerName,
      suitColorIdx,
      position: [playerPosRef.current.x, 0, playerPosRef.current.z]
    });

    // Periodic sync with server via HTTP fallback every 2.5s
    const syncLobby = async () => {
      try {
        const serverUrl = import.meta.env.VITE_SERVER_URL || '';
        const res = await fetch(`${serverUrl}/api/lobby-players`);
        if (res.ok) {
          const players: any[] = await res.json();
          const myId = socket?.id;
          players.forEach(p => {
            if (p && p.id !== myId) {
              addOrUpdateRemotePlayer(p);
            }
          });
          const activeIds = new Set(players.map(p => p.id));
          pendingRemotePlayersRef.current.forEach((_, id) => {
            if (!activeIds.has(id)) {
              removeRemotePlayer(id);
            }
          });
        }
      } catch {}
    };

    syncLobby();
    const syncInterval = setInterval(syncLobby, 2500);

    return () => {
      clearInterval(syncInterval);
      socket.emit('lobby:leave');
      socket.off('lobby:all-players', onAllPlayers);
      socket.off('lobby:player-joined', onPlayerJoined);
      socket.off('lobby:player-moved', onPlayerMoved);
      socket.off('lobby:player-updated', onPlayerUpdated);
      socket.off('lobby:player-left', onPlayerLeft);
    };
  }, [socket, addOrUpdateRemotePlayer, removeRemotePlayer, updateRemotePlayerVisuals, playerName, suitColorIdx, showLoungeToast]);

  // Helper to create Procedural Carpet Texture
  const createProceduralCarpetTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Rich dark base
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, 512, 512);

    // Luxury diamond pattern
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.12)';
    ctx.lineWidth = 2;

    const step = 64;
    for (let x = -512; x < 1024; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 512, 512);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, 512);
      ctx.lineTo(x + 512, 0);
      ctx.stroke();
    }

    // Small golden rosettes in diamonds
    ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
    for (let x = 0; x <= 512; x += step) {
      for (let y = 0; y <= 512; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    texture.needsUpdate = true;
    return texture;
  };

  // Helper to create Neon Sign Canvas Texture
  const createNeonSignTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 1024, 256);

    // Glowing border frame
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.roundRect(20, 20, 984, 216, 24);
    ctx.stroke();

    // Outer glow title
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#0ea5e9';
    ctx.shadowBlur = 24;
    ctx.font = '900 68px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('♠ VIP CASINO LOUNGE ♣', 512, 110);

    // Subtitle
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 14;
    ctx.font = '700 32px "JetBrains Mono", monospace';
    ctx.fillText('TEXAS HOLD\'EM INDONESIA • MEJA REALTIME', 512, 175);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  };

  // Helper to create Table Felt Canvas Texture
  const createTableFeltTexture = (table: TableConfig): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Felt base
    ctx.fillStyle = table.feltHex;
    ctx.fillRect(0, 0, 512, 256);

    // Subtle felt grain / vignette
    const grad = ctx.createRadialGradient(256, 128, 50, 256, 128, 250);
    grad.addColorStop(0, 'rgba(255,255,255,0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Betting line (gold rounded oval)
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.4)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(256, 128, 190, 85, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Table watermark text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.font = '900 32px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(table.name.toUpperCase(), 256, 120);

    ctx.fillStyle = 'rgba(253, 224, 71, 0.35)';
    ctx.font = '700 20px "JetBrains Mono", monospace';
    ctx.fillText(`BLIND: Rp ${table.smallBlind.toLocaleString('id-ID')} / Rp ${table.bigBlind.toLocaleString('id-ID')}`, 256, 155);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  };

  // Helper to create Table Floating Billboard Texture
  const createTableBillboardTexture = (
    table: TableConfig,
    playerCount: number = 0
  ): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 512, 256);

    // Glowing badge card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = table.tagColor;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(16, 16, 480, 224, 32);
    ctx.fill();
    ctx.stroke();

    // Category banner
    ctx.fillStyle = table.tagColor;
    ctx.font = '900 24px "Outfit", sans-serif';
    ctx.fillText(table.category + ' LOUNGE', 42, 62);

    // Table Name
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px "Outfit", sans-serif';
    ctx.fillText(table.name, 42, 110);

    // Blind Stakes & Players
    ctx.fillStyle = '#fef08a';
    ctx.font = '700 24px "JetBrains Mono", monospace';
    ctx.fillText(`Blind: Rp ${(table.smallBlind / 1000).toFixed(0)}K / ${(table.bigBlind / 1000).toFixed(0)}K`, 42, 155);

    // Player Count pill
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.roundRect(42, 175, 210, 44, 22);
    ctx.fill();

    ctx.fillStyle = playerCount > 0 ? '#34d399' : '#94a3b8';
    ctx.font = 'bold 22px "Outfit", sans-serif';
    ctx.fillText(`👥 ${playerCount} / 8 Pemain`, 58, 205);

    // CTA
    ctx.fillStyle = table.tagColor;
    ctx.font = 'bold 22px "Outfit", sans-serif';
    ctx.fillText('Klik / Dekati →', 300, 205);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  };

  // Main Three.js Scene Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060911);
    scene.fog = new THREE.FogExp2(0x060911, 0.022);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 120);
    camera.position.set(0, 15, 17);
    camera.lookAt(0, 1.2, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting
    // Subtle ambient
    const ambientLight = new THREE.AmbientLight(0x2d3250, 0.9);
    scene.add(ambientLight);

    // Directional warm light
    const dirLight = new THREE.DirectionalLight(0xfff5ea, 1.3);
    dirLight.position.set(12, 22, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -22;
    dirLight.shadow.camera.right = 22;
    dirLight.shadow.camera.top = 22;
    dirLight.shadow.camera.bottom = -22;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // Blue fill light
    const fillLight = new THREE.DirectionalLight(0x1e3a8a, 0.6);
    fillLight.position.set(-15, 12, -10);
    scene.add(fillLight);

    // 5. Room Geometry (Luxury VIP Box Room)
    const roomWidth = 34;
    const roomDepth = 26;
    const roomHeight = 9;

    // Floor
    const floorTexture = createProceduralCarpetTexture();
    const floorGeo = new THREE.PlaneGeometry(roomWidth, roomDepth);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.45,
      metalness: 0.1
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Golden floor border rim
    const borderMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.85 });
    const borderGeomX = new THREE.BoxGeometry(roomWidth, 0.15, 0.4);
    const borderNorth = new THREE.Mesh(borderGeomX, borderMat);
    borderNorth.position.set(0, 0.075, -roomDepth / 2);
    scene.add(borderNorth);

    const borderSouth = new THREE.Mesh(borderGeomX, borderMat);
    borderSouth.position.set(0, 0.075, roomDepth / 2);
    scene.add(borderSouth);

    const borderGeomZ = new THREE.BoxGeometry(0.4, 0.15, roomDepth);
    const borderWest = new THREE.Mesh(borderGeomZ, borderMat);
    borderWest.position.set(-roomWidth / 2, 0.075, 0);
    scene.add(borderWest);

    const borderEast = new THREE.Mesh(borderGeomZ, borderMat);
    borderEast.position.set(roomWidth / 2, 0.075, 0);
    scene.add(borderEast);

    // Back Wall
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0c111d, roughness: 0.85, metalness: 0.1 });
    const backWallGeo = new THREE.BoxGeometry(roomWidth, roomHeight, 0.6);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, roomHeight / 2, -roomDepth / 2);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Left Wall
    const leftWallGeo = new THREE.BoxGeometry(0.6, roomHeight, roomDepth);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-roomWidth / 2, roomHeight / 2, 0);
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Right Wall
    const rightWall = new THREE.Mesh(leftWallGeo, wallMat);
    rightWall.position.set(roomWidth / 2, roomHeight / 2, 0);
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Wall Pilasters & Gold Trims (Back Wall)
    const pilasterGeo = new THREE.BoxGeometry(0.8, roomHeight, 0.4);
    [-12, -4, 4, 12].forEach(px => {
      const p = new THREE.Mesh(pilasterGeo, borderMat);
      p.position.set(px, roomHeight / 2, -roomDepth / 2 + 0.25);
      p.castShadow = true;
      p.receiveShadow = true;
      scene.add(p);
    });

    // Wall Sconces with warm point lights
    const sconcePositions = [
      [-12, 4.5, -roomDepth / 2 + 0.5],
      [-4, 4.5, -roomDepth / 2 + 0.5],
      [4, 4.5, -roomDepth / 2 + 0.5],
      [12, 4.5, -roomDepth / 2 + 0.5],
      [-roomWidth / 2 + 0.5, 4.5, -5],
      [-roomWidth / 2 + 0.5, 4.5, 5],
      [roomWidth / 2 - 0.5, 4.5, -5],
      [roomWidth / 2 - 0.5, 4.5, 5]
    ];

    sconcePositions.forEach(([sx, sy, sz]) => {
      const sconceMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.25, 0.6, 12),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.6, roughness: 0.2 })
      );
      sconceMesh.position.set(sx, sy, sz);
      scene.add(sconceMesh);

      const sconceLight = new THREE.PointLight(0xffb74d, 1.2, 7.5);
      sconceLight.position.set(sx, sy, sz);
      scene.add(sconceLight);
    });

    // Back Wall Large Neon Sign
    const neonTexture = createNeonSignTexture();
    const neonMat = new THREE.MeshBasicMaterial({
      map: neonTexture,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    const neonPlane = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), neonMat);
    neonPlane.position.set(0, 6.2, -roomDepth / 2 + 0.35);
    scene.add(neonPlane);

    // Decorative Bar on Right Side
    const barCounter = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.4, 12),
      new THREE.MeshStandardMaterial({ color: 0x1f140e, roughness: 0.3, metalness: 0.3 })
    );
    barCounter.position.set(roomWidth / 2 - 2, 0.7, 0);
    barCounter.castShadow = true;
    barCounter.receiveShadow = true;
    scene.add(barCounter);

    const barTop = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.15, 12.4),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15, metalness: 0.1 })
    );
    barTop.position.set(roomWidth / 2 - 2, 1.45, 0);
    barTop.castShadow = true;
    scene.add(barTop);

    // Barstools
    for (let bz = -4.5; bz <= 4.5; bz += 2.2) {
      const stoolGroup = new THREE.Group();
      stoolGroup.position.set(roomWidth / 2 - 3.8, 0, bz);

      const stoolLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.9, 12),
        new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.2 })
      );
      stoolLeg.position.y = 0.45;
      stoolGroup.add(stoolLeg);

      const stoolCushion = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.2, 16),
        new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.6 })
      );
      stoolCushion.position.y = 0.95;
      stoolCushion.castShadow = true;
      stoolGroup.add(stoolCushion);

      scene.add(stoolGroup);
    }

    // VIP Chesterfield Sofa Lounge on Left Side
    const sofaGroup = new THREE.Group();
    sofaGroup.position.set(-roomWidth / 2 + 2.8, 0, 0);

    const sofaBase = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: 0x1a0f0d, roughness: 0.7 })
    );
    sofaBase.position.y = 0.35;
    sofaBase.castShadow = true;
    sofaGroup.add(sofaBase);

    const sofaBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1.1, 8),
      new THREE.MeshStandardMaterial({ color: 0x1a0f0d, roughness: 0.7 })
    );
    sofaBack.position.set(-0.9, 0.9, 0);
    sofaBack.castShadow = true;
    sofaGroup.add(sofaBack);

    // Coffee table
    const tableGlass = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.08, 4),
      new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, roughness: 0.1 })
    );
    tableGlass.position.set(1.8, 0.45, 0);
    tableGlass.castShadow = true;
    sofaGroup.add(tableGlass);

    scene.add(sofaGroup);

    // Tropical potted plants in corners
    const plantPositions = [
      [-roomWidth / 2 + 2, 0, -roomDepth / 2 + 2],
      [roomWidth / 2 - 2, 0, -roomDepth / 2 + 2],
      [-roomWidth / 2 + 2, 0, roomDepth / 2 - 2],
      [roomWidth / 2 - 2, 0, roomDepth / 2 - 2]
    ];

    plantPositions.forEach(([px, py, pz]) => {
      const potGroup = new THREE.Group();
      potGroup.position.set(px, py, pz);

      const potMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.4, 1.1, 16),
        new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.7 })
      );
      potMesh.position.y = 0.55;
      potMesh.castShadow = true;
      potGroup.add(potMesh);

      // Leaves
      for (let l = 0; l < 8; l++) {
        const leafAngle = (l / 8) * Math.PI * 2;
        const leaf = new THREE.Mesh(
          new THREE.SphereGeometry(0.35, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.6 })
        );
        leaf.scale.set(0.7, 1.8, 0.2);
        leaf.position.set(Math.cos(leafAngle) * 0.4, 1.4, Math.sin(leafAngle) * 0.4);
        leaf.rotation.z = Math.cos(leafAngle) * 0.45;
        leaf.rotation.x = Math.sin(leafAngle) * 0.45;
        potGroup.add(leaf);
      }

      scene.add(potGroup);
    });

    // 6. Build 4 Authentic Poker Tables in 3D
    CASINO_TABLES.forEach(tableConfig => {
      const tableGroup = new THREE.Group();
      tableGroup.position.set(...tableConfig.position);
      tableGroup.name = `table_${tableConfig.id}`;

      // Table Shape: Oval / Rounded Capsule
      // Dimensions: Length 5.2, Width 3.2, Height 1.15
      const feltWidth = 4.8;
      const feltDepth = 2.8;

      // Table Pedestal Base
      const basePedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.85, 0.95, 24),
        new THREE.MeshStandardMaterial({ color: tableConfig.rimColor, roughness: 0.3, metalness: 0.5 })
      );
      basePedestal.position.y = 0.475;
      basePedestal.castShadow = true;
      basePedestal.receiveShadow = true;
      tableGroup.add(basePedestal);

      const baseFoot = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.3, 0.15, 24),
        new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.8 })
      );
      baseFoot.position.y = 0.075;
      baseFoot.receiveShadow = true;
      tableGroup.add(baseFoot);

      // Wooden Outer Rim
      const rimMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(feltWidth / 2 + 0.35, feltWidth / 2 + 0.35, 0.25, 32),
        new THREE.MeshStandardMaterial({ color: tableConfig.rimColor, roughness: 0.4, metalness: 0.2 })
      );
      rimMesh.scale.set(1.0, 1.0, feltDepth / feltWidth);
      rimMesh.position.y = 1.0;
      rimMesh.castShadow = true;
      rimMesh.receiveShadow = true;
      tableGroup.add(rimMesh);

      // Padded Leather Armrest Rail
      const railMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.5
      });
      const railMesh = new THREE.Mesh(
        new THREE.TorusGeometry(feltWidth / 2 + 0.1, 0.22, 12, 32),
        railMat
      );
      railMesh.rotation.x = Math.PI / 2;
      railMesh.scale.set(1.0, feltDepth / feltWidth, 1.0);
      railMesh.position.y = 1.15;
      railMesh.castShadow = true;
      tableGroup.add(railMesh);

      // Inner Felt Surface with Custom Texture
      const feltTexture = createTableFeltTexture(tableConfig);
      const feltMat = new THREE.MeshStandardMaterial({
        map: feltTexture,
        roughness: 0.8,
        metalness: 0.05
      });
      const feltMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(feltWidth / 2, feltWidth / 2, 0.06, 32),
        feltMat
      );
      feltMesh.scale.set(1.0, 1.0, feltDepth / feltWidth);
      feltMesh.position.y = 1.13;
      feltMesh.receiveShadow = true;
      tableGroup.add(feltMesh);

      // 3D Chip Stacks on Table
      const chipColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b];
      const chipPositions = [
        [-0.8, 1.17, 0.3],
        [-0.5, 1.17, -0.4],
        [0.7, 1.17, 0.2],
        [0.4, 1.17, -0.3]
      ];

      chipPositions.forEach(([cx, cy, cz], idx) => {
        const stackHeight = 0.12 + Math.random() * 0.14;
        const stackMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, stackHeight, 16),
          new THREE.MeshStandardMaterial({ color: chipColors[idx % chipColors.length], roughness: 0.3 })
        );
        stackMesh.position.set(cx, cy + stackHeight / 2, cz);
        stackMesh.castShadow = true;
        tableGroup.add(stackMesh);
      });

      // 8 Casino Chairs around the table
      const numChairs = 8;
      for (let c = 0; c < numChairs; c++) {
        const angle = (c / numChairs) * Math.PI * 2;
        const chairRadiusX = feltWidth / 2 + 0.9;
        const chairRadiusZ = feltDepth / 2 + 0.8;
        const chairX = Math.cos(angle) * chairRadiusX;
        const chairZ = Math.sin(angle) * chairRadiusZ;

        const chairGroup = new THREE.Group();
        chairGroup.position.set(chairX, 0, chairZ);
        chairGroup.rotation.y = -angle - Math.PI / 2;

        // Chair stand
        const chairLeg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 0.65, 8),
          new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 })
        );
        chairLeg.position.y = 0.325;
        chairGroup.add(chairLeg);

        // Chair seat
        const chairSeat = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, 0.38, 0.14, 16),
          new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 })
        );
        chairSeat.position.y = 0.72;
        chairSeat.castShadow = true;
        chairGroup.add(chairSeat);

        // Chair curved backrest
        const chairBack = new THREE.Mesh(
          new THREE.CylinderGeometry(0.36, 0.36, 0.45, 16, 1, false, 0, Math.PI),
          new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 })
        );
        chairBack.position.set(0, 1.05, 0.18);
        chairBack.rotation.y = Math.PI;
        chairBack.castShadow = true;
        chairGroup.add(chairBack);

        tableGroup.add(chairGroup);
      }

      // Overhead Hanging Brass Pendant Lamp
      const lampCord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 3.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
      );
      lampCord.position.set(0, 5.8, 0);
      tableGroup.add(lampCord);

      const lampShade = new THREE.Mesh(
        new THREE.ConeGeometry(0.7, 0.5, 16, 1, true),
        new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.85, side: THREE.DoubleSide })
      );
      lampShade.position.set(0, 3.9, 0);
      tableGroup.add(lampShade);

      // Real Spotlight over Table Felt
      const spotLight = new THREE.SpotLight(0xfff5ea, 1.6);
      spotLight.position.set(tableConfig.position[0], 4.2, tableConfig.position[2]);
      spotLight.target = tableGroup;
      spotLight.angle = 0.58;
      spotLight.penumbra = 0.5;
      spotLight.distance = 9;
      spotLight.castShadow = true;
      spotLight.shadow.mapSize.width = 1024;
      spotLight.shadow.mapSize.height = 1024;
      scene.add(spotLight);
      tableSpotlightsRef.current.set(tableConfig.id, spotLight);

      // Floating 3D Billboard Sprite above Table
      const billboardTexture = createTableBillboardTexture(tableConfig, 0);
      const billboardMat = new THREE.SpriteMaterial({ map: billboardTexture, transparent: true });
      const billboardSprite = new THREE.Sprite(billboardMat);
      billboardSprite.scale.set(4.0, 2.0, 1.0);
      billboardSprite.position.set(0, 3.2, 0);
      tableGroup.add(billboardSprite);
      tableBillboardsRef.current.set(tableConfig.id, billboardSprite);

      scene.add(tableGroup);
    });

    // 7. Click Destination Marker (Expanding Gold Pulse Ring)
    const markerGeo = new THREE.RingGeometry(0.35, 0.5, 32);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0 });
    const clickMarker = new THREE.Mesh(markerGeo, markerMat);
    clickMarker.rotation.x = -Math.PI / 2;
    clickMarker.position.set(0, 0.03, 0);
    scene.add(clickMarker);
    clickMarkerRef.current = clickMarker;

    // 8. 3D Character Avatar Setup (Local Player)
    const localAvatar = createAvatar(playerName, suitColorIdx, true);
    localAvatar.group.position.set(playerPosRef.current.x, 0, playerPosRef.current.z);
    characterGroupRef.current = localAvatar.group;
    bodyMeshRef.current = localAvatar.bodyMesh;
    playerRingRef.current = localAvatar.ring;
    leftArmRef.current = localAvatar.leftArm;
    rightArmRef.current = localAvatar.rightArm;
    leftLegRef.current = localAvatar.leftLeg;
    rightLegRef.current = localAvatar.rightLeg;
    nametagSpriteRef.current = localAvatar.nametagSprite;

    scene.add(localAvatar.group);

    // Re-hydrate any remote players that arrived before Three.js scene mounted
    pendingRemotePlayersRef.current.forEach(p => {
      if (!otherPlayersRef.current.has(p.id)) {
        const avatar = createAvatar(p.name, p.suitColorIdx, false);
        avatar.group.position.set(p.position[0], 0, p.position[2]);
        scene.add(avatar.group);
        otherPlayersRef.current.set(p.id, {
          id: p.id,
          name: p.name,
          suitColorIdx: p.suitColorIdx,
          group: avatar.group,
          bodyMesh: avatar.bodyMesh,
          leftArm: avatar.leftArm,
          rightArm: avatar.rightArm,
          leftLeg: avatar.leftLeg,
          rightLeg: avatar.rightLeg,
          nametagSprite: avatar.nametagSprite,
          walkCycle: 0,
          targetPos: { x: p.position[0], z: p.position[2] },
          targetRotY: 0,
          isMoving: false
        });
      }
    });

    // Initial position if initialTableId provided
    if (initialTableId) {
      const targetTable = CASINO_TABLES.find(t => t.id === initialTableId);
      if (targetTable) {
        playerPosRef.current = {
          x: targetTable.position[0],
          z: targetTable.position[2] + 3.2
        };
        localAvatar.group.position.set(playerPosRef.current.x, 0, playerPosRef.current.z);
      }
    }

    // 9. Input Listeners (Keyboard)
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = true;
      // If typing in an input, don't move or trigger game keys
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;

      const isEKey = e.code === 'KeyE' || e.key === 'e' || e.key === 'E';
      const isSpaceOrEnter = e.code === 'Space' || e.key === 'Enter';

      if (isEKey || isSpaceOrEnter) {
        const table = nearbyTableRef.current;
        if (table) {
          e.preventDefault();
          e.stopPropagation();
          handleEnterTableRef.current(table);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 10. Click / Pointer Raycasting (Click-to-Move & Click-on-Table)
    const raycaster = new THREE.Raycaster();
    const mouseVector = new THREE.Vector2();

    const handlePointerDown = (e: MouseEvent) => {
      // Ignore if clicking on UI overlay
      if ((e.target as HTMLElement)?.closest('.lobby-ui-element')) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouseVector.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVector.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseVector, camera);

      // Check click on tables first
      for (const tableConfig of CASINO_TABLES) {
        const tableObj = scene.getObjectByName(`table_${tableConfig.id}`);
        if (tableObj) {
          const intersects = raycaster.intersectObjects(tableObj.children, true);
          if (intersects.length > 0) {
            // Player clicked directly on this table!
            setSelectedTable(tableConfig);
            // Also walk character towards the table
            destinationRef.current = {
              x: tableConfig.position[0],
              z: tableConfig.position[2] + 3.0
            };
            return;
          }
        }
      }

      // Check click on floor for movement
      const floorIntersects = raycaster.intersectObject(floorMesh);
      if (floorIntersects.length > 0) {
        const point = floorIntersects[0].point;
        destinationRef.current = { x: point.x, z: point.z };

        // Animate click marker
        if (clickMarkerRef.current) {
          clickMarkerRef.current.position.set(point.x, 0.04, point.z);
          (clickMarkerRef.current.material as THREE.MeshBasicMaterial).opacity = 1.0;
          clickMarkerRef.current.scale.set(0.6, 0.6, 0.6);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // 11. Resize Observer
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      cameraRef.current.aspect = nw / nh;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(nw, nh);
    };

    window.addEventListener('resize', handleResize);

    // 12. Main Render & Physics Animation Loop
    let lastTime = performance.now();

    const animate = (time: number) => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Click marker pulse animation
      if (clickMarkerRef.current && (clickMarkerRef.current.material as THREE.MeshBasicMaterial).opacity > 0) {
        const mat = clickMarkerRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, mat.opacity - delta * 2.2);
        const s = clickMarkerRef.current.scale.x + delta * 1.6;
        clickMarkerRef.current.scale.set(s, s, s);
      }

      // Floating ring rotation
      if (playerRingRef.current) {
        playerRingRef.current.rotation.z += delta * 1.5;
      }

      // Neon sign gentle pulse
      if (neonPlane) {
        neonPlane.position.y = 6.2 + Math.sin(time * 0.002) * 0.05;
      }

      // Character Movement Physics
      const keys = keysPressedRef.current;
      let moveX = 0;
      let moveZ = 0;

      // Keyboard movement
      if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
      if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

      // Virtual Joystick movement
      if (joystickTouchRef.current.active) {
        const dx = joystickTouchRef.current.currX - joystickTouchRef.current.startX;
        const dy = joystickTouchRef.current.currY - joystickTouchRef.current.startY;
        const dist = Math.hypot(dx, dy);
        if (dist > 10) {
          moveX = dx / Math.max(dist, 40);
          moveZ = dy / Math.max(dist, 40);
        }
      }

      let isMoving = false;
      const moveSpeed = 6.5;

      if (moveX !== 0 || moveZ !== 0) {
        // Direct keyboard/joystick input overrides click destination
        destinationRef.current = null;
        const len = Math.hypot(moveX, moveZ);
        const normX = (moveX / len) * moveSpeed * delta;
        const normZ = (moveZ / len) * moveSpeed * delta;

        playerPosRef.current.x += normX;
        playerPosRef.current.z += normZ;
        playerHeadingRef.current = Math.atan2(moveX, moveZ);
        isMoving = true;
      } else if (destinationRef.current) {
        // Navigating towards clicked point
        const toX = destinationRef.current.x - playerPosRef.current.x;
        const toZ = destinationRef.current.z - playerPosRef.current.z;
        const dist = Math.hypot(toX, toZ);

        if (dist > 0.15) {
          const step = Math.min(moveSpeed * delta, dist);
          playerPosRef.current.x += (toX / dist) * step;
          playerPosRef.current.z += (toZ / dist) * step;
          playerHeadingRef.current = Math.atan2(toX, toZ);
          isMoving = true;
        } else {
          destinationRef.current = null;
        }
      }

      // Boundaries (Stay inside room)
      playerPosRef.current.x = Math.max(-14, Math.min(14, playerPosRef.current.x));
      playerPosRef.current.z = Math.max(-10.5, Math.min(10.5, playerPosRef.current.z));

      // Simple Table Collision check (push away from table centers)
      CASINO_TABLES.forEach(t => {
        const dx = playerPosRef.current.x - t.position[0];
        const dz = playerPosRef.current.z - t.position[2];
        const dist = Math.hypot(dx, dz);
        const minRadius = 2.4;
        if (dist < minRadius && dist > 0.001) {
          const push = (minRadius - dist) / dist;
          playerPosRef.current.x += dx * push;
          playerPosRef.current.z += dz * push;
        }
      });

      isWalkingRef.current = isMoving;

      // Update Character Transform
      if (characterGroupRef.current) {
        characterGroupRef.current.position.x = playerPosRef.current.x;
        characterGroupRef.current.position.z = playerPosRef.current.z;

        // Smooth rotation interpolation
        const currentRot = characterGroupRef.current.rotation.y;
        let diff = playerHeadingRef.current - currentRot;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        characterGroupRef.current.rotation.y += diff * 0.15;
      }

      // Procedural Walking Animation (Limbs swing & Body bob)
      if (isMoving) {
        walkCycleRef.current += delta * 12;
        const cycle = walkCycleRef.current;

        // Leg swing
        if (leftLegRef.current && rightLegRef.current) {
          leftLegRef.current.rotation.x = Math.sin(cycle) * 0.65;
          rightLegRef.current.rotation.x = -Math.sin(cycle) * 0.65;
        }

        // Arm counter-swing
        if (leftArmRef.current && rightArmRef.current) {
          leftArmRef.current.rotation.x = -Math.sin(cycle) * 0.55;
          rightArmRef.current.rotation.x = Math.sin(cycle) * 0.55;
        }

        // Body rhythmic bob
        if (bodyMeshRef.current) {
          bodyMeshRef.current.position.y = 1.35 + Math.abs(Math.sin(cycle)) * 0.06;
        }

        // Periodic footstep audio
        if (time - lastFootstepTimeRef.current > 280) {
          soundEffects.playFootstep();
          lastFootstepTimeRef.current = time;
        }
      } else {
        // Idle breathing
        walkCycleRef.current = 0;
        const idleCycle = time * 0.0025;

        if (leftLegRef.current && rightLegRef.current) {
          leftLegRef.current.rotation.x *= 0.85;
          rightLegRef.current.rotation.x *= 0.85;
        }

        if (leftArmRef.current && rightArmRef.current) {
          leftArmRef.current.rotation.x *= 0.85;
          rightArmRef.current.rotation.x *= 0.85;
        }

        if (bodyMeshRef.current) {
          bodyMeshRef.current.position.y = 1.35 + Math.sin(idleCycle) * 0.02;
        }
      }

      // Update Remote Players' Transforms & Procedural Walk Animations
      otherPlayersRef.current.forEach((remote) => {
        // Smooth position lerp
        remote.group.position.x += (remote.targetPos.x - remote.group.position.x) * 0.25;
        remote.group.position.z += (remote.targetPos.z - remote.group.position.z) * 0.25;

        // Smooth rotation lerp
        let diff = remote.targetRotY - remote.group.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        remote.group.rotation.y += diff * 0.25;

        // Remote limb animations
        if (remote.isMoving) {
          remote.walkCycle += delta * 12;
          const cycle = remote.walkCycle;
          remote.leftLeg.rotation.x = Math.sin(cycle) * 0.65;
          remote.rightLeg.rotation.x = -Math.sin(cycle) * 0.65;
          remote.leftArm.rotation.x = -Math.sin(cycle) * 0.55;
          remote.rightArm.rotation.x = Math.sin(cycle) * 0.55;
          remote.bodyMesh.position.y = 1.35 + Math.abs(Math.sin(cycle)) * 0.06;
        } else {
          remote.leftLeg.rotation.x *= 0.85;
          remote.rightLeg.rotation.x *= 0.85;
          remote.leftArm.rotation.x *= 0.85;
          remote.rightArm.rotation.x *= 0.85;
          remote.bodyMesh.position.y += (1.35 - remote.bodyMesh.position.y) * 0.15;
        }
      });

      // Emit local player position to server (throttled ~20 times/sec)
      if (socket) {
        lastMoveEmitTimeRef.current += delta;
        if (lastMoveEmitTimeRef.current > 0.05 || isMoving !== lastWasMovingRef.current) {
          lastMoveEmitTimeRef.current = 0;
          lastWasMovingRef.current = isMoving;
          socket.emit('lobby:move', {
            position: [playerPosRef.current.x, 0, playerPosRef.current.z],
            rotationY: playerHeadingRef.current,
            isMoving
          });
        }
      }

      // Proximity Detection to Poker Tables
      let closest: TableConfig | null = null;
      let minDistance = 5.0;

      CASINO_TABLES.forEach(t => {
        const dist = Math.hypot(playerPosRef.current.x - t.position[0], playerPosRef.current.z - t.position[2]);

        // Table spotlight intensity reaction
        const light = tableSpotlightsRef.current.get(t.id);
        const billboard = tableBillboardsRef.current.get(t.id);

        if (dist < 5.0) {
          if (dist < minDistance) {
            minDistance = dist;
            closest = t;
          }
          if (light) light.intensity = 2.6;
          if (billboard) {
            billboard.scale.set(4.6, 2.3, 1.0);
            billboard.position.y = 3.3 + Math.sin(time * 0.004) * 0.08;
          }
        } else {
          if (light) light.intensity = 1.6;
          if (billboard) {
            billboard.scale.set(4.0, 2.0, 1.0);
            billboard.position.y = 3.2;
          }
        }
      });

      nearbyTableRef.current = closest;
      setNearbyTable(closest);

      // Smooth Third-Person Camera Follow
      if (cameraRef.current && !isTransitioning) {
        const targetCamX = playerPosRef.current.x * 0.45;
        const targetCamZ = playerPosRef.current.z + 14.5;
        const targetCamY = 13.5;

        cameraRef.current.position.x += (targetCamX - cameraRef.current.position.x) * 0.055;
        cameraRef.current.position.z += (targetCamZ - cameraRef.current.position.z) * 0.055;
        cameraRef.current.position.y += (targetCamY - cameraRef.current.position.y) * 0.055;

        cameraRef.current.lookAt(playerPosRef.current.x, 1.3, playerPosRef.current.z);
      }

      renderer.render(scene, camera);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);

      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }

      if (socket) {
        socket.emit('lobby:leave');
      }
      otherPlayersRef.current.forEach(remote => {
        if (sceneRef.current) sceneRef.current.remove(remote.group);
      });
      otherPlayersRef.current.clear();

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Suit Color on mesh when changed
  useEffect(() => {
    if (bodyMeshRef.current && leftArmRef.current && rightArmRef.current) {
      const col = OUTFIT_COLORS[suitColorIdx].colorVal;
      (bodyMeshRef.current.material as THREE.MeshStandardMaterial).color.setHex(col);
      const armMat = (leftArmRef.current.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (armMat) armMat.color.setHex(col);
    }
    if (socket) {
      socket.emit('lobby:update-outfit', { suitColorIdx, name: playerName });
    }
  }, [suitColorIdx, playerName, socket]);

  // Update Nametag Sprite when player name changes
  useEffect(() => {
    if (nametagSpriteRef.current) {
      const tex = updateNametagCanvas(playerName, true);
      if (tex) {
        nametagSpriteRef.current.material.map = tex;
        nametagSpriteRef.current.material.needsUpdate = true;
      }
    }
    if (socket) {
      socket.emit('lobby:update-outfit', { suitColorIdx, name: playerName });
    }
  }, [playerName, suitColorIdx, socket]);

  // Update Billboards when roomData updates
  useEffect(() => {
    CASINO_TABLES.forEach(table => {
      const sprite = tableBillboardsRef.current.get(table.id);
      if (sprite) {
        const count = roomData[table.id]?.playerCount || 0;
        const newTex = createTableBillboardTexture(table, count);
        sprite.material.map = newTex;
        sprite.material.needsUpdate = true;
      }
    });
  }, [roomData]);

  // Handle entering a table with Cinematic Transition
  const handleEnterTable = (table: TableConfig) => {
    if (isTransitioningRef.current) return;
    if (socket) {
      socket.emit('lobby:leave');
    }
    isTransitioningRef.current = true;
    setIsTransitioning(true);
    soundEffects.playEnterTable();

    // Cinematic camera zoom towards the table
    if (cameraRef.current) {
      const startPos = cameraRef.current.position.clone();
      const targetPos = new THREE.Vector3(table.position[0], 4.2, table.position[2] + 4.8);
      let p = 0;

      const zoomInterval = setInterval(() => {
        p += 0.06;
        setTransitionProgress(p);
        if (cameraRef.current) {
          cameraRef.current.position.lerpVectors(startPos, targetPos, p);
          cameraRef.current.lookAt(table.position[0], 1.2, table.position[2]);
        }

        if (p >= 1) {
          clearInterval(zoomInterval);
          setTimeout(() => {
            onSelectTable(table.id);
          }, 150);
        }
      }, 20);
    } else {
      onSelectTable(table.id);
    }
  };

  handleEnterTableRef.current = handleEnterTable;

  // Dedicated global key listener for entering table (guarantees E / Space / Enter always works)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;

      const isEKey = e.code === 'KeyE' || e.key === 'e' || e.key === 'E';
      const isSpaceOrEnter = e.code === 'Space' || e.key === 'Enter';

      if (isEKey || isSpaceOrEnter) {
        if (nearbyTable && !isTransitioning) {
          e.preventDefault();
          e.stopPropagation();
          handleEnterTable(nearbyTable);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKey, true);
    return () => window.removeEventListener('keydown', handleGlobalKey, true);
  }, [nearbyTable, isTransitioning]);

  // Virtual joystick touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    joystickTouchRef.current = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      currX: touch.clientX,
      currY: touch.clientY
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!joystickTouchRef.current.active) return;
    const touch = e.touches[0];
    joystickTouchRef.current.currX = touch.clientX;
    joystickTouchRef.current.currY = touch.clientY;
  };

  const handleTouchEnd = () => {
    joystickTouchRef.current.active = false;
  };

  const handleSavePlayerName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onUpdatePlayerName(nameInput.trim());
      setIsEditingName(false);
    }
  };

  return (
    <div
      className="lobby-3d-root"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#070a10',
        userSelect: 'none'
      }}
    >
      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'grab'
        }}
      />

      {/* Top Header Navigation Overlay */}
      <header
        className="lobby-ui-element"
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          right: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'auto',
          zIndex: 20
        }}
      >
        {/* Brand & Room Info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            padding: '10px 18px',
            borderRadius: '999px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b, #b45309)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              color: '#000',
              fontWeight: 900
            }}
          >
            ♠
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#f8fafc', letterSpacing: '0.04em' }}>
              VIP CASINO LOUNGE 3D
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                Texas Hold'em Royale • Ruang Utama
              </span>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748b' }} />
              <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', display: 'inline-block' }} />
                {onlineLobbyCount} di Lounge
              </span>
            </div>
          </div>
        </div>

        {/* Top Actions: Avatar Customizer, Name, BGM, Quick List */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Avatar Outfit Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(12px)',
              padding: '6px 14px',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 700 }}>Jas:</span>
            {OUTFIT_COLORS.map((outfit, idx) => (
              <button
                key={outfit.name}
                onClick={() => {
                  setSuitColorIdx(idx);
                  localStorage.setItem('poker_avatar_outfit', idx.toString());
                }}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: outfit.hex,
                  border: suitColorIdx === idx ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.3)',
                  transform: suitColorIdx === idx ? 'scale(1.2)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer'
                }}
                title={outfit.tag}
              />
            ))}
          </div>

          {/* Player Name Pill */}
          <button
            onClick={() => {
              setNameInput(playerName);
              setIsEditingName(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(12px)',
              padding: '8px 16px',
              borderRadius: '999px',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#fef08a',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            <User size={15} color="#f59e0b" />
            <span>{playerName}</span>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>✎</span>
          </button>

          {/* Tokyo Drift BGM Toggle */}
          <button
            onClick={onToggleBgm}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: isBgmPlaying
                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(180, 83, 9, 0.4))'
                : 'rgba(15, 23, 42, 0.85)',
              border: isBgmPlaying ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
              padding: '8px 14px',
              borderRadius: '999px',
              color: isBgmPlaying ? '#fef08a' : '#94a3b8',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Tokyo Drift - Teriyaki Boyz BGM"
          >
            {isBgmPlaying ? <Music size={15} className="animate-pulse" /> : <VolumeX size={15} />}
            <span className="hidden sm:inline">
              {isBgmPlaying ? 'Tokyo Drift 🎵' : 'Musik: OFF'}
            </span>
          </button>

          {/* Quick Rooms List Modal Toggle */}
          <button
            onClick={() => setShowRoomListModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#0f172a',
              padding: '8px 16px',
              borderRadius: '999px',
              fontWeight: 900,
              fontSize: '13px',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
              cursor: 'pointer'
            }}
          >
            <Compass size={15} />
            <span className="hidden sm:inline">Pilih Meja</span>
          </button>
        </div>
      </header>

      {/* Floating Lounge Toast Notification Banner */}
      {loungeToast && (
        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
            border: '1px solid #f59e0b',
            boxShadow: '0 8px 32px rgba(245, 158, 11, 0.4)',
            borderRadius: '999px',
            padding: '10px 24px',
            color: '#fef08a',
            fontSize: '13px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'none'
          }}
        >
          <span>{loungeToast}</span>
        </div>
      )}

      {/* Floating Active Players in Lounge Panel */}
      <div
        className="lobby-ui-element"
        style={{
          position: 'absolute',
          top: '80px',
          left: '16px',
          zIndex: 25,
          background: 'rgba(15, 23, 42, 0.90)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '16px',
          padding: '12px 14px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.65)',
          width: '270px',
          pointerEvents: 'auto'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
              Pemain di Lounge ({remotePlayersList.length + 1})
            </span>
          </div>
          <span style={{ fontSize: '10px', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '999px' }}>
            Live 3D
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
          {/* Local Player */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '8px',
              padding: '6px 10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: OUTFIT_COLORS[suitColorIdx % OUTFIT_COLORS.length].hex,
                  border: '1px solid #ffffff'
                }}
              />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#fef08a' }}>
                {playerName} (Anda)
              </span>
            </div>
            <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 800 }}>👑 VIP</span>
          </div>

          {/* Other Players */}
          {remotePlayersList.length === 0 ? (
            <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', padding: '6px 4px' }}>
              Menunggu teman bergabung ke Lounge...
            </div>
          ) : (
            remotePlayersList.map((player) => (
              <div
                key={player.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '8px',
                  padding: '6px 10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: OUTFIT_COLORS[player.suitColorIdx % OUTFIT_COLORS.length]?.hex || '#38bdf8',
                      border: '1px solid #38bdf8'
                    }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>
                    {player.name}
                  </span>
                </div>
                <button
                  onClick={() => handleTeleportToPlayer(player)}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#38bdf8',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                  title="Jalan mendekati posisi teman ini"
                >
                  📍 Temui
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mini-map / Room Compass HUD in Bottom Left */}
      <div
        className="lobby-ui-element"
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'auto',
          zIndex: 15
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, color: '#f59e0b' }}>
          <Compass size={14} />
          <span>KONTROL NAVIGASI</span>
        </div>
        <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
          • Gunakan <strong>W, A, S, D</strong> atau <strong>Panah</strong> untuk jalan
          <br />
          • Atau <strong>Klik Lantai</strong> untuk bergerak ke tujuan
          <br />
          • Dekati meja dan tekan <strong>[E]</strong> untuk masuk
        </div>
      </div>

      {/* Proximity Table Prompt (Appears when character walks near a table) */}
      {nearbyTable && (
        <div
          className="lobby-ui-element animate-fade-in"
          style={{
            position: 'absolute',
            bottom: '36px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
            backdropFilter: 'blur(16px)',
            border: `2px solid ${nearbyTable.tagColor}`,
            boxShadow: `0 12px 40px ${nearbyTable.tagColor}55`,
            borderRadius: '24px',
            padding: '20px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            maxWidth: '560px',
            width: '90%',
            zIndex: 30,
            pointerEvents: 'auto',
            animation: 'slideUp 0.25s ease-out'
          }}
        >
          {/* Table Felt Preview Icon */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: nearbyTable.feltHex,
              border: '3px solid rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              color: '#fff',
              flexShrink: 0,
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)'
            }}
          >
            ♠
          </div>

          {/* Details */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  color: nearbyTable.tagColor,
                  background: 'rgba(255,255,255,0.08)',
                  padding: '2px 8px',
                  borderRadius: '999px'
                }}
              >
                {nearbyTable.category}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                👥 {roomData[nearbyTable.id]?.playerCount || 0} / 8 Pemain
              </span>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#f8fafc', marginBottom: '4px' }}>
              {nearbyTable.name}
            </h3>

            <div style={{ fontSize: '13px', color: '#fef08a', fontWeight: 700 }}>
              Blind: Rp {nearbyTable.smallBlind.toLocaleString('id-ID')} / Rp {nearbyTable.bigBlind.toLocaleString('id-ID')}
              <span style={{ color: '#94a3b8', fontWeight: 500, marginLeft: '8px' }}>
                • Modal: {nearbyTable.minBuyinText}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => handleEnterTable(nearbyTable)}
            style={{
              background: `linear-gradient(135deg, ${nearbyTable.tagColor}, #d97706)`,
              color: '#0f172a',
              border: 'none',
              padding: '14px 24px',
              borderRadius: '999px',
              fontSize: '14px',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: `0 6px 20px ${nearbyTable.tagColor}66`,
              flexShrink: 0,
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <Play size={18} fill="#0f172a" />
            <span>MASUK [E]</span>
          </button>
        </div>
      )}

      {/* Selected Table Modal (When player clicks on a table from afar) */}
      {selectedTable && !nearbyTable && (
        <div
          className="modal-overlay lobby-ui-element"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 40
          }}
          onClick={() => setSelectedTable(null)}
        >
          <div
            className="modal-card"
            style={{
              background: '#0f172a',
              border: `2px solid ${selectedTable.tagColor}`,
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '460px',
              width: '90%',
              boxShadow: `0 16px 50px rgba(0,0,0,0.8), 0 0 40px ${selectedTable.tagColor}33`
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 900,
                    color: selectedTable.tagColor,
                    background: 'rgba(255,255,255,0.08)',
                    padding: '3px 10px',
                    borderRadius: '999px'
                  }}
                >
                  {selectedTable.category}
                </span>
                <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#f8fafc', marginTop: '8px' }}>
                  {selectedTable.name}
                </h2>
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>{selectedTable.subtitle}</div>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#94a3b8',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '20px' }}>
              {selectedTable.description}
            </p>

            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginBottom: '24px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#94a3b8' }}>Taruhan Blind:</span>
                <span style={{ color: '#fef08a', fontWeight: 700 }}>
                  Rp {selectedTable.smallBlind.toLocaleString('id-ID')} / Rp {selectedTable.bigBlind.toLocaleString('id-ID')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#94a3b8' }}>Starting Chips:</span>
                <span style={{ color: '#34d399', fontWeight: 700 }}>
                  Rp {selectedTable.startingChips.toLocaleString('id-ID')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#94a3b8' }}>Pemain Aktif:</span>
                <span style={{ color: '#f8fafc', fontWeight: 700 }}>
                  {roomData[selectedTable.id]?.playerCount || 0} / 8 Kursi
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  destinationRef.current = {
                    x: selectedTable.position[0],
                    z: selectedTable.position[2] + 3.0
                  };
                  setSelectedTable(null);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#cbd5e1',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Jalan ke Meja
              </button>
              <button
                onClick={() => handleEnterTable(selectedTable)}
                style={{
                  flex: 1.5,
                  padding: '12px',
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${selectedTable.tagColor}, #d97706)`,
                  color: '#0f172a',
                  fontWeight: 900,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: `0 4px 18px ${selectedTable.tagColor}55`
                }}
              >
                <Play size={16} fill="#0f172a" />
                <span>Masuk Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Rooms List Modal */}
      {showRoomListModal && (
        <div
          className="modal-overlay lobby-ui-element"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 45
          }}
          onClick={() => setShowRoomListModal(false)}
        >
          <div
            className="modal-card"
            style={{
              background: '#0f172a',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '540px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.85)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Compass size={22} color="#f59e0b" />
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#f8fafc' }}>
                  Daftar Meja Poker 3D
                </h2>
              </div>
              <button
                onClick={() => setShowRoomListModal(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#94a3b8',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
              {CASINO_TABLES.map(table => {
                const count = roomData[table.id]?.playerCount || 0;
                return (
                  <div
                    key={table.id}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid rgba(255,255,255,0.08)`,
                      borderRadius: '16px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: table.feltHex,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          color: '#fff',
                          border: '2px solid rgba(255,255,255,0.2)'
                        }}
                      >
                        ♠
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>
                            {table.name}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              color: table.tagColor,
                              background: 'rgba(255,255,255,0.08)',
                              padding: '1px 6px',
                              borderRadius: '999px'
                            }}
                          >
                            {table.category}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#fef08a', fontWeight: 600 }}>
                          Blind: Rp {table.smallBlind.toLocaleString('id-ID')} / Rp {table.bigBlind.toLocaleString('id-ID')}
                          <span style={{ color: '#94a3b8', marginLeft: '6px' }}>• 👥 {count}/8</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          destinationRef.current = {
                            x: table.position[0],
                            z: table.position[2] + 3.0
                          };
                          setShowRoomListModal(false);
                        }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.08)',
                          color: '#cbd5e1',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Jalan
                      </button>
                      <button
                        onClick={() => {
                          setShowRoomListModal(false);
                          handleEnterTable(table);
                        }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          background: `linear-gradient(135deg, ${table.tagColor}, #d97706)`,
                          color: '#0f172a',
                          fontSize: '12px',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        Masuk
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Edit Player Name Modal */}
      {isEditingName && (
        <div
          className="modal-overlay lobby-ui-element"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
          }}
          onClick={() => setIsEditingName(false)}
        >
          <div
            className="modal-card"
            style={{
              background: '#0f172a',
              border: '1px solid #f59e0b',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '380px',
              width: '90%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#f8fafc', marginBottom: '14px' }}>
              Ubah Nama Pemain
            </h3>
            <form onSubmit={handleSavePlayerName}>
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                maxLength={18}
                autoFocus
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 700,
                  marginBottom: '16px',
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#94a3b8',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#0f172a',
                    fontSize: '13px',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cinematic Transition Overlay to Table */}
      {isTransitioning && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#070a10',
            opacity: transitionProgress,
            pointerEvents: 'none',
            zIndex: 100,
            transition: 'opacity 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '4px solid #f59e0b',
              borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          <div style={{ color: '#fef08a', fontSize: '16px', fontWeight: 900, letterSpacing: '0.05em' }}>
            MEMASUKI MEJA POKER...
          </div>
        </div>
      )}
    </div>
  );
};
