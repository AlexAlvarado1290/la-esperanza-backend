// RF36 — Bitácora de seguimiento por acuerdo.
import { Injectable, NotFoundException } from '@nestjs/common';
import { NombreRol } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AgreementsRepository } from '../agreements.repository';
import { AgreementsService } from '../agreements.service';

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: AgreementsRepository,
    private readonly agreements: AgreementsService,
  ) {}

  async list(idAcuerdo: number, actor: { sub: number; rol: NombreRol }) {
    const acuerdo = await this.repo.findById(idAcuerdo);
    if (!acuerdo) throw new NotFoundException('Acuerdo no encontrado');
    this.agreements.assertParte(acuerdo, actor);
    return this.prisma.seguimientoEntrega.findMany({
      where: { idAcuerdo },
      include: { usuario: { select: { idUsuario: true, nombreCompleto: true } } },
      orderBy: { fechaHora: 'asc' },
    });
  }
}
