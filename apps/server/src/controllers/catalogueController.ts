import { Request, Response, NextFunction } from 'express';
import { CatalogueService } from '../services/catalogueService';

export class CatalogueController {
  static async listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const onlyActive = req.query.all !== 'true';
      const categories = await CatalogueService.listCategories(onlyActive);
      res.status(200).json({
        success: true,
        data: categories,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await CatalogueService.createCategory(req.body);
      res.status(201).json({
        success: true,
        data: category,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listBrands(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const onlyActive = req.query.all !== 'true';
      const brands = await CatalogueService.listBrands(onlyActive);
      res.status(200).json({
        success: true,
        data: brands,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const brand = await CatalogueService.createBrand(req.body);
      res.status(201).json({
        success: true,
        data: brand,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listDevices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CatalogueService.listDevices({
        brandId: req.query.brandId as string | undefined,
        categoryId: req.query.categoryId as string | undefined,
        search: (req.query.search || req.query.q) as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      });
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          totalItems: result.total,
          totalPages: Math.ceil(result.total / result.limit),
        },
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const device = await CatalogueService.getDeviceById(req.params.id);
      res.status(200).json({
        success: true,
        data: device,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const device = await CatalogueService.createDevice(req.body);
      res.status(201).json({
        success: true,
        data: device,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDeviceParts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await CatalogueService.getCompatiblePartsForDevice(req.params.id);
      res.status(200).json({
        success: true,
        data,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listParts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CatalogueService.listParts({
        categoryId: req.query.categoryId as string | undefined,
        brandId: req.query.brandId as string | undefined,
        componentType: req.query.componentType as string | undefined,
        search: (req.query.search || req.query.q) as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      });
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          totalItems: result.total,
          totalPages: Math.ceil(result.total / result.limit),
        },
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await CatalogueService.getPartById(req.params.id);
      res.status(200).json({
        success: true,
        data,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createPart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const part = await CatalogueService.createPart(req.body);
      res.status(201).json({
        success: true,
        data: part,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createCompatibilityRecord(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const record = await CatalogueService.createCompatibilityRecord(
        req.body,
        (req as any).user?.id
      );
      res.status(201).json({
        success: true,
        data: record,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async checkCompatibility(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await CatalogueService.checkCompatibility(req.body);
      res.status(200).json({
        success: true,
        data: result,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listListings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CatalogueService.listListings({
        partId: req.query.partId as string | undefined,
        sellerId: req.query.sellerId as string | undefined,
        condition: req.query.condition as string | undefined,
        status: req.query.status as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      });
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          totalItems: result.total,
          totalPages: Math.ceil(result.total / result.limit),
        },
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createListing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId =
        (req as any).user?.id ||
        req.body.sellerId ||
        '000000000000000000000001';
      const listing = await CatalogueService.createListing(
        sellerId,
        req.body,
        Boolean(req.body.autoActivate)
      );
      res.status(201).json({
        success: true,
        data: listing,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }
}

