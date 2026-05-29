import { Body, Controller, Get, Patch, Post, Req, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { DriverService } from './driver.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {multerConfig} from './multer.config'

@Controller('driver')
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Post('apply')
  applyAsDriver(@Body() body: {
    userId: string;
    vehicleType: string;
    vehicleNumber: string;
    vehicleModel: string;
  }) {
    return this.driverService.apply(body);
  }

  @Post('documents')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'license', maxCount: 1 },
      { name: 'rc', maxCount: 1 },
      { name: 'insurance', maxCount: 1 },
    ],multerConfig),
  )
  uploadDocuments(
    @Body('userId') userId: string,
    @UploadedFiles()
    files: {
      license?: Express.Multer.File[];
      rc?: Express.Multer.File[];
      insurance?: Express.Multer.File[];
    },
  ) {
    return this.driverService.uploadDocuments(userId, files);
  }

  @Patch('status')
async updateStatus(@Body() body: {
  userId: string;
  isOnline: boolean;
  lat?: number;
  lng?: number;
}) {
  return this.driverService.updateDriverStatus(body);
}


@Post('me')
  async getDriverByUser(@Body('userId') userId: string) {
    if (!userId) {
      return {
        driverId: null,
        status: null,
        isOnline: false,
      };
    }

    const driver = await this.driverService.getDriverByUserId(userId);

    return {
      driverId: driver?._id || null,
      status: driver?.status || null,
      isOnline: driver?.isOnline || false,
    };
  }


}
