import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Cart, CartItem } from '../entities';

@Injectable()
export class CartsService {
  constructor(
    @InjectRepository(Cart) private readonly repository: Repository<Cart>,
  ) {}

  async getOrCreateForUser(
    userId: string,
    manager?: EntityManager,
  ): Promise<Cart> {
    const repo = manager ? manager.getRepository(Cart) : this.repository;
    const existing = await repo.findOne({ where: { userId } });
    if (existing) return existing;
    return repo.save(repo.create({ userId }));
  }

  async getCartWithItemsForUser(
    userId: string,
    manager?: EntityManager,
  ): Promise<Cart> {
    const cart = await this.getOrCreateForUser(userId, manager);
    const repo = manager ? manager.getRepository(Cart) : this.repository;
    return repo.findOneOrFail({
      where: { id: cart.id },
      relations: { items: { livestock: true, bulkListing: true } },
    });
  }

  findOne(id: string): Promise<Cart | null> {
    return this.repository.findOne({ where: { id } });
  }

  // "Clear cart" — used after checkout consumes the items into an order, and
  // available directly so a buyer can empty their cart without checking out.
  async clear(userId: string, manager?: EntityManager): Promise<void> {
    const cart = await this.getOrCreateForUser(userId, manager);
    const em = manager ?? this.repository.manager;
    await em.delete(CartItem, { cartId: cart.id });
  }
}
