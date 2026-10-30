import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Settings,
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
import { RoomInfo, WalletRecord } from '../types.js';

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
    position: [-6.5, 0, -2.5],
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
    position: [6.5, 0, -2.5],
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
    position: [-6.5, 0, 6.5],
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
    position: [6.5, 0, 6.5],
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

export const CASHIER_BOOTH_POS: [number, number, number] = [0, 0, -11.5];
export const ROULETTE_TABLE_POS: [number, number, number] = [17.0, 0, -3.0];
export const SLOT_MACHINE_POS: [number, number, number] = [-17.0, 0, -3.0];
export const CRASH_TERMINAL_POS: [number, number, number] = [-17.0, 0, 6.5];
export const BLACKJACK_TABLE_POS: [number, number, number] = [17.0, 0, 6.5];

export interface PythonQuizQuestion {
  code: string;
  question: string;
  options: { label: 'A' | 'B' | 'C' | 'D'; value: number }[];
  correctAnswer: number;
}

export function generatePythonAdditionQuiz(): PythonQuizQuestion {
  const pattern = Math.floor(Math.random() * 4);
  let code = '';
  let correctAnswer = 0;

  if (pattern === 0) {
    const a = (Math.floor(Math.random() * 18) + 2) * 10;
    const b = (Math.floor(Math.random() * 18) + 3) * 10;
    correctAnswer = a + b;
    code = `chip_awal = ${a}\nbonus = ${b}\ntotal = chip_awal + bonus\nprint(total)`;
  } else if (pattern === 1) {
    const a = (Math.floor(Math.random() * 9) + 1) * 10;
    const b = (Math.floor(Math.random() * 9) + 2) * 10;
    const c = (Math.floor(Math.random() * 9) + 1) * 10;
    correctAnswer = a + b + c;
    code = `a = ${a}\nb = ${b}\nc = ${c}\nhasil = a + b + c\nprint(hasil)`;
  } else if (pattern === 2) {
    const s = (Math.floor(Math.random() * 12) + 2) * 10;
    const add1 = (Math.floor(Math.random() * 10) + 1) * 10;
    const add2 = (Math.floor(Math.random() * 10) + 2) * 10;
    correctAnswer = s + add1 + add2;
    code = `saldo = ${s}\nsaldo += ${add1}\nsaldo += ${add2}\nprint(saldo)`;
  } else {
    const x = (Math.floor(Math.random() * 8) + 2) * 10;
    const y = (Math.floor(Math.random() * 8) + 3) * 10;
    const z = (Math.floor(Math.random() * 8) + 1) * 10;
    correctAnswer = x + y + z;
    code = `koin = [${x}, ${y}, ${z}]\ntotal = sum(koin)\nprint(total)`;
  }

  const wrongSet = new Set<number>();
  const offsets = [-30, -20, -10, 10, 20, 30, 40, -40, 50];
  while (wrongSet.size < 3) {
    const off = offsets[Math.floor(Math.random() * offsets.length)];
    const candidate = correctAnswer + off;
    if (candidate > 0 && candidate !== correctAnswer) {
      wrongSet.add(candidate);
    }
  }

  const rawValues = [correctAnswer, ...Array.from(wrongSet)];
  // Shuffle
  for (let i = rawValues.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rawValues[i], rawValues[j]] = [rawValues[j], rawValues[i]];
  }

  const labels: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  return {
    code,
    question: 'Berapakah hasil output dari print(...) pada kode Python di atas?',
    options: rawValues.map((val, idx) => ({ label: labels[idx], value: val })),
    correctAnswer
  };
}

interface Lobby3DProps {
  socket?: any;
  playerName: string;
  walletId?: string;
  walletBalance?: number;
  walletWins?: number;
  leaderboard?: WalletRecord[];
  onClaimRelief?: () => void;
  onUpdatePlayerName: (name: string) => void;
  onSelectTable: (roomId: string) => void;
  onSelectRoulette?: () => void;
  onSelectSlots?: () => void;
  onSelectCrash?: () => void;
  onSelectBlackjack?: () => void;
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
  walletId,
  walletBalance = 1000000,
  walletWins = 0,
  leaderboard = [],
  onClaimRelief,
  onUpdatePlayerName,
  onSelectTable,
  onSelectRoulette,
  onSelectSlots,
  onSelectCrash,
  onSelectBlackjack,
  isBgmPlaying,
  onToggleBgm,
  initialTableId
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // UI state
  const [roomData, setRoomData] = useState<Record<string, RoomInfo>>({});
  const [fetchedLeaderboard, setFetchedLeaderboard] = useState<WalletRecord[]>([]);
  const [nearbyTable, setNearbyTable] = useState<TableConfig | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableConfig | null>(null);
  const [isNearCashier, setIsNearCashier] = useState<boolean>(false);
  const [isNearRoulette, setIsNearRoulette] = useState<boolean>(false);
  const [isNearSlots, setIsNearSlots] = useState<boolean>(false);
  const [isNearCrash, setIsNearCrash] = useState<boolean>(false);
  const [isNearBlackjack, setIsNearBlackjack] = useState<boolean>(false);
  const [showPlayersPanel, setShowPlayersPanel] = useState<boolean>(true);
  const [showLeaderboardPanel, setShowLeaderboardPanel] = useState<boolean>(true);
  const [showCashierModal, setShowCashierModal] = useState<boolean>(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [pythonQuiz, setPythonQuiz] = useState<PythonQuizQuestion>(() => generatePythonAdditionQuiz());
  const [quizFeedback, setQuizFeedback] = useState<{ type: 'correct' | 'wrong'; message: string } | null>(null);
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
  const cashierSpotlightRef = useRef<THREE.SpotLight | null>(null);
  const cashierBillboardRef = useRef<THREE.Sprite | null>(null);
  const cashierNpcRightArmRef = useRef<THREE.Group | null>(null);
  const cashierNpcBodyRef = useRef<THREE.Mesh | null>(null);
  const isNearCashierRef = useRef<boolean>(false);
  const isNearRouletteRef = useRef<boolean>(false);
  const isNearSlotsRef = useRef<boolean>(false);
  const isNearCrashRef = useRef<boolean>(false);
  const isNearBlackjackRef = useRef<boolean>(false);
  const rouletteSpotlightRef = useRef<THREE.SpotLight | null>(null);
  const rouletteBillboardRef = useRef<THREE.Sprite | null>(null);
  const rouletteWheelMeshRef = useRef<THREE.Group | null>(null);
  const rouletteCroupierArmRef = useRef<THREE.Group | null>(null);
  const slotsSpotlightRef = useRef<THREE.SpotLight | null>(null);
  const slotsBillboardRef = useRef<THREE.Sprite | null>(null);
  const crashSpotlightRef = useRef<THREE.SpotLight | null>(null);
  const crashBillboardRef = useRef<THREE.Sprite | null>(null);
  const crashRocketMeshRef = useRef<THREE.Group | null>(null);
  const blackjackSpotlightRef = useRef<THREE.SpotLight | null>(null);
  const blackjackBillboardRef = useRef<THREE.Sprite | null>(null);
  const blackjackDealerArmRef = useRef<THREE.Group | null>(null);
  const isTransitioningRef = useRef<boolean>(false);
  const handleEnterTableRef = useRef<(table: TableConfig) => void>(() => {});
  const handleOpenCashierRef = useRef<() => void>(() => {});

  const handleOpenCashierModal = useCallback(() => {
    setPythonQuiz(generatePythonAdditionQuiz());
    setQuizFeedback(null);
    setShowCashierModal(true);
    soundEffects.playChatPop();
  }, []);

  handleOpenCashierRef.current = handleOpenCashierModal;

  const handleSelectQuizOption = (selectedValue: number) => {
    if (selectedValue === pythonQuiz.correctAnswer) {
      soundEffects.playWinFanfare();
      setQuizFeedback({
        type: 'correct',
        message: '🎉 Jawaban Benar! Selamat, saldo dompet Anda telah diisi ulang sebesar Rp 1.000.000!'
      });
      if (onClaimRelief) {
        onClaimRelief();
      }
    } else {
      soundEffects.playCheckSound();
      setQuizFeedback({
        type: 'wrong',
        message: '❌ Jawaban kurang tepat! Coba hitung lagi soal Python baru di bawah ini:'
      });
      setPythonQuiz(generatePythonAdditionQuiz());
    }
  };

  // Virtual Joystick touch state
  const joystickTouchRef = useRef<{ active: boolean; startX: number; startY: number; currX: number; currY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    currX: 0,
    currY: 0
  });

