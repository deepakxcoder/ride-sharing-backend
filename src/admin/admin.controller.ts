import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('drivers')
  async getPendingDrivers(@Query('status') status:string ){
    return this.adminService.getDriversByStatus(status);
  }

  @Patch('driver/:id/approve')
  approveDriver(@Param('id') driverProfileId: string) {
    console.log('hello buddy')
    return this.adminService.approveDriver(driverProfileId);
  }

  @Patch('driver/:id/reject')
rejectDriver(
  @Param('id') id: string,
  @Body() body: {
    reason: string;
    documents: ('license' | 'rc' | 'insurance')[];
  },
) {
  console.log('hey');
  return this.adminService.rejectDriver(id, body);
}

  @Get('stats')
getStats() {
  return this.adminService.getDashboardStats();
}
}
