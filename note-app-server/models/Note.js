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

// 📘 Note (PDF or Image)
const NoteSchema = new mongoose.Schema(
  {
    // 기본 식별 정보
    userId:    { type: String, required: true, index: true },
    noteId:    { type: String, required: true, unique: true, index: true },
    name:      { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    folderId:  { type: String, default: null },

    // 파일 관련 (PDF 또는 Image)
    fileId:       { type: mongoose.Schema.Types.ObjectId, default: null },
    fileName:     { type: String, default: null },
    mimeType:     { type: String, default: null }, // ✅ pdf / image/png 등
    pageImageIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },

    // 구분자 추가 ✅
    noteType: {
      type: String,
      enum: ['pdf', 'image'],
      default: 'pdf'
    },

    // ✏️ 필기 정보
    annotations: {
      type: [pageAnnotationSchema],
      default: []
    },
  },
  {
    timestamps: true,
    strict: true
  }
);

module.exports = mongoose.model('Note', NoteSchema);
