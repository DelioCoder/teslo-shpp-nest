import { Repository } from "typeorm";
import { ExtractJwt, Strategy } from "passport-jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { User } from "../entities/user.entity";
import { JwtPayload } from "../interfaces/jwt-payload.interface";
@Injectable()
export class JwtStrategy extends PassportStrategy( Strategy ) {
    
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        configService: ConfigService
    ) {
        super({
            secretOrKey: configService.get<string>('JWT_SECRET') || (() => {
                throw new Error('JWT_SECRET must be defined');
            })(),
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        });
    }

    // Check expiration date & signature
    async validate(payload: JwtPayload): Promise<User> {
        
        const { id } = payload;

        const user = await this.userRepository.findOneBy({ id });

        if (!user) throw new UnauthorizedException('Token not valid');

        if (!user.isActive) throw new UnauthorizedException('User is inactive, talk with an admin');

        return user;
    }

}