  // Fetch live table stats & leaderboard from server
  const fetchRoomStats = useCallback(async () => {
    try {
      const serverUrl = import.meta.env.VITE_SERVER_URL || '';
      const [resRooms, resLb] = await Promise.all([
        fetch(`${serverUrl}/api/rooms`),
        fetch(`${serverUrl}/api/leaderboard`)
      ]);
      if (resRooms.ok) {
        const rooms: RoomInfo[] = await resRooms.json();
        const map: Record<string, RoomInfo> = {};
        rooms.forEach(r => {
          map[r.roomId] = r;
        });
        setRoomData(map);
      }
      if (resLb.ok) {
        const lb: WalletRecord[] = await resLb.json();
        if (Array.isArray(lb)) {
          setFetchedLeaderboard(lb);
        }
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
      position: [playerPosRef.current.x, 0, playerPosRef.current.z],
      walletId,
      clientCachedBalance: walletBalance
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

  // Helper to create Cashier Booth (Loket Isi Ulang Chip NPC) Billboard Texture
  const createCashierBillboardTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 512, 256);

    // Glowing emerald & gold card
    ctx.fillStyle = 'rgba(6, 46, 34, 0.94)';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(16, 16, 480, 224, 32);
    ctx.fill();
    ctx.stroke();

    // Banner
    ctx.fillStyle = '#34d399';
    ctx.font = '900 22px "Outfit", sans-serif';
    ctx.fillText('🏦 LOKET BANK CHIP • KUIS PYTHON', 38, 60);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 34px "Outfit", sans-serif';
    ctx.fillText('Isi Ulang Rp 1.000.000', 38, 108);

    // Subtitle
    ctx.fillStyle = '#fef08a';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText('Jawab 1 Soal Python (Saat Chip Rp 0)', 38, 152);

    // NPC Badge pill
    ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
    ctx.beginPath();
    ctx.roundRect(38, 174, 240, 44, 22);
    ctx.fill();

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 21px "Outfit", sans-serif';
    ctx.fillText('👨‍💻 NPC: Pak Python', 54, 204);

    // CTA
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 22px "Outfit", sans-serif';
    ctx.fillText('Dekati [E] →', 310, 204);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  };

  // Helper to create Compact European Roulette Floating Pill Texture
  const createRouletteBillboardTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 480, 128);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(14, 18, 452, 92, 46);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(58, 64, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎡', 58, 65);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 27px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('European Roulette VIP', 98, 65);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  };

  // Helper to create Compact Slot Machine Row Floating Pill Texture
  const createSlotsBillboardTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 480, 128);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(14, 18, 452, 92, 46);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(58, 64, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎰', 58, 65);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 27px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Mesin Slot 777 Jackpot', 98, 65);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  };

