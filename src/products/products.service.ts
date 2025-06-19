import { Repository } from 'typeorm';
import { validate as isUUID } from 'uuid';
import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>
  ) { }

  async create(createProductDto: CreateProductDto) {
    try {
      const product = this.productRepository.create(createProductDto);
      await this.productRepository.save(product);
      return product;
    } catch (ex) {
      this.handleDBExceptions(ex);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    try {
      const products = await this.productRepository.find({
        take: limit,
        skip: offset
        // ToDo: Relaciones
      });
      return products;
    } catch (ex) {
      this.handleDBExceptions(ex);
    }
  }

  async findOne(term: string) {
    let product: Product | null;
    try {

      if (isUUID(term)) {
        product = await this.productRepository.findOneBy({ id: term });
      } else {
        const queryBuilder = this.productRepository.createQueryBuilder();
        product = await queryBuilder
          .where(`title = :title or slug = slug`, {
            title: term,
            slug: term
          }).getOne();
      }

      if (!product) throw new NotFoundException(`Product with id ${term} not found`);
      return product;
    } catch (ex) {
      this.handleDBExceptions(ex);
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productRepository.preload({
      id,
      ...updateProductDto
    });
    if (!product) throw new NotFoundException(`Product with id: ${id} not found`);
    
    try {
      await this.productRepository.save(product);
      return product;
    } catch (ex) {
      this.handleDBExceptions(ex);
    }
  }

  async remove(id: string) {
    try {
      await this.productRepository.delete({ id });
    } catch (ex) {
      this.handleDBExceptions(ex);
    }
  }

  private handleDBExceptions(ex: any) {
    if (ex.code === '23505') throw new BadRequestException(ex.detail);
    this.logger.error(ex);
    throw new InternalServerErrorException(`Unexpected error, check server logs`);
  }
}
