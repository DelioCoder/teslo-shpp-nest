import { DataSource, Repository } from 'typeorm';
import { validate as isUUID } from 'uuid';
import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Product, ProductImage } from './entities';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource
  ) { }

  async create(createProductDto: CreateProductDto) {
    try {
      const { images = [], ...productDetails } = createProductDto;
      const product = this.productRepository.create({
        ...productDetails,
        images: images.map(image => this.productImageRepository.create({ url: image }))
      });
      await this.productRepository.save(product);
      return { ...product, images };
    } catch (ex) {
      this.handleDBExceptions(ex);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    try {
      const products = await this.productRepository.find({
        take: limit,
        skip: offset,
        // ToDo: Relaciones
        relations: {
           images: true,
        }
      });
      return products.map(({ images, ...rest }) => ({ 
        ...rest,
        images: images?.map((img) => img.url)
       }));
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
        const queryBuilder = this.productRepository.createQueryBuilder('prod');
        product = await queryBuilder
          .where(`title = :title or :slug = slug`, {
            title: term,
            slug: term
          })
          .leftJoinAndSelect('prod.images', 'prodImages')
          .getOne();
      }

      if (!product) throw new NotFoundException(`Product with id ${term} not found`);
      return product;
    } catch (ex) {
      this.handleDBExceptions(ex);
    }
  }

  async findOnePlain( term: string ) {
    const product = await this.findOne(term);
    if (!product) throw new NotFoundException(`Product not found`);

    const { images, ...rest } = product;
    return {
      ...rest,
      images: images?.map((image) => image.url)
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto) {

    const { images, ...toUpdate } = updateProductDto;

    const product = await this.productRepository.preload({ id, ...toUpdate });

    if (!product) throw new NotFoundException(`Product with id: ${id} not found`);
    
    // Create query runner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {

      if ( images ) {
        await queryRunner.manager.delete( ProductImage, { product: { id } } );

        product.images = images.map(
          (image) => this.productImageRepository.create({ url: image })
        );
      }

      await queryRunner.manager.save(product);

      await queryRunner.commitTransaction();
      await queryRunner.release();

      return this.findOnePlain(id);
    } catch (ex) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      
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

  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder('product');

    try {
      return await query
        .delete()
        .where({})
        .execute();
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
