import { Router } from 'express';
import { UploadIntentSchema } from '@fixme/validation';
import { AssetController } from '../controllers/assetController';
import { validateBody } from '../validators/validateRequest';
import { authenticate } from '../permissions/rbac';

const router = Router();

router.post(
  '/upload-intent',
  validateBody(UploadIntentSchema),
  AssetController.createUploadIntent
);

router.post('/:id/complete', AssetController.completeUpload);

router.get('/:id/access', authenticate, AssetController.getAssetAccess);

export default router;
