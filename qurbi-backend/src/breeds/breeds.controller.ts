import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../entities';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BreedsService } from './breeds.service';
import { CreateBreedDto } from './dto/create-breed.dto';
import { UpdateBreedDto } from './dto/update-breed.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('breeds')
export class BreedsController {
  constructor(private readonly breedsService: BreedsService) {}

  // Admin-only: breeds is shared reference data, same as species — a farmer
  // proposes one via POST /breed-requests instead.
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Post()
  create(@Body() body: CreateBreedDto) {
    return this.breedsService.create(body);
  }

  @Public()
  @Get()
  findAll(@Query('speciesId') speciesId?: string) {
    return speciesId
      ? this.breedsService.findBySpecies(speciesId)
      : this.breedsService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.breedsService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateBreedDto) {
    return this.breedsService.update(id, body);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.breedsService.remove(id);
  }
}
