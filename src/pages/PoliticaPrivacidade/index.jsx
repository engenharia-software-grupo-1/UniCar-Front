import { useNavigate } from 'react-router-dom';
import './style.css';

function PoliticaPrivacidade() {
  const navigate = useNavigate();

  return (
    <main className="privacidade-page">
      <section className="privacidade-card">
        <div className="privacidade-header">
          <div>
            <span>Privacidade</span>
            <h1>Política de Privacidade</h1>
            <p>
              Entenda como o UniCar coleta, utiliza, protege e compartilha dados
              necessários para o funcionamento da plataforma.
            </p>
          </div>

          <button type="button" onClick={() => navigate(-1)}>
            Voltar
          </button>
        </div>

        <article className="privacidade-content" aria-label="Texto completo da Política de Privacidade">
          <h2>1. Finalidade da política</h2>
          <p>
            Esta Política de Privacidade descreve como o UniCar trata dados pessoais
            de usuários da plataforma. O objetivo é oferecer transparência sobre o
            uso das informações necessárias para autenticação, identificação,
            organização de caronas, comunicação e segurança da comunidade.
          </p>

          <h2>2. Dados coletados</h2>
          <p>
            O UniCar pode coletar dados informados pelo usuário, como nome, matrícula,
            e-mail institucional, curso, gênero, preferências de comunicação, dados
            de veículos cadastrados, avaliações, comentários e informações geradas
            durante o uso da plataforma.
          </p>
          <p>
            Também podem ser registrados dados técnicos essenciais, como data e hora
            de acesso, identificadores de sessão, token de autenticação, endereço de
            rede e registros de erro, quando necessários para manter o serviço seguro
            e funcional.
          </p>

          <h2>3. Uso dos dados</h2>
          <p>
            Os dados são utilizados para autenticar usuários, validar vínculo
            institucional, exibir informações de perfil, permitir cadastro de veículos,
            organizar caronas, exibir avaliações recebidas, enviar comunicações
            relacionadas ao serviço e prevenir uso indevido da plataforma.
          </p>

          <h2>4. Compartilhamento de informações</h2>
          <p>
            O UniCar exibe apenas as informações necessárias para viabilizar a
            interação entre usuários, como dados básicos de identificação, informações
            da carona, veículo, avaliações e comentários. Dados sensíveis ou não
            necessários ao uso da plataforma não devem ser exibidos publicamente.
          </p>
          <p>
            Informações poderão ser compartilhadas com autoridades competentes ou
            responsáveis institucionais quando houver obrigação legal, solicitação
            legítima ou necessidade de apuração de incidentes de segurança.
          </p>

          <h2>5. Segurança</h2>
          <p>
            A plataforma adota medidas técnicas e organizacionais para proteger os
            dados contra acesso não autorizado, perda, alteração e uso indevido. O
            usuário também deve proteger suas credenciais e encerrar a sessão em
            dispositivos compartilhados.
          </p>

          <h2>6. Comunicação com o usuário</h2>
          <p>
            O UniCar poderá enviar mensagens informativas, avisos de funcionamento,
            alertas de segurança e comunicações relacionadas ao uso da plataforma.
            Quando aplicável, o usuário poderá ajustar preferências de recebimento
            no perfil.
          </p>

          <h2>7. Retenção e exclusão</h2>
          <p>
            Os dados são mantidos pelo tempo necessário para cumprir as finalidades
            descritas nesta política, atender obrigações legais, preservar segurança
            e possibilitar auditoria de eventos relevantes. Ao excluir a conta, dados
            associados ao cadastro local poderão ser removidos ou anonimizados,
            respeitando necessidades legais e operacionais.
          </p>

          <h2>8. Direitos do usuário</h2>
          <p>
            O usuário pode solicitar acesso, correção, atualização ou exclusão de
            dados pessoais, conforme regras aplicáveis e limitações técnicas ou
            legais. Solicitações devem ser encaminhadas aos canais de suporte da
            plataforma.
          </p>

          <h2>9. Alterações nesta política</h2>
          <p>
            Esta política poderá ser atualizada para refletir mudanças no UniCar,
            requisitos legais ou melhorias de segurança. Alterações relevantes serão
            comunicadas por meio da própria plataforma ou por canais institucionais.
          </p>

          <h2>10. Contato</h2>
          <p>
            Em caso de dúvidas sobre privacidade ou tratamento de dados, entre em
            contato pelo e-mail suporte@unicar.app ou pela Central de Ajuda.
          </p>
        </article>
      </section>
    </main>
  );
}

export default PoliticaPrivacidade;
