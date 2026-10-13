import { Router } from 'express';
import {
  CreateCategorySchema,
  CreateBrandSchema,
  CreateDeviceSchema,
  CreatePartSchema,
  CreateCompatibilitySchema,
  CompatibilityCheckSchema,
  CreateListingSchema,
} from '@fixme/validation';
import { CatalogueController } from '../controllers/catalogueController';
import { validateBody } from '../validators/validateRequest';

const router = Router();

// Categories
router.get('/categories', CatalogueController.listCategories);
router.post(
  '/categories',
  validateBody(CreateCategorySchema),
  CatalogueController.createCategory
);

// Brands
router.get('/brands', CatalogueController.listBrands);
router.post('/brands', validateBody(CreateBrandSchema), CatalogueController.createBrand);

// Devices
router.get('/devices', CatalogueController.listDevices);
router.get('/devices/:id', CatalogueController.getDevice);
router.get('/devices/:id/parts', CatalogueController.getDeviceParts);
router.post('/devices', validateBody(CreateDeviceSchema), CatalogueController.createDevice);

// Canonical Parts
router.get('/parts', CatalogueController.listParts);
router.get('/parts/:id', CatalogueController.getPart);
router.post('/parts', validateBody(CreatePartSchema), CatalogueController.createPart);

// Compatibility Engine
router.post(
  '/compatibility/records',
  validateBody(CreateCompatibilitySchema),
  CatalogueController.createCompatibilityRecord
);
router.post(
  '/compatibility/check',
  validateBody(CompatibilityCheckSchema),
  CatalogueController.checkCompatibility
);

// Seller Listings
router.get('/listings', CatalogueController.listListings);
router.post(
  '/listings',
  validateBody(CreateListingSchema),
  CatalogueController.createListing
);

export default router;

