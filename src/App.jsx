import { Fragment, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import SONG from './song.txt?raw'
import { layout } from './chords.js'

// The page opens one tone below the original key (C#m → Bm), easier for the singers. "Tone gốc" still goes to C#m.
const DEFAULT_SHIFT = -2

// Nothing is stored: every reload comes back to src/song.txt, DEFAULT_SHIFT, the sheet's own ♯/♭ and 16px text.
export default function App() {
  const [custom, setCustom] = useState(null) // pasted via Sửa; null = src/song.txt
  const [shift, setShift] = useState(DEFAULT_SHIFT) // semitones, -11…11
  const [flatPref, setFlatPref] = useState(null)
  const [size, setSize] = useState(16)
  const [draft, setDraft] = useState(null) // textarea content while editing; null = reading
  const [folded, setFolded] = useState({}) // block index → folded; every block opens on load
  const [barShown, setBarShown] = useState(true) // phones: the bottom bar, or just its ▴ button

  const text = custom ?? SONG
  const flat = flatPref ?? /\b[A-G]b/.test(text) // follow the sheet's own ♯/♭ notation until toggled
  const song = layout(text, shift, flat)
  const anyOpen = song.blocks.some((b, i) => b.block && !folded[i]) // then the button folds them all, else opens all

  // Keep the screen on: phones dim mid-song. The lock drops whenever the tab is hidden, so take it again on return.
  // Unsupported, refused (low battery) or plain http on a LAN IP: the screen just dims as usual.
  useEffect(() => {
    const lock = () => document.visibilityState === 'visible' && navigator.wakeLock?.request('screen').catch(() => {})
    lock()
    document.addEventListener('visibilitychange', lock)
    return () => document.removeEventListener('visibilitychange', lock)
  }, [])

  // Saved PDFs take their file name from the page title: the song's while printing, the app's otherwise
  useEffect(() => {
    const app = document.title
    const before = () => (document.title = song.title)
    const after = () => (document.title = app)
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [song.title])

  const finishEditing = () => {
    if (draft !== text) {
      const next = draft === SONG ? null : draft
      setCustom(next)
      setShift(next === null ? DEFAULT_SHIFT : 0) // back to src/song.txt: its usual tone; a pasted song: as written
      setFlatPref(null)
      setFolded({})
    }
    setDraft(null)
  }

  const steps = `${shift > 0 ? '+' : '−'}${Math.abs(shift) / 2} tone`

  // In the top bar on wide screens; on phones the same buttons sit above the sheet so the bottom bar stays one row
  const tools = (
    <>
      <button onClick={() => setFlatPref(!flat)} title="Đổi cách ghi thăng/giáng">
        ♯ / ♭
      </button>
      <button onClick={() => setSize(s => Math.max(s - 2, 11))} aria-label="Chữ nhỏ hơn">
        A−
      </button>
      <button onClick={() => setSize(s => Math.min(s + 2, 30))} aria-label="Chữ lớn hơn">
        A+
      </button>
      <button
        onClick={() => {
          flushSync(() => setFolded({})) // open every block first: the PDF holds the whole song
          window.print()
        }}
        title="In hoặc lưu PDF"
      >
        In PDF
      </button>
    </>
  )

  // Block shortcuts: a second row of the top bar on wide screens, a sticky strip above the sheet on phones.
  // A jump opens the block if it was folded and lands it just under that sticky row, whatever its height.
  const jump = draft === null && song.blocks.length > 1 && (
    <nav className="jump" aria-label="Nhảy tới block">
      <small>Block</small>
      {song.blocks.map(
        ({ block }, i) =>
          block && (
            <button
              key={i}
              onClick={e => {
                setFolded(f => ({ ...f, [i]: false }))
                const sticky = e.currentTarget.closest('.bar') ?? e.currentTarget.parentElement
                const top = document.getElementById(`block-${i}`).getBoundingClientRect().top + window.scrollY
                window.scrollTo({ top: top - sticky.offsetHeight - 8, behavior: 'smooth' })
              }}
            >
              {block}
            </button>
          ),
      )}
    </nav>
  )

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

      <div className={barShown ? 'bar' : 'bar hidden'}>
        <div className="grp">
          <button className="step" onClick={() => setShift(s => (s - 1) % 12)} aria-label="Giảm nửa tone">
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
          <button className="step" onClick={() => setShift(s => (s + 1) % 12)} aria-label="Tăng nửa tone">
            +
          </button>
        </div>
        <div className="grp">
          <button onClick={() => setShift(0)}>Tone gốc</button>
          <span className="desk">{tools}</span>
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
        <button
          className="toggle"
          onClick={() => setBarShown(!barShown)}
          aria-expanded={barShown}
          aria-label={barShown ? 'Ẩn thanh công cụ' : 'Hiện thanh công cụ'}
        >
          {barShown ? '▾' : '▴'}
        </button>
        {jump}
      </div>
      <div className="tools">{tools}</div>
      {jump}

      {draft === null ? (
        <div className="sheet">
          {song.blocks.map(({ block, lines }, i) => {
            const body = lines.map((line, j) => <Line key={j} line={line} />)
            // native <details>: tapping the badge folds the block, onToggle copies that into `folded`
            return block ? (
              <details key={i} id={`block-${i}`} open={!folded[i]} onToggle={e => setFolded(f => ({ ...f, [i]: !e.target.open }))}>
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
