const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFSBucket, ObjectId } = require('mongodb');
const { once } = require('events');
const fs = require('fs');
const path = require('path');
const { fromPath } = require("pdf2pic");
const Note = require('../models/Note');

const router = express.Router();

// ─────────────────────────────────────────────
// 📦 Multer (메모리 스토리지)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ─────────────────────────────────────────────
// 유틸
function normalizeFolderId(v) {
  return (v === undefined || v === null || v === '' || v === 'null' || v === 'undefined')
    ? null
    : v;
}

function parseCreatedAt(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date() : d;
}

// ─────────────────────────────────────────────
// ✨ PDF → 이미지 변환 및 업로드
async function convertAndUploadPages(pdfBuffer, noteId, db) {
  const pageImageIds = [];
  const imageBucket = new GridFSBucket(db, { bucketName: 'pageImages' });

  // 1️⃣ 임시 경로 생성
  const tempDir = path.join(__dirname, '..', 'uploads', 'temp_pdfs');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const tempPdfPath = path.join(tempDir, `${noteId}.pdf`);
  fs.writeFileSync(tempPdfPath, pdfBuffer);

  // 2️⃣ pdf2pic 옵션
  const options = {
    density: 150,
    saveFilename: "page",
    savePath: path.join(__dirname, '..', 'uploads', 'temp_images', noteId),
    format: "png",
    width: 800,
    height: 1132,
  };
  if (!fs.existsSync(options.savePath)) fs.mkdirSync(options.savePath, { recursive: true });

  // 3️⃣ 변환 실행
  const convert = fromPath(tempPdfPath, options);
  const pages = await convert.bulk(-1, { responseType: "image" });

  // 4️⃣ 변환된 이미지를 GridFS에 업로드
  for (const page of pages) {
    const imageName = path.basename(page.path);
    const uploadStream = imageBucket.openUploadStream(imageName, {
      contentType: 'image/png',
      metadata: { noteId },
    });

    const fileBuffer = fs.readFileSync(page.path);
    uploadStream.end(fileBuffer);
    await once(uploadStream, 'finish');
    pageImageIds.push(uploadStream.id);
    fs.unlinkSync(page.path);
  }

  // 5️⃣ 정리
  fs.unlinkSync(tempPdfPath);
  fs.rmSync(options.savePath, { recursive: true, force: true });

  return pageImageIds;
}

// ─────────────────────────────────────────────
// 1) 노트 목록 조회
router.get('/', async (req, res) => {
  try {
    const { userId, folderId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId 필요' });

    const filter = {
      userId,
      folderId: normalizeFolderId(folderId),
    };

    const notes = await Note.find(filter).sort({ createdAt: -1 });
    return res.json({ notes });
  } catch (err) {
    console.error('❌ 노트 목록 조회 오류:', err);
    return res.status(500).json({ error: '서버 오류' });
  }
});

// ─────────────────────────────────────────────
// 2) 노트 + PDF 업로드 (+ 이미지 변환)
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { userId, noteId, name, createdAt, folderId } = req.body;
    if (!userId || !noteId || !name || !createdAt || !req.file) {
      return res.status(400).json({ error: '필수 항목 또는 파일 누락' });
    }

    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ error: 'DB 연결 미확립' });

    // 1️⃣ PDF GridFS 업로드
    const pdfBucket = new GridFSBucket(db, { bucketName: 'pdfs' });
    const originalName = req.file.originalname || `${noteId}.pdf`;
    const mime = req.file.mimetype || 'application/pdf';

    const pdfUploadStream = pdfBucket.openUploadStream(originalName, { contentType: mime });
    pdfUploadStream.end(req.file.buffer);
    await once(pdfUploadStream, 'finish');
    const pdfFileId = pdfUploadStream.id;

    // 2️⃣ PDF → 이미지 변환
    console.log('🖼️ PDF → 이미지 변환 시작...');
    const pageImageIds = await convertAndUploadPages(req.file.buffer, noteId, db);
    console.log('✅ 이미지 업로드 완료:', pageImageIds.length, '개');

    // 3️⃣ 메타데이터 저장
    const doc = new Note({
      userId,
      noteId,
      name,
      createdAt: parseCreatedAt(createdAt),
      folderId: normalizeFolderId(folderId),
      fileId: pdfFileId,
      fileName: originalName,
      mimeType: mime,
      pageImageIds,
    });

    await doc.save();
    return res.status(201).json({ message: '업로드 및 변환 성공', note: doc });
  } catch (err) {
    console.error('🚨 업로드 처리 오류:', err);
    return res.status(500).json({ error: '서버 오류' });
  }
});

