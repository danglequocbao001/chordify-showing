// Chord-sheet parsing and transposing. Pure functions with no React, so `pnpm test` runs them in plain Node.

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const ACC = { '#': 1, b: -1 }
const CHORD = /^([A-G])([#b]?)((?:m|maj|min|dim|aug|sus|add|M|[0-9]|\+|-|\(|\)|#|b)*)(?:\/([A-G])([#b]?))?$/
const FILLER = /^(\||\/|-+|\.+|x\d+|\(|\)|%)$/i // allowed on a chord line besides chords
const CUE = /(band|drum|keyboard|\bkey\b|guitar|bass|mute|tone|vocal|intro|chorus|nhịp|dạo)/i // arrangement notes
const NO_LYRIC = /^[\s\-\/|x\d().,]*$/i
const BRACKETS = /\[([^\]]+)\]/
const BLOCK = /^\s*\[block\s*(\d+)\]\s*/i // "[Block 3] Band dạo…" opens block 3 of the mashup

export const isChord = s => CHORD.test(s)

export function transpose(chord, shift, flat) {
  const m = chord.match(CHORD)
  if (!m) return chord
  const note = (letter, acc) => (flat ? FLAT : SHARP)[(((BASE[letter] + (ACC[acc] ?? 0) + shift) % 12) + 12) % 12]
  return note(m[1], m[2]) + m[3] + (m[4] ? '/' + note(m[4], m[5]) : '')
}

function isChordLine(line) {
  const toks = line.trim().split(/\s+/).filter(Boolean)
  return toks.some(isChord) && toks.every(t => isChord(t) || FILLER.test(t))
}

// "G     C#m" lines: keep every chord at its column so it stays over the right syllable of the lyric below.
function gridParts(line, t) {
  const parts = []
  let col = 0
  for (const m of line.matchAll(/\S+/g)) {
    const pad = Math.max(m.index - col, col ? 1 : 0)
    const part = isChord(m[0]) ? { chord: t(m[0]) } : { text: m[0] }
    if (pad) parts.push({ text: ' '.repeat(pad) })
    parts.push(part)
    col += pad + (part.chord ?? part.text).length
  }
  return parts
}

// Notes, chord-only rows and lyrics read left to right. In notes, bare chord names ("tone C#m") are transposed too.
function inlineParts(line, t, bare) {
  return line.split(BRACKETS).flatMap((bit, i) => {
    if (i % 2) return [isChord(bit) ? { chord: t(bit) } : { text: `[${bit}]` }]
    if (!bare) return bit ? [{ text: bit }] : []
    return bit.split(/([\s,()\->:;/]+)/).filter(Boolean).map(s => (isChord(s) ? { chord: t(s) } : { text: s }))
  })
}

// Chords shown without their brackets must not touch their neighbours: "[C#m][G#m]x2" → "C#m G#m x2"
function spaced(parts) {
  return parts.flatMap((p, i) => {
    if (!parts[i - 1]?.chord) return [p]
    if (p.chord) return [{ text: ' ' }, p]
    return /^[\p{L}\d]/u.test(p.text) ? [{ text: ' ' + p.text }] : [p]
  })
}

function classify(raw, prev, t) {
  if (isChordLine(raw)) return { type: 'grid', parts: gridParts(raw, t) }
  const label = raw.trim().match(/^\[([^\]]+)\]$/)
  if (label && !isChord(label[1])) return { type: 'label', text: label[1] }
  const bare = raw.replace(/\[[^\]]*\]/g, '')
  if (CUE.test(bare)) return { type: 'cue', parts: spaced(inlineParts(raw, t, true)) }
  if (!BRACKETS.test(raw)) return { type: prev === 'grid' ? 'pre' : 'text', text: raw } // 'pre' keeps columns under a grid
  if (NO_LYRIC.test(bare)) return { type: 'row', parts: spaced(inlineParts(raw, t, false)) }
  return { type: 'lyric', parts: inlineParts(raw, t, false) } // "[C#m]Hình như em": chords stay inline, as written
}

function firstChord(lines) {
  for (const line of lines) {
    const toks = isChordLine(line) ? line.trim().split(/\s+/) : [...line.matchAll(/\[([^\]]+)\]/g)].map(m => m[1])
    const chord = toks.find(isChord)
    if (chord) return chord
  }
  return null
}

// Whole sheet → { title, keys, nowKeys, blocks }, already transposed by `shift` semitones.
// blocks[0] holds the lines before the first "[Block N]"; every marker then opens a block of its own.
export function layout(text, shift, flat) {
  const t = c => transpose(c, shift, flat)
  const [head = '', ...body] = text.trim().split(/\r?\n/)
  // original keys listed at the end of the title, e.g. "(C#m, A#m, F#m, Gm, Am)"; otherwise the first chord
  const list = head.match(/\(([^)]*)\)\s*$/)
  const listed = list ? list[1].split(/[,\s]+/).filter(Boolean) : []
  const fromTitle = listed.length > 0 && listed.every(isChord)
  const first = firstChord(body)
  const keys = (fromTitle ? listed : first ? [first] : []).map(k => k.replace(/\/.*/, ''))
  let prev = null
  const blocks = [{ block: null, lines: [] }]
  for (const raw of body) {
    const mark = raw.match(BLOCK)
    if (mark) blocks.push({ block: mark[1], lines: [] })
    const rest = mark ? raw.slice(mark[0].length) : raw
    if (mark && !rest) continue // "[Block 8]" alone on its line
    const line = classify(rest, prev, t)
    prev = line.type
    blocks.at(-1).lines.push(line)
  }
  return {
    title: (fromTitle ? head.slice(0, list.index) : head).trim() || 'Bảng Hợp Âm',
    keys,
    nowKeys: keys.map(t),
    blocks,
  }
}
