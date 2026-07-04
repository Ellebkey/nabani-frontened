# Expense Tagging System - Implementation Plan

## Overview

This document provides a comprehensive step-by-step plan to implement a tagging system for expenses in the MyExpenses application. The implementation follows the MODULE_DEVELOPMENT_GUIDE.md for backend and REFACTORING_GUIDE.md for frontend patterns.

**Goal**: Allow users to create and assign tags to expenses for better organization (e.g., "Christmas vacation 2025" for related travel expenses).

## Backend Implementation

### 1. Database Schema Changes

#### 1.1 Create Tag Migration
**File**: `myexpenses-backend/src/database/migrations/YYYYMMDD-create-tag-table.js`

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tag', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      color: {
        type: Sequelize.STRING(7), // Hex color #FFFFFF
        allowNull: false,
        defaultValue: '#3B82F6', // Blue-500
      },
      icon: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Optional Material Icon name',
      },
      is_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('tag', ['name']);
    await queryInterface.addIndex('tag', ['is_enabled']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tag');
  },
};
```

#### 1.2 Create Expense-Tag Junction Table Migration
**File**: `myexpenses-backend/src/database/migrations/YYYYMMDD-create-expense-tag-table.js`

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('expense_tag', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      expense_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'expense',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      tag_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'tag',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Composite unique index to prevent duplicate tags on same expense
    await queryInterface.addIndex('expense_tag', ['expense_id', 'tag_id'], {
      unique: true,
      name: 'expense_tag_unique',
    });

    // Individual indexes for queries
    await queryInterface.addIndex('expense_tag', ['expense_id']);
    await queryInterface.addIndex('expense_tag', ['tag_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('expense_tag');
  },
};
```

### 2. Tag Model Implementation

#### 2.1 Tag Model
**File**: `myexpenses-backend/src/models/tag.model.ts`

```typescript
import {
  Sequelize,
  DataTypes,
  CreationOptional,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';
import { ExpenseInstance } from '@models/expense.model';

export class TagInstance extends BaseModelInstance<TagInstance> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare color: CreationOptional<string>;
  declare icon: CreationOptional<string>;
  declare isEnabled: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  // Associations
  declare expenses?: ExpenseInstance[];
}

const TagFactory = (sequelize: Sequelize): ModelClass<TagInstance> => {
  TagInstance.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      color: {
        type: DataTypes.STRING(7),
        allowNull: false,
        defaultValue: '#3B82F6',
        validate: {
          isHexColor(value: string) {
            if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
              throw new Error('Color must be a valid hex color (e.g., #FFFFFF)');
            }
          },
        },
      },
      icon: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      isEnabled: {
        field: 'is_enabled',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        field: 'created_at',
        type: DataTypes.DATE,
      },
      updatedAt: {
        field: 'updated_at',
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      tableName: 'tag',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      modelName: 'Tag',
    },
  );

  TagInstance.associate = (models) => {
    TagInstance.belongsToMany(models.Expense, {
      as: 'expenses',
      through: 'expense_tag',
      foreignKey: 'tag_id',
      otherKey: 'expense_id',
      timestamps: false,
    });
  };

  return TagInstance as ModelClass<TagInstance>;
};

export default TagFactory;
```

#### 2.2 Update Expense Model for Tag Association
**File**: `myexpenses-backend/src/models/expense.model.ts`
**Changes needed**:

1. Add TagInstance import:
```typescript
import { TagInstance } from '@models/tag.model';
```

2. Add tags property to ExpenseInstance class:
```typescript
export class ExpenseInstance extends BaseModelInstance<ExpenseInstance> {
  // ... existing properties
  // Associations
  declare recipient?: RecipientInstance;
  declare paymentMethod?: PaymentMethodInstance;
  declare articles?: ArticleWithExpenseItem[];
  declare expenseItems?: ExpenseItemInstance[];
  declare tags?: TagInstance[]; // ADD THIS LINE
}
```

3. Update associate method in ExpenseFactory:
```typescript
ExpenseInstance.associate = (models) => {
  ExpenseInstance.belongsTo(models.PaymentMethod, { as: 'paymentMethod', foreignKey: 'payment_method_id' });
  ExpenseInstance.belongsTo(models.Recipient, { as: 'recipient', foreignKey: 'recipient_id' });
  ExpenseInstance.belongsToMany(models.Article, {
    as: 'articles',
    through: models.ExpenseItem,
    foreignKey: 'expense_id',
  });
  ExpenseInstance.hasMany(models.ExpenseItem, {
    as: 'expenseItems',
    foreignKey: 'expense_id',
  });
  ExpenseInstance.belongsTo(models.Account, { as: 'account', foreignKey: 'account_id' });
  // ADD THIS LINE:
  ExpenseInstance.belongsToMany(models.Tag, {
    as: 'tags',
    through: 'expense_tag',
    foreignKey: 'expense_id',
    otherKey: 'tag_id',
    timestamps: false,
  });
};
```

### 3. DTOs and Interfaces

#### 3.1 Tag DTOs
**File**: `myexpenses-backend/src/interfaces/tag.dto.ts`

```typescript
import { BaseFilterDto, BaseListDto } from './base.dto';

export interface CreateTagDto {
  name: string;
  color?: string;
  icon?: string;
  isEnabled?: boolean;
}

export interface UpdateTagDto {
  name?: string;
  color?: string;
  icon?: string;
  isEnabled?: boolean;
}

export interface TagDto {
  id: number;
  name: string;
  color: string;
  icon?: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TagListDto = BaseListDto<TagDto>;

export interface TagFilterDto extends BaseFilterDto {
  isEnabled?: boolean;
}

export interface TagUsageDto extends TagDto {
  usageCount: number;
}
```

#### 3.2 Update Expense DTOs
**File**: `myexpenses-backend/src/interfaces/expense.dto.ts`
**Changes needed**:

1. Add tag import at top:
```typescript
import { TagDto } from './tag.dto';
```

2. Update CreateExpenseDto:
```typescript
export interface CreateExpenseDto {
  // ... existing properties
  articles?: ArticlePurchasedDto[];
  isDraft?: boolean;
  isPayout?: boolean;
  tagIds?: number[]; // ADD THIS LINE
}
```

