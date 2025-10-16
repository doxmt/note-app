// server.js

//// 🔧 핫스팟 사용 시 DNS 수동 지정 (선택)
//const dns = require('node:dns');
//dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();

// 1️⃣ 미들웨어
app.use(cors());
app.use(express.json());

// 2️⃣ 업로드된 파일 접근 허용 (예: /uploads/notes/노트ID/page_1.png)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 3️⃣ 라우터 import
const notesRoutes  = require('./routes/note');
const folderRoutes = require('./routes/folder');
const userRouter   = require('./routes/user');

// 4️⃣ 라우터 장착
app.use('/api/notes', notesRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/user', userRouter);

// 5️⃣ 헬스체크
app.get('/', (_req, res) => res.send('서버 연결 성공!'));

// 6️⃣ public 폴더 (정적 파일 제공)
app.use(express.static(path.join(__dirname, 'public')));

// 7️⃣ 요청 로깅
app.use((req, _res, next) => {
    console.log(`[${req.method}] ${req.originalUrl}`);
    next();
});

// 8️⃣ 라우트 목록 로깅 (개선된 버전)
function logRoutes() {
    const lines = [];
    app._router.stack.forEach((layer) => {
        if (layer.route && layer.route.path) {
            const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
            lines.push(`${methods.padEnd(6)} ${layer.route.path}`);
        } else if (layer.name === 'router' && layer.handle?.stack) {
            layer.handle.stack.forEach((r) => {
                if (r.route) {
                    const methods = Object.keys(r.route.methods).join(',').toUpperCase();
                    const base = layer.regexp?.source
                        ?.replace('^\\\\', '')
                        ?.replace('\\\\/?(?=\\/|$)', '') || '';
                    lines.push(`${methods.padEnd(6)} ${base} ${r.route.path}`);
                }
            });
        }
    });
    console.log('🧭 Mounted routes:\n' + lines.map(s => '  - ' + s).join('\n'));
}

// 9️⃣ DB 연결 후 서버 실행
const PORT = process.env.PORT || 5001;

(async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            console.error('❌ MONGO_URI 미설정');
            process.exit(1);
        }

        console.log('🗄️  MongoDB 연결 시도…');
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ MongoDB 연결 성공');

        // 서버 실행
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 서버 실행 중! http://localhost:${PORT}`);
            logRoutes(); // ✅ 라우트 장착 확인
        });

        mongoose.connection.on('error', (err) => console.error('❌ Mongoose 에러:', err));
        mongoose.connection.on('disconnected', () => console.warn('⚠️  Mongoose 연결 끊김'));
    } catch (err) {
        console.error('❌ MongoDB 연결 실패:', err);
        process.exit(1);
    }
})();
