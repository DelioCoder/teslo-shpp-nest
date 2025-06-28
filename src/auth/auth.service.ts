import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto, LoginUserDto } from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService
  ) { }

  async register(createUserDto: CreateUserDto) {
    try {
      const { password, ...userDate } = createUserDto;

      const user = this.userRepository.create({
        ...userDate,
        password: bcrypt.hashSync(password, 10)
      });
      await this.userRepository.save(user);
      return {
        ...user,
        token: this.getJwtToken({ id: user.id })
      };
    } catch (ex) {
      this.handleDBErrors(ex);
    }
  }

  async login(loginUserDto: LoginUserDto) {
    const { password, email } = loginUserDto;
    try {
      const user = await this.userRepository.findOne({
        where: { email },
        select: { email: true, password: true, id: true }
      });
      if (!user) throw new UnauthorizedException(`Credentials are not valid`);

      if (!bcrypt.compareSync(password, user.password)) throw new UnauthorizedException(`Credentials are not valid`);

      return {
        ...user,
        token: this.getJwtToken({ id: user.id })
      };
    } catch (ex) {
      this.handleDBErrors(ex)
    }
  }

  async checkAuthStatus(user: User) {
    return {
      ...user,
      token: this.getJwtToken({ id: user.id })
    };
  }

  private getJwtToken(payload: JwtPayload) {
    const token = this.jwtService.sign(payload);
    return token;

  }

  private handleDBErrors(exception: any): never {
    if (exception.code === '23505') {
      throw new BadRequestException(exception.detail);
    }
    console.error(exception);

    throw new InternalServerErrorException(`Please check server logs`)
  }

}