3. Update UpdateExpenseDto:
```typescript
export interface UpdateExpenseDto {
  // ... existing properties
  articles?: ArticlePurchasedDto[];
  isPayout?: boolean;
  tagIds?: number[]; // ADD THIS LINE
}
```

4. Update ExpenseDto:
```typescript
export interface ExpenseDto {
  // ... existing properties
  recipientName: string;
  cardIcon: string;
  backgroundColor: string;
  showDetail: boolean;
  articles: ArticlePurchasedDto[];
  tags?: TagDto[]; // ADD THIS LINE
}
```

### 4. Validation Schemas

#### 4.1 Tag Validation
**File**: `myexpenses-backend/src/validations/tag.validation.ts`

```typescript
import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const tagValidationSchemas = {
  createTag: Joi.object({
    name: Joi.string()
      .required()
      .min(1)
      .max(100)
      .trim()
      .messages({
        'string.empty': 'Tag name is required',
        'string.max': 'Tag name must not exceed 100 characters',
      }),
    color: Joi.string()
      .pattern(/^#[0-9A-Fa-f]{6}$/)
      .default('#3B82F6')
      .messages({
        'string.pattern.base': 'Color must be a valid hex color (e.g., #FFFFFF)',
      }),
    icon: Joi.string()
      .allow(null, '')
      .max(50)
      .trim(),
    isEnabled: Joi.boolean()
      .default(true),
  }),

  updateTag: Joi.object({
    name: Joi.string()
      .min(1)
      .max(100)
      .trim(),
    color: Joi.string()
      .pattern(/^#[0-9A-Fa-f]{6}$/)
      .messages({
        'string.pattern.base': 'Color must be a valid hex color (e.g., #FFFFFF)',
      }),
    icon: Joi.string()
      .allow(null, '')
      .max(50)
      .trim(),
    isEnabled: Joi.boolean(),
  }).min(1),

  tagFilter: Joi.object({
    searchText: Joi.string()
      .allow('')
      .max(100)
      .trim(),
    isEnabled: Joi.boolean(),
    offset: Joi.number()
      .integer()
      .min(0)
      .default(0),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(50),
  }),

  tagIds: Joi.array()
    .items(Joi.number().integer().positive())
    .unique()
    .max(20)
    .messages({
      'array.max': 'Cannot assign more than 20 tags to an expense',
    }),
};

registerSchemas(tagValidationSchemas);

export default tagValidationSchemas;
```

#### 4.2 Update Expense Validation
**File**: `myexpenses-backend/src/validations/expense.validation.ts`
**Changes needed**:

Add tagIds validation to existing schemas:

```typescript
// In createExpense schema, add:
tagIds: Joi.array()
  .items(Joi.number().integer().positive())
  .unique()
  .max(20)
  .optional(),

// In updateExpense schema, add:
tagIds: Joi.array()
  .items(Joi.number().integer().positive())
  .unique()
  .max(20)
  .optional(),
```

### 5. Tag Service Implementation

#### 5.1 Tag Service
**File**: `myexpenses-backend/src/services/tag.service.ts`

