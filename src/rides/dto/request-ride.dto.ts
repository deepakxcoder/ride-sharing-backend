import { IsEnum, IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RideType } from '../../common/enums/ride-type.enum';

class LocationDto {
 @IsNumber()
  @Type(() => Number)
  lat: number;

  @IsNumber()
  @Type(() => Number)
  lng: number;

  @IsString()
  @IsNotEmpty()
  address: string; 
}

export class RequestRideDto {

  @ValidateNested()
  @Type(() => LocationDto)
  pickup: LocationDto;

  @ValidateNested()
  @Type(() => LocationDto)
  dropoff: LocationDto;

  @IsEnum(RideType)
  rideType: RideType;
}
