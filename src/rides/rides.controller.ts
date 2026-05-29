import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { RidesService } from './rides.service';
import { EstimateRideDto } from './dto/estimate-ride.dto';
import { RequestRideDto } from './dto/request-ride.dto';
import { Param, Patch } from '@nestjs/common';

@Controller('rides')
export class RidesController {
    constructor( private ridesService : RidesService,
    ){}
    @Post('estimate')
    estimate(@Body() dto: EstimateRideDto){
        return this.ridesService.estimate(dto.pickup,dto.dropoff);
    }
    
    @Get('debug/nearby')
async testNearby(
  @Query('lat') lat: string,
  @Query('lng') lng: string,
) {
  return this.ridesService.findNearestDrivers(
    Number(lat),
    Number(lng),
  );
}

@Get(':id')
getRide(@Param('id') id: string) {
  return this.ridesService.getRideById(id);
}

// @Patch(':id/arrive')
// arrive(
//   @Param('id') id: string,
//   @Body() body: { driverId: string },
// ) {
//   return this.ridesService.markArrived(id, body.driverId);
  
// }


@Patch(':id/start')
start(@Param('id') id: string, @Body() body: { otp: string }) {
  return this.ridesService.startRide(id, body.otp);
}


}
