// As respostas da API variam entre fotoUrl, linkFoto e fotoPerfil. Centralizar
// essa compatibilidade garante que todos os avatares mostrem a mesma foto.
export function obterFotoPerfil(usuario = {}) {
  const foto = [
    usuario.fotoUrl,
    usuario.linkFoto,
    usuario.fotoPerfil,
    usuario.fotoPerfilUrl,
    usuario.avatarUrl,
    usuario.urlImagem,
    usuario.profileImage,
  ].find((valor) => /^data:image\/|^https?:\/\//i.test(String(valor || '').trim()));

  return String(foto || '').trim();
}
