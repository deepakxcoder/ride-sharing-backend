import { Injectable } from '@nestjs/common';
import { RideType } from 'src/common/enums/ride-type.enum';

@Injectable()
export class PricingService {
    private PRICING = {
        BIKE:{base:20,perKm:8,perMin:1},
        CAB:{base:40,perKm:15,perMin:2},
        XL:{base:60,perKm:20,perMin:3},
    }

    async calculate(type:RideType, distanceMeters:number, durationSeconds:number){
        const config = this.PRICING[type];
        const km = distanceMeters/1000;
        const min = durationSeconds/60;

        const price = config.base + (km*config.perKm) + (min*config.perMin);

        return Math.round(price);
    }
}
