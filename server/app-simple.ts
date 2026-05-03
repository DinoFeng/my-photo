import express from 'express';
import cors from 'cors';
import { join } from 'path';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 简单的内存数据存储
let photos = [
  { id: '1', name: 'photo1.jpg', date: new Date(), url: 'https://picsum.photos/400/300?random=1' },
  { id: '2', name: 'photo2.jpg', date: new Date(), url: 'https://picsum.photos/400/300?random=2' },
  { id: '3', name: 'photo3.jpg', date: new Date(), url: 'https://picsum.photos/400/300?random=3' },
];

let albums = [
  { id: '1', name: '按日期', type: 'system' },
  { id: '2', name: '自定义相册', type: 'custom' },
];

let settings = {
  photoSourcePath: '',
  organizePattern: '{year}/{month}/{day}',
  duplicateDetection: 'hash',
  thumbnailQuality: 'medium',
  remoteAccess: false,
  remotePort: 3000,
};

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/photos', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;
  res.json(photos.slice(offset, offset + limit));
});

app.get('/api/albums', (req, res) => {
  res.json(albums);
});

app.get('/api/settings', (req, res) => {
  res.json(settings);
});

app.put('/api/settings', (req, res) => {
  Object.assign(settings, req.body);
  res.json(settings);
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
});