```typescript
import { Transaction, Op } from 'sequelize';
import withTransaction from '@utils/transaction.util';
import { logger } from '@config/logger';
import { db } from '@config/sequelize';
import { TagInstance } from '@models/tag.model';
import { NotFoundError, ConflictError } from '@errors/app-error';
import { WhereClause } from '@interfaces/base.dto';
import {
  CreateTagDto,
  UpdateTagDto,
  TagDto,
  TagListDto,
  TagFilterDto,
  TagUsageDto,
} from '@interfaces/tag.dto';

class TagService {
  /**
   * Creates a new tag in the system.
   * @param dto - The data transfer object containing tag creation details
   * @returns Promise resolving to the created tag DTO
   * @throws ConflictError if tag name already exists
   */
  create = async (dto: CreateTagDto): Promise<TagDto> =>
    withTransaction(async (transaction: Transaction) => {
      // Check for duplicate name
      const existingTag = await db.Tag.findOne({
        where: { name: dto.name.trim() },
        transaction,
      });

      if (existingTag) {
        throw new ConflictError(`Tag with name "${dto.name}" already exists`);
      }

      const tag = await db.Tag.create({
        ...dto,
        name: dto.name.trim(),
      }, { transaction });

      logger.info('Tag created', { tagId: tag.id, name: dto.name });

      return this.toTagDto(tag);
    });

  /**
   * Updates an existing tag's information.
   * @param id - The unique identifier of the tag to update
   * @param dto - The data transfer object containing fields to update
   * @returns Promise resolving to the updated tag DTO
   * @throws NotFoundError if the tag is not found
   * @throws ConflictError if new name conflicts with existing tag
   */
  update = async (id: number, dto: UpdateTagDto): Promise<TagDto> =>
    withTransaction(async (transaction) => {
      // Check if tag exists
      const existingTag = await db.Tag.findByPk(id, { transaction });
      if (!existingTag) {
        throw new NotFoundError('Tag', id);
      }

      // Check for name conflict if name is being updated
      if (dto.name && dto.name.trim() !== existingTag.name) {
        const conflictingTag = await db.Tag.findOne({
          where: { 
            name: dto.name.trim(),
            id: { [Op.ne]: id },
          },
          transaction,
        });

        if (conflictingTag) {
          throw new ConflictError(`Tag with name "${dto.name}" already exists`);
        }
      }

      const updateData = {
        ...dto,
        ...(dto.name && { name: dto.name.trim() }),
      };

      const [updatedCount, [updatedTag]] = await db.Tag.update(updateData, {
        where: { id },
        returning: true,
        transaction,
      });

      if (updatedCount === 0 || !updatedTag) {
        throw new NotFoundError('Tag', id);
      }

      logger.info('Tag updated', { tagId: id });

      return this.toTagDto(updatedTag);
    });

  /**
   * Soft deletes a tag by setting isEnabled to false.
   * @param id - The unique identifier of the tag to delete
   * @returns Promise resolving when the deletion is complete
   * @throws NotFoundError if the tag is not found
   */
  delete = async (id: number): Promise<void> =>
    withTransaction(async (transaction) => {
      const [updatedCount] = await db.Tag.update(
        { isEnabled: false },
        {
          where: { id },
          transaction,
        }
      );

      if (updatedCount === 0) {
        throw new NotFoundError('Tag', id);
      }

      logger.info('Tag soft deleted', { tagId: id });
    });

  /**
   * Hard deletes a tag and all its associations.
   * @param id - The unique identifier of the tag to permanently delete
   * @returns Promise resolving when the deletion is complete
   * @throws NotFoundError if the tag is not found
   */
  permanentDelete = async (id: number): Promise<void> =>
    withTransaction(async (transaction) => {
      const deletedCount = await db.Tag.destroy({
        where: { id },
        transaction,
      });

      if (deletedCount === 0) {
        throw new NotFoundError('Tag', id);
      }

      logger.info('Tag permanently deleted', { tagId: id });
    });

  /**
   * Retrieves a tag by its unique identifier.
   * @param id - The unique identifier of the tag
   * @returns Promise resolving to the tag DTO
   * @throws NotFoundError if the tag is not found
   */
  findById = async (id: number): Promise<TagDto> => {
    const tag = await db.Tag.findByPk(id);

    if (!tag) {
      throw new NotFoundError('Tag', id);
    }

    return this.toTagDto(tag);
  };

  /**
   * Retrieves a paginated list of tags based on filter criteria.
   * @param filters - Filter parameters including search text and pagination
   * @returns Promise resolving to a list of tags with total count
   */
  findAll = async (filters: TagFilterDto): Promise<TagListDto> => {
    const { searchText, isEnabled, offset = 0, limit = 50 } = filters;
    const where: WhereClause = {};

    if (typeof isEnabled === 'boolean') {
      where.isEnabled = isEnabled;
    }

    if (searchText) {
      where.name = { [Op.iLike]: `%${searchText}%` };
    }

    const { count, rows } = await db.Tag.findAndCountAll({
      where,
      limit,
      offset,
      order: [['name', 'ASC']],
      distinct: true,
    });

    return {
      rows: rows.map((row) => this.toTagDto(row)),
      count: +count,
    };
  };

  /**
   * Retrieves tags with their usage count across expenses.
   * @param limit - Maximum number of tags to return
   * @returns Promise resolving to tags with usage statistics
   */
  findMostUsed = async (limit: number = 10): Promise<TagUsageDto[]> => {
    const tags = await db.Tag.findAll({
      attributes: [
        'id',
        'name',
        'color',
        'icon',
        'isEnabled',
        'createdAt',
        'updatedAt',
        [db.sequelize.fn('COUNT', db.sequelize.col('expenses.id')), 'usageCount'],
      ],
      include: [{
        model: db.Expense,
        as: 'expenses',
        attributes: [],
        through: { attributes: [] },
      }],
      where: { isEnabled: true },
      group: ['Tag.id'],
      order: [[db.sequelize.literal('usageCount'), 'DESC']],
      limit,
      raw: true,
    });

    return tags.map(tag => ({
      ...this.toTagDto(tag),
      usageCount: +(tag as any).usageCount || 0,
    }));
  };

  /**
   * Validates that all provided tag IDs exist and are enabled.
   * @param tagIds - Array of tag IDs to validate
   * @returns Promise resolving to array of valid TagDto objects
   * @throws NotFoundError if any tag ID is invalid
   */
  validateTagIds = async (tagIds: number[]): Promise<TagDto[]> => {
    if (!tagIds || tagIds.length === 0) {
      return [];
    }

    const tags = await db.Tag.findAll({
      where: {
        id: { [Op.in]: tagIds },
        isEnabled: true,
      },
    });

    if (tags.length !== tagIds.length) {
      const foundIds = tags.map(tag => tag.id);
      const missingIds = tagIds.filter(id => !foundIds.includes(id));
      throw new NotFoundError(`Tags not found or disabled: ${missingIds.join(', ')}`);
    }

    return tags.map(tag => this.toTagDto(tag));
  };

  private toTagDto = (tag: TagInstance): TagDto => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    icon: tag.icon,
    isEnabled: tag.isEnabled,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  });
}

export default new TagService();
```

### 6. Tag Controller Implementation

#### 6.1 Tag Controller
**File**: `myexpenses-backend/src/controllers/tag.controller.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import TagService from '@services/tag.service';
import { validateDto } from '@utils/validation.util';
import {
  CreateTagDto,
  UpdateTagDto,
  TagFilterDto,
} from '@interfaces/tag.dto';

class TagController {
  private tagService: typeof TagService;

  constructor() {
    this.tagService = TagService;
  }

  /**
   * Creates a new tag
   * @param req - Express request object containing tag data in body
   * @param res - Express response object
   * @param next - Express next function for error handling
   * @returns Created tag with 201 status
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const dto = validateDto<CreateTagDto>('createTag', req.body);
      const tag = await this.tagService.create(dto);

      return res.status(201).json(tag);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Updates an existing tag
   * @param req - Express request object containing tag ID in params and update data in body
   * @param res - Express response object
   * @param next - Express next function for error handling
   * @returns Updated tag data
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const id = +req.params.id;
      const dto = validateDto<UpdateTagDto>('updateTag', req.body);

      const tag = await this.tagService.update(id, dto);

      return res.json(tag);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Soft deletes a tag by ID
   * @param req - Express request object containing tag ID in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   * @returns 204 No Content status
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const id = +req.params.id;
      await this.tagService.delete(id);

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Permanently deletes a tag by ID
   * @param req - Express request object containing tag ID in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   * @returns 204 No Content status
   */
  permanentDelete = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const id = +req.params.id;
      await this.tagService.permanentDelete(id);

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Retrieves a tag by ID
   * @param req - Express request object containing tag ID in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   * @returns Tag data
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const id = +req.params.id;
      const tag = await this.tagService.findById(id);
      return res.json(tag);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Lists tags with optional filtering
   * @param req - Express request object containing filter parameters in query
   * @param res - Express response object
   * @param next - Express next function for error handling
   * @returns Paginated list of tags matching filters
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const filters = validateDto<TagFilterDto>('tagFilter', req.query);
      const result = await this.tagService.findAll(filters);

      return res.json(result);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Retrieves most used tags
   * @param req - Express request object containing optional limit in query
   * @param res - Express response object
   * @param next - Express next function for error handling
   * @returns Array of tags with usage count
   */
  getMostUsed = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const limit = req.query.limit ? +req.query.limit : 10;
      const tags = await this.tagService.findMostUsed(limit);

      return res.json(tags);
    } catch (error) {
      return next(error);
    }
  };
}

export default new TagController();
```

