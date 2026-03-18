import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PartnersService } from './partners.service';
import { Partner } from './partner.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Partners')
@ApiBearerAuth()
@Controller('partners')
@UseGuards(JwtAuthGuard)
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  @ApiOperation({
    summary:
      'Get partners with pagination and search, optionally filtered by type (CUSTOMER or SUPPLIER)',
  })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('type') type?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ) {
    return this.partnersService.findAll(type, +page, +limit, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific partner by ID' })
  findOne(@Param('id') id: string) {
    return this.partnersService.findOne(+id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new partner' })
  create(@Body() partnerData: Partial<Partner>) {
    return this.partnersService.create(partnerData);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing partner' })
  update(@Param('id') id: string, @Body() updateData: Partial<Partner>) {
    return this.partnersService.update(+id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a partner' })
  remove(@Param('id') id: string) {
    return this.partnersService.remove(+id);
  }
}
