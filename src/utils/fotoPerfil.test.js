import { describe, expect, it } from 'vitest';
import { obterFotoPerfil } from './fotoPerfil.js';

describe('obterFotoPerfil', () => {
  it('aceita os nomes de campo usados pelas respostas da API', () => {
    expect(obterFotoPerfil({ linkFoto: 'https://cdn.unicar.test/ana.jpg' })).toBe(
      'https://cdn.unicar.test/ana.jpg',
    );
    expect(obterFotoPerfil({ fotoPerfil: 'data:image/png;base64,abc' })).toBe(
      'data:image/png;base64,abc',
    );
  });

  it('não interpreta iniciais como se fossem uma imagem', () => {
    expect(obterFotoPerfil({ avatar: 'MA' })).toBe('');
  });
});
