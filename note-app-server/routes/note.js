/**
 * 📘 routes/note.js — 통합 완성형
 * 기능: 업로드, 변환, 페이지 이미지, 스트리밍, 필기 저장, 메타 수정, 삭제
 */
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
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ───────────────────────────────
// 📎 유틸
function normalizeFolderId(v) {
  return (v === undefined || v === null || v === '' || v === 'null' || v === 'undefined')
    ? null
    : v;
}
function parseCreatedAt(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date() : d;
}

// ───────────────────────────────
// 🖼️ PDF → 이미지 변환 후 GridFS 업로드
async function convertAndUploadPages(pdfBuffer, noteId, db) {
  const pageImageIds = [];
  const imageBucket = new GridFSBucket(db, { bucketName: 'pageImages' });

  const tempDir = path.join(__dirname, '..', 'uploads', 'temp_pdfs');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const tempPdfPath = path.join(tempDir, `${noteId}.pdf`);
  fs.writeFileSync(tempPdfPath, pdfBuffer);

  const options = {
    density: 150,
    saveFilename: "page",
    savePath: path.join(__dirname, '..', 'uploads', 'temp_images', noteId),
    format: "png",
    width: 800,
    height: 1132,
  };
  if (!fs.existsSync(options.savePath)) fs.mkdirSync(options.savePath, { recursive: true });

  const convert = fromPath(tempPdfPath, options);
  const pages = await convert.bulk(-1, { responseType: "image" });

  for (const [i, page] of pages.entries()) {
    const uploadStream = imageBucket.openUploadStream(`page-${i}.png`, {
      contentType: 'image/png',
      metadata: { noteId },
    });

    const fileBuffer = fs.readFileSync(page.path);
    uploadStream.end(fileBuffer);
    await once(uploadStream, 'finish');

    pageImageIds.push(uploadStream.id);
    fs.unlinkSync(page.path);
  }

  fs.unlinkSync(tempPdfPath);
  fs.rmSync(options.savePath, { recursive: true, force: true });

  return pageImageIds;
}

