import { Fragment, useEffect, useState } from 'react'
import SONG from './song.txt?raw'
import { hash, layout } from './chords.js'

// Per-browser settings. Prefixed because every Vite app on localhost:5173 shares one localStorage.
const PREFIX = 'mashup-orange-sofia:'
const load = (key, fallback) => {
  try {
    const v = localStorage.getItem(PREFIX + key)
    return v === null ? fallback : JSON.parse(v)
  } catch {
    return fallback
  }
}
const save = (key, value) => {
  try {
    if (value === null) localStorage.removeItem(PREFIX + key)
    else localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // storage blocked (private window…): the page still works, settings just aren't remembered
  }
}

// The page opens one tone below the original key (C#m → Bm), easier for the singers, and every reload comes back
// here: the tone is never stored. "Tone gốc" still goes to C#m.
const DEFAULT_SHIFT = -2

// A sheet pasted in the page only applies while src/song.txt is unchanged: edit the file and the file wins.
// ('shift' is cleared too: older versions stored the tone.)
if (load('base', null) !== hash(SONG)) ['text', 'shift', 'flat'].forEach(key => save(key, null))
save('base', hash(SONG))

export default function App() {
  const [custom, setCustom] = useState(() => load('text', null)) // pasted via Sửa; null = src/song.txt
  const [shift, setShift] = useState(custom === null ? DEFAULT_SHIFT : 0) // semitones, -11…11; a pasted song as written
  const [flatPref, setFlatPref] = useState(() => load('flat', null))
  const [size, setSize] = useState(() => load('size', 16))
  const [draft, setDraft] = useState(null) // textarea content while editing; null = reading
  const [folded, setFolded] = useState({}) // block index → folded; every block opens on load

  const text = custom ?? SONG
  const flat = flatPref ?? /\b[A-G]b/.test(text) // follow the sheet's own ♯/♭ notation until toggled
  const song = layout(text, shift, flat)
  const anyOpen = song.blocks.some((b, i) => b.block && !folded[i]) // then the button folds them all, else opens all

  useEffect(() => {
    save('flat', flatPref)
    save('size', size)
  }, [flatPref, size])

  const finishEditing = () => {
    if (draft !== text) {
      const next = draft === SONG ? null : draft
      setCustom(next)
      save('text', next)
      setShift(next === null ? DEFAULT_SHIFT : 0) // back to src/song.txt: its usual tone; a pasted song: as written
      setFlatPref(null)
      setFolded({})
    }
    setDraft(null)
  }

  const steps = `${shift > 0 ? '+' : '−'}${Math.abs(shift) / 2} cung`

  return (
    <div className="wrap" style={{ '--size': `${size}px` }}>
      <h1>{song.title}</h1>
      {song.keys.length > 0 && (
        <p className="keys">
          <span>Tone gốc</span> <Keys list={song.keys} />
          {shift !== 0 && (
            <>
              <br />
              <span>Tone hiện tại</span> <Keys list={song.nowKeys} now />
            </>
          )}
        </p>
      )}

      <div className="bar">
        <div className="grp">
          <button className="step" onClick={() => setShift(s => (s - 1) % 12)} aria-label="Giảm nửa cung">
            −
          </button>
          <div className="key" aria-live="polite">
            {song.nowKeys[0] ? (
              <>
                <b>{song.nowKeys[0]}</b> <small>{shift ? steps : 'gốc'}</small>
              </>
            ) : (
              <small>chưa có hợp âm</small>
            )}
          </div>
          <button className="step" onClick={() => setShift(s => (s + 1) % 12)} aria-label="Tăng nửa cung">
            +
          </button>
        </div>
        <div className="grp">
          <button onClick={() => setShift(0)}>Tone gốc</button>
          <button onClick={() => setFlatPref(!flat)} title="Đổi cách ghi thăng/giáng">
            ♯ / ♭
          </button>
          <button onClick={() => setSize(s => Math.max(s - 2, 11))} aria-label="Chữ nhỏ hơn">
            A−
          </button>
          <button onClick={() => setSize(s => Math.min(s + 2, 30))} aria-label="Chữ lớn hơn">
            A+
          </button>
          {song.blocks.length > 1 && (
            <button
              onClick={() => setFolded(Object.fromEntries(song.blocks.map((b, i) => [i, anyOpen])))}
              title={anyOpen ? 'Thu gọn tất cả block' : 'Mở tất cả block'}
            >
              {anyOpen ? 'Thu gọn' : 'Mở hết'}
            </button>
          )}
        </div>
        <span className="spacer" />
        <button className="primary" onClick={draft === null ? () => setDraft(text) : finishEditing}>
          {draft === null ? 'Sửa' : 'Xong'}
        </button>
      </div>

      {draft === null ? (
        <div className="sheet">
          {song.blocks.map(({ block, lines }, i) => {
            const body = lines.map((line, j) => <Line key={j} line={line} />)
            // native <details>: tapping the badge folds the block, onToggle copies that into `folded`
            return block ? (
              <details key={i} open={!folded[i]} onToggle={e => setFolded(f => ({ ...f, [i]: !e.target.open }))}>
                <summary className="block">
                  <b>Block {block}</b>
                </summary>
                {body}
              </details>
            ) : (
              <Fragment key={i}>{body}</Fragment>
            )
          })}
        </div>
      ) : (
        <>
          <textarea
            id="src"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            spellCheck={false}
            aria-label="Nội dung bài hát và hợp âm"
          />
          <p className="hint">
            Hỗ trợ 2 kiểu: hợp âm nằm trên dòng lời riêng, hoặc hợp âm trong ngoặc vuông ngay trước chữ như{' '}
            <code>[G]Lời [C]hát</code>. Dòng đầu tiên là tên bài; ghi tone gốc trong ngoặc ở cuối dòng đó, ví dụ{' '}
            <code>(C#m, A#m)</code>. Bản mặc định lấy từ file <code>src/song.txt</code>.
            <button onClick={() => setDraft(SONG)}>Dùng lại bản mặc định</button>
          </p>
        </>
      )}

      <footer className="foot">© {new Date().getFullYear()} Dang Le Quoc Bao</footer>
    </div>
  )
}

function Keys({ list, now }) {
  return list.map((key, i) => (
    <Fragment key={i}>
      {i > 0 && ' · '}
      <b className={now ? 'c' : undefined}>{key}</b>
    </Fragment>
  ))
}

function Line({ line }) {
  switch (line.type) {
    case 'label':
      return <div className="ln lab">{line.text}</div>
    case 'text':
    case 'pre':
      return <div className={`ln ${line.type}`}>{line.text || ' '}</div>
    default: // grid, row, cue, lyric
      return (
        <div className={`ln ${line.type}`}>
          {line.parts.map((p, i) =>
            p.chord ? (
              <b className="c" key={i}>
                {/* lyrics keep song.txt's brackets, so "năm[D#]ta" still reads as chord between syllables */}
                {line.type === 'lyric' ? `[${p.chord}]` : p.chord}
              </b>
            ) : (
              <Fragment key={i}>{p.text}</Fragment>
            ),
          )}
        </div>
      )
  }
}
