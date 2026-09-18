import {
  RIVAL_SKILL_PRESETS, RIVAL_BOT_DRIVER_VERSION, rivalPreset, rivalPresetByTier, rivalBotDisplayName,
  rivalOpponentLabel, rivalTierForHistory, rivalRecordingID, chooseRivalOpponent
} from '../src/logic/rivalPresets.js';
let passed = 0;
function check(name, value) { if (!value) throw new Error(name); passed++; }
check('three tiers', Object.keys(RIVAL_SKILL_PRESETS).length === 3 && [1, 2, 3].every(t => rivalPresetByTier(t)));
check('tiers are distinct configurations', new Set(Object.values(RIVAL_SKILL_PRESETS).map(p => JSON.stringify([p.aiLevel, p.coverPenalty, p.phaseEscapeCells, p.dangerCells]))).size === 3);
check('ace keeps route variety (level 5 or lower)', RIVAL_SKILL_PRESETS.ace.aiLevel <= 5 && RIVAL_SKILL_PRESETS.street.aiLevel <= 5);
check('evasion layers grow with tier', RIVAL_SKILL_PRESETS.street.coverPenalty === 0 && RIVAL_SKILL_PRESETS.ace.coverPenalty > 0 && RIVAL_SKILL_PRESETS.ace.phaseEscapeCells > 0);
check('presets frozen', Object.isFrozen(RIVAL_SKILL_PRESETS) && Object.isFrozen(RIVAL_SKILL_PRESETS.ace));
check('aliases resolve', rivalPreset('bronze').key === 'street' && rivalPreset('GOLD').key === 'ace' && rivalPreset('hustler').tier === 2);
check('unknown preset null', rivalPreset('legend') === null && rivalPreset() === null);
check('driver version present', typeof RIVAL_BOT_DRIVER_VERSION === 'string' && RIVAL_BOT_DRIVER_VERSION.length);
check('bot label says BOT', rivalBotDisplayName('ace') === 'BOT · Ace' && rivalBotDisplayName('nope') === 'BOT · Unknown');
check('opponent label never claims live', rivalOpponentLabel({ kind: 'bot' }) === 'AI RIVAL' && rivalOpponentLabel(null) === 'AI PACE' && rivalOpponentLabel({ kind: 'human' }) === 'RIVAL');
const hist = (results) => results.map(result => ({ courseID: 'c1', opponentKind: 'recorded-bot', result }));
check('no history starts at tier 1', rivalTierForHistory([], 'c1') === 1);
check('a win promotes', rivalTierForHistory(hist(['win']), 'c1') === 2);
check('tier capped at 3', rivalTierForHistory(hist(['win', 'win', 'win', 'win']), 'c1') === 3);
check('three losses demote one', rivalTierForHistory(hist(['win', 'win', 'loss', 'loss', 'loss']), 'c1') === 2);
check('tier floored at 1', rivalTierForHistory(hist(['loss', 'loss', 'loss', 'loss', 'loss', 'loss']), 'c1') === 1);
check('other courses ignored', rivalTierForHistory([{ courseID: 'c2', opponentKind: 'recorded-bot', result: 'win' }], 'c1') === 1);
check('simulated results ignored', rivalTierForHistory([{ courseID: 'c1', opponentKind: 'simulated-ai', result: 'win' }], 'c1') === 1);
const id = rivalRecordingID('low-end-rush', 'street', 2, [1, 2, 3]);
check('recording id readable and stable', id.startsWith('rec-low-end-rush-street-2-') && id === rivalRecordingID('low-end-rush', 'street', 2, [1, 2, 3]));
check('recording id changes with times', id !== rivalRecordingID('low-end-rush', 'street', 2, [1, 2, 4]));
const rec = (recordingID, preset) => ({ recordingID, opponent: { kind: 'bot', skillPreset: preset } });
const bank = [rec('a-street', 'street'), rec('b-street', 'street'), rec('c-hustler', 'hustler'), rec('d-ace', 'ace')];
check('empty bank yields null', chooseRivalOpponent([], {}) === null && chooseRivalOpponent(null, {}) === null);
check('rematch returns the named recording', chooseRivalOpponent(bank, { recordingID: 'c-hustler', tier: 1 }).recordingID === 'c-hustler');
check('unknown rematch id falls back to tier', ['a-street', 'b-street'].includes(chooseRivalOpponent(bank, { recordingID: 'zzz', tier: 1 }).recordingID));
check('tier respected', chooseRivalOpponent(bank, { tier: 3 }).recordingID === 'd-ace' && chooseRivalOpponent(bank, { tier: 2 }).recordingID === 'c-hustler');
check('missing tier picks nearest below-or-above deterministically', chooseRivalOpponent([rec('x', 'street'), rec('y', 'ace')], { tier: 2 }).recordingID === 'x');
check('same salt same pick', chooseRivalOpponent(bank, { tier: 1, salt: 'u1/c1/0' }).recordingID === chooseRivalOpponent(bank, { tier: 1, salt: 'u1/c1/0' }).recordingID);
const picks = new Set(Array.from({ length: 20 }, (_, i) => chooseRivalOpponent(bank, { tier: 1, salt: 'u1/c1/' + i }).recordingID));
check('salt rotates within the tier', picks.size === 2 && [...picks].every(p => p.endsWith('street')));
console.log(passed + ' rival preset assertions passed');
