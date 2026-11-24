import carro from '../assets/logo-gs-carro.png';

const CONTATO = 'gabrielpuneco@gmail.com';

// Pública e sem login: é o link de política de privacidade que a Google Play exige na ficha do app.
export function Privacidade() {
  return (
    <div className="pagina-simples">
      <header className="faixa-simples">
        <img src={carro} alt="" />
        <h1>Política de privacidade</h1>
      </header>
      <article className="pagina-simples-corpo documento">
        <p>
          Esta política vale para o aplicativo GS Instalações (Android) e para o site de mesmo nome, ferramentas de trabalho internas da GS
          Instalações (Wallbox, Padrão 220V e Manutenções) para ordens de serviço e orçamentos. Última atualização: 24 de novembro de 2026.
        </p>

        <h2>Quem usa</h2>
        <p>
          O acesso é só para a equipe da GS Instalações, com usuário e senha criados pelo gestor. Não há cadastro aberto ao público nem venda
          dentro do app.
        </p>

        <h2>Quais dados guardamos</h2>
        <ul>
          <li>Da conta de cada pessoa da equipe: nome, usuário e papel (gestor ou técnico). A senha é guardada cifrada e ninguém consegue lê-la.</li>
          <li>Das ordens de serviço: nome do cliente, responsáveis, tipo de serviço, observações, data de abertura e as fotos de antes e depois, com a data em que cada foto foi adicionada.</li>
          <li>Dos orçamentos e do cadastro de clientes, que só o gestor acessa: nome, telefone, e-mail, CPF ou CNPJ e endereço do cliente, modelo do veículo, itens, valores e condições.</li>
        </ul>
        <p>Não coletamos localização, contatos do aparelho, áudio nem dados de navegação, e o app não tem anúncios nem rastreamento.</p>

        <h2>Permissões do aparelho</h2>
        <p>
          A câmera e a galeria de fotos são usadas só quando alguém toca para fotografar ou escolher uma foto para anexar a uma ordem de serviço.
          O microfone não é usado.
        </p>

        <h2>Para que usamos</h2>
        <p>
          Só para registrar e acompanhar os serviços, gerar os relatórios e orçamentos em PDF e enviá-los ao próprio cliente quando a equipe
          pede. Os dados não são vendidos nem compartilhados com terceiros para outros fins.
        </p>

        <h2>Onde ficam e como são protegidos</h2>
        <p>
          Os dados ficam no servidor da GS Instalações (Railway) e as fotos no armazenamento da Cloudflare (R2). Toda comunicação é feita por
          conexão cifrada (HTTPS). Sem internet, o app guarda no aparelho as alterações e fotos ainda não enviadas, até a conexão voltar. Uma cópia
          de segurança do banco é feita todo dia e mantida por 30 dias.
        </p>

        <h2>Por quanto tempo e como excluir</h2>
        <p>
          Os dados ficam guardados enquanto forem úteis para o histórico dos serviços. O gestor pode excluir ordens de serviço, fotos, orçamentos,
          clientes e desativar contas a qualquer momento. Para pedir a exclusão dos seus dados, escreva para <a href={`mailto:${CONTATO}`}>{CONTATO}</a>.
        </p>

        <h2>Contato</h2>
        <p>
          Dúvidas sobre esta política: <a href={`mailto:${CONTATO}`}>{CONTATO}</a>.
        </p>
      </article>
    </div>
  );
}
