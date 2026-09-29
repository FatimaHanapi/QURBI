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
import { SpeciesService } from './species.service';
import { CreateSpeciesDto } from './dto/create-species.dto';
import { UpdateSpeciesDto } from './dto/update-species.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('species')
export class SpeciesController {
  constructor(private readonly speciesService: SpeciesService) {}

  // Admin-only: species is shared reference data, not something any signed-in
  // user should be able to add.
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Post()
  create(@Body() body: CreateSpeciesDto) {
    return this.speciesService.create(body);
  }

  @Public()
  @Get()
  findAll() {
    return this.speciesService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.speciesService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateSpeciesDto) {
    return this.speciesService.update(id, body);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.speciesService.remove(id);
  }
}
