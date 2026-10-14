import express, { Router } from 'express';
import { UploadIntentSchema } from '@fixme/validation';
import { AssetController } from '../controllers/assetController';
import { validateBody } from '../validators/validateRequest';
import { authenticate } from '../permissions/rbac';

const router = Router();

// 1. Create Upload Intent (returns uploadUrl and uploadToken)
router.post(
  '/upload-intent',
  validateBody(UploadIntentSchema),
  AssetController.createUploadIntent
);

// 2. Direct binary upload to local storage (for STORAGE_PROVIDER=local)
router.put(
  '/upload-put',
  express.raw({ type: ['image/*', 'application/octet-stream', '*/*'], limit: '10mb' }),
  AssetController.handleLocalUpload
);

// 3. Mark asset upload as ready/completed
router.post('/:id/complete', AssetController.completeUpload);

// 4. Request authorized signed access URL for private assets (KYC, dispute evidence)
router.get('/:id/access', authenticate, AssetController.getAssetAccess);

// 5. Serve public assets (product photos, avatars)
router.get('/public/*', AssetController.servePublicAsset);

// 6. Serve private assets with signed verification
router.get('/private/*', AssetController.servePrivateAsset);

// 7. Delete asset and remove associated storage object
router.delete('/:id', authenticate, AssetController.deleteAsset);

export default router;