### 7. Tag Routes Implementation

#### 7.1 Tag Routes
**File**: `myexpenses-backend/src/routes/tag.route.ts`

```typescript
import { Router } from 'express';
import tagController from '@controllers/tag.controller';
import Auth from '@middlewares/auth';
import '@validations/tag.validation';

export class TagRoute {
  public canAccess = new Auth().checkAuth;
  public router: Router = Router();

  public constructor() {
    this.init();
  }

  private init(): void {
    this.router.route('/tags')
      .all(this.canAccess)
      .get(tagController.list)
      .post(tagController.create);

    this.router.route('/tags/most-used')
      .all(this.canAccess)
      .get(tagController.getMostUsed);

    this.router.route('/tags/:id')
      .all(this.canAccess)
      .get(tagController.getById)
      .put(tagController.update)
      .delete(tagController.delete);

    this.router.route('/tags/:id/permanent')
      .all(this.canAccess)
      .delete(tagController.permanentDelete);
  }
}

export default new TagRoute().router;
```

### 8. Update Expense Service for Tag Support

#### 8.1 Update Expense Service
**File**: `myexpenses-backend/src/services/expense.service.ts`
**Changes needed**:

1. Add TagService import:
```typescript
import TagService from '@services/tag.service';
```

2. Add TagService to constructor:
```typescript
constructor() {
  this.accountLedgerService = AccountLedgerService;
  this.paymentMethodService = PaymentMethodService;
  this.tagService = TagService; // ADD THIS LINE
}

private tagService: typeof TagService; // ADD THIS LINE
```

3. Update `findExpenseById` method to include tags:
```typescript
// In the include array, add:
{
  model: db.Tag,
  as: 'tags',
  attributes: ['id', 'name', 'color', 'icon'],
  through: { attributes: [] },
}
```

4. Update `toExpenseDto` method to include tags:
```typescript
private toExpenseDto = (expense: ExpenseInstance): ExpenseDto => ({
  // ... existing properties
  articles: this.mapArticles(expense.articles || []),
  tags: expense.tags ? expense.tags.map(tag => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    icon: tag.icon,
    isEnabled: tag.isEnabled,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  })) : [], // ADD THIS LINE
});
```

5. Update `create` method to handle tags:
```typescript
create = async (dto: CreateExpenseDto): Promise<ExpenseDto> =>
  withTransaction(async (transaction: Transaction) => {
    // Validate tag IDs if provided
    let validatedTags: TagDto[] = [];
    if (dto.tagIds && dto.tagIds.length > 0) {
      validatedTags = await this.tagService.validateTagIds(dto.tagIds);
    }

    const { tagIds, articles, ...expenseData } = dto;
    
    const expense = await db.Expense.create(expenseData, { transaction });

    // Associate tags if provided
    if (validatedTags.length > 0) {
      await expense.setTags(validatedTags.map(tag => tag.id), { transaction });
    }

    // ... existing article handling logic

    // Reload expense with tags
    const expenseWithTags = await this.findExpenseById(expense.id);
    
    if (!expenseWithTags) {
      throw new NotFoundError('Expense', expense.id);
    }

    logger.info('Expense created', { 
      expenseId: expense.id,
      tagCount: validatedTags.length,
    });

    return this.toExpenseDto(expenseWithTags);
  });
```

6. Update `update` method to handle tags:
```typescript
update = async (id: number, dto: UpdateExpenseDto): Promise<ExpenseDto> =>
  withTransaction(async (transaction) => {
    // Validate tag IDs if provided
    let validatedTags: TagDto[] = [];
    if (dto.tagIds !== undefined) { // Check for undefined to allow empty array
      validatedTags = dto.tagIds.length > 0 
        ? await this.tagService.validateTagIds(dto.tagIds)
        : [];
    }

    const { tagIds, articles, ...expenseData } = dto;

    const [updatedCount, [updatedExpense]] = await db.Expense.update(expenseData, {
      where: { id },
      returning: true,
      transaction,
    });

    if (updatedCount === 0 || !updatedExpense) {
      throw new NotFoundError('Expense', id);
    }

    // Update tags if tagIds was provided
    if (dto.tagIds !== undefined) {
      await updatedExpense.setTags(validatedTags.map(tag => tag.id), { transaction });
    }

    // ... existing article update logic

    // Reload expense with tags
    const expenseWithTags = await this.findExpenseById(id);
    
    if (!expenseWithTags) {
      throw new NotFoundError('Expense', id);
    }

    logger.info('Expense updated', { 
      expenseId: id,
      tagCount: validatedTags.length,
    });

    return this.toExpenseDto(expenseWithTags);
  });
```

### 9. Register Models in Sequelize Config

#### 9.1 Update Sequelize Config
**File**: `myexpenses-backend/src/config/sequelize.ts`
**Changes needed**:

1. Add Tag model import:
```typescript
import TagFactory from '@models/tag.model';
```

2. In initDataBase method, add:
```typescript
db.Tag = TagFactory(sequelize);
```

#### 9.2 Update DB Models Interface
**File**: `myexpenses-backend/src/interfaces/db-models.interface.ts`
**Changes needed**:

1. Add TagInstance import:
```typescript
import { TagInstance } from '@models/tag.model';
```

2. Add to DbModels interface:
```typescript
export interface DbModels {
  // ... existing models
  Tag: ModelStatic<TagInstance>;
  // ...
}
```

### 10. Update Main Routes File

#### 10.1 Add Tag Routes to Main Router
**File**: `myexpenses-backend/src/routes/index.ts`
**Changes needed**:

1. Add tag routes import:
```typescript
import tagRoutes from './tag.route';
```

2. Add to routes registration:
```typescript
router.use(tagRoutes);
```

---

## Frontend Implementation

### 1. Tag Interfaces and Models

#### 1.1 Tag Model
**File**: `myexpenses-frontend/src/app/modules/shared/interfaces/tag.model.ts`

