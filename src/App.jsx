import React, { useState, useEffect, useRef } from 'react';
import { HeroPortrait, DragonPortrait } from './PixiComponents';

// ⚠️ 部署 Google Apps Script 後，預設 URL 貼在這裡
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbyPUYF9tUjYpRw227BKsVF5RhqsN7w9zHblVtSxeBhDFJS1p9GXxXCM6neXJW195c0w/exec';

const BASE_PLAYER_HP = 100;

// ===== Roguelike Items =====
const ITEM_TIERS = [
  { tier: '普通', bonus: 0.05, color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' },
  { tier: '高級', bonus: 0.15, color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  { tier: '頂級', bonus: 0.30, color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
];

const ITEM_CATEGORIES = [
  {
    type: 'attack', label: '攻擊', emoji: '⚔️',
    desc: (pct) => `攻擊傷害 +${Math.round(pct * 100)}%`,
    border: '#ef4444',
  },
  {
    type: 'defense', label: '防禦', emoji: '🛡️',
    desc: (pct) => `受到傷害 -${Math.round(pct * 100)}%`,
    border: '#3b82f6',
  },
  {
    type: 'maxhp', label: '血量', emoji: '❤️',
    desc: (pct) => `最大生命值 +${Math.round(pct * 100)}%`,
    border: '#22c55e',
  },
  {
    type: 'healboost', label: '回血', emoji: '💊',
    desc: (pct) => `過關回復量 +${Math.round(pct * 100)}%`,
    border: '#a855f7',
  },
];

function generateItemChoices() {
  const choices = [];
  const usedCombos = new Set();
  while (choices.length < 3) {
    const cat = ITEM_CATEGORIES[Math.floor(Math.random() * ITEM_CATEGORIES.length)];
    // Weighted tier: 60% normal, 30% advanced, 10% epic
    const roll = Math.random();
    const tierIdx = roll < 0.6 ? 0 : roll < 0.9 ? 1 : 2;
    const tier = ITEM_TIERS[tierIdx];
    const key = `${cat.type}-${tierIdx}`;
    if (usedCombos.has(key)) continue;
    usedCombos.add(key);
    choices.push({ ...cat, ...tier, id: key });
  }
  return choices;
}

// Dragon variants cycle
const DRAGON_VARIANTS = [
  { name: '幼龍', css: 'dragon-img', emoji: '🐉' },
  { name: '火焰龍', css: 'dragon-fire', emoji: '🔥' },
  { name: '寒冰龍', css: 'dragon-ice', emoji: '❄️' },
  { name: '暗影龍', css: 'dragon-dark', emoji: '🌑' },
  { name: '神聖龍', css: 'dragon-divine', emoji: '✨' },
  { name: '混沌龍', css: 'dragon-chaos', emoji: '💥' },
];

function getDragonStats(stage) {
  const variant = DRAGON_VARIANTS[(stage - 1) % DRAGON_VARIANTS.length];
  return {
    ...variant,
    hp: 150 + (stage - 1) * 30,
    defense: 20 + (stage - 1) * 5,
    maxAtk: 10 + stage * 2,
  };
}

// ===== Early Mode Rendering =====
function Representation({ val, isNegative, gameMode, variant = 'grid' }) {
  if (gameMode !== 'early') return val;

  const stars = [];
  const limit = variant === 'grid' ? 10 : val;
  for (let i = 0; i < limit; i++) {
    if (i < val) {
      stars.push(
        <div key={i} className={`star ${isNegative ? 'cancelled' : ''}`}>
          ⭐
        </div>
      );
    } else if (variant === 'grid') {
      stars.push(<div key={i} className="star empty" />);
    }
  }

  return (
    <div className={variant === 'grid' ? 'representation-grid' : 'hud-stars'}>
      {stars}
    </div>
  );
}

// ===== Login Screen =====
function LoginScreen({ onLogin }) {
  const [classId, setClassId] = useState('');
  const [seat, setSeat] = useState('');
  const [pin, setPin] = useState('');
  const [customGasUrl, setCustomGasUrl] = useState(() => localStorage.getItem('mcb_gas_url') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!classId.trim() || !seat.trim()) { setError('請輸入班級和座號'); return; }
    if (!pin.trim() || pin.trim().length !== 4 || !/^\d{4}$/.test(pin.trim())) {
      setError('請輸入4位數字驗證碼'); return;
    }
    setError('');
    setLoading(true);

    const finalUrl = customGasUrl.trim() || DEFAULT_API_URL;
    localStorage.setItem('mcb_gas_url', customGasUrl.trim());

    try {
      let savedData = null;
      if (finalUrl) {
        const res = await fetch(`${finalUrl}?action=load&class=${encodeURIComponent(classId)}&seat=${encodeURIComponent(seat)}&pin=${encodeURIComponent(pin.trim())}`);
        savedData = await res.json();
      }
      if (savedData && savedData.error === 'PIN_MISMATCH') {
        setError('驗證碼錯誤！請重新輸入');
        return;
      }
      onLogin(classId.trim(), seat.trim(), pin.trim(), savedData, finalUrl);
    } catch (e) {
      console.warn('Load failed:', e);
      onLogin(classId.trim(), seat.trim(), pin.trim(), null, finalUrl);
    } finally { setLoading(false); }
  };

  return (
    <div className="login-screen">
      <div className="glass-panel login-box">
        <h1>⚔️ 數學卡牌戰鬥</h1>
        <div className="subtitle">輸入你的班級、座號和驗證碼開始冒險</div>
        <div className="input-group">
          <label>班級</label>
          <input type="text" placeholder="例如: 301" value={classId}
            onChange={(e) => setClassId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
        </div>
        <div className="input-group">
          <label>座號</label>
          <input type="text" placeholder="例如: 05" value={seat}
            onChange={(e) => setSeat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
        </div>
        <div className="input-group">
          <label>驗證碼 (4位數字)</label>
          <input type="password" placeholder="自訂4位數字密碼" value={pin} maxLength={4}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
        </div>
        <div className="input-group" style={{ marginTop: '24px' }}>
          <label style={{ color: '#9ca3af', fontSize: '0.75rem' }}>進階: 自訂伺服器 (GAS URL)</label>
          <input type="text" placeholder="留白則使用預設伺服器" value={customGasUrl}
            onChange={(e) => setCustomGasUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            style={{ fontSize: '0.8rem', padding: '8px 12px', background: 'rgba(0,0,0,0.2)' }} />
        </div>
        <button className="btn-login" onClick={handleLogin} disabled={loading}>
          {loading ? '載入中...' : '🚀 開始冒險'}
        </button>
        {error && <div className="login-error">{error}</div>}
        {loading && <div className="login-loading">正在連接伺服器...</div>}
      </div>
    </div>
  );
}

// ===== Item Selection Screen =====
function ItemSelectScreen({ choices, onSelect, stage }) {
  return (
    <div className="game-overlay">
      <h1 className="victory">🎉 第 {stage} 關通過！</h1>
      <p style={{ marginBottom: 24 }}>選擇一個道具強化你的英雄</p>
      <div className="item-choices">
        {choices.map((item) => (
          <div key={item.id} className="item-card" onClick={() => onSelect(item)}
            style={{ borderColor: item.border, background: item.bg }}>
            <div className="item-emoji">{item.emoji}</div>
            <div className="item-tier" style={{ color: item.color }}>{item.tier}</div>
            <div className="item-label">{item.label}強化</div>
            <div className="item-desc">{item.desc(item.bonus)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Help Modal =====
function HelpModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel rules-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>📜 冒險指南</h2>

        <div className="rules-section">
          <h3>🎮 核心玩法</h3>
          <ul>
            <li>利用下方的「數字卡」與「符號卡」組合出算式。</li>
            <li>若算式結果等於惡龍的「弱點數字」，將發動強大的特效攻擊！</li>
            <li>算式越長（使用的數字越多），發動的特效威力越大。</li>
          </ul>
        </div>

        <div className="rules-section">
          <h3>✨ 弱點特效 (當結果 = 弱點)</h3>
          <ul>
            <li>使用 1 顆數字：致命一擊 (高傷害)</li>
            <li>使用 2 顆數字：🔥 燃燒 (持續 3 回合扣血)</li>
            <li>使用 3 顆數字：❄️ 冰凍 (對手停止行動 1 回合)</li>
            <li>使用 4 顆數字：⚡ 雷擊 (極高傷害)</li>
            <li>使用 5 顆以上：☄️ 流星 (毀滅性傷害)</li>
          </ul>
        </div>

        <div className="rules-section">
          <h3>🛡️ 戰鬥提示</h3>
          <ul>
            <li>若計算結果不等於弱點，則進行一般攻擊（扣除防禦力後計算傷害）。</li>
            <li>過關後可以挑選一件「道具」來強化英雄。</li>
            <li>血量扣完則戰敗，所有道具加成將會重置。</li>
          </ul>
        </div>

        <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.8rem', marginTop: '16px' }}>
          點擊任意處或右上角關閉
        </div>
      </div>
    </div>
  );
}

// ===== Save to Google Sheets =====
async function saveProgress(apiUrl, classId, seat, pin, stage, maxStage, playerHp, buffs) {
  if (!apiUrl) return;
  try {
    await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'save', classId, seat, pin, stage, maxStage, playerHp, buffs }),
    });
  } catch (e) { console.warn('Save failed:', e); }
}

// ===== Main Game =====
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [gameMode, setGameMode] = useState(() => localStorage.getItem('mcb_game_mode') || 'standard');
  const [apiUrl, setApiUrl] = useState('');
  const [classId, setClassId] = useState('');
  const [seat, setSeat] = useState('');
  const [pin, setPin] = useState('');
  const [stage, setStage] = useState(1);
  const [maxStage, setMaxStage] = useState(1);
  const [showHelp, setShowHelp] = useState(false);

  // Roguelike buffs (accumulated percentages)
  const [buffs, setBuffs] = useState({ attack: 0, defense: 0, maxhp: 0, healboost: 0 });
  const [itemChoices, setItemChoices] = useState(null); // null or array of 3

  // Derived max HP
  const getMaxHp = () => Math.floor(BASE_PLAYER_HP * (1 + buffs.maxhp));

  const [playerHp, setPlayerHp] = useState(BASE_PLAYER_HP);
  const [dragonHp, setDragonHp] = useState(150);
  const [dragonMaxHp, setDragonMaxHp] = useState(150);
  const [defense, setDefense] = useState(20);
  const [dragonMaxAtk, setDragonMaxAtk] = useState(12);
  const [weaknessNum, setWeaknessNum] = useState(7);
  const [handNumbers, setHandNumbers] = useState([]);
  const [handOps, setHandOps] = useState([]);
  const [equation, setEquation] = useState([]);
  const [logs, setLogs] = useState([]);
  const [debuffs, setDebuffs] = useState({ burning: 0, frozen: 0 });
  const [gameState, setGameState] = useState('playing'); // playing | victory | defeat | itemselect
  const [shakeTarget, setShakeTarget] = useState(null);
  const [specialEffect, setSpecialEffect] = useState(null);
  const [collectedItems, setCollectedItems] = useState([]); // list of collected items for display

  const logsEndRef = useRef(null);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const dragonInfo = getDragonStats(stage);

  const initStage = (stageNum, hp, currentBuffs) => {
    const b = currentBuffs || buffs;
    const info = getDragonStats(stageNum);
    const maxHp = Math.floor(BASE_PLAYER_HP * (1 + b.maxhp));
    setStage(stageNum);
    setDragonHp(info.hp);
    setDragonMaxHp(info.hp);
    setDefense(info.defense);
    setDragonMaxAtk(info.maxAtk);
    setWeaknessNum(Math.floor(Math.random() * 10) + 5);
    setPlayerHp(hp != null ? Math.min(hp, maxHp) : maxHp);
    setDebuffs({ burning: 0, frozen: 0 });
    setGameState('playing');
    setLogs([`⚔️ 第 ${stageNum} 關開始！${info.emoji} ${info.name}出現了！`]);
    dealHand();
  };

  const handleLogin = (cid, s, p, savedData, loadedApiUrl) => {
    setClassId(cid);
    setSeat(s);
    setPin(p);
    setApiUrl(loadedApiUrl);
    setLoggedIn(true);
    const defaultBuffs = { attack: 0, defense: 0, maxhp: 0, healboost: 0 };
    if (savedData && savedData.found) {
      const st = savedData.stage || 1;
      const ms = savedData.maxStage || 1;
      const hp = savedData.playerHp || BASE_PLAYER_HP;
      const savedBuffs = savedData.buffs || defaultBuffs;
      setMaxStage(ms);
      setBuffs(savedBuffs);
      setCollectedItems([]);
      initStage(st, hp, savedBuffs);
    } else {
      setMaxStage(1);
      setBuffs(defaultBuffs);
      setCollectedItems([]);
      initStage(1, BASE_PLAYER_HP, defaultBuffs);
    }
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setClassId('');
    setSeat('');
    setPin('');
  };

  const toggleMode = (mode) => {
    setGameMode(mode);
    localStorage.setItem('mcb_game_mode', mode);
  };

  const dealHand = () => {
    const nums = [];
    let highValUsed = false;
    for (let i = 0; i < 8; i++) {
      let n;
      do { n = Math.floor(Math.random() * 10); } while ([7, 8, 9].includes(n) && highValUsed);
      if ([7, 8, 9].includes(n)) highValUsed = true;
      nums.push({ id: `n${Date.now()}${i}${Math.random()}`, val: n, type: 'num' });
    }
    // Guaranteed: +, -, *, / each once; extra 2 from +, -, /
    const baseOps = ['+', '-', '*', '/'];
    const extraPool = ['+', '-', '/'];
    const opVals = [...baseOps];
    for (let i = 0; i < 2; i++) {
      opVals.push(extraPool[Math.floor(Math.random() * extraPool.length)]);
    }
    // Shuffle
    for (let i = opVals.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opVals[i], opVals[j]] = [opVals[j], opVals[i]];
    }
    const ops = opVals.map((op, i) => ({ id: `o${Date.now()}${i}${Math.random()}`, val: op, type: 'op' }));
    setHandNumbers(nums);
    setHandOps(ops);
    setEquation([]);
  };

  const addLog = (msg) => setLogs((l) => [...l, msg]);

  const handleCardClick = (card, source) => {
    if (gameState !== 'playing') return;
    setEquation((prev) => [...prev, card]);
    if (source === 'num') setHandNumbers((prev) => prev.filter((c) => c.id !== card.id));
    else setHandOps((prev) => prev.filter((c) => c.id !== card.id));
  };

  const clearEquation = () => {
    const nums = equation.filter((c) => c.type === 'num');
    const ops = equation.filter((c) => c.type === 'op');
    setHandNumbers((prev) => [...prev, ...nums]);
    setHandOps((prev) => [...prev, ...ops]);
    setEquation([]);
  };

  const triggerShake = (target) => {
    setShakeTarget(target);
    setTimeout(() => setShakeTarget(null), 500);
  };

  const showEffect = (text, type) => {
    setSpecialEffect({ text, type });
    setTimeout(() => setSpecialEffect(null), 1200);
  };

  const handleItemSelect = (item) => {
    const newBuffs = { ...buffs, [item.type]: buffs[item.type] + item.bonus };
    setBuffs(newBuffs);
    setCollectedItems((prev) => [...prev, item]);
    setItemChoices(null);

    const nextStage = stage + 1;
    const newMax = Math.max(maxStage, nextStage);
    setMaxStage(newMax);

    // HP recovery: base 30% + healboost buff
    const maxHp = Math.floor(BASE_PLAYER_HP * (1 + newBuffs.maxhp));
    const healPct = 0.3 + newBuffs.healboost;
    const recoveredHp = Math.min(maxHp, playerHp + Math.floor(maxHp * healPct));

    initStage(nextStage, recoveredHp, newBuffs);
    saveProgress(apiUrl, classId, seat, pin, nextStage, newMax, recoveredHp, newBuffs);
  };

  const handleDefeat = () => {
    const resetBuffs = { attack: 0, defense: 0, maxhp: 0, healboost: 0 };
    setBuffs(resetBuffs);
    setCollectedItems([]);
    initStage(stage, BASE_PLAYER_HP, resetBuffs);
    saveProgress(apiUrl, classId, seat, pin, stage, maxStage, BASE_PLAYER_HP, resetBuffs);
  };

  const attackEnemy = () => {
    if (equation.length === 0 || gameState !== 'playing') return;

    try {
      const exprString = equation.map((c) => c.val).join('');
      if (['+', '-', '*', '/'].includes(exprString.slice(-1))) {
        addLog('⚠️ 算式尚未完成！');
        return;
      }

      const result = Math.floor(new Function('return ' + exprString)());
      if (isNaN(result) || !isFinite(result)) throw new Error('Invalid');

      let currentDragonHp = dragonHp;
      let playerDmgTaken = 0;
      const numCardCount = equation.filter((c) => c.type === 'num').length;
      const atkMul = 1 + buffs.attack; // attack buff multiplier
      const defMul = 1 - buffs.defense; // defense buff multiplier (damage reduction)

      let dBurning = debuffs.burning;
      let dFrozen = debuffs.frozen;

      if (result === weaknessNum) {
        let baseDmg = 0;
        if (numCardCount === 1) {
          baseDmg = 30;
          showEffect('致命一擊！', 'crit');
        } else if (numCardCount === 2) {
          baseDmg = 30;
          dBurning = 3;
          showEffect('🔥 燃燒！', 'burn');
        } else if (numCardCount === 3) {
          baseDmg = 30;
          dFrozen = 1;
          showEffect('❄️ 冰凍！', 'freeze');
        } else if (numCardCount === 4) {
          baseDmg = 60;
          showEffect('⚡ 雷擊！', 'thunder');
        } else {
          baseDmg = 90;
          showEffect('☄️ 流星！', 'meteor');
        }
        const dmg = Math.floor(baseDmg * atkMul);
        currentDragonHp -= dmg;
        const effectNames = ['致命', '燃燒', '冰凍', '雷擊', '流星'];
        const effectIdx = Math.min(numCardCount - 1, 4);
        addLog(`🎯 命中弱點！造成 ${dmg} 點${effectNames[effectIdx]}傷害！${buffs.attack > 0 ? ` (攻擊加成 +${Math.round(buffs.attack * 100)}%)` : ''}`);
        if (numCardCount === 2) addLog('🔥 敵人開始燃燒 (3回合)！');
        if (numCardCount === 3) addLog('❄️ 敵人被凍結1回合！');
        triggerShake('dragon');
      } else {
        const randomMultiplier = 1.0 + Math.random() * 2.0;
        let dmg = Math.floor(result - defense * randomMultiplier);
        if (dmg > 0) dmg = Math.floor(dmg * atkMul);
        if (dmg <= 0) {
          addLog(`🛡️ 攻擊無效！${dragonInfo.name}防禦了傷害 (計算結果: ${result})`);
        } else {
          currentDragonHp -= dmg;
          addLog(`⚔️ 攻擊成功！造成 ${dmg} 點傷害 (計算結果: ${result})`);
          triggerShake('dragon');
        }
      }

      // Debuff ticks
      if (dBurning > 0) {
        currentDragonHp -= 3;
        addLog(`🔥 燃燒效果！受到 3 點持續傷害 (剩餘 ${dBurning - 1} 回合)`);
        dBurning -= 1;
      }
      if (dFrozen > 0) {
        currentDragonHp -= 5;
        addLog(`❄️ 冰凍效果！受到 5 點持續傷害`);
      }

      if (currentDragonHp <= 0) {
        setDragonHp(0);
        setEquation([]);
        const newMax = Math.max(maxStage, stage + 1);
        setMaxStage(newMax);
        addLog(`🎉 你擊敗了${dragonInfo.name}！第 ${stage} 關通過！`);
        // Show item selection instead of direct victory
        setItemChoices(generateItemChoices());
        setGameState('itemselect');
        saveProgress(apiUrl, classId, seat, pin, stage, newMax, playerHp, buffs);
        return;
      }

      // Dragon turn
      if (dFrozen > 0) {
        addLog(`❄️ ${dragonInfo.name}被凍結，無法行動！`);
        dFrozen -= 1;
      } else {
        let dragonAtk = Math.floor(Math.random() * dragonMaxAtk) + 1;
        dragonAtk = Math.max(1, Math.floor(dragonAtk * defMul)); // apply defense buff
        playerDmgTaken = dragonAtk;
        addLog(`🐉 ${dragonInfo.name}攻擊！造成 ${dragonAtk} 點傷害！${buffs.defense > 0 ? ` (減傷 ${Math.round(buffs.defense * 100)}%)` : ''}`);
        triggerShake('hero');
      }

      setDebuffs({ frozen: dFrozen, burning: dBurning });
      setDragonHp(Math.max(0, currentDragonHp));
      const currentMaxHp = getMaxHp();
      const newPlayerHp = Math.max(0, playerHp - playerDmgTaken);
      setPlayerHp(newPlayerHp);

      if (newPlayerHp <= 0) {
        addLog('💀 英雄倒下了... 遊戲結束。');
        setGameState('defeat');
        saveProgress(apiUrl, classId, seat, pin, stage, maxStage, 0, buffs);
      } else {
        dealHand();
        setWeaknessNum(Math.floor(Math.random() * 15) + 5);
      }
    } catch (e) {
      addLog('❌ 錯誤：不合法的數學算式！');
    }
  };

  const getLogClass = (log) => {
    if (log.includes('命中弱點')) return 'log-entry weakness-hit';
    if (log.includes('🐉') && log.includes('攻擊')) return 'log-entry dragon-atk';
    if (log.includes('倒下') || log.includes('擊敗') || log.includes('通過') || log.includes('開始')) return 'log-entry game-end';
    return 'log-entry normal';
  };

  // Set body background image with correct base URL
  useEffect(() => {
    document.body.style.backgroundImage = `url('${import.meta.env.BASE_URL}pixel_battle_bg.png')`;
  }, []);

  // ===== Render =====
  if (!loggedIn) return <LoginScreen onLogin={handleLogin} />;

  const currentMaxHp = getMaxHp();

  return (
    <div className="game-container full-screen">
      {specialEffect && (
        <div className="effect-overlay">
          <div className={`effect-text effect-${specialEffect.type}`}>{specialEffect.text}</div>
        </div>
      )}

      {gameState === 'itemselect' && itemChoices && (
        <ItemSelectScreen choices={itemChoices} onSelect={handleItemSelect} stage={stage} />
      )}

      {gameState === 'defeat' && (
        <div className="game-overlay">
          <h1 className="defeat">💀 戰敗...</h1>
          <p>英雄在第 {stage} 關倒下了...</p>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: 4 }}>所有道具加成將會重置</p>
          <button onClick={handleDefeat}>🔄 重新挑戰第 {stage} 關</button>
        </div>
      )}

      {/* ===== Arena Layer (Characters) ===== */}
      <div className="arena-layer">
        <div className={`character-container hero-container ${shakeTarget === 'hero' ? 'shake' : ''}`}>
          <div className="floating-stats">
            <div className="char-name hero-name">英雄 (你)</div>
            <div className="hp-bar-bg">
              <div className="hp-bar-fill" style={{ width: `${(playerHp / currentMaxHp) * 100}%` }} />
            </div>
            <div className="hp-text">{playerHp} / {currentMaxHp} HP</div>
            {/* Buff indicators */}
            {collectedItems.length > 0 && (
              <div className="tags center">
                {buffs.attack > 0 && <span className="tag" style={{ background: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}>⚔️+{Math.round(buffs.attack * 100)}%</span>}
                {buffs.defense > 0 && <span className="tag" style={{ background: 'rgba(59,130,246,0.3)', color: '#93c5fd' }}>🛡️+{Math.round(buffs.defense * 100)}%</span>}
                {buffs.maxhp > 0 && <span className="tag" style={{ background: 'rgba(34,197,94,0.3)', color: '#86efac' }}>❤️+{Math.round(buffs.maxhp * 100)}%</span>}
                {buffs.healboost > 0 && <span className="tag" style={{ background: 'rgba(168,85,247,0.3)', color: '#d8b4fe' }}>💊+{Math.round(buffs.healboost * 100)}%</span>}
              </div>
            )}
          </div>
          <HeroPortrait isTakingDamage={shakeTarget === 'hero'} isAttacking={specialEffect !== null} />
        </div>

        <div className={`character-container dragon-container ${shakeTarget === 'dragon' ? 'shake' : ''}`}>
          <div className="floating-stats right">
            <div className="char-name dragon-name">{dragonInfo.emoji} {dragonInfo.name}</div>
            <div className="hp-bar-bg">
              <div className="hp-bar-fill dragon-hp" style={{ width: `${(dragonHp / dragonMaxHp) * 100}%` }} />
            </div>
            <div className="hp-text">{dragonHp} / {dragonMaxHp} HP</div>
            <div className="tags center">
              <span className="tag weakness">
                弱點: {gameMode === 'early' ? (
                  <Representation val={weaknessNum} gameMode={gameMode} variant="hud" />
                ) : weaknessNum}
              </span>
              <span className="tag defense">防禦: {defense}</span>
            </div>
            <div className="tags center" style={{ marginTop: 4 }}>
              {debuffs.burning > 0 && <span className="tag burning">🔥 燃燒({debuffs.burning})</span>}
              {debuffs.frozen > 0 && <span className="tag frozen">❄️ 冰凍({debuffs.frozen})</span>}
            </div>
          </div>
          <DragonPortrait isTakingDamage={shakeTarget === 'dragon'} dragonClass={dragonInfo.css} />
        </div>
      </div>

      {/* ===== UI Layer (Cards & Logs) ===== */}
      <div className="ui-layer">

        {/* Top Info Bar */}
        <div className="top-hud">
          <div className="mode-toggle glass-panel">
            <button className={`mode-btn ${gameMode === 'standard' ? 'active' : ''}`} onClick={() => toggleMode('standard')}>一般</button>
            <button className={`mode-btn ${gameMode === 'early' ? 'active' : ''}`} onClick={() => toggleMode('early')}>初階</button>
          </div>
          <div className="stage-badge glass-panel">第 {stage} 關</div>
          <div className="student-info glass-panel">
            {classId} 班 {seat} 號 ｜ 最高: 第 {maxStage} 關
            <button className="btn-logout" onClick={handleLogout}>登出</button>
            <div className="btn-help" onClick={() => setShowHelp(true)}>？</div>
          </div>
        </div>

        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

        {/* Logs on Top Right */}
        <div className="glass-panel log-panel floating-logs">
          <div className="log-header">📜 戰鬥日誌</div>
          <div className="log-body">
            {logs.map((log, i) => (
              <div key={i} className={getLogClass(log)}>{log}</div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Bottom HUD: Cards and Equations */}
        <div className="bottom-hud">

          <div className="glass-panel equation-panel float">
            <div className="equation-box">
              {equation.length === 0 && <span className="placeholder">點擊下方卡牌組合方程... (目標: {weaknessNum})</span>}
              {equation.map((c, idx) => {
                const prevCard = idx > 0 ? equation[idx - 1] : null;
                const isNegative = c.type === 'num' && prevCard?.val === '-';
                return (
                  <div key={c.id} className={`card ${c.type === 'num' ? 'number-card' : 'op-card'}`}>
                    {c.type === 'num' ? (
                      <Representation val={c.val} isNegative={isNegative} gameMode={gameMode} />
                    ) : (
                      c.val
                    )}
                  </div>
                );
              })}
            </div>
            <div className="action-buttons">
              <button className="btn-attack" onClick={attackEnemy} disabled={gameState !== 'playing'}>⚔️ 攻擊</button>
              <button className="btn-clear" onClick={clearEquation}>清除</button>
            </div>
          </div>

          <div className="card-hand-container">
            <div className="card-row">
              {handNumbers.map((c) => (
                <div key={c.id} onClick={() => handleCardClick(c, 'num')} className="card number-card in-hand">
                  <Representation val={c.val} gameMode={gameMode} />
                </div>
              ))}
            </div>
            <div className="card-row ops-row">
              {handOps.map((c) => (
                <div key={c.id} onClick={() => handleCardClick(c, 'op')} className="card op-card in-hand">{c.val}</div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