// ─────────────────────────────────────────────
// 3) PDF 파일 스트리밍
router.get('/:noteId/file', async (req, res) => {
  try {
    const { noteId } = req.params;
    const db = mongoose.connection.db;
    const note = await Note.findOne({ noteId });
    if (!note || !note.fileId) return res.status(404).json({ error: '파일 없음' });

    const bucket = new GridFSBucket(db, { bucketName: 'pdfs' });
    res.set('Content-Type', note.mimeType || 'application/pdf');
    bucket.openDownloadStream(note.fileId)
      .on('error', (e) => {
        console.error('❌ PDF 스트리밍 오류:', e);
        res.status(404).end();
      })
      .pipe(res);
  } catch (err) {
    console.error('🚨 PDF 다운로드 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// ─────────────────────────────────────────────
// 4) 페이지 이미지 ID 목록 조회
router.get('/:noteId/pages', async (req, res) => {
  try {
    const { noteId } = req.params;
    const note = await Note.findOne({ noteId });
    if (!note || !note.pageImageIds) {
      return res.status(404).json({ error: '페이지 없음' });
    }
    res.json(note.pageImageIds);
  } catch (err) {
    res.status(500).json({ error: '페이지 ID 조회 오류' });
  }
});

// ─────────────────────────────────────────────
// 5) 특정 이미지 스트리밍
router.get('/page/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'pageImages' });
    res.set('Content-Type', 'image/png');
    bucket.openDownloadStream(new ObjectId(fileId))
      .on('error', () => res.status(404).end())
      .pipe(res);
  } catch {
    res.status(400).json({ error: '잘못된 파일 ID' });
  }
});

// ─────────────────────────────────────────────
// 6) 필기 저장
router.put('/:noteId/strokes', async (req, res) => {
  try {
    const { noteId } = req.params;
    const strokesData = req.body;
    const updatedNote = await Note.findOneAndUpdate(
      { noteId },
      { $set: { annotations: strokesData } },
      { new: true }
    );
    if (!updatedNote) return res.status(404).json({ error: '해당 노트 없음' });
    res.status(200).json({ message: '필기 저장 성공' });
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// ─────────────────────────────────────────────
// 7) 필기 불러오기
router.get('/:noteId/strokes', async (req, res) => {
  try {
    const { noteId } = req.params;
    const note = await Note.findOne({ noteId });
    if (!note) return res.status(404).json({ message: '해당 노트 없음' });
    res.status(200).json(note.annotations || []);
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// ─────────────────────────────────────────────
// 8) 노트 메타 수정 (이름 변경, 폴더 이동 등)
router.put('/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;
    const { name, folderId } = req.body;
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (folderId !== undefined) updateFields.folderId = normalizeFolderId(folderId);

    const result = await Note.findOneAndUpdate({ noteId }, { $set: updateFields }, { new: true });
    if (!result) return res.status(404).json({ error: 'noteId 없음' });

    console.log(`📝 노트 업데이트 성공: ${noteId} → ${JSON.stringify(updateFields)}`);
    res.json({ message: '노트 업데이트 성공', note: result });
  } catch (err) {
    console.error('🚨 노트 업데이트 실패:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// ─────────────────────────────────────────────
// 9) 노트 삭제
router.delete('/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;
    const db = mongoose.connection.db;
    const note = await Note.findOne({ noteId });
    if (!note) return res.status(404).json({ error: '노트 없음' });

    const pdfBucket = new GridFSBucket(db, { bucketName: 'pdfs' });
    const imageBucket = new GridFSBucket(db, { bucketName: 'pageImages' });

    if (note.fileId) {
      try { await pdfBucket.delete(new ObjectId(note.fileId)); }
      catch (e) { console.warn('⚠️ PDF 삭제 실패:', e.message); }
    }
    if (note.pageImageIds?.length) {
      for (const imgId of note.pageImageIds) {
        try { await imageBucket.delete(new ObjectId(imgId)); }
        catch { /* 무시 */ }
      }
    }

    await Note.deleteOne({ noteId });
    console.log(`🗑️ 노트 삭제 완료: ${noteId}`);
    res.json({ message: '삭제 완료' });
  } catch (err) {
    console.error('🚨 노트 삭제 실패:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
