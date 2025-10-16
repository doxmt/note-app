const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema(
    {
        // 📌 사용자/폴더/노트 식별 정보
        userId:    { type: String, required: true, index: true },
        noteId:    { type: String, required: true, unique: true, index: true },
        name:      { type: String, required: true },
        createdAt: { type: Date,   required: true },
        folderId:  { type: String, default: null },

        // 📎 GridFS 파일 메타데이터
        fileId:    { type: mongoose.Schema.Types.ObjectId, default: null },
        fileName:  { type: String, default: null },
        mimeType:  { type: String, default: 'application/pdf' },

        // 🖼️ 변환된 PDF 페이지 이미지들의 GridFS File ID 배열
        pageImageIds: {
            type: [mongoose.Schema.Types.ObjectId],
            default: [],
        },

        // ✏️ 필기(annotations) 데이터 — PDF 위에 저장되는 stroke 정보
        annotations: {
            type: Array,
            default: [],
        },
    },
    {
        timestamps: true, // createdAt, updatedAt 자동 생성
        strict: true,     // 스키마에 정의되지 않은 필드 방지
    }
);

module.exports = mongoose.model('Note', NoteSchema);
