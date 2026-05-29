import { HttpException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { error } from 'console';

@Injectable()
export class RoutesService {
    private OSRM_Base = 'https://router.project-osrm.org';
    async getRoute(pickup,dropoff){
        const url = `${this.OSRM_Base}/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson`;


        try{
            const res = await axios.get(url);
            if(!res.data.routes?.length) throw new Error();

            const route = res.data.routes[0];

            return {
                distanceMeters:route.distance,
                durationSeconds:route.duration,
                geometry:route.geometry,
            };
        }
        catch(err){
            throw new HttpException("Route calculation failed",500);
        }
    }
}
