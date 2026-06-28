import { Router } from 'express'
import {
  getAlbumList,
  getAlbumDetail,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  getAlbumMedia,
  addMediaToAlbum,
  removeMediaFromAlbum,
  batchRemoveMediaFromAlbum,
  getAlbumShares,
  createAlbumShare,
  deleteAlbumShare,
} from '../controllers/albumController'
import { requireAuth } from '../middleware/authMiddleware'

const router: Router = Router()

router.get('/', requireAuth, getAlbumList)
router.get('/:id', requireAuth, getAlbumDetail)
router.post('/', requireAuth, createAlbum)
router.put('/:id', requireAuth, updateAlbum)
router.delete('/:id', requireAuth, deleteAlbum)

// 照片管理
router.get('/:id/media', requireAuth, getAlbumMedia)
router.post('/:id/media', requireAuth, addMediaToAlbum)
router.delete('/:id/media/:mediaId', requireAuth, removeMediaFromAlbum)
router.post('/:id/media/batch-remove', requireAuth, batchRemoveMediaFromAlbum)

// 分享
router.get('/:id/shares', requireAuth, getAlbumShares)
router.post('/:id/shares', requireAuth, createAlbumShare)
router.delete('/:id/shares/:shareId', requireAuth, deleteAlbumShare)

export default router