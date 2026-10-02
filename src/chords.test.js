// Run: pnpm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { layout, transpose } from './chords.js'

test('transpose keeps quality and slash bass, wraps the octave, follows ♯/♭', () => {
  assert.equal(transpose('C#m', 1, false), 'Dm')
  assert.equal(transpose('A#m7/G#', 2, false), 'Cm7/A#')
  assert.equal(transpose('B', 1, false), 'C')
  assert.equal(transpose('C', -1, false), 'B')
  assert.equal(transpose('Gm', 1, true), 'Abm')
  assert.equal(transpose('Hình', 3, false), 'Hình')
})

test('layout reads title keys, notes, inline chords and chord grids', () => {
  const sheet = [
    'Bài thử (C#m, Gm)',
    'Keyboard intro, tone C#m: [F#m7] -> [Gm7]',
    '[C#m]Hình như em [G#m]cần',
    'G   C#m',
    '[C#m][G#m]x2',
    'Vào năm[D#]ta[F]60',
    '[Block 3] Band dạo [A#m]',
    '[Block 4]',
    '[C#m]Hình',
  ].join('\n')
  const song = layout(sheet, 2, false)
  assert.equal(song.title, 'Bài thử')
  assert.deepEqual(song.nowKeys, ['D#m', 'Am'])

  const [loose, third, fourth] = song.blocks
  assert.equal(loose.block, null)
  const [cue, lyric, grid, row, glued] = loose.lines
  assert.equal(cue.type, 'cue')
  assert.deepEqual(cue.parts.filter(p => p.chord).map(p => p.chord), ['D#m', 'G#m7', 'Am7'])
  // lyrics keep each chord inline, right where the sheet writes it, even between two syllables
  const inline = line => line.parts.map(p => (p.chord ? `[${p.chord}]` : p.text)).join('')
  assert.equal(lyric.type, 'lyric')
  assert.equal(inline(lyric), '[D#m]Hình như em [A#m]cần')
  assert.equal(inline(glued), 'Vào năm[F]ta[G]60')
  assert.equal(grid.parts.map(p => p.chord ?? p.text).join(''), 'A   D#m')
  assert.equal(row.type, 'row')
  assert.equal(row.parts.map(p => p.chord ?? p.text).join(''), 'D#m A#m x2')
  // "[Block 3]" opens a block and comes off its line; alone on a line it adds no empty one
  assert.equal(third.block, '3')
  assert.equal(third.lines.length, 1)
  assert.equal(third.lines[0].parts.map(p => p.chord ?? p.text).join(''), 'Band dạo Cm')
  assert.equal(fourth.block, '4')
  assert.deepEqual(fourth.lines.map(inline), ['[D#m]Hình'])
})
