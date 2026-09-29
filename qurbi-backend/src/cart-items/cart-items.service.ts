import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CartItem, OrderItemType } from '../entities';
import { CartsService } from '../carts/carts.service';
import { ReservationsService } from '../reservations/reservations.service';

type AddCartItemInput = {
  userId: string;
  itemType: OrderItemType;
  livestockId?: string;
  bulkListingId?: string;
  quantity: number;
  metadata?: Record<string, any>;
};

@Injectable()
export class CartItemsService {
  constructor(
    @InjectRepository(CartItem) private readonly repository: Repository<CartItem>,
    private readonly cartsService: CartsService,
    private readonly reservationsService: ReservationsService,
  ) {}

  async findAllForUser(userId: string): Promise<CartItem[]> {
    const cart = await this.cartsService.getOrCreateForUser(userId);
    return this.repository.find({
      where: { cartId: cart.id },
      relations: { livestock: true, bulkListing: true },
    });
  }

  // No price snapshot here on purpose — the cart shows live prices;
  // snapshotting happens once at checkout, on order_items.
  async addItem(input: AddCartItemInput): Promise<CartItem> {
    this.assertValidTarget(input);
    if (input.livestockId) {
      const availability = await this.reservationsService.availability(input.livestockId, input.userId);
      if (!availability.available && availability.state === 'reserved') {
        throw new ConflictException('This livestock is currently reserved by another buyer.');
      }
      if (!availability.available) {
        throw new ConflictException('This livestock is no longer available.');
      }
    }
    const cart = await this.cartsService.getOrCreateForUser(input.userId);

    // TypeORM throws on both `undefined` and a bare `null` inside a where
    // clause — the unset FK (exactly one of the two, per assertValidTarget)
    // must use IsNull() to mean "IS NULL".
    const existing = await this.repository.findOne({
      where: {
        cartId: cart.id,
        itemType: input.itemType,
        livestockId: input.livestockId ?? IsNull(),
        bulkListingId: input.bulkListingId ?? IsNull(),
      },
    });
    if (existing) {
      // A lot is bought whole — re-adding an already-carted lot is a no-op,
      // never a quantity bump.
      if (input.itemType === OrderItemType.BULK_LISTING) {
        return existing;
      }
      existing.quantity += input.quantity;
      return this.repository.save(existing);
    }

    return this.repository.save(
      this.repository.create({
        cartId: cart.id,
        itemType: input.itemType,
        livestockId: input.livestockId ?? null,
        bulkListingId: input.bulkListingId ?? null,
        quantity: input.quantity,
        metadata: input.metadata ?? null,
      }),
    );
  }

  async updateQuantity(userId: string, itemId: string, quantity: number): Promise<CartItem> {
    const item = await this.findOwnedItem(userId, itemId);
    if (item.itemType === OrderItemType.BULK_LISTING && quantity !== 1) {
      throw new BadRequestException(
        'A bulk listing is purchased as a whole lot; quantity must be 1',
      );
    }
    item.quantity = quantity;
    return this.repository.save(item);
  }

  async removeItem(userId: string, itemId: string): Promise<void> {
    const item = await this.findOwnedItem(userId, itemId);
    await this.repository.remove(item);
  }

  private async findOwnedItem(userId: string, itemId: string): Promise<CartItem> {
    const cart = await this.cartsService.getOrCreateForUser(userId);
    const item = await this.repository.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException(`CartItem ${itemId} not found`);
    if (item.cartId !== cart.id) {
      throw new ForbiddenException(`CartItem ${itemId} does not belong to this user's cart`);
    }
    return item;
  }

  private assertValidTarget(input: AddCartItemInput): void {
    const hasLivestock = Boolean(input.livestockId);
    const hasBulkListing = Boolean(input.bulkListingId);
    if (hasLivestock === hasBulkListing) {
      throw new BadRequestException(
        'Exactly one of livestockId or bulkListingId must be set',
      );
    }
    if (input.itemType === OrderItemType.LIVESTOCK && !hasLivestock) {
      throw new BadRequestException('itemType livestock requires livestockId');
    }
    if (input.itemType === OrderItemType.BULK_LISTING) {
      if (!hasBulkListing) {
        throw new BadRequestException('itemType bulk_listing requires bulkListingId');
      }
      // A lot is one unit, not a repeatable SKU — you can't buy "2 of" a
      // specific group of animals.
      if (input.quantity !== 1) {
        throw new BadRequestException(
          'A bulk listing is purchased as a whole lot; quantity must be 1',
        );
      }
    }
  }
}