```typescript
export interface ITag {
  id: number;
  name: string;
  color: string;
  icon?: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateTag {
  name: string;
  color?: string;
  icon?: string;
  isEnabled?: boolean;
}

export interface IUpdateTag {
  name?: string;
  color?: string;
  icon?: string;
  isEnabled?: boolean;
}

export interface ITagUsage extends ITag {
  usageCount: number;
}

export interface ITagFilter {
  searchText?: string;
  isEnabled?: boolean;
  offset?: number;
  limit?: number;
}

// Color palette for tag creation
export const TAG_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#F43F5E', // Rose
] as const;

export type TagColor = typeof TAG_COLORS[number];
```

#### 1.2 Update Expense Model
**File**: `myexpenses-frontend/src/app/modules/shared/interfaces/expense.model.ts`
**Changes needed**:

1. Add tag import:
```typescript
import { ITag } from './tag.model';
```

2. Update IExpense interface:
```typescript
export interface IExpense {
  id: number;
  expenseDate: string;
  totalAmount: number;
  isMonths: boolean;
  isPayout: boolean;
  remainingMonths: number;
  totalMonths: number;
  debtAmount: number;
  paymentMethodId: string;
  cardType: string;
  cardIcon: string;
  method: string;
  backgroundColor: string;
  recipientName: string;
  showDetail: boolean;
  articles: IExpenseArticles[];
  tags?: ITag[]; // ADD THIS LINE
}
```

3. Update IExpenseDTO interface:
```typescript
export interface IExpenseDTO {
  id?: number;
  expenseDate: string;
  totalAmount: number;
  isMonths: boolean;
  isPayout: boolean;
  remainingMonths: number;
  totalMonths: number;
  debtAmount: number;
  paymentMethodId: string;
  recipientId: string;
  comment: string;
  articles: IExpenseArticles[];
  tagIds?: number[]; // ADD THIS LINE
}
```

### 2. Tag Service Implementation

#### 2.1 Tag Service
**File**: `myexpenses-frontend/src/app/modules/shared/services/tag.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpHelpersService } from '@shared/services/httpHelpers.service';
import { RecordsList } from '@shared/interfaces/shared.model';
import { 
  ITag, 
  ICreateTag, 
  IUpdateTag, 
  ITagFilter, 
  ITagUsage 
} from '@shared/interfaces/tag.model';

@Injectable({
  providedIn: 'root'
})
export class TagService extends HttpHelpersService {
  constructor(private http: HttpClient) {
    super();
  }

  /**
   * Retrieves all tags with optional filtering
   */
  getTags(filter?: ITagFilter): Observable<RecordsList<ITag>> {
    const params = filter ? this.createHttpParams(filter) : undefined;
    return this.http.get<RecordsList<ITag>>(`${this.API_URL}/tags`, { params });
  }

  /**
   * Retrieves a single tag by ID
   */
  getTagById(id: number): Observable<ITag> {
    return this.http.get<ITag>(`${this.API_URL}/tags/${id}`);
  }

  /**
   * Creates a new tag
   */
  createTag(tag: ICreateTag): Observable<ITag> {
    return this.http.post<ITag>(`${this.API_URL}/tags`, tag);
  }

  /**
   * Updates an existing tag
   */
  updateTag(id: number, tag: IUpdateTag): Observable<ITag> {
    return this.http.put<ITag>(`${this.API_URL}/tags/${id}`, tag);
  }

  /**
   * Soft deletes a tag (sets isEnabled to false)
   */
  deleteTag(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/tags/${id}`);
  }

  /**
   * Permanently deletes a tag
   */
  permanentDeleteTag(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/tags/${id}/permanent`);
  }

  /**
   * Retrieves most used tags
   */
  getMostUsedTags(limit: number = 10): Observable<ITagUsage[]> {
    return this.http.get<ITagUsage[]>(`${this.API_URL}/tags/most-used?limit=${limit}`);
  }
}
```

#### 2.2 Update Expense Service
**File**: `myexpenses-frontend/src/app/modules/expenses/expenses.service.ts`
**Changes needed**:

Add import for tag model:
```typescript
import { ITag } from '@shared/interfaces/tag.model';
```

The service already uses IExpense which now includes tags, so no other changes are needed for basic functionality.

### 3. Tag Components Implementation

#### 3.1 Tag Chip Component
**File**: `myexpenses-frontend/src/app/modules/shared/components/tag-chip/tag-chip.component.ts`

```typescript
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ITag } from '@shared/interfaces/tag.model';

@Component({
  selector: 'app-tag-chip',
  template: `
    <div 
      class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
      [style.background-color]="tag().color + '20'"
      [style.color]="tag().color"
      [style.border]="'1px solid ' + tag().color + '40'">
      
      @if (tag().icon) {
        <mat-icon class="text-xs">{{ tag().icon }}</mat-icon>
      }
      
      <span>{{ tag().name }}</span>
      
      @if (removable()) {
        <button
          mat-icon-button
          class="!w-4 !h-4 !min-h-0"
          [style.color]="tag().color"
          (click)="onRemove()">
          <mat-icon class="text-xs">close</mat-icon>
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatButtonModule]
})
export class TagChipComponent {
  tag = input.required<ITag>();
  removable = input<boolean>(false);
  
  remove = output<ITag>();

  onRemove(): void {
    this.remove.emit(this.tag());
  }
}
```

#### 3.2 Tag Selector Component
**File**: `myexpenses-frontend/src/app/modules/shared/components/tag-selector/tag-selector.component.ts`

```typescript
import { Component, OnInit, input, output, effect, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { NgSelectModule } from '@ng-select/ng-select';
import { debounceTime, distinctUntilChanged, switchMap, startWith, catchError } from 'rxjs/operators';
import { of, EMPTY } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TagService } from '@shared/services/tag.service';
import { ITag, ICreateTag, TAG_COLORS, TagColor } from '@shared/interfaces/tag.model';
import { TagChipComponent } from '../tag-chip/tag-chip.component';
import { TagCreateModalComponent } from '../tag-create-modal/tag-create-modal.component';

