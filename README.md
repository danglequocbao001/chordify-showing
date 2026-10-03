# Mashup Orange Sofia

Sheet hợp âm đổi tone được ngay trên trang (React 19 + Vite 8).

```bash
pnpm install
pnpm dev        # mở http://localhost:5173
pnpm test       # kiểm tra phần đổi tone
pnpm build      # bản build tĩnh trong dist/
```

## Nội dung bài

Bài mặc định nằm ở `src/song.txt`. Dán lời + hợp âm vào file đó rồi lưu, trang tự cập nhật.

- Dòng đầu là tên bài, tone gốc ghi trong ngoặc ở cuối dòng: `(C#m, A#m, F#m, Gm, Am)`.
- Hợp âm ghi trong ngoặc vuông ngay trước chữ: `[C#m]Lời bài hát`, hoặc cả dòng hợp âm nằm trên dòng lời.
- Dòng ghi chú (có chữ như band, drum, keyboard, guitar, bass, mute, tone, vocal, intro, chorus, nhịp, dạo) được tô nổi bật.
- `[Tên đoạn]` đứng riêng một dòng là tiêu đề đoạn.
- `[Block 3]` ở đầu dòng là mốc block của mashup, hiện thành nhãn xanh lá trên một dòng riêng; bấm vào nhãn để thu gọn / mở lại block đó, nút **Thu gọn / Mở hết** cạnh A+ làm cho tất cả block.

Trang mở ở tone **Bm**, thấp hơn tone gốc C#m 1 cung cho vừa giọng ca sĩ (`DEFAULT_SHIFT` trong `src/App.jsx`). Nút **Tone gốc** về lại C#m.

Nút **Sửa** trên trang cho dán bài khác. Trang không lưu gì: tải lại là về mặc định (lời trong `src/song.txt`, tone Bm, cỡ chữ, ♯/♭).
