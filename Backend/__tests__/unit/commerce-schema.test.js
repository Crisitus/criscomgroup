jest.mock('../../src/config/database', () => ({ sequelize: {} }));

const { enumEquals, enumValues } = require('../../src/scripts/ensure-commerce-schema');

describe('comparación de columnas comerciales', () => {
  test('reconoce un ENUM que ya contiene todos los documentos', () => {
    expect(enumEquals("ENUM('0','1','3')", ['0', '1', '3'])).toBe(true);
  });

  test('detecta un ENUM incompleto', () => {
    expect(enumEquals("ENUM('0','1')", ['0', '1', '3'])).toBe(false);
  });

  test('tolera variantes de mayúsculas reportadas por el dialecto', () => {
    expect(enumEquals("enum('0', '1', '3')", ['0', '1', '3'])).toBe(true);
  });

  test('rechaza valores extra y orden distinto', () => {
    expect(enumEquals("enum('0','1','2','3')", ['0', '1', '3'])).toBe(false);
    expect(enumEquals("enum('1','0','3')", ['0', '1', '3'])).toBe(false);
  });

  test('interpreta comillas SQL escapadas', () => {
    expect(enumValues("enum('normal','d''angelo')")).toEqual(['normal', "d'angelo"]);
  });
});