// ───────────────────────────────
// 1️⃣ 노트 목록 조회
router.get('/', async (req, res) => {
  try {
    const { userId, folderId, isFavorite } = req.query; // ✅ isFavorite 추가!
    if (!userId) return res.status(400).json({ error: 'userId 필요' });

    const filter = { userId };

    // 폴더 필터 적용 (루트면 null)
    const normalized = normalizeFolderId(folderId);
    if (normalized !== null) filter.folderId = normalized;

    // ✅ 즐겨찾기 필터 추가
    if (isFavorite === 'true') filter.isFavorite = true;

    const notes = await Note.find(filter).sort({ createdAt: -1 });
    res.json({ notes });
  } catch (err) {
    console.error('❌ 노트 목록 조회 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});


// ───────────────────────────────
// 2️⃣ PDF 업로드 + 이미지 변환 + DB저장
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { userId, noteId, name, createdAt, folderId } = req.body;
    if (!userId || !noteId || !name || !createdAt || !req.file)
      return res.status(400).json({ error: '필수 항목 또는 파일 누락' });

    const db = mongoose.connection.db;
    const pdfBucket = new GridFSBucket(db, { bucketName: 'pdfs' });

    const originalName = req.file.originalname || `${noteId}.pdf`;
    const mime = req.file.mimetype || 'application/pdf';
    const pdfUploadStream = pdfBucket.openUploadStream(originalName, { contentType: mime });
    pdfUploadStream.end(req.file.buffer);
    await once(pdfUploadStream, 'finish');
    const pdfFileId = pdfUploadStream.id;

    console.log('🖼️ PDF → 이미지 변환 시작...');
    const pageImageIds = await convertAndUploadPages(req.file.buffer, noteId, db);
    console.log('✅ 이미지 업로드 완료:', pageImageIds.length, '개');

    const note = new Note({
      userId,
      noteId,
      name,
      createdAt: parseCreatedAt(createdAt),
      folderId: normalizeFolderId(folderId),
      fileId: pdfFileId,
      fileName: originalName,
      mimeType: mime,
      pageImageIds,
      annotations: [], // 기본 빈 배열
    });

    await note.save();
    res.status(201).json({ message: '업로드 및 변환 성공', note });
  } catch (err) {
    console.error('🚨 업로드 처리 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 2-2
// ───────────────────────────────
// 🖼️ 이미지 업로드 + DB 저장
router.post('/upload-image', upload.single('file'), async (req, res) => {
  try {
    const { userId, noteId, name, createdAt, folderId } = req.body;
    if (!userId || !noteId || !name || !createdAt || !req.file)
      return res.status(400).json({ error: '필수 항목 또는 파일 누락' });

    const db = mongoose.connection.db;
    const imageBucket = new GridFSBucket(db, { bucketName: 'pageImages' });

    const originalName = req.file.originalname || `${noteId}.png`;
    const mime = req.file.mimetype || 'image/png';

    // ✅ 이미지 1장 업로드
    const uploadStream = imageBucket.openUploadStream(originalName, {
      contentType: mime,
      metadata: { noteId },
    });
    uploadStream.end(req.file.buffer);
    await once(uploadStream, 'finish');
    const imageFileId = uploadStream.id;

    // ✅ Note 생성 (PDF 없이 단일 이미지)
    const note = new Note({
      userId,
      noteId,
      name,
      createdAt: parseCreatedAt(createdAt),
      folderId: normalizeFolderId(folderId),
      fileId: null, // PDF 없음
      fileName: originalName,
      mimeType: mime,
      pageImageIds: [imageFileId], // ✅ 단일 이미지
      annotations: [],
    });

    await note.save();
    res.status(201).json({ message: '이미지 업로드 성공', note });
  } catch (err) {
    console.error('🚨 이미지 업로드 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});


// ───────────────────────────────
// 3️⃣ PDF 다운로드 스트리밍
router.get('/:noteId/file', async (req, res) => {
  try {
    const { noteId } = req.params;
    const db = mongoose.connection.db;
    const note = await Note.findOne({ noteId });
    if (!note || !note.fileId) return res.status(404).json({ error: '파일 없음' });

    const bucket = new GridFSBucket(db, { bucketName: 'pdfs' });
    res.set('Content-Type', note.mimeType || 'application/pdf');
    bucket.openDownloadStream(note.fileId).on('error', () => res.status(404).end()).pipe(res);
  } catch (err) {
    console.error('🚨 PDF 다운로드 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// ───────────────────────────────
// 4️⃣ 페이지 이미지 스트리밍
router.get('/page/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'pageImages' });
    res.set('Content-Type', 'image/png');
    bucket.openDownloadStream(new ObjectId(fileId)).on('error', () => res.status(404).end()).pipe(res);
  } catch {
    res.status(400).json({ error: '잘못된 파일 ID' });
  }
});

// ───────────────────────────────
// 5️⃣ 페이지 이미지 ID 목록 조회
router.get('/:noteId/pages', async (req, res) => {
  try {
    const { noteId } = req.params;
    const note = await Note.findOne({ noteId });
    if (!note || !note.pageImageIds)
      return res.status(404).json([]);

    // 단순 배열만 리턴
    res.json(note.pageImageIds);
  } catch (err) {
    res.status(500).json({ error: '페이지 목록 오류' });
  }
});


// ───────────────────────────────
// 6️⃣ 페이지별 필기 저장 (pageIndex 포함 구조)
router.put('/:noteId/strokes', async (req, res) => {
  try {
    const { noteId } = req.params;
    const strokesData = req.body; // [{ pageIndex, strokes: [...] }]
    if (!Array.isArray(strokesData))
      return res.status(400).json({ error: '잘못된 데이터 형식' });

    const note = await Note.findOne({ noteId });
    if (!note) return res.status(404).json({ error: '노트 없음' });

    note.annotations = strokesData;
    await note.save();

    res.status(200).json({ message: '필기 저장 완료' });
  } catch (err) {
    console.error('🚨 필기 저장 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// ───────────────────────────────
// 7️⃣ 필기 불러오기
router.get('/:noteId/strokes', async (req, res) => {
  try {
    const note = await Note.findOne({ noteId: req.params.noteId });
    if (!note) return res.status(404).json({ message: '노트 없음' });
    res.status(200).json(note.annotations || []);
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// ───────────────────────────────
// 8️⃣ 노트 메타데이터 수정
router.put('/:noteId', async (req, res) => {
  try {
    const { name, folderId } = req.body;
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (folderId !== undefined) updateFields.folderId = normalizeFolderId(folderId);

    const updated = await Note.findOneAndUpdate(
      { noteId: req.params.noteId },
      { $set: updateFields },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'noteId 없음' });
    res.json({ message: '노트 업데이트 성공', note: updated });
  } catch (err) {
    console.error('🚨 노트 업데이트 실패:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// ───────────────────────────────
// 9️⃣ 노트 삭제
router.delete('/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;
    const db = mongoose.connection.db;
    const note = await Note.findOne({ noteId });
    if (!note) return res.status(404).json({ error: '노트 없음' });

    const pdfBucket = new GridFSBucket(db, { bucketName: 'pdfs' });
    const imageBucket = new GridFSBucket(db, { bucketName: 'pageImages' });

    if (note.fileId) {
      try { await pdfBucket.delete(new ObjectId(note.fileId)); } catch (e) { console.warn('⚠️ PDF 삭제 실패:', e.message); }
    }
    if (note.pageImageIds?.length) {
      for (const id of note.pageImageIds) {
        try { await imageBucket.delete(new ObjectId(id)); } catch { }
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
// ───────────────────────────────
// 🔟 즐겨찾기 상태 변경 (토글)
router.put('/:noteId/favorite', async (req, res) => {
  try {
    const { noteId } = req.params;
    const { isFavorite } = req.body;

    if (typeof isFavorite !== 'boolean') {
      return res.status(400).json({ error: 'isFavorite(boolean) 필수' });
    }

    const note = await Note.findOneAndUpdate(
      { noteId },
      { $set: { isFavorite } },
      { new: true }
    );

    if (!note) {
      return res.status(404).json({ error: 'noteId 없음' });
    }

    res.json({ message: '즐겨찾기 상태 업데이트 성공', note });
  } catch (err) {
    console.error('🚨 즐겨찾기 상태 업데이트 실패:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
