import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { acceptTerms, getTermsVersion } from '../../services/termsService.js';
import { clearSession } from '../../services/sessionStore.js';
import './style.css';

function TermosUso() {
  const navigate = useNavigate();

  const [aceitou, setAceitou] = useState(false);
  const [erro, setErro] = useState('');

  function handleAcceptTerms() {
    setErro('');

    if (!aceitou) {
      setErro('Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.');
      return;
    }

    acceptTerms();

    navigate('/inicio');
  }

  function handleLogout() {
    clearSession();
    navigate('/login');
  }

  return (
    <main className="termos-page">
      <section className="termos-card">
        <div className="termos-header">
          <h1>Termos de Uso e Política de Privacidade</h1>
          <p>
            Antes de utilizar o UniCar, leia e aceite os termos da plataforma.
          </p>
          <span>Versão {getTermsVersion()}</span>
        </div>

        <div className="termos-content">
          <h2>1. Uso da plataforma</h2>
          <p>
            O UniCar é uma plataforma destinada à organização de caronas entre
            usuários vinculados à comunidade acadêmica da UFCG. O uso da
            plataforma deve ocorrer de forma responsável, respeitosa e segura.
          </p>

          <h2>2. Dados institucionais</h2>
          <p>
            O sistema poderá utilizar dados institucionais necessários para
            autenticação, identificação do usuário e validação de vínculo com a
            UFCG. Essas informações são utilizadas para aumentar a segurança da
            plataforma.
          </p>

          <h2>3. Responsabilidade dos usuários</h2>
          <p>
            Cada usuário é responsável pelas informações fornecidas, pelas
            interações realizadas na plataforma e pelo cumprimento das regras
            de convivência, segurança e respeito entre os participantes.
          </p>

          <h2>4. Política de Privacidade</h2>
          <p>
            Os dados do usuário serão utilizados para funcionamento do sistema,
            autenticação, exibição de perfil, organização de caronas e
            comunicação relacionada ao uso da plataforma.
          </p>

          <h2>5. Aceite</h2>
          <p>
            Ao marcar a opção de aceite, o usuário declara que leu, compreendeu
            e concorda com os Termos de Uso e com a Política de Privacidade do
            UniCar.
          </p>
        </div>

        <label className="termos-checkbox">
          <input
            type="checkbox"
            checked={aceitou}
            onChange={(event) => setAceitou(event.target.checked)}
          />
          <span>
            Li e aceito os Termos de Uso e a Política de Privacidade.
          </span>
        </label>

        {erro && (
          <div className="termos-error">
            {erro}
          </div>
        )}

        <div className="termos-actions">
          <button type="button" onClick={handleAcceptTerms}>
            Aceitar e continuar
          </button>

          <button type="button" className="secondary" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </section>
    </main>
  );
}

export default TermosUso;
