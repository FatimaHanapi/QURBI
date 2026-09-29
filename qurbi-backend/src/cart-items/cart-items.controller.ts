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
import { CartItemsService } from './cart-items.service';
import { UserRole } from '../entities';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

// The owning cart is always the authenticated caller's — never a query/body field.
@Controller('cart-items')
@Roles(UserRole.BUYER)
@UseGuards(RolesGuard)
export class CartItemsController {
  constructor(private readonly cartItemsService: CartItemsService) {}

  @Get()
  findAllForUser(@CurrentUser() user: AuthenticatedUser) {
    return this.cartItemsService.findAllForUser(user.id);
  }

  @Post()
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AddCartItemDto,
  ) {
    return this.cartItemsService.addItem({ ...body, userId: user.id });
  }

  @Patch(':id')
  updateQuantity(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateCartItemDto,
  ) {
    return this.cartItemsService.updateQuantity(user.id, id, body.quantity);
  }

  @Delete(':id')
  removeItem(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.cartItemsService.removeItem(user.id, id);
  }
}
