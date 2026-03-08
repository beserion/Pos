import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { Employee } from './employee.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll() {
    return this.employeesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(+id);
  }

  @Post()
  create(@Body() employeeData: Partial<Employee>) {
    return this.employeesService.create(employeeData);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateData: Partial<Employee>) {
    return this.employeesService.update(+id, updateData);
  }

  @Patch(':id')
  partialUpdate(
    @Param('id') id: string,
    @Body() updateData: Partial<Employee>,
  ) {
    return this.employeesService.update(+id, updateData);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeesService.remove(+id);
  }

  // Document Management Endpoints

  @Get(':id/documents')
  getDocuments(@Param('id') id: string) {
    return this.employeesService.getDocuments(+id);
  }

  @Post(':id/documents')
  addDocument(
    @Param('id') id: string,
    @Body() body: { documentType: string; documentData: string },
  ) {
    return this.employeesService.addDocument(
      +id,
      body.documentType,
      body.documentData,
    );
  }

  @Delete(':id/documents/:docId')
  removeDocument(@Param('id') id: string, @Param('docId') docId: string) {
    return this.employeesService.removeDocument(+id, +docId);
  }
}
