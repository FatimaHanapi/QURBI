import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Address, UserRole } from '../entities';
import { BaseCrudService } from '../common/base-crud.service';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class AddressesService extends BaseCrudService<Address> {
  constructor(@InjectRepository(Address) repository: Repository<Address>) {
    super(repository);
  }

  findByUser(userId: string): Promise<Address[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  // Fetches an address and confirms `viewer` owns it (or is an admin). Anyone
  // else gets the exact same 404 a made-up id would return.
  async findOwned(id: string, viewer: AuthenticatedUser): Promise<Address> {
    const address = await this.findOne(id);
    this.assertOwner(address, viewer);
    return address;
  }

  private assertOwner(address: Address, viewer: AuthenticatedUser): void {
    if (viewer.role === UserRole.ADMIN) return;
    if (address.userId !== viewer.id) {
      throw new NotFoundException(`Address ${address.id} not found`);
    }
  }

  // Only one address can be the default per user — creating/flagging one as
  // default must atomically un-flag any previous one.
  async create(data: DeepPartial<Address>): Promise<Address> {
    return this.repository.manager.transaction(async (manager) => {
      if (data.isDefault) {
        await manager.update(
          Address,
          { userId: data.userId },
          { isDefault: false },
        );
      }
      return manager.save(manager.create(Address, data));
    });
  }

  async updateOwned(
    id: string,
    viewer: AuthenticatedUser,
    data: DeepPartial<Address>,
  ): Promise<Address> {
    const address = await this.findOwned(id, viewer);
    if (data.isDefault) {
      await this.repository.manager.transaction(async (manager) => {
        await manager.update(
          Address,
          { userId: address.userId },
          { isDefault: false },
        );
        await manager.update(Address, { id }, data);
      });
      return this.findOne(id);
    }
    return super.update(id, data);
  }

  async removeOwned(id: string, viewer: AuthenticatedUser): Promise<void> {
    const address = await this.findOwned(id, viewer);
    await this.repository.remove(address);
  }

  async setDefault(
    viewer: AuthenticatedUser,
    addressId: string,
  ): Promise<Address> {
    const address = await this.findOwned(addressId, viewer);
    return this.repository.manager.transaction(async (manager) => {
      await manager.update(
        Address,
        { userId: address.userId },
        { isDefault: false },
      );
      await manager.update(Address, { id: addressId }, { isDefault: true });
      return manager.findOneByOrFail(Address, { id: addressId });
    });
  }
}
