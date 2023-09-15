import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { USER_MODEL, UserDocument, IUserModel } from '../schemas/user';
import { AccountLoginDTO, CreateUserDTO, UpdateUserDTO } from './dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(USER_MODEL) private readonly userModel: IUserModel,
  ) {}

  async login(accountLoginDto: AccountLoginDTO) {
    const { email, password } = accountLoginDto;

    const user = await this.userModel.findByEmailAndPassword(email, password);
    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }

  async create(createUserDto: CreateUserDTO) {
    try {
      const createdUser = await this.userModel.create(createUserDto);

      return createdUser;
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.errors);
      }

      throw new ServiceUnavailableException();
    }
  }

  async search(name: string) {
    const users: UserDocument[] = await this.userModel.find({
      name: new RegExp(name, 'i'),
    });

    return users;
  }

  async findAll() {
    const users = await this.userModel.find();

    return users;
  }

  async findOne(id: string) {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDTO) {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      updateUserDto,
      {
        new: true,
      },
    );

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  async remove(id: string) {
    const deletedUser = await this.userModel.findByIdAndDelete(id);

    if (!deletedUser) {
      throw new NotFoundException('User not found');
    }

    return {
      _id: id,
    };
  }
}
