import { CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

export class RolesGuard implements CanActivate {
  constructor(private readonly role: string) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user; // later from JWT

    if (!user || !user.roles.includes(this.role)) {
      throw new ForbiddenException('Access denied');
    }

    return true;
  }
}
