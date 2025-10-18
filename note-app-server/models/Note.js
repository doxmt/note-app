const mongoose = require('mongoose');

// ✏️ Stroke (단일 펜 경로)
const strokeSchema = new mongoose.Schema({
  pathString: { type: String, required: true },  // Skia Path.toSVGString()
  color: { type: String, default: 'black' },
  width: { type: Number, default: 4 }
});

// 📄 페이지별 Annotation (페이지별로 strokes를 묶음)
const pageAnnotationSchema = new mongoose.Schema({
  pageIndex: { type: Number, required: true }, // 0-based index
  strokes: { type: [strokeSchema], default: [] }
});

// 📘 Note (PDF 메타데이터 + 필기 + 파일 관리)
const NoteSchema = new mongoose.Schema(
  {
    // 기본 식별 정보
    userId:    { type: String, required: true, index: true },
    noteId:    { type: String, required: true, unique: true, index: true },
    name:      { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    folderId:  { type: String, default: null },

    // PDF 파일 관련
    fileId:    { type: mongoose.Schema.Types.ObjectId, default: null },
    fileName:  { type: String, default: null },
    mimeType:  { type: String, default: 'application/pdf' },
    pageImageIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },

    // ✏️ 필기 정보 (페이지별 strokes 구조)
    annotations: {
      type: [pageAnnotationSchema],
      default: []
    },
  },
  {
    timestamps: true, // createdAt, updatedAt 자동
    strict: true
  }
);

module.exports = mongoose.model('Note', NoteSchema);
