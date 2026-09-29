import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../entities';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { LivestockCategoriesService } from './livestock-categories.service';
import { CreateLivestockCategoryDto } from './dto/create-livestock-category.dto';
import { UpdateLivestockCategoryDto } from './dto/update-livestock-category.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('livestock-categories')
export class LivestockCategoriesController {
  constructor(private readonly categoriesService: LivestockCategoriesService) {}

  // Admin-only: marketing/browse groupings are curated reference data.
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Post()
  create(@Body() body: CreateLivestockCategoryDto) {
    return this.categoriesService.create(body);
  }

  @Public()
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateLivestockCategoryDto) {
    return this.categoriesService.update(id, body);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