  // Helper to create Compact Crash Aviator Floating Pill Texture
  const createCrashBillboardTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 480, 128);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(14, 18, 452, 92, 46);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(58, 64, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚀', 58, 65);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 27px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Crash Aviator Roket', 98, 65);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  };

  // Helper to create Compact Blackjack 21 Floating Pill Texture
  const createBlackjackBillboardTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 480, 128);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(14, 18, 452, 92, 46);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(58, 64, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🃏', 58, 65);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 27px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Blackjack 21 VIP Table', 98, 65);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
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

    // 5. Room Geometry (Grand Luxury VIP Casino & Poker Lounge)
    const roomWidth = 48;
    const roomDepth = 32;
    const roomHeight = 9.5;

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
    [-18, -10, -2, 6, 14].forEach(px => {
      const p = new THREE.Mesh(pilasterGeo, borderMat);
      p.position.set(px, roomHeight / 2, -roomDepth / 2 + 0.25);
      p.castShadow = true;
      p.receiveShadow = true;
      scene.add(p);
    });

    // Wall Sconces with warm point lights
    const sconcePositions = [
      [-18, 4.5, -roomDepth / 2 + 0.5],
      [-10, 4.5, -roomDepth / 2 + 0.5],
      [-2, 4.5, -roomDepth / 2 + 0.5],
      [6, 4.5, -roomDepth / 2 + 0.5],
      [14, 4.5, -roomDepth / 2 + 0.5],
      [-roomWidth / 2 + 0.5, 4.5, -6],
      [-roomWidth / 2 + 0.5, 4.5, 6],
      [roomWidth / 2 - 0.5, 4.5, -6],
      [roomWidth / 2 - 0.5, 4.5, 6]
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

    // 6b. Build 3D Cashier Booth (Loket Isi Ulang Chip) & NPC "Pak Python" at Center-North [0, 0, -9.0]
    const cashierGroup = new THREE.Group();
    cashierGroup.position.set(...CASHIER_BOOTH_POS);
    cashierGroup.name = 'cashier_booth';

    // Golden Emerald Base Platform
    const boothPlatform = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.14, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.4, metalness: 0.3 })
    );
    boothPlatform.position.set(0, 0.07, -0.2);
    boothPlatform.receiveShadow = true;
    cashierGroup.add(boothPlatform);

    // Front Counter Desk Body
    const counterBody = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 1.15, 0.85),
      new THREE.MeshStandardMaterial({ color: 0x1e130c, roughness: 0.35, metalness: 0.25 })
    );
    counterBody.position.set(0, 0.64, 0.55);
    counterBody.castShadow = true;
    counterBody.receiveShadow = true;
    cashierGroup.add(counterBody);

    // Gold Front Trim Bars on Counter
    for (let gx = -1.3; gx <= 1.3; gx += 0.65) {
      const goldBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.05, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.85 })
      );
      goldBar.position.set(gx, 0.64, 0.99);
      cashierGroup.add(goldBar);
    }

    // White & Gold Marble Counter Top
    const counterTop = new THREE.Mesh(
      new THREE.BoxGeometry(3.65, 0.14, 1.05),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15, metalness: 0.15 })
    );
    counterTop.position.set(0, 1.25, 0.55);
    counterTop.castShadow = true;
    cashierGroup.add(counterTop);

    // Side Golden Pillars & Top Canopy Arch
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.85 });
    const leftPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.5, 16), pillarMat);
    leftPillar.position.set(-1.55, 2.0, 0.55);
    cashierGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.5, 16), pillarMat);
    rightPillar.position.set(1.55, 2.0, 0.55);
    cashierGroup.add(rightPillar);

    const canopyBeam = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.22, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.3, metalness: 0.5 })
    );
    canopyBeam.position.set(0, 2.75, 0.55);
    cashierGroup.add(canopyBeam);

    // Bank Glass Partition with Teller Window Cutout Effect
    const tellerGlass = new THREE.Mesh(
      new THREE.BoxGeometry(2.9, 0.9, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xa7f3d0, transparent: true, opacity: 0.22, roughness: 0.1 })
    );
    tellerGlass.position.set(0, 1.95, 0.55);
    cashierGroup.add(tellerGlass);

    // 3D Gold Ingots & Chip Stacks on Counter Top
    const ingotMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.2, metalness: 0.9 });
    [-0.95, -0.7, 0.7, 0.95].forEach((ix, idx) => {
      const ingot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.34), ingotMat);
      ingot.position.set(ix, 1.37, 0.55 + (idx % 2 === 0 ? -0.1 : 0.1));
      ingot.castShadow = true;
      cashierGroup.add(ingot);
    });

    // NPC Character "Pak Python" standing behind the counter
    const npcAvatar = createAvatar('🏦 PAK PYTHON (NPC)', 3, false);
    npcAvatar.group.position.set(0, 0.08, -0.35);
    npcAvatar.group.rotation.y = 0; // Facing South towards players
    cashierNpcRightArmRef.current = npcAvatar.rightArm;
    cashierNpcBodyRef.current = npcAvatar.bodyMesh;
    cashierGroup.add(npcAvatar.group);

    // Floating 3D Billboard above Cashier Booth
    const cashierBillboardTex = createCashierBillboardTexture();
    const cashierBillboardMat = new THREE.SpriteMaterial({ map: cashierBillboardTex, transparent: true });
    const cashierBillboardSprite = new THREE.Sprite(cashierBillboardMat);
    cashierBillboardSprite.scale.set(4.3, 2.15, 1.0);
    cashierBillboardSprite.position.set(0, 3.85, 0.2);
    cashierGroup.add(cashierBillboardSprite);
    cashierBillboardRef.current = cashierBillboardSprite;

    // Spotlight over Cashier Booth
    const cashierSpot = new THREE.SpotLight(0x6ee7b7, 2.0);
    cashierSpot.position.set(CASHIER_BOOTH_POS[0], 5.0, CASHIER_BOOTH_POS[2] + 1.5);
    cashierSpot.target = cashierGroup;
    cashierSpot.angle = 0.6;
    cashierSpot.penumbra = 0.5;
    cashierSpot.distance = 10;
    scene.add(cashierSpot);
    cashierSpotlightRef.current = cashierSpot;

    scene.add(cashierGroup);

    // 6c. Build Grand European Roulette Table at ROULETTE_TABLE_POS [20.0, 0, 2.0]
    const rouletteGroup = new THREE.Group();
    rouletteGroup.position.set(...ROULETTE_TABLE_POS);
    rouletteGroup.name = 'roulette_table';

    // Mahogany Pedestal Table Base
    const rouletteBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.95, 0.95, 24),
      new THREE.MeshStandardMaterial({ color: 0x1c0f09, roughness: 0.35, metalness: 0.25 })
    );
    rouletteBase.position.y = 0.475;
    rouletteBase.castShadow = true;
    rouletteGroup.add(rouletteBase);

    // Oval Green Roulette Felt
    const rouletteFelt = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.16, 2.8),
      new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.5, metalness: 0.1 })
    );
    rouletteFelt.position.y = 1.0;
    rouletteFelt.castShadow = true;
    rouletteFelt.receiveShadow = true;
    rouletteGroup.add(rouletteFelt);

    // Mahogany Curved Leather Armrest Rim
    const rouletteRim = new THREE.Mesh(
      new THREE.BoxGeometry(5.1, 0.18, 3.1),
      new THREE.MeshStandardMaterial({ color: 0x241208, roughness: 0.25, metalness: 0.3 })
    );
    rouletteRim.position.y = 0.95;
    rouletteGroup.add(rouletteRim);

    // Gold Number Grid on Felt
    const rouletteGrid = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.3 })
    );
    rouletteGrid.rotation.x = -Math.PI / 2;
    rouletteGrid.position.set(0.8, 1.09, 0);
    rouletteGroup.add(rouletteGrid);

    // 3D Roulette Wheel Cylinder
    const wheelBowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.75, 0.28, 32),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2, metalness: 0.85 })
    );
    wheelBowl.position.set(-1.2, 1.14, 0);
    rouletteGroup.add(wheelBowl);

    // Rotating Wheel Head
    const wheelInner = new THREE.Group();
    wheelInner.position.set(-1.2, 1.25, 0);
    const wheelSpindle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.18, 16),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.1, metalness: 0.95 })
    );
    wheelInner.add(wheelSpindle);
    const wheelDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.68, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.3, metalness: 0.4 })
    );
    wheelInner.add(wheelDisc);
    rouletteGroup.add(wheelInner);
    rouletteWheelMeshRef.current = wheelInner;

    // Croupier NPC Clara behind wheel
    const claraAvatar = createAvatar('Mbak Clara', 1, false);
    claraAvatar.group.position.set(-1.2, 0, -1.6);
    claraAvatar.group.rotation.y = 0;
    rouletteCroupierArmRef.current = claraAvatar.rightArm;
    rouletteGroup.add(claraAvatar.group);

    // Roulette Spotlight
    const rouletteSpot = new THREE.SpotLight(0xf59e0b, 2.2);
    rouletteSpot.position.set(ROULETTE_TABLE_POS[0], 5.5, ROULETTE_TABLE_POS[2] + 1.2);
    rouletteSpot.target = rouletteGroup;
    rouletteSpot.angle = 0.65;
    rouletteSpot.penumbra = 0.45;
    rouletteSpot.distance = 12;
    scene.add(rouletteSpot);
    rouletteSpotlightRef.current = rouletteSpot;

    // Billboard Sprite
    const rouletteBillboardTex = createRouletteBillboardTexture();
    const rouletteBillboardSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: rouletteBillboardTex, transparent: true })
    );
    rouletteBillboardSprite.scale.set(2.8, 0.75, 1.0);
    rouletteBillboardSprite.position.set(0, 3.55, 0.2);
    rouletteGroup.add(rouletteBillboardSprite);
    rouletteBillboardRef.current = rouletteBillboardSprite;

    scene.add(rouletteGroup);

    // 6d. Build 777 Slot Machine Arcade Row at SLOT_MACHINE_POS [-20.0, 0, 2.0]
    const slotsGroup = new THREE.Group();
    slotsGroup.position.set(...SLOT_MACHINE_POS);
    slotsGroup.name = 'slot_machine_row';

    const slotXPositions = [-1.8, 0, 1.8];
    slotXPositions.forEach((sx, idx) => {
      const cabinetGroup = new THREE.Group();
      cabinetGroup.position.set(sx, 0, 0);

      // Main Cabinet Body
      const cabBody = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 2.4, 1.1),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.6 })
      );
      cabBody.position.y = 1.2;
      cabBody.castShadow = true;
      cabinetGroup.add(cabBody);

      // Gold Trim Edge
      const cabTrim = new THREE.Mesh(
        new THREE.BoxGeometry(1.36, 0.08, 1.16),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.85 })
      );
      cabTrim.position.y = 2.42;
      cabinetGroup.add(cabTrim);

      // Neon Top Marquee ("777")
      const marquee = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.5, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.8 })
      );
      marquee.position.set(0, 2.15, 0.5);
      cabinetGroup.add(marquee);

      // Glass Reel Display Screen
      const screenDisplay = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.75, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.1 })
      );
      screenDisplay.position.set(0, 1.45, 0.53);
      cabinetGroup.add(screenDisplay);

      // Pull Lever on right side
      const leverBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8),
        new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9 })
      );
      leverBase.position.set(0.72, 1.45, 0.15);
      leverBase.rotation.z = -0.35;
      cabinetGroup.add(leverBase);

      const leverKnob = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.2 })
      );
      leverKnob.position.set(0.82, 1.62, 0.15);
      cabinetGroup.add(leverKnob);

      slotsGroup.add(cabinetGroup);
    });

    // NPC Budi in front of center machine
    const budiAvatar = createAvatar('Budi', 3, false);
    budiAvatar.group.position.set(0, 0, 1.55);
    budiAvatar.group.rotation.y = Math.PI;
    budiAvatar.rightArm.rotation.x = -1.1;
    slotsGroup.add(budiAvatar.group);

    // Slots Spotlight
    const slotsSpot = new THREE.SpotLight(0xef4444, 2.2);
    slotsSpot.position.set(SLOT_MACHINE_POS[0], 5.5, SLOT_MACHINE_POS[2] + 1.2);
    slotsSpot.target = slotsGroup;
    slotsSpot.angle = 0.65;
    slotsSpot.penumbra = 0.45;
    slotsSpot.distance = 12;
    scene.add(slotsSpot);
    slotsSpotlightRef.current = slotsSpot;

    // Billboard Sprite
    const slotsBillboardTex = createSlotsBillboardTexture();
    const slotsBillboardSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: slotsBillboardTex, transparent: true })
    );
    slotsBillboardSprite.scale.set(2.8, 0.75, 1.0);
    slotsBillboardSprite.position.set(0, 3.65, 0.3);
    slotsGroup.add(slotsBillboardSprite);
    slotsBillboardRef.current = slotsBillboardSprite;

    scene.add(slotsGroup);

    // 6e. Build Crash Aviator Launchpad Terminal at CRASH_TERMINAL_POS [-15.0, 0, -11.0]
    const crashGroup = new THREE.Group();
    crashGroup.position.set(...CRASH_TERMINAL_POS);
    crashGroup.name = 'crash_terminal';

    // Octagonal Launchpad Pedestal Base
    const launchpadBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.4, 0.22, 8),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.7 })
    );
    launchpadBase.position.y = 0.11;
    launchpadBase.receiveShadow = true;
    crashGroup.add(launchpadBase);

    // Runway Glowing Ring
    const runwayRing = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 1.9, 32),
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xf97316,
        emissiveIntensity: 0.8,
        side: THREE.DoubleSide
      })
    );
    runwayRing.rotation.x = -Math.PI / 2;
    runwayRing.position.y = 0.23;
    crashGroup.add(runwayRing);

    // Floating 3D Rocket Group
    const rocketMeshGroup = new THREE.Group();
    rocketMeshGroup.position.set(0, 1.35, 0);

    // Fuselage (Body)
    const rocketBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.38, 1.2, 24),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.5 })
    );
    rocketMeshGroup.add(rocketBody);

    // Nose Cone
    const rocketNose = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.65, 24),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.2, metalness: 0.6 })
    );
    rocketNose.position.y = 0.92;
    rocketMeshGroup.add(rocketNose);

    // Cockpit Window (Cyan Visor)
    const rocketVisor = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.8 })
    );
    rocketVisor.position.set(0, 0.35, 0.24);
    rocketVisor.scale.set(1, 1.2, 0.8);
    rocketMeshGroup.add(rocketVisor);

    // 3 Aerodynamic Fins
    for (let f = 0; f < 3; f++) {
      const finAngle = (f / 3) * Math.PI * 2;
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.5, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.5 })
      );
      fin.position.set(Math.cos(finAngle) * 0.38, -0.42, Math.sin(finAngle) * 0.38);
      fin.rotation.y = -finAngle;
      rocketMeshGroup.add(fin);
    }

    // Exhaust Thruster Plume Flame
    const thrusterFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.6, 16),
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xfbbf24,
        emissiveIntensity: 1.2,
        roughness: 0.1
      })
    );
    thrusterFlame.position.y = -0.85;
    thrusterFlame.rotation.x = Math.PI;
    rocketMeshGroup.add(thrusterFlame);

    crashGroup.add(rocketMeshGroup);
    crashRocketMeshRef.current = rocketMeshGroup;

    // Crash Spotlight
    const crashSpot = new THREE.SpotLight(0xf97316, 2.5);
    crashSpot.position.set(CRASH_TERMINAL_POS[0], 5.5, CRASH_TERMINAL_POS[2] + 1.5);
    crashSpot.target = crashGroup;
    crashSpot.angle = 0.65;
    crashSpot.penumbra = 0.45;
    crashSpot.distance = 12;
    scene.add(crashSpot);
    crashSpotlightRef.current = crashSpot;

    // Billboard Sprite
    const crashBillboardTex = createCrashBillboardTexture();
    const crashBillboardSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: crashBillboardTex, transparent: true })
    );
    crashBillboardSprite.scale.set(2.8, 0.75, 1.0);
    crashBillboardSprite.position.set(0, 3.65, 0.2);
    crashGroup.add(crashBillboardSprite);
    crashBillboardRef.current = crashBillboardSprite;

    scene.add(crashGroup);

    // 6f. Build VIP Blackjack 21 Table at BLACKJACK_TABLE_POS [15.0, 0, -11.0]
    const blackjackGroup = new THREE.Group();
    blackjackGroup.position.set(...BLACKJACK_TABLE_POS);
    blackjackGroup.name = 'blackjack_table';

    // Pedestal Base
    const bjBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.95, 0.95, 24),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.35, metalness: 0.3 })
    );
    bjBase.position.y = 0.475;
    bjBase.castShadow = true;
    blackjackGroup.add(bjBase);

    // Semicircular Green Felt
    const bjFelt = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.3, 0.16, 32, 1, false, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.48, metalness: 0.12 })
    );
    bjFelt.position.set(0, 1.0, 0);
    bjFelt.rotation.y = Math.PI;
    bjFelt.castShadow = true;
    bjFelt.receiveShadow = true;
    blackjackGroup.add(bjFelt);

    // Padded Leather Rail
    const bjRail = new THREE.Mesh(
      new THREE.CylinderGeometry(2.45, 2.45, 0.18, 32, 1, false, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x241208, roughness: 0.25, metalness: 0.4 })
    );
    bjRail.position.set(0, 0.95, 0);
    bjRail.rotation.y = Math.PI;
    blackjackGroup.add(bjRail);

    // Card Dealing Shoe on felt
    const bjShoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.2, 0.55),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2, metalness: 0.85 })
    );
    bjShoe.position.set(1.1, 1.15, -0.4);
    bjShoe.rotation.y = -0.4;
    blackjackGroup.add(bjShoe);

    // Chip Tray
    const bjChipTray = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.12, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.3, metalness: 0.6 })
    );
    bjChipTray.position.set(0, 1.12, -0.7);
    blackjackGroup.add(bjChipTray);

    // Dealer Roy NPC behind table
    const royAvatar = createAvatar('Dealer Roy', 0, false);
    royAvatar.group.position.set(0, 0, -1.55);
    royAvatar.group.rotation.y = 0;
    blackjackDealerArmRef.current = royAvatar.rightArm;
    blackjackGroup.add(royAvatar.group);

    // Blackjack Spotlight
    const bjSpot = new THREE.SpotLight(0x10b981, 2.5);
    bjSpot.position.set(BLACKJACK_TABLE_POS[0], 5.5, BLACKJACK_TABLE_POS[2] + 1.5);
    bjSpot.target = blackjackGroup;
    bjSpot.angle = 0.65;
    bjSpot.penumbra = 0.45;
    bjSpot.distance = 12;
    scene.add(bjSpot);
    blackjackSpotlightRef.current = bjSpot;

    // Billboard Sprite
    const bjBillboardTex = createBlackjackBillboardTexture();
    const bjBillboardSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: bjBillboardTex, transparent: true })
    );
    bjBillboardSprite.scale.set(2.8, 0.75, 1.0);
    bjBillboardSprite.position.set(0, 3.65, 0.2);
    blackjackGroup.add(bjBillboardSprite);
    blackjackBillboardRef.current = bjBillboardSprite;

    scene.add(blackjackGroup);



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
        } else if (isNearCashierRef.current) {
          e.preventDefault();
          e.stopPropagation();
          handleOpenCashierRef.current();
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

      // Check click on Roulette table
      const rouletteObj = scene.getObjectByName('roulette_table');
      if (rouletteObj && raycaster.intersectObjects(rouletteObj.children, true).length > 0) {
        destinationRef.current = { x: ROULETTE_TABLE_POS[0], z: ROULETTE_TABLE_POS[2] + 2.8 };
        if (isNearRouletteRef.current) {
          soundEffects.playEnterTable();
          onSelectRoulette?.();
        } else {
          showLoungeToast('🎡 Berjalan menuju Meja Roulette Eropa...');
        }
        return;
      }

      // Check click on Slot Machine arcade row
      const slotsObj = scene.getObjectByName('slot_machine_row');
      if (slotsObj && raycaster.intersectObjects(slotsObj.children, true).length > 0) {
        destinationRef.current = { x: SLOT_MACHINE_POS[0], z: SLOT_MACHINE_POS[2] + 2.8 };
        if (isNearSlotsRef.current) {
          soundEffects.playEnterTable();
          onSelectSlots?.();
        } else {
          showLoungeToast('🎰 Berjalan menuju Mesin Slot 777 Jackpot...');
        }
        return;
      }

      // Check click on Crash Terminal
      const crashObj = scene.getObjectByName('crash_terminal');
      if (crashObj && raycaster.intersectObjects(crashObj.children, true).length > 0) {
        destinationRef.current = { x: CRASH_TERMINAL_POS[0], z: CRASH_TERMINAL_POS[2] + 2.8 };
        if (isNearCrashRef.current) {
          soundEffects.playEnterTable();
          onSelectCrash?.();
        } else {
          showLoungeToast('🚀 Berjalan menuju Crash Aviator Launchpad...');
        }
        return;
      }

      // Check click on Blackjack table
      const bjObj = scene.getObjectByName('blackjack_table');
      if (bjObj && raycaster.intersectObjects(bjObj.children, true).length > 0) {
        destinationRef.current = { x: BLACKJACK_TABLE_POS[0], z: BLACKJACK_TABLE_POS[2] + 2.8 };
        if (isNearBlackjackRef.current) {
          soundEffects.playEnterTable();
          onSelectBlackjack?.();
        } else {
          showLoungeToast('🃏 Berjalan menuju Meja Blackjack 21 VIP...');
        }
        return;
      }

      // Check click on Cashier Booth (Loket Isi Ulang Chip NPC)
      const cashierObj = scene.getObjectByName('cashier_booth');
      if (cashierObj) {
        const cashierHits = raycaster.intersectObjects(cashierObj.children, true);
        if (cashierHits.length > 0) {
          destinationRef.current = {
            x: CASHIER_BOOTH_POS[0],
            z: CASHIER_BOOTH_POS[2] + 2.7
          };
          if (isNearCashierRef.current) {
            handleOpenCashierRef.current();
          } else {
            showLoungeToast('🏦 Berjalan menuju Loket Kasir NPC (Pak Python)...');
          }
          return;
        }
      }

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

      // Boundaries (Stay inside spacious VIP lounge)
      playerPosRef.current.x = Math.max(-21.5, Math.min(21.5, playerPosRef.current.x));
      playerPosRef.current.z = Math.max(-14.0, Math.min(14.0, playerPosRef.current.z));

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

      // Cashier Booth Collision check (keep player in front of counter desk)
      {
        const cdx = playerPosRef.current.x - CASHIER_BOOTH_POS[0];
        const cdz = playerPosRef.current.z - CASHIER_BOOTH_POS[2];
        const cdist = Math.hypot(cdx, cdz);
        const cMinRadius = 1.9;
        if (cdist < cMinRadius && cdist > 0.001) {
          const push = (cMinRadius - cdist) / cdist;
          playerPosRef.current.x += cdx * push;
          playerPosRef.current.z += cdz * push;
        }
      }

      // Roulette Table Collision check
      {
        const rdx = playerPosRef.current.x - ROULETTE_TABLE_POS[0];
        const rdz = playerPosRef.current.z - ROULETTE_TABLE_POS[2];
        const rdist = Math.hypot(rdx, rdz);
        const rMinRadius = 2.4;
        if (rdist < rMinRadius && rdist > 0.001) {
          const push = (rMinRadius - rdist) / rdist;
          playerPosRef.current.x += rdx * push;
          playerPosRef.current.z += rdz * push;
        }
      }

      // Slot Machines Collision check
      {
        const sdx = playerPosRef.current.x - SLOT_MACHINE_POS[0];
        const sdz = playerPosRef.current.z - SLOT_MACHINE_POS[2];
        const sdist = Math.hypot(sdx, sdz);
        const sMinRadius = 2.4;
        if (sdist < sMinRadius && sdist > 0.001) {
          const push = (sMinRadius - sdist) / sdist;
          playerPosRef.current.x += sdx * push;
          playerPosRef.current.z += sdz * push;
        }
      }

      // Crash Terminal Collision check
      {
        const ctdx = playerPosRef.current.x - CRASH_TERMINAL_POS[0];
        const ctdz = playerPosRef.current.z - CRASH_TERMINAL_POS[2];
        const ctDist = Math.hypot(ctdx, ctdz);
        const ctMinRadius = 2.2;
        if (ctDist < ctMinRadius && ctDist > 0.001) {
          const push = (ctMinRadius - ctDist) / ctDist;
          playerPosRef.current.x += ctdx * push;
          playerPosRef.current.z += ctdz * push;
        }
      }

      // Blackjack Table Collision check
      {
        const bjdx = playerPosRef.current.x - BLACKJACK_TABLE_POS[0];
        const bjdz = playerPosRef.current.z - BLACKJACK_TABLE_POS[2];
        const bjDist = Math.hypot(bjdx, bjdz);
        const bjMinRadius = 2.4;
        if (bjDist < bjMinRadius && bjDist > 0.001) {
          const push = (bjMinRadius - bjDist) / bjDist;
          playerPosRef.current.x += bjdx * push;
          playerPosRef.current.z += bjdz * push;
        }
      }

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

      // Proximity Detection & Animation for Cashier Booth (Loket Isi Ulang Chip NPC)
      const cashierDist = Math.hypot(
        playerPosRef.current.x - CASHIER_BOOTH_POS[0],
        playerPosRef.current.z - (CASHIER_BOOTH_POS[2] + 0.8)
      );
      const nearCashier = cashierDist < 4.2 && !closest;
      isNearCashierRef.current = nearCashier;
      setIsNearCashier(nearCashier);

      if (cashierSpotlightRef.current) {
        cashierSpotlightRef.current.intensity = nearCashier ? 3.2 : 2.0;
      }
      if (cashierBillboardRef.current) {
        if (nearCashier) {
          cashierBillboardRef.current.scale.set(4.8, 2.4, 1.0);
          cashierBillboardRef.current.position.y = 3.95 + Math.sin(time * 0.004) * 0.08;
        } else {
          cashierBillboardRef.current.scale.set(4.3, 2.15, 1.0);
          cashierBillboardRef.current.position.y = 3.85;
        }
      }
      // NPC Pak Python friendly idle wave & breathing
      if (cashierNpcRightArmRef.current) {
        cashierNpcRightArmRef.current.rotation.z = nearCashier
          ? -2.35 + Math.sin(time * 0.009) * 0.35
          : Math.sin(time * 0.002) * 0.08;
      }
      if (cashierNpcBodyRef.current) {
        cashierNpcBodyRef.current.position.y = 1.35 + Math.sin(time * 0.003) * 0.025;
      }

      // Proximity Detection & Animation for Grand European Roulette Table
      const rouletteDist = Math.hypot(
        playerPosRef.current.x - ROULETTE_TABLE_POS[0],
        playerPosRef.current.z - ROULETTE_TABLE_POS[2]
      );
      const nearRoulette = rouletteDist < 4.8 && !closest && !nearCashier;
      isNearRouletteRef.current = nearRoulette;
      setIsNearRoulette(nearRoulette);

      if (rouletteSpotlightRef.current) {
        rouletteSpotlightRef.current.intensity = nearRoulette ? 3.4 : 2.2;
      }
      if (rouletteBillboardRef.current) {
        if (nearRoulette) {
          rouletteBillboardRef.current.scale.set(3.1, 0.83, 1.0);
          rouletteBillboardRef.current.position.y = 3.65 + Math.sin(time * 0.004) * 0.06;
        } else {
          rouletteBillboardRef.current.scale.set(2.8, 0.75, 1.0);
          rouletteBillboardRef.current.position.y = 3.55;
        }
      }
      if (rouletteWheelMeshRef.current) {
        rouletteWheelMeshRef.current.rotation.y += delta * 0.45;
      }
      if (rouletteCroupierArmRef.current) {
        rouletteCroupierArmRef.current.rotation.x = -0.55 + Math.sin(time * 0.0025) * 0.2;
      }

      // Proximity Detection & Animation for Slot Machine Arcade Zone
      const slotsDist = Math.hypot(
        playerPosRef.current.x - SLOT_MACHINE_POS[0],
        playerPosRef.current.z - SLOT_MACHINE_POS[2]
      );
      const nearSlots = slotsDist < 4.8 && !closest && !nearCashier && !nearRoulette;
      isNearSlotsRef.current = nearSlots;
      setIsNearSlots(nearSlots);

      if (slotsSpotlightRef.current) {
        slotsSpotlightRef.current.intensity = nearSlots ? 3.4 : 2.2;
      }
      if (slotsBillboardRef.current) {
        if (nearSlots) {
          slotsBillboardRef.current.scale.set(3.1, 0.83, 1.0);
          slotsBillboardRef.current.position.y = 3.75 + Math.sin(time * 0.004) * 0.06;
        } else {
          slotsBillboardRef.current.scale.set(2.8, 0.75, 1.0);
          slotsBillboardRef.current.position.y = 3.65;
        }
      }

      // Proximity Detection & Animation for Crash Aviator Terminal
      const crashDist = Math.hypot(
        playerPosRef.current.x - CRASH_TERMINAL_POS[0],
        playerPosRef.current.z - CRASH_TERMINAL_POS[2]
      );
      const nearCrash = crashDist < 4.8 && !closest && !nearCashier && !nearRoulette && !nearSlots;
      isNearCrashRef.current = nearCrash;
      setIsNearCrash(nearCrash);

      if (crashSpotlightRef.current) {
        crashSpotlightRef.current.intensity = nearCrash ? 3.6 : 2.5;
      }
      if (crashBillboardRef.current) {
        if (nearCrash) {
          crashBillboardRef.current.scale.set(3.1, 0.83, 1.0);
          crashBillboardRef.current.position.y = 3.75 + Math.sin(time * 0.004) * 0.06;
        } else {
          crashBillboardRef.current.scale.set(2.8, 0.75, 1.0);
          crashBillboardRef.current.position.y = 3.65;
        }
      }
      if (crashRocketMeshRef.current) {
        crashRocketMeshRef.current.rotation.y += delta * 0.8;
        crashRocketMeshRef.current.position.y = 1.35 + Math.sin(time * 0.003) * 0.08;
      }

      // Proximity Detection & Animation for VIP Blackjack 21 Table
      const bjDist = Math.hypot(
        playerPosRef.current.x - BLACKJACK_TABLE_POS[0],
        playerPosRef.current.z - BLACKJACK_TABLE_POS[2]
      );
      const nearBlackjack = bjDist < 4.8 && !closest && !nearCashier && !nearRoulette && !nearSlots && !nearCrash;
      isNearBlackjackRef.current = nearBlackjack;
      setIsNearBlackjack(nearBlackjack);

      if (blackjackSpotlightRef.current) {
        blackjackSpotlightRef.current.intensity = nearBlackjack ? 3.6 : 2.5;
      }
      if (blackjackBillboardRef.current) {
        if (nearBlackjack) {
          blackjackBillboardRef.current.scale.set(3.1, 0.83, 1.0);
          blackjackBillboardRef.current.position.y = 3.75 + Math.sin(time * 0.004) * 0.06;
        } else {
          blackjackBillboardRef.current.scale.set(2.8, 0.75, 1.0);
          blackjackBillboardRef.current.position.y = 3.65;
        }
      }
      if (blackjackDealerArmRef.current) {
        blackjackDealerArmRef.current.rotation.x = -0.45 + Math.sin(time * 0.002) * 0.15;
      }



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
      // Pre-join the poker room during the camera zoom so tableState is ready immediately
      socket.emit('joinRoom', { roomId: table.id, playerName });
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
        } else if (isNearCashier && !isTransitioning && !showCashierModal) {
          e.preventDefault();
          e.stopPropagation();
          handleOpenCashierModal();
        } else if (isNearRoulette && !isTransitioning) {
          e.preventDefault();
          e.stopPropagation();
          soundEffects.playEnterTable();
          onSelectRoulette?.();
        } else if (isNearSlots && !isTransitioning) {
          e.preventDefault();
          e.stopPropagation();
          soundEffects.playEnterTable();
          onSelectSlots?.();
        } else if (isNearCrash && !isTransitioning) {
          e.preventDefault();
          e.stopPropagation();
          soundEffects.playEnterTable();
          onSelectCrash?.();
        } else if (isNearBlackjack && !isTransitioning) {
          e.preventDefault();
          e.stopPropagation();
          soundEffects.playEnterTable();
          onSelectBlackjack?.();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKey, true);
    return () => window.removeEventListener('keydown', handleGlobalKey, true);
  }, [nearbyTable, isNearCashier, isNearRoulette, isNearSlots, isNearCrash, isNearBlackjack, isTransitioning, showCashierModal, handleOpenCashierModal, onSelectRoulette, onSelectSlots, onSelectCrash, onSelectBlackjack]);

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

        {/* Top Actions: Saldo di Atas & Menu Pengaturan Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Persistent Wallet Balance Pill (Tetap di Atas Sesuai Request) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.92), rgba(4, 47, 46, 0.95))',
              backdropFilter: 'blur(12px)',
              padding: '8px 18px',
              borderRadius: '999px',
              border: '1.5px solid rgba(52, 211, 153, 0.6)',
              boxShadow: '0 4px 18px rgba(16, 185, 129, 0.3)',
              color: '#a7f3d0',
              fontSize: '13.5px',
              fontWeight: 900
            }}
            title="Saldo Chip Anda (Tersimpan Otomatis)"
          >
            <span>💰 Saldo:</span>
            <span style={{ color: '#fef08a', fontFamily: 'monospace', fontSize: '15px' }}>
              Rp {walletBalance.toLocaleString('id-ID')}
            </span>
            {walletWins > 0 && (
              <span
                style={{
                  fontSize: '11px',
                  background: 'rgba(245, 158, 11, 0.25)',
                  border: '1px solid rgba(245, 158, 11, 0.5)',
                  color: '#fde68a',
                  padding: '2px 8px',
                  borderRadius: '999px'
                }}
              >
                🏆 {walletWins}x
              </span>
            )}
            {walletBalance <= 0 && (
              <button
                onClick={() => {
                  destinationRef.current = {
                    x: CASHIER_BOOTH_POS[0],
                    z: CASHIER_BOOTH_POS[2] + 2.7
                  };
                  showLoungeToast('🏦 Berjalan menuju Loket Kasir NPC (Pak Python)...');
                }}
                style={{
                  marginLeft: '4px',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#0f172a',
                  fontSize: '11px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  border: 'none'
                }}
                title="Jalan ke Loket Kasir NPC untuk menjawab Kuis Python (+Rp 1.000.000)"
              >
                🏦 Ke Loket NPC
              </button>
            )}
          </div>

          {/* Icon Setting & Menu Tunggal (Klik untuk membuka ke bawah) */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSettingsMenu(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: showSettingsMenu
                  ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.35), rgba(217, 119, 6, 0.5))'
                  : 'rgba(15, 23, 42, 0.88)',
                backdropFilter: 'blur(14px)',
                border: showSettingsMenu ? '1.5px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.18)',
                padding: '9px 18px',
                borderRadius: '999px',
                color: '#fef08a',
                fontSize: '13px',
                fontWeight: 800,
                boxShadow: showSettingsMenu
                  ? '0 6px 25px rgba(245, 158, 11, 0.45)'
                  : '0 4px 16px rgba(0,0,0,0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="Buka Menu & Pengaturan Lounge"
            >
              <Settings size={18} className={showSettingsMenu ? 'animate-spin' : ''} style={{ animationDuration: '6s', color: '#f59e0b' }} />
              <span className="hidden sm:inline">Menu & Opsi</span>
              <span style={{ fontSize: '10px', opacity: 0.8, color: '#fef08a' }}>{showSettingsMenu ? '▲' : '▼'}</span>
            </button>

            {/* Dropdown Menu yang Muncul ke Bawah */}
            {showSettingsMenu && (
              <div
                className="animate-fade-in"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 12px)',
                  right: 0,
                  zIndex: 80,
                  width: '320px',
                  background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.96))',
                  backdropFilter: 'blur(20px)',
                  border: '1.5px solid rgba(245, 158, 11, 0.45)',
                  borderRadius: '20px',
                  padding: '16px',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85), 0 0 30px rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                {/* Header Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Settings size={16} color="#f59e0b" />
                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#f8fafc', letterSpacing: '0.02em' }}>
                      Pengaturan & Game
                    </span>
                  </div>
                  <button
                    onClick={() => setShowSettingsMenu(false)}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: 'none',
                      color: '#94a3b8',
                      borderRadius: '50%',
                      width: '22px',
                      height: '22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Tutup Menu"
                  >
                    ✕
                  </button>
                </div>

                {/* Section 1: Profil Pemain */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Profil & Jas Karakter
                  </div>

                  {/* Player Name Edit */}
                  <div
                    onClick={() => {
                      setNameInput(playerName);
                      setIsEditingName(true);
                      setShowSettingsMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      cursor: 'pointer'
                    }}
                    title="Ganti Nama Anda"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={15} color="#f59e0b" />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#fef08a' }}>{playerName}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>Ganti ✎</span>
                  </div>

                  {/* Jas Avatar Color Selector */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '8px 12px',
                      borderRadius: '10px'
                    }}
                  >
                    <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 700 }}>Warna Jas:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {OUTFIT_COLORS.map((outfit, idx) => (
                        <button
                          key={outfit.name}
                          onClick={() => {
                            setSuitColorIdx(idx);
                            localStorage.setItem('poker_avatar_outfit', idx.toString());
                          }}
                          style={{
                            width: '22px',
                            height: '22px',
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
                  </div>
                </div>

                {/* Section 2: Audio & Tampilan Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Audio & Tampilan
                  </div>

                  {/* BGM Tokyo Drift Toggle */}
                  <button
                    onClick={onToggleBgm}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isBgmPlaying
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(180, 83, 9, 0.35))'
                        : 'rgba(255, 255, 255, 0.04)',
                      border: isBgmPlaying ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      color: isBgmPlaying ? '#fef08a' : '#cbd5e1',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isBgmPlaying ? <Music size={15} color="#f59e0b" className="animate-pulse" /> : <VolumeX size={15} color="#94a3b8" />}
                      <span>Musik Tokyo Drift</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: isBgmPlaying ? '#10b981' : '#94a3b8' }}>
                      {isBgmPlaying ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  {/* Toggle Panel Pemain */}
                  <button
                    onClick={() => setShowPlayersPanel(prev => !prev)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: showPlayersPanel
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(255, 255, 255, 0.04)',
                      border: showPlayersPanel ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      color: showPlayersPanel ? '#6ee7b7' : '#cbd5e1',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={15} color={showPlayersPanel ? '#10b981' : '#94a3b8'} />
                      <span>Panel Pemain ({remotePlayersList.length + 1})</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: showPlayersPanel ? '#10b981' : '#94a3b8' }}>
                      {showPlayersPanel ? 'Terbuka' : 'Tertutup'}
                    </span>
                  </button>

                  {/* Toggle Papan Peringkat Sultan */}
                  <button
                    onClick={() => setShowLeaderboardPanel(prev => !prev)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: showLeaderboardPanel
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(255, 255, 255, 0.04)',
                      border: showLeaderboardPanel ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      color: showLeaderboardPanel ? '#fef08a' : '#cbd5e1',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Award size={15} color={showLeaderboardPanel ? '#f59e0b' : '#94a3b8'} />
                      <span>Papan Peringkat Sultan</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: showLeaderboardPanel ? '#f59e0b' : '#94a3b8' }}>
                      {showLeaderboardPanel ? 'Terbuka' : 'Tertutup'}
                    </span>
                  </button>
                </div>

                {/* Section 3: Akses Cepat Game Casino */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Game Casino & Meja
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      onClick={() => {
                        setShowSettingsMenu(false);
                        onSelectRoulette?.();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.35))',
                        border: '1px solid rgba(251, 191, 36, 0.4)',
                        color: '#fef08a',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '11.5px',
                        cursor: 'pointer'
                      }}
                    >
                      <span>🎡</span>
                      <span>Roulette</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowSettingsMenu(false);
                        onSelectSlots?.();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.35))',
                        border: '1px solid rgba(248, 113, 113, 0.4)',
                        color: '#fca5a5',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '11.5px',
                        cursor: 'pointer'
                      }}
                    >
                      <span>🎰</span>
                      <span>Slot 777</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowSettingsMenu(false);
                        onSelectCrash?.();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(194, 65, 12, 0.35))',
                        border: '1px solid rgba(251, 146, 60, 0.4)',
                        color: '#fed7aa',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '11.5px',
                        cursor: 'pointer'
                      }}
                    >
                      <span>🚀</span>
                      <span>Crash Aviator</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowSettingsMenu(false);
                        onSelectBlackjack?.();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(4, 120, 87, 0.35))',
                        border: '1px solid rgba(52, 211, 153, 0.4)',
                        color: '#a7f3d0',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '11.5px',
                        cursor: 'pointer'
                      }}
                    >
                      <span>🃏</span>
                      <span>Blackjack</span>
                    </button>
                  </div>

                  {/* Tombol Pilih Meja Modal */}
                  <button
                    onClick={() => {
                      setShowSettingsMenu(false);
                      setShowRoomListModal(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: '#0f172a',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      fontWeight: 900,
                      fontSize: '13px',
                      boxShadow: '0 4px 15px rgba(245, 158, 11, 0.35)',
                      cursor: 'pointer',
                      border: 'none',
                      marginTop: '4px'
                    }}
                  >
                    <Compass size={16} />
                    <span>Pilih Meja Poker Texas Hold'em</span>
                  </button>
                </div>
              </div>
            )}
          </div>
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

      {/* Floating Active Players in Lounge Panel (Bisa dibuka & ditutup, tidak dihilangkan) */}
      <div
        className="lobby-ui-element animate-fade-in"
        style={{
          position: 'absolute',
          top: '80px',
          left: '16px',
          zIndex: 25,
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '16px',
          padding: showPlayersPanel ? '12px 14px' : '8px 12px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.65)',
          width: showPlayersPanel ? '270px' : 'auto',
          maxWidth: '280px',
          pointerEvents: 'auto',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: showPlayersPanel ? '8px' : '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#f8fafc' }}>
              Pemain di Lounge ({remotePlayersList.length + 1})
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {showPlayersPanel && (
              <span style={{ fontSize: '10px', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '999px' }}>
                Live 3D
              </span>
            )}
            <button
              onClick={() => setShowPlayersPanel(prev => !prev)}
              style={{
                background: showPlayersPanel ? 'rgba(255, 255, 255, 0.08)' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(5, 150, 105, 0.45))',
                border: showPlayersPanel ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #10b981',
                color: showPlayersPanel ? '#cbd5e1' : '#6ee7b7',
                borderRadius: '999px',
                padding: '3px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={showPlayersPanel ? 'Tutup list pemain' : 'Buka list pemain'}
            >
              <span>{showPlayersPanel ? 'Tutup ▲' : 'Buka ▼'}</span>
            </button>
          </div>
        </div>

        {showPlayersPanel && (
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
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#fef08a' }}>
                    {playerName} (Anda)
                  </div>
                  <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#34d399', fontFamily: 'monospace' }}>
                    Rp {walletBalance.toLocaleString('id-ID')}
                  </div>
                </div>
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
        )}
      </div>

      {/* Floating Leaderboard (Papan Peringkat Sultan) Panel on Right Side (Bisa dibuka & ditutup, tidak dihilangkan) */}
      <div
        className="lobby-ui-element animate-fade-in"
        style={{
          position: 'absolute',
          top: '80px',
          right: '16px',
          zIndex: 25,
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(245, 158, 11, 0.45)',
          borderRadius: '16px',
          padding: showLeaderboardPanel ? '12px 14px' : '8px 12px',
          boxShadow: '0 14px 36px rgba(0,0,0,0.75)',
          width: showLeaderboardPanel ? '295px' : 'auto',
          maxWidth: '310px',
          pointerEvents: 'auto',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: showLeaderboardPanel ? '10px' : '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Award size={16} color="#f59e0b" />
            <span style={{ fontSize: '13px', fontWeight: 900, color: '#fef08a', letterSpacing: '0.02em' }}>
              Papan Peringkat Sultan
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {showLeaderboardPanel && (
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 800,
                  color: '#34d399',
                  background: 'rgba(16, 185, 129, 0.14)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  padding: '2px 7px',
                  borderRadius: '999px'
                }}
              >
                Real-Time
              </span>
            )}
            <button
              onClick={() => setShowLeaderboardPanel(prev => !prev)}
              style={{
                background: showLeaderboardPanel ? 'rgba(255, 255, 255, 0.08)' : 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(217, 119, 6, 0.45))',
                border: showLeaderboardPanel ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #f59e0b',
                color: showLeaderboardPanel ? '#cbd5e1' : '#fef08a',
                borderRadius: '999px',
                padding: '3px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={showLeaderboardPanel ? 'Tutup papan peringkat' : 'Buka papan peringkat'}
            >
              <span>{showLeaderboardPanel ? 'Tutup ▲' : 'Buka ▼'}</span>
            </button>
          </div>
        </div>

        {showLeaderboardPanel && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
            {(() => {
              const activeList = leaderboard.length > 0 ? leaderboard : fetchedLeaderboard;
              const hasMe = activeList.some(
                item =>
                  (walletId && item.walletId === walletId) ||
                  item.name.trim().toLowerCase() === playerName.trim().toLowerCase()
              );
              const combined = hasMe
                ? activeList
                : [
                    ...activeList,
                    {
                      walletId: walletId || 'local',
                      name: playerName,
                      balance: walletBalance,
                      wins: walletWins,
                      handsPlayed: 0,
                      updatedAt: Date.now()
                    }
                  ].sort((a, b) => b.balance - a.balance);

              return combined.slice(0, 10).map((entry, idx) => {
                const isMeEntry =
                  (walletId && entry.walletId === walletId) ||
                  entry.name.trim().toLowerCase() === playerName.trim().toLowerCase();
                const rankBadge = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;

                return (
                  <div
                    key={entry.walletId || `${entry.name}-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      borderRadius: '10px',
                      background: isMeEntry
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(16, 185, 129, 0.15))'
                        : idx === 0
                        ? 'rgba(245, 158, 11, 0.1)'
                        : 'rgba(255, 255, 255, 0.04)',
                      border: isMeEntry
                        ? '1px solid rgba(245, 158, 11, 0.55)'
                        : '1px solid rgba(255, 255, 255, 0.07)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: idx < 3 ? '14px' : '11px',
                          fontWeight: 900,
                          color: idx < 3 ? '#fbbf24' : '#94a3b8',
                          width: '22px',
                          textAlign: 'center',
                          flexShrink: 0
                        }}
                      >
                        {rankBadge}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color: isMeEntry ? '#fef08a' : '#f1f5f9',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '130px'
                          }}
                        >
                          {entry.name} {isMeEntry ? '(Anda)' : entry.isBot ? '🤖' : ''}
                        </div>
                        <div style={{ fontSize: '9.5px', color: '#94a3b8', fontWeight: 600 }}>
                          🏆 {entry.wins || 0} Menang
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 900,
                        color: '#34d399',
                        fontFamily: 'monospace',
                        flexShrink: 0
                      }}
                    >
                      Rp {entry.balance.toLocaleString('id-ID')}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
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

      {/* Proximity Cashier Booth Prompt (Appears when character walks near Loket Kasir NPC) */}
      {isNearCashier && !nearbyTable && !showCashierModal && (
        <div
          className="lobby-ui-element animate-fade-in"
          style={{
            position: 'absolute',
            bottom: '36px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, rgba(6, 46, 34, 0.96), rgba(15, 23, 42, 0.96))',
            backdropFilter: 'blur(16px)',
            border: '2px solid #34d399',
            boxShadow: '0 12px 40px rgba(16, 185, 129, 0.45)',
            borderRadius: '24px',
            padding: '18px 26px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            maxWidth: '580px',
            width: '92%',
            zIndex: 30,
            pointerEvents: 'auto',
            animation: 'slideUp 0.25s ease-out'
          }}
        >
          <div
            style={{
              width: '62px',
              height: '62px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #059669, #047857)',
              border: '2px solid #6ee7b7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              flexShrink: 0,
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)'
            }}
          >
            👨‍💻
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 900,
                  color: '#34d399',
                  background: 'rgba(16, 185, 129, 0.18)',
                  border: '1px solid rgba(52, 211, 153, 0.4)',
                  padding: '2px 8px',
                  borderRadius: '999px'
                }}
              >
                🏦 LOKET BANK CHIP
              </span>
              <span style={{ fontSize: '11px', color: '#fde68a', fontWeight: 700 }}>
                NPC: Pak Python
              </span>
            </div>

            <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#f8fafc', marginBottom: '3px' }}>
              Isi Ulang Modal Rp 1.000.000 (Kuis Python)
            </h3>

            <div style={{ fontSize: '12.5px', color: walletBalance <= 0 ? '#6ee7b7' : '#cbd5e1', fontWeight: 700 }}>
              {walletBalance <= 0
                ? '✅ Chip Anda Rp 0! Jawab 1 soal Python untuk isi ulang Rp 1.000.000'
                : `Saldo Anda: Rp ${walletBalance.toLocaleString('id-ID')} (Isi ulang hanya saat chip Rp 0)`}
            </div>
          </div>

          <button
            onClick={handleOpenCashierModal}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              border: '1px solid #a7f3d0',
              padding: '13px 22px',
              borderRadius: '999px',
              fontSize: '13.5px',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(16, 185, 129, 0.5)',
              flexShrink: 0
            }}
          >
            <span>🐍 BUKA LOKET [E]</span>
          </button>
        </div>
      )}

      {/* Cashier Booth Python Quiz Modal (Loket Isi Ulang Chip NPC) */}
      {showCashierModal && (
        <div
          className="modal-overlay lobby-ui-element"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 80
          }}
          onClick={() => setShowCashierModal(false)}
        >
          <div
            className="modal-card"
            style={{
              background: 'linear-gradient(180deg, #0b1528 0%, #070d19 100%)',
              border: '2px solid #10b981',
              borderRadius: '24px',
              padding: '26px',
              maxWidth: '480px',
              width: '92%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.85), 0 0 40px rgba(16, 185, 129, 0.25)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #10b981, #047857)',
                    border: '2px solid #6ee7b7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px'
                  }}
                >
                  👨‍💻
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 900, color: '#34d399', letterSpacing: '0.05em' }}>
                    🏦 LOKET BANK CHIP • NPC KASIR
                  </div>
                  <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 900, color: '#f8fafc' }}>
                    Pak Python — Tantangan Kuis
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setShowCashierModal(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#94a3b8',
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {quizFeedback?.type === 'correct' ? (
              <div
                style={{
                  padding: '22px 18px',
                  borderRadius: '18px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1.5px solid #34d399',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '42px', marginBottom: '8px' }}>🎉💰</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 900, color: '#6ee7b7' }}>
                  Jawaban Tepat Sekali!
                </h3>
                <p style={{ margin: '0 0 18px 0', fontSize: '13.5px', color: '#e2e8f0', lineHeight: 1.5 }}>
                  Pak Python telah mengisi ulang saldo dompet Anda sebesar <strong style={{ color: '#fef08a' }}>Rp 1.000.000</strong>. Selamat bermain kembali!
                </p>
                <button
                  onClick={() => setShowCashierModal(false)}
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    border: '1px solid #fef08a',
                    color: '#0f172a',
                    fontSize: '14px',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  ✅ Siap Kembali ke Meja Poker
                </button>
              </div>
            ) : walletBalance > 0 ? (
              <div
                style={{
                  padding: '20px 18px',
                  borderRadius: '16px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.45)',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '34px', marginBottom: '8px' }}>🛡️💰</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 900, color: '#fef08a' }}>
                  Saldo Anda Masih Tersedia!
                </h3>
                <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>
                  "Halo Bos <strong>{playerName}</strong>! Saldo dompetmu saat ini masih <strong style={{ color: '#34d399' }}>Rp {walletBalance.toLocaleString('id-ID')}</strong>. Sesuai aturan kasino, isi ulang chip <strong>Rp 1.000.000</strong> lewat soal Python hanya bisa diambil saat chipmu sudah benar-benar <strong>Rp 0 (habis total)</strong> ya!"
                </p>
                <button
                  onClick={() => setShowCashierModal(false)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#f8fafc',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Mengerti, Tutup Loket
                </button>
              </div>
            ) : (
              <>
                {/* NPC Speech Bubble */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    background: 'rgba(30, 41, 59, 0.75)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '12.5px',
                    color: '#e2e8f0',
                    marginBottom: '14px',
                    lineHeight: 1.45
                  }}
                >
                  💬 <strong>Pak Python:</strong> "Chipmu sudah <strong>Rp 0</strong> ya? Tenang, jawab <strong>1 soal penjumlahan Python</strong> di bawah ini dengan benar untuk langsung dapat modal <strong style={{ color: '#fef08a' }}>Rp 1.000.000</strong>!"
                </div>

                {quizFeedback?.type === 'wrong' && (
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: 'rgba(244, 63, 94, 0.16)',
                      border: '1px solid rgba(244, 63, 94, 0.45)',
                      color: '#fda4af',
                      fontSize: '12px',
                      fontWeight: 700,
                      marginBottom: '12px'
                    }}
                  >
                    {quizFeedback.message}
                  </div>
                )}

                {/* Python Code Snippet Block */}
                <div
                  style={{
                    borderRadius: '14px',
                    overflow: 'hidden',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    background: '#050811',
                    marginBottom: '14px'
                  }}
                >
                  <div
                    style={{
                      padding: '7px 14px',
                      background: 'rgba(15, 23, 42, 0.95)',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#38bdf8'
                    }}
                  >
                    <span>🐍 soal_kasir.py</span>
                    <span style={{ color: '#fef08a' }}>Hadiah: +Rp 1.000.000</span>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: '14px 16px',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '14.5px',
                      fontWeight: 700,
                      color: '#a7f3d0',
                      lineHeight: 1.6,
                      overflowX: 'auto'
                    }}
                  >
                    {pythonQuiz.code}
                  </pre>
                </div>

                <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', marginBottom: '10px' }}>
                  ❓ {pythonQuiz.question}
                </div>

                {/* 4 Multiple Choice Buttons (A, B, C, D) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {pythonQuiz.options.map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleSelectQuizOption(opt.value)}
                      style={{
                        padding: '13px 14px',
                        borderRadius: '12px',
                        background: 'rgba(30, 41, 59, 0.9)',
                        border: '1.5px solid rgba(52, 211, 153, 0.4)',
                        color: '#f8fafc',
                        fontSize: '14px',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        fontFamily: "'JetBrains Mono', monospace"
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)';
                        e.currentTarget.style.borderColor = '#34d399';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(30, 41, 59, 0.9)';
                        e.currentTarget.style.borderColor = 'rgba(52, 211, 153, 0.4)';
                      }}
                    >
                      <span
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          color: '#0f172a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 900,
                          flexShrink: 0
                        }}
                      >
                        {opt.label}
                      </span>
                      <span>{opt.value}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
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
