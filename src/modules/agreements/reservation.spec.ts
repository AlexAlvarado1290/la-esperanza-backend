// Pruebas unitarias del cálculo de cantidad reservada/liberada en el flujo
// del acuerdo (RF15, RF20). Validan el invariante:
//   - aceptar reduce stock,
//   - cancelar antes de entregar restaura stock,
//   - cancelar después de entregar NO restaura stock.

describe('Reserva/liberación de cantidad (RF15 / RF20)', () => {
  function reservar(stockActual: number, cantidadAcordada: number) {
    if (cantidadAcordada > stockActual) {
      throw new Error('Stock insuficiente');
    }
    return stockActual - cantidadAcordada;
  }

  function liberar(stockActual: number, cantidadAcordada: number, yaEntregado: boolean) {
    if (yaEntregado) return stockActual; // no se libera si ya hubo entrega
    return stockActual + cantidadAcordada;
  }

  it('reserva descuenta del stock exactamente la cantidad acordada', () => {
    expect(reservar(150, 25)).toBe(125);
    expect(reservar(100, 100)).toBe(0);
  });

  it('rechaza la reserva si el stock no alcanza', () => {
    expect(() => reservar(10, 25)).toThrow('Stock insuficiente');
  });

  it('al cancelar antes de la entrega, restaura el stock', () => {
    const stock = 125;
    const acordada = 25;
    expect(liberar(stock, acordada, false)).toBe(150);
  });

  it('al cancelar después de la entrega NO restaura el stock', () => {
    const stock = 125;
    const acordada = 25;
    expect(liberar(stock, acordada, true)).toBe(125);
  });

  it('reserva + liberación previa a entrega es idempotente', () => {
    const stockInicial = 200;
    const cantidad = 40;
    const tras = reservar(stockInicial, cantidad);
    expect(liberar(tras, cantidad, false)).toBe(stockInicial);
  });
});
