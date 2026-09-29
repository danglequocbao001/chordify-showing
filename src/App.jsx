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

// A sheet pasted in the page only applies while src/song.txt is unchanged: edit the file and the file wins.
if (load('base', null) !== hash(SONG)) ['text', 'shift', 'flat'].forEach(key => save(key, null))
save('base', hash(SONG))

export default function App() {
  const [custom, setCustom] = useState(() => load('text', null)) // pasted via Sửa; null = src/song.txt
  const [shift, setShift] = useState(() => load('shift', 0)) // semitones, -11…11
  const [flatPref, setFlatPref] = useState(() => load('flat', null))
  const [size, setSize] = useState(() => load('size', 16))
  const [draft, setDraft] = useState(null) // textarea content while editing; null = reading

  const text = custom ?? SONG
  const flat = flatPref ?? /\b[A-G]b/.test(text) // follow the sheet's own ♯/♭ notation until toggled
  const song = layout(text, shift, flat)

  useEffect(() => {
    save('shift', shift)
    save('flat', flatPref)
    save('size', size)
  }, [shift, flatPref, size])

  const finishEditing = () => {
    if (draft !== text) {
      const next = draft === SONG ? null : draft
      setCustom(next)
      save('text', next)
      setShift(0)
      setFlatPref(null)
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
              <span>Đang đàn</span> <Keys list={song.nowKeys} now />
            </>
          )}
        </p>
      )}
      <p className="sub">Bấm − / + để đổi tone cả bài, mỗi lần nửa cung. Muốn dán bài khác thì bấm Sửa.</p>

      <div className="bar">
        <div className="grp">
          <button onClick={() => setShift(s => (s - 1) % 12)} aria-label="Giảm nửa cung">
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
          <button onClick={() => setShift(s => (s + 1) % 12)} aria-label="Tăng nửa cung">
            +
          </button>
          <button onClick={() => setShift(0)}>Tone gốc</button>
        </div>
        <div className="grp">
          <button onClick={() => setFlatPref(!flat)} title="Đổi cách ghi thăng/giáng">
            ♯ / ♭
          </button>
          <button onClick={() => setSize(s => Math.max(s - 2, 11))} aria-label="Chữ nhỏ hơn">
            A−
          </button>
          <button onClick={() => setSize(s => Math.min(s + 2, 30))} aria-label="Chữ lớn hơn">
            A+
          </button>
        </div>
        <span className="spacer" />
        <button className="primary" onClick={draft === null ? () => setDraft(text) : finishEditing}>
          {draft === null ? 'Sửa' : 'Xong'}
        </button>
      </div>

      {draft === null ? (
        <div className="sheet">
          {song.lines.map((line, i) => (
            <Line key={i} line={line} />
          ))}
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
    case 'lyric':
      return (
        <div className="ln lyric">
          {line.words.map((word, i) => (
            <Fragment key={i}>
              {i > 0 && ' '}
              <span className="word">
                {word.map((piece, j) => (
                  <span className="seg" key={j}>
                    <span className="c">{piece.chord}</span>
                    <span>{piece.text}</span>
                  </span>
                ))}
              </span>
            </Fragment>
          ))}
        </div>
      )
    default: // grid, row, cue
      return (
        <div className={`ln ${line.type}`}>
          {line.parts.map((p, i) =>
            p.chord ? (
              <b className="c" key={i}>
                {p.chord}
              </b>
            ) : (
              <Fragment key={i}>{p.text}</Fragment>
            ),
          )}
        </div>
      )
  }
}