@Component({
  selector: 'app-tag-selector',
  template: `
    <div class="w-full">
      <label class="font-medium mb-2 block">Tags</label>
      
      <!-- Selected Tags Display -->
      @if (selectedTags().length > 0) {
        <div class="flex flex-wrap gap-2 mb-3">
          @for (tag of selectedTags(); track tag.id) {
            <app-tag-chip
              [tag]="tag"
              [removable]="true"
              (remove)="removeTag(tag)" />
          }
        </div>
      }

      <!-- Tag Selector -->
      <ng-select
        [items]="availableTags()"
        [bindLabel]="'name'"
        [bindValue]="'id'"
        [formControl]="tagSearchControl"
        [virtualScroll]="true"
        [multiple]="false"
        [clearable]="false"
        placeholder="Search or create tags..."
        notFoundText="No tags found"
        [addTag]="true"
        [addTagText]="'Create tag'"
        (add)="onCreateTag($event)"
        (change)="onTagSelect($event)"
        class="mt-1">
        
        <ng-option-highlight 
          *ngFor="let tag of availableTags()"
          [term]="tagSearchControl.value"
          [value]="tag.id"
          [disabled]="isTagSelected(tag)">
          
          <div class="flex items-center gap-2">
            <div 
              class="w-3 h-3 rounded-full"
              [style.background-color]="tag.color">
            </div>
            <span>{{ tag.name }}</span>
            @if (tag.icon) {
              <mat-icon class="text-sm text-gray-500">{{ tag.icon }}</mat-icon>
            }
          </div>
        </ng-option-highlight>
      </ng-select>

      <!-- Quick Actions -->
      <div class="flex justify-between items-center mt-2 text-sm">
        <button
          type="button"
          mat-button
          class="!text-xs"
          [matMenuTriggerFor]="quickTagsMenu"
          [disabled]="mostUsedTags().length === 0">
          <mat-icon class="text-sm">star</mat-icon>
          Quick Tags
        </button>

        <button
          type="button"
          mat-button
          class="!text-xs"
          (click)="openTagManager()">
          <mat-icon class="text-sm">settings</mat-icon>
          Manage Tags
        </button>
      </div>

      <!-- Quick Tags Menu -->
      <mat-menu #quickTagsMenu="matMenu">
        @for (tag of mostUsedTags(); track tag.id) {
          <button 
            mat-menu-item
            [disabled]="isTagSelected(tag)"
            (click)="selectTag(tag)">
            <div class="flex items-center gap-2">
              <div 
                class="w-3 h-3 rounded-full"
                [style.background-color]="tag.color">
              </div>
              <span>{{ tag.name }}</span>
              <span class="text-xs text-gray-500">({{ tag.usageCount }})</span>
            </div>
          </button>
        }
      </mat-menu>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatMenuModule,
    NgSelectModule,
    TagChipComponent
  ]
})
export class TagSelectorComponent implements OnInit {
  // Services
  private tagService = inject(TagService);
  private dialog = inject(MatDialog);

  // Inputs/Outputs
  selectedTagIds = input<number[]>([]);
  maxTags = input<number>(20);
  
  tagsChanged = output<number[]>();
  
  // Form Controls
  tagSearchControl = new FormControl<string>('');
  
  // Signals
  private allTags = signal<ITag[]>([]);
  private loadingTags = signal<boolean>(false);
  mostUsedTags = signal<ITagUsage[]>([]);
  
  // Computed values
  selectedTags = computed(() => {
    const ids = this.selectedTagIds();
    return this.allTags().filter(tag => ids.includes(tag.id));
  });

  availableTags = computed(() => {
    const selected = this.selectedTagIds();
    return this.allTags().filter(tag => 
      tag.isEnabled && !selected.includes(tag.id)
    );
  });

  ngOnInit(): void {
    this.loadTags();
    this.loadMostUsedTags();
    this.setupTagSearch();
  }

  private loadTags(): void {
    this.loadingTags.set(true);
    this.tagService.getTags({ isEnabled: true, limit: 200 })
      .pipe(
        catchError(() => of({ rows: [], count: 0 }))
      )
      .subscribe(result => {
        this.allTags.set(result.rows);
        this.loadingTags.set(false);
      });
  }

  private loadMostUsedTags(): void {
    this.tagService.getMostUsedTags(10)
      .pipe(
        catchError(() => of([]))
      )
      .subscribe(tags => {
        this.mostUsedTags.set(tags);
      });
  }

  private setupTagSearch(): void {
    this.tagSearchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(searchText => {
          if (!searchText || searchText.length < 2) {
            return of({ rows: [], count: 0 });
          }
          return this.tagService.getTags({ 
            searchText, 
            isEnabled: true, 
            limit: 50 
          }).pipe(
            catchError(() => of({ rows: [], count: 0 }))
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe(result => {
        // Merge with existing tags, avoiding duplicates
        const existingIds = this.allTags().map(tag => tag.id);
        const newTags = result.rows.filter(tag => !existingIds.includes(tag.id));
        
        if (newTags.length > 0) {
          this.allTags.set([...this.allTags(), ...newTags]);
        }
      });
  }

  onTagSelect(tagId: number): void {
    if (!tagId) return;
    
    const tag = this.allTags().find(t => t.id === tagId);
    if (tag && !this.isTagSelected(tag)) {
      this.selectTag(tag);
    }
    
    // Clear the search
    this.tagSearchControl.setValue('', { emitEvent: false });
  }

  selectTag(tag: ITag): void {
    const currentTags = this.selectedTagIds();
    
    if (currentTags.length >= this.maxTags()) {
      // Could show a toast message here
      return;
    }

    if (!currentTags.includes(tag.id)) {
      const newTagIds = [...currentTags, tag.id];
      this.tagsChanged.emit(newTagIds);
    }
  }

  removeTag(tag: ITag): void {
    const currentTags = this.selectedTagIds();
    const newTagIds = currentTags.filter(id => id !== tag.id);
    this.tagsChanged.emit(newTagIds);
  }

  isTagSelected(tag: ITag): boolean {
    return this.selectedTagIds().includes(tag.id);
  }

  onCreateTag(tagName: string): void {
    if (!tagName?.trim()) return;

    const dialogRef = this.dialog.open(TagCreateModalComponent, {
      width: '400px',
      data: { name: tagName.trim() }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh tags and select the new one
        this.loadTags();
        // The new tag will be selected by the modal
      }
    });
  }

  openTagManager(): void {
    // TODO: Implement tag manager modal
    console.log('Tag manager not implemented yet');
  }
}
```

#### 3.3 Tag Create Modal Component
**File**: `myexpenses-frontend/src/app/modules/shared/components/tag-create-modal/tag-create-modal.component.ts`

```typescript
import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs/operators';

import { TagService } from '@shared/services/tag.service';
import { ICreateTag, TAG_COLORS, TagColor } from '@shared/interfaces/tag.model';

interface DialogData {
  name?: string;
}

@Component({
  selector: 'app-tag-create-modal',
  template: `
    <div class="p-6">
      <h2 class="text-lg font-medium mb-4">Create New Tag</h2>
      
      <form [formGroup]="tagForm" (ngSubmit)="onSubmit()">
        <!-- Tag Name -->
        <mat-form-field appearance="fill" class="w-full mb-4">
          <mat-label>Tag Name</mat-label>
          <input matInput formControlName="name" maxlength="100" required>
          <mat-error *ngIf="tagForm.get('name')?.hasError('required')">
            Tag name is required
          </mat-error>
          <mat-error *ngIf="tagForm.get('name')?.hasError('maxlength')">
            Tag name must not exceed 100 characters
          </mat-error>
        </mat-form-field>

        <!-- Color Selection -->
        <div class="mb-4">
          <label class="font-medium mb-2 block">Color</label>
          <div class="flex flex-wrap gap-2">
            @for (color of TAG_COLORS; track color) {
              <button
                type="button"
                class="w-8 h-8 rounded-full border-2 transition-all"
                [class.ring-2]="tagForm.get('color')?.value === color"
                [class.ring-gray-400]="tagForm.get('color')?.value === color"
                [style.background-color]="color"
                (click)="selectColor(color)">
              </button>
            }
          </div>
        </div>

        <!-- Preview -->
        <div class="mb-6">
          <label class="font-medium mb-2 block">Preview</label>
          <div 
            class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
            [style.background-color]="tagForm.get('color')?.value + '20'"
            [style.color]="tagForm.get('color')?.value"
            [style.border]="'1px solid ' + tagForm.get('color')?.value + '40'">
            <span>{{ tagForm.get('name')?.value || 'Tag Name' }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 justify-end">
          <button
            type="button"
            mat-button
            (click)="onCancel()">
            Cancel
          </button>
          
          <button
            type="submit"
            mat-flat-button
            color="primary"
            [disabled]="tagForm.invalid || isCreating()">
            @if (isCreating()) {
              Creating...
            } @else {
              Create Tag
            }
          </button>
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class TagCreateModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private tagService = inject(TagService);
  private dialogRef = inject(MatDialogRef<TagCreateModalComponent>);
  private data = inject<DialogData>(MAT_DIALOG_DATA);

  // Signals
  isCreating = signal(false);

  // Form
  tagForm: FormGroup;

  // Available colors
  TAG_COLORS = TAG_COLORS;

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.tagForm = this.fb.group({
      name: [this.data?.name || '', [Validators.required, Validators.maxLength(100)]],
      color: [TAG_COLORS[0], Validators.required]
    });
  }

  selectColor(color: TagColor): void {
    this.tagForm.patchValue({ color });
  }

  onSubmit(): void {
    if (this.tagForm.invalid || this.isCreating()) {
      return;
    }

    const tagData: ICreateTag = {
      name: this.tagForm.value.name.trim(),
      color: this.tagForm.value.color,
      isEnabled: true
    };

    this.isCreating.set(true);

    this.tagService.createTag(tagData)
      .pipe(
        finalize(() => this.isCreating.set(false))
      )
      .subscribe({
        next: (createdTag) => {
          this.dialogRef.close(createdTag);
        },
        error: (error) => {
          console.error('Failed to create tag:', error);
          // TODO: Show error message to user
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
```

### 4. Integration with Expense Forms

#### 4.1 Update Expense Create Modal Component
**File**: `myexpenses-frontend/src/app/modules/expenses/expenses-create-modal/expenses-create-modal.component.ts`
**Changes needed**:

1. Add imports:
```typescript
import { TagSelectorComponent } from '@shared/components/tag-selector/tag-selector.component';
```

2. Add to component imports array:
```typescript
imports: [
  // ... existing imports
  TagSelectorComponent
]
```

3. Add tagIds to form:
```typescript
// In initializeForm method, add:
tagIds: [expense?.tags?.map(tag => tag.id) || []]
```

4. Add method to handle tag changes:
```typescript
onTagsChanged(tagIds: number[]): void {
  this.expenseForm.patchValue({ tagIds });
}
```

#### 4.2 Update Expense Create Modal Template
**File**: `myexpenses-frontend/src/app/modules/expenses/expenses-create-modal/expenses-create-modal.component.html`
**Changes needed**:

Add the tag selector after the payment method field (around line 62):

```html
          <!-- Payment Method -->
          <div class="w-full mb-4 px-2">
            <label class="font-medium">Método de Pago *</label>
            <ng-select
              class="mt-1"
              [items]="payments"
              bindLabel="name"
              bindValue="id"
              formControlName="paymentMethodId"
              [virtualScroll]="true"
              (change)="onPaymentSelect($event)"
            ></ng-select>
          </div>

          <!-- Tags -->
          <div class="w-full mb-4 px-2">
            <app-tag-selector
              [selectedTagIds]="expenseForm.get('tagIds')?.value || []"
              (tagsChanged)="onTagsChanged($event)">
            </app-tag-selector>
          </div>
```

### 5. Display Tags in Expense Lists

#### 5.1 Update Expense Item Detail Component
**File**: `myexpenses-frontend/src/app/modules/expenses/shared/expenses-item-detail/expenses-item-detail.component.html`
**Changes needed**:

Add tag display after the existing expense details. Find a suitable location (e.g., after the recipient name) and add:

```html
<!-- Tags Display -->
@if (expense.tags && expense.tags.length > 0) {
  <div class="flex flex-wrap gap-1 mt-2">
    @for (tag of expense.tags; track tag.id) {
      <app-tag-chip [tag]="tag" />
    }
  </div>
}
```

#### 5.2 Update Expense Item Detail Component
**File**: `myexpenses-frontend/src/app/modules/expenses/shared/expenses-item-detail/expenses-item-detail.component.ts`
**Changes needed**:

Add TagChipComponent to imports:
```typescript
import { TagChipComponent } from '@shared/components/tag-chip/tag-chip.component';

// Add to imports array:
imports: [
  // ... existing imports
  TagChipComponent
]
```

### 6. Add Tag Filtering to Expense List

#### 6.1 Update Expense List Component
**File**: `myexpenses-frontend/src/app/modules/expenses/expenses-list/expenses-list.component.html`
**Changes needed**:

Add tag filter after the payment method filter (around line 67):

```html
          <div class="flex-1">
            <ng-select
              [items]="paymentMethodList"
              bindLabel="name"
              bindValue="id"
              formControlName="paymentMethodId"
              [virtualScroll]="true"
              [multiple]="true"
              placeholder="Metodo de Pago"
            ></ng-select>
          </div>

          <!-- Tag Filter -->
          <div class="flex-1">
            <ng-select
              [items]="tagList"
              bindLabel="name"
              bindValue="id"
              formControlName="tagIds"
              [virtualScroll]="true"
              [multiple]="true"
              placeholder="Tags"
            ></ng-select>
          </div>
        </div>
```

#### 6.2 Update Expense List Component TypeScript
**File**: `myexpenses-frontend/src/app/modules/expenses/expenses-list/expenses-list.component.ts`
**Changes needed**:

1. Add imports:
```typescript
import { TagService } from '@shared/services/tag.service';
import { ITag } from '@shared/interfaces/tag.model';
```

2. Add to constructor:
```typescript
constructor(
  // ... existing services
  private tagService: TagService
) {
  // ... existing initialization
}
```

3. Add tag list property:
```typescript
tagList: ITag[] = [];
```

4. Add tagIds to form initialization:
```typescript
// In form initialization:
tagIds: [null]
```

5. Add method to load tags:
```typescript
private loadTags(): void {
  this.tagService.getTags({ isEnabled: true, limit: 200 }).subscribe({
    next: (result) => {
      this.tagList = result.rows;
    },
    error: (error) => {
      console.error('Failed to load tags:', error);
    }
  });
}
```

6. Call loadTags in ngOnInit:
```typescript
ngOnInit(): void {
  // ... existing initialization
  this.loadTags();
}
```

7. Update loadOnDatesSelected method to include tagIds:
```typescript
loadOnDatesSelected(): void {
  const formValue = this.expensesForm.value;
  // ... existing logic
  // Make sure tagIds is included in the query object
}
```

---

## Database Migration Commands

### Running the Migrations

Once the migration files are created, run:

```bash
# Navigate to backend directory
cd myexpenses-backend

# Run migrations
npx sequelize-cli db:migrate

# If you need to rollback:
npx sequelize-cli db:migrate:undo
```

---

## Testing the Implementation

### Backend Testing

1. **Test Tag CRUD operations**:
   ```bash
   # Create tag
   POST /api/tags
   {
     "name": "Christmas 2024",
     "color": "#EF4444",
     "icon": "celebration"
   }

   # List tags
   GET /api/tags

   # Update tag
   PUT /api/tags/1
   {
     "name": "Christmas Vacation 2024"
   }

   # Delete tag
   DELETE /api/tags/1
   ```

2. **Test Expense with Tags**:
   ```bash
   # Create expense with tags
   POST /api/expenses
   {
     "expenseDate": "2024-12-20",
     "totalAmount": 150.00,
     "paymentMethodId": "uuid-here",
     "recipientId": 1,
     "tagIds": [1, 2]
   }

   # Update expense tags
   PUT /api/expenses/1
   {
     "tagIds": [2, 3]
   }
   ```

### Frontend Testing

1. **Test Tag Selector**:
   - Open expense creation modal
   - Search for existing tags
   - Create new tags inline
   - Select/remove tags
   - Verify tag display

2. **Test Tag Display**:
   - View expense list with tagged expenses
   - Verify tags appear as chips
   - Test tag filtering

3. **Test Tag Management**:
   - Create tags with different colors
   - Edit tag names and colors
   - Disable/delete tags

---

## Implementation Checklist

### Backend Checklist
- [ ] Create tag migration files
- [ ] Run migrations to create tables
- [ ] Implement Tag model with factory pattern
- [ ] Create tag DTOs and interfaces
- [ ] Implement tag validation schemas
- [ ] Create TagService with CRUD operations
- [ ] Implement TagController with error handling
- [ ] Set up tag routes with authentication
- [ ] Update Expense model for tag associations
- [ ] Update ExpenseService to handle tags
- [ ] Register Tag model in Sequelize config
- [ ] Update DB models interface
- [ ] Add tag routes to main router

### Frontend Checklist
- [ ] Create tag interfaces and models
- [ ] Implement TagService for API calls
- [ ] Build TagChipComponent for display
- [ ] Create TagSelectorComponent with search
- [ ] Build TagCreateModalComponent
- [ ] Update expense interfaces to include tags
- [ ] Integrate tag selector in expense forms
- [ ] Add tag display in expense list items
- [ ] Implement tag filtering in expense list
- [ ] Update expense service to handle tags
- [ ] Test all tag functionality

### Testing Checklist
- [ ] Test tag CRUD operations via API
- [ ] Test expense creation with tags
- [ ] Test expense update with tags
- [ ] Test tag validation and error handling
- [ ] Test tag filtering in expense list
- [ ] Test tag display in expense items
- [ ] Test tag search functionality
- [ ] Test tag creation from selector
- [ ] Test tag removal from expenses
- [ ] Test most used tags feature

---

## Future Enhancements

1. **Tag Analytics**:
   - Tag usage statistics
   - Expense amounts by tag
   - Monthly tag trends

2. **Tag Management**:
   - Bulk tag operations
   - Tag merging functionality
   - Tag import/export

3. **UI Improvements**:
   - Tag color themes
   - Custom tag icons
   - Tag grouping/categories

4. **Performance Optimizations**:
   - Tag search indexing
   - Cached frequent tags
   - Lazy loading for large tag lists

---

## Notes for Continuation

- This implementation follows the established patterns in MODULE_DEVELOPMENT_GUIDE.md and REFACTORING_GUIDE.md
- All components use Angular 17+ features including signals and standalone components
- Backend follows the 6-layer architecture with proper error handling
- The system supports up to 20 tags per expense (configurable)
- Tags are soft-deleted by default (isEnabled flag)
- Color validation ensures proper hex color format
- The implementation includes proper TypeScript typing throughout
- All database operations use transactions for consistency
- The frontend uses OnPush change detection for performance
- Components are designed to be reusable across the application

Remember to test each component as you implement it to ensure proper functionality before moving to the next step